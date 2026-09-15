import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@vercel/remix";
import { employeeRepository } from "~/domains/employee/repository";
import { employeeService } from "~/domains/employee/service";
import { insertMondayData } from "~/domains/utils";
import { formatDate } from "~/utils/utils";

const toPeopleValue = (ids: string[]) => ({
  personsAndTeams: ids.map((id) => ({ id: Number(id), kind: "person" })),
});

export const action = async ({ request }: ActionFunctionArgs) => {
  const body = await request.json();
  const { name, date, projectLogEntries, comment, employeeId } = body;
  // ?dryRun=1 returns the parent item's column values without writing to Monday
  const isDryRun = new URL(request.url).searchParams.get("dryRun") === "1";

  //validate Inputs
  if (!name || !date || !Array.isArray(projectLogEntries)) {
    return new Response(null, {
      status: 400,
      statusText: "Submission Inputs are not valid",
    });
  }

  //process the submission
  try {
    const formattedDate = formatDate(date);
    let totalHours = projectLogEntries.reduce((a, b) => {
      return a + parseFloat(b.workHours);
    }, 0);

    // Tag the Employee Profile and Home Manager Profile People columns from the
    // FTE/PTE Details board. A failed lookup shouldn't block the submission.
    const peopleTags = await employeeService(
      employeeRepository()
    ).fetchEmployeePeopleTags(employeeId);
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
      ...peopleColumnValues,
    };

    if (isDryRun) {
      return json({
        parentColumnValues,
        peopleTagError: peopleTags.error?.message ?? null,
      });
    }

    //create the parent item
    const queryParentItem =
      "mutation ($myItemName: String!, $columnVals: JSON!, $groupName: String! ) { create_item (board_id:4284585496, group_id: $groupName, item_name:$myItemName, column_values:$columnVals) { id } }";
    const createParentItem = (columnValues: object) =>
      insertMondayData(queryParentItem, {
        groupName: "topics",
        myItemName: name,
        columnVals: JSON.stringify(columnValues),
      });
    let response = await createParentItem(parentColumnValues);
    // If create_item fails with People tags (e.g. a deactivated manager), retry
    // once untagged rather than failing the whole submission. Monday's error
    // messages aren't stable enough to match on, so any failure retries once.
    if (!response?.data?.create_item && Object.keys(peopleColumnValues).length > 0) {
      console.warn(
        "create_item failed with people tags, retrying untagged:",
        JSON.stringify(response?.errors ?? response)
      );
      const { person, people, ...untaggedColumnValues } = parentColumnValues as Record<string, unknown>;
      response = await createParentItem(untaggedColumnValues);
    }
    if (!response?.data?.create_item) {
      console.error(
        "create_item failed:",
        JSON.stringify(response?.errors ?? response)
      );
      return new Response(null, {
        status: 500,
        statusText: "Something went wrong with submission",
      });
    }
    const parentItemId = response.data.create_item.id;
    console.log("parentItemId", parentItemId);

    //create subitems
    const querySubItems =
      "mutation ($myItemName: String!,$parentID: ID!, $columnVals: JSON! ) { create_subitem (parent_item_id:$parentID, item_name:$myItemName, column_values:$columnVals) { id } }";
    const subitemPromises = projectLogEntries.map((project) => {
      const { projectName, projectRole, workHours, activity } = project;
      const varsSubItems = {
        myItemName: name,
        parentID: String(parentItemId),
        columnVals: JSON.stringify({
          date: { date: formattedDate },
          project_role: projectRole,
          name6: projectName,
          numbers: parseFloat(workHours),
          numeric_mkq2d9jn: employeeId,
          text_mkt4atja: activity,
        }),
      };
      // Return the promise for each subitem creation
      return insertMondayData(querySubItems, varsSubItems)
        .then((result) => {
          console.log(`Subitem created for project: ${projectName}`);
          return result;
        })
        .catch((error) => {
          console.error(`Error creating subitem ${projectName}:`, error);
          throw error;
        });
    });
    await Promise.all(subitemPromises);
    return new Response(null, {
      status: 200,
      statusText: "All items and subitems created successfully.",
    });
  } catch (e) {
    console.error(e);
    return new Response(null, {
      status: 500,
      statusText: "Something went wrong with submission",
    });
  }
};
