import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@vercel/remix";
import { employeeRepository } from "~/domains/employee/repository";
import {
  WEEKLY_PROJECT_LOG_BOARD_ID,
  weeklyProjectLogRepository,
} from "~/domains/weekly-project-log/repository";
import { weeklyProjectLogService } from "~/domains/weekly-project-log/service";
import { getTeachingLabUser } from "~/utils/auth.server";
import { formatDate } from "~/utils/utils";

// Large logs create 20+ subitems a few at a time (~0.75s per subitem), which
// blew through the previous 15s limit and killed submissions mid-write.
export const config = { maxDuration: 60 };

const toPeopleValue = (ids: string[]) => ({
  personsAndTeams: ids.map((id) => ({ id: Number(id), kind: "person" })),
});

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const user = await getTeachingLabUser(request);
  if (!user) {
    return json({ error: "Please sign in with your Teaching Lab account." }, { status: 401 });
  }
  const { headers } = user;

  const body = await request.json();
  const { name, date, projectLogEntries, comment, employeeId } = body;
  // ?dryRun=1 returns the parent item's column values without writing to Monday
  const isDryRun = new URL(request.url).searchParams.get("dryRun") === "1";

  //validate Inputs
  // date must be a string: formatDate() slices it, and a number or object
  // would throw inside the handler and surface as a 500
  if (!name || typeof date !== "string" || !date || !employeeId || !Array.isArray(projectLogEntries) || projectLogEntries.length === 0) {
    return json({ error: "Submission inputs are not valid." }, { status: 400, headers });
  }

  const service = weeklyProjectLogService(weeklyProjectLogRepository(), employeeRepository());

  //process the submission
  try {
    const { data: isAllowed, error: permissionError } = await service.canSubmitFor(
      user.email,
      String(employeeId)
    );
    if (permissionError) {
      console.error("Could not verify submitter:", user.email, permissionError.message);
      return json(
        { error: "We couldn't verify your employee profile. Please try again." },
        { status: 502, headers }
      );
    }
    if (!isAllowed) {
      console.warn(`Rejected project log from ${user.email} for employee ${employeeId}`);
      return json(
        { error: "You can only submit a project log for yourself." },
        { status: 403, headers }
      );
    }

    const formattedDate = formatDate(date);

    // One log per employee per week. If the lookup itself fails, let the
    // submission through rather than block everyone during a Monday hiccup.
    const submittedWeeks = await service.fetchSubmittedWeeks(String(employeeId));
    if (submittedWeeks.error) {
      console.error("Could not check for an existing project log:", submittedWeeks.error.message);
    }
    const existing = submittedWeeks.data?.find((week) => week.week === formattedDate);
    if (existing) {
      return json(
        { error: `A project log for the week of ${formattedDate} was already submitted.`, existing },
        { status: 409, headers }
      );
    }

    const totalHours = projectLogEntries.reduce((a, b) => {
      return a + (parseFloat(b.workHours) || 0);
    }, 0);

    // Employee Profile and Home Manager Profile People values from the FTE/PTE
    // Details board. A failed lookup shouldn't block the submission.
    const peopleTags = await service.fetchEmployeePeopleTags(employeeId);
    if (peopleTags.error) {
      console.warn("Could not tag people on project log:", peopleTags.error.message);
    }
    const peopleColumnValues = peopleTags.data
      ? {
          ...(peopleTags.data.employeeProfileIds.length > 0 && {
            person: toPeopleValue(peopleTags.data.employeeProfileIds),
          }),
          ...(peopleTags.data.homeManagerIds.length > 0 && {
            people: toPeopleValue(peopleTags.data.homeManagerIds),
          }),
        }
      : {};

    const parentColumnValues = {
      date4: { date: formattedDate },
      numbers8: totalHours,
      notes: comment,
      numeric_mkq25pjh: employeeId,
    };

    if (isDryRun) {
      return json(
        {
          parentColumnValues,
          peopleColumnValues,
          peopleTagError: peopleTags.error?.message ?? null,
        },
        { headers }
      );
    }

    //create the parent item
    const parentItem = await service.createParentItem(name, parentColumnValues);
    if (!parentItem.data) {
      console.error("create_item failed:", parentItem.error?.message);
      return json(
        { error: "Your project log couldn't be saved. Please try again." },
        { status: 502, headers }
      );
    }
    const parentItemId = parentItem.data.id;

    //create subitems
    const subitemResults = await service.createSubitems(
      parentItemId,
      projectLogEntries.map((project) => ({
        itemName: name,
        columnValues: {
          date: { date: formattedDate },
          project_role: project.projectRole,
          name6: project.projectName,
          numbers: parseFloat(project.workHours),
          numeric_mkq2d9jn: employeeId,
          text_mkt4atja: project.activity,
        },
      }))
    );
    const failedSubitems = subitemResults
      .map((result, index) => ({ result, project: projectLogEntries[index] }))
      .filter(({ result }) => result.error);

    // Don't leave a partial log behind: remove the entry so a resubmit starts
    // clean and isn't blocked by the duplicate check
    if (failedSubitems.length > 0) {
      failedSubitems.forEach(({ result, project }) => {
        console.error(`create_subitem failed for ${project.projectName}:`, result.error?.message);
      });
      const deleted = await service.deleteItem(parentItemId);
      if (deleted.error) {
        console.error(`Could not remove partial project log ${parentItemId}:`, deleted.error.message);
        // The partial entry is still on the board, so a resubmit would hit the
        // duplicate check. Point the user at it instead of saying "try again".
        return json(
          {
            error: `${failedSubitems.length} of ${projectLogEntries.length} project rows couldn't be saved, and the incomplete entry couldn't be removed automatically. Please delete it on Monday (https://teachinglab.monday.com/boards/${WEEKLY_PROJECT_LOG_BOARD_ID}/pulses/${parentItemId}) and submit again.`,
          },
          { status: 502, headers }
        );
      }
      return json(
        {
          error: `${failedSubitems.length} of ${projectLogEntries.length} project rows couldn't be saved, so nothing was submitted. Please try again.`,
        },
        { status: 502, headers }
      );
    }

    // Tag the People columns only once the log is complete. They're set after
    // create_item, not in it, because the board's automation that moves the
    // entry from "New Submission" into the submitter's group fires on a change
    // to Employee Profile, and a value set at creation isn't a change.
    if (Object.keys(peopleColumnValues).length > 0) {
      let tagged = await service.updateItemColumns(parentItemId, peopleColumnValues);
      // A rejected Home Manager (e.g. a deactivated user) fails the whole
      // update, so retry with just Employee Profile, which drives the move
      if (tagged.error && "people" in peopleColumnValues && "person" in peopleColumnValues) {
        console.warn("Tagging people failed, retrying Employee Profile only:", tagged.error.message);
        tagged = await service.updateItemColumns(parentItemId, {
          person: peopleColumnValues.person,
        });
      }
      if (tagged.error) {
        console.warn(`Could not tag people on project log ${parentItemId}:`, tagged.error.message);
      }
    }

    return json(
      {
        submitted: {
          itemId: parentItemId,
          week: formattedDate,
          totalHours,
          createdAt: new Date().toISOString(),
        },
      },
      { headers }
    );
  } catch (e) {
    console.error(e);
    return json(
      { error: "Something went wrong with your submission. Please try again." },
      { status: 500, headers }
    );
  }
};
