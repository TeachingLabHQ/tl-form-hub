import type { ActionFunctionArgs } from "@vercel/remix";
import type { CoachLogSubmission } from "~/domains/coach-log/model";
import { insertMondayData } from "~/domains/utils";

// A real session date is YYYY-MM-DD; the "N/A" sentinel must not be written to a
// Monday date column.
const isRealDate = (value: string) => !!value && value !== "N/A";

// Reuses the legacy Coach Log Form board + column schema.
const BOARD_ID = 18416482214;
const GROUP_ID = "topics";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return new Response(null, { status: 405, statusText: "Method not allowed" });
  }

  const body = (await request.json()) as CoachLogSubmission;
  const {
    coachName,
    coachMondayId,
    district,
    school,
    subSchool,
    nycCoachType,
    sessionDate,
    canceled,
    cancelReason,
    cancelReasonOther,
    rescheduled,
    did1on1,
    coacheeRows,
    didGroupCoaching,
    groupParticipants,
    groupParticipantRole,
    groupTopic,
    groupDurationMins,
  } = body;

  if (!coachName || !district || !school) {
    return new Response(null, {
      status: 400,
      statusText: "Submission inputs are not valid",
    });
  }

  try {
    // ---- Parent item column values -------------------------------------
    const parentColumns: Record<string, unknown> = {
      text88__1: district, // District
      text5__1: school, // School
    };
    if (isRealDate(sessionDate)) parentColumns.date__1 = { date: sessionDate };
    if (coachMondayId) {
      parentColumns.people__1 = {
        personsAndTeams: [{ id: Number(coachMondayId), kind: "person" }],
      };
    }
    if (nycCoachType) parentColumns.text13__1 = nycCoachType; // NYC Coach Type
    if (subSchool) parentColumns.text_mm465e65 = subSchool; // Sub-school

    if (canceled === "Yes") {
      parentColumns.text51__1 = cancelReason; // Why session did not take place
      parentColumns.text99__1 = cancelReasonOther; // "Canceled Other" write-in
      parentColumns.text_mkssvd55 = rescheduled; // Rescheduled?
    }

    if (didGroupCoaching === "Yes") {
      parentColumns.text7__1 = groupParticipants.join(", "); // Participants
      parentColumns.text29__1 = groupParticipantRole; // Participant role
      parentColumns.text76__1 = groupTopic; // Topic of session
      if (groupDurationMins)
        parentColumns.numbers1__1 = parseFloat(groupDurationMins); // Duration
    }

    const queryParent =
      "mutation ($myItemName: String!, $columnVals: JSON!, $groupName: String!) { create_item (board_id: " +
      BOARD_ID +
      ", group_id: $groupName, item_name: $myItemName, column_values: $columnVals, create_labels_if_missing: true) { id } }";
    const varsParent = {
      groupName: GROUP_ID,
      myItemName: coachName,
      columnVals: JSON.stringify(parentColumns),
    };

    const parentResponse = await insertMondayData(queryParent, varsParent);
    const parentItemId = parentResponse?.data?.create_item?.id;
    if (!parentItemId) {
      console.error("Coach log parent create failed:", parentResponse?.errors);
      return new Response(null, {
        status: 500,
        statusText: "Failed to create coach log item",
      });
    }

    // ---- Subitems: one per 1:1 coachee ---------------------------------
    if (did1on1 === "Yes" && Array.isArray(coacheeRows) && coacheeRows.length) {
      const querySub =
        "mutation ($myItemName: String!, $parentID: ID!, $columnVals: JSON!) { create_subitem (parent_item_id: $parentID, item_name: $myItemName, column_values: $columnVals) { id } }";

      const results = await Promise.allSettled(
        coacheeRows.map((row) => {
          const subColumns: Record<string, unknown> = {
            text__1: row.coacheeName, // Coachee
            text0__1: row.role, // Role
          };
          if (isRealDate(sessionDate)) subColumns.date0 = { date: sessionDate };
          if (row.durationMins)
            subColumns.numbers__1 = parseFloat(row.durationMins); // Duration

          const varsSub = {
            myItemName: row.coacheeName,
            parentID: String(parentItemId),
            columnVals: JSON.stringify(subColumns),
          };
          return insertMondayData(querySub, varsSub);
        })
      );

      // A subitem only succeeds if Monday returns a created id. A GraphQL error
      // comes back as a resolved 200 with no id (insertMondayData doesn't
      // throw), so inspect every result rather than trusting Promise resolution.
      const failedCoachees = results
        .map((result, i) => {
          const created =
            result.status === "fulfilled" &&
            result.value?.data?.create_subitem?.id;
          if (created) return null;
          const coacheeName = coacheeRows[i]?.coacheeName ?? "(unknown)";
          const reason =
            result.status === "rejected" ? result.reason : result.value?.errors;
          console.error(
            `Coach log subitem create failed for "${coacheeName}":`,
            reason
          );
          return coacheeName;
        })
        .filter((name): name is string => name !== null);

      if (failedCoachees.length) {
        // The parent item was created, so this is a partial failure (207), not a
        // 500 — returning 500 would invite a resubmit and duplicate the parent.
        // The client warns the coach which 1:1 rows didn't save.
        return new Response(JSON.stringify({ parentItemId, failedCoachees }), {
          status: 207,
          statusText: `${failedCoachees.length} of ${coacheeRows.length} coachee rows failed to save`,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return new Response(null, {
      status: 200,
      statusText: "Coach log submitted successfully",
    });
  } catch (e) {
    console.error(e);
    return new Response(null, {
      status: 500,
      statusText: "Something went wrong with submission",
    });
  }
};
