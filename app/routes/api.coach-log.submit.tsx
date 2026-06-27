import type { ActionFunctionArgs } from "@vercel/remix";
import type { CoachLogSubmission } from "~/domains/coach-log/model";
import {
  COACH_LOG_BOARD_ID,
  coachLogRepository,
} from "~/domains/coach-log/repository";
import { coachLogService } from "~/domains/coach-log/service";
import { insertMondayData } from "~/domains/utils";
import {
  readsShowsDistrictBlock,
  readsShowsLeaderBlock,
  readsShowsTeacherBlock,
  SOLVES_INTERVISITATION_PROTOCOL,
  solvesShowsAdditionalSupport,
  solvesShowsLeaderBlock,
  solvesShowsTeacherBlock,
} from "~/components/coach-log/questions/nyc/constants";

// Joins a multi-select array into the comma-separated string the Monday text
// columns expect (matching the legacy form's serialization).
const csv = (values: string[] | undefined) => (values ?? []).join(", ");

// Session date is YYYY-MM-DD (required); guard against an empty value just in
// case so we never write a blank date column.
const isRealDate = (value: string) => !!value;

// Reuses the legacy Coach Log Form board + column schema.
const BOARD_ID = COACH_LOG_BOARD_ID;
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
    ecTouchpoint,
    ecTeacherStrategies,
    ecLeaderCapacityFocus,
    readsIsPLSession,
    readsScheduleProvided,
    readsHighImpactActivities,
    readsTouchpoint,
    readsIsMultiSchool,
    readsMultiSchoolDBN,
    readsVisitDuration,
    readsSupportedTeacherTypes,
    readsGradeBands,
    readsTeacherStrategies,
    readsMTSSFocus,
    readsMajorityUsingHQIM,
    readsHQIMContext,
    readsSupportedLeaders,
    readsSupportedLeadersOther,
    readsLeaderVisitDuration,
    readsLeaderCapacityFocus,
    readsSupportedDistrictLeaders,
    readsSupportedDistrictLeadersOther,
    readsDistrictSupports,
    mtssPracticesResponses,
    mtssAdditionalContext,
    solvesTouchpoint,
    solvesTeacherVisitDuration,
    solvesSupportedTeacherTypes,
    solvesGradeContentAreas,
    solvesTeacherProtocols,
    solvesIntervisitationDBNs,
    solvesMajorityUsingHQIM,
    solvesHQIMContext,
    solvesLeaderSupportDuration,
    solvesLeaderSupportTrack,
    solvesAdditionalSupportDuration,
    solvesAdditionalSupportType,
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
    // ---- Duplicate guard ------------------------------------------------
    // One log per coach + district + school + date + coach type (cancelled logs
    // count). This is the authoritative check; the form also pre-checks for a
    // better UX.
    const service = coachLogService(coachLogRepository());
    const duplicate = await service.hasExistingLog({
      coachMondayId,
      coachName,
      district,
      school,
      sessionDate,
      nycCoachType,
    });
    if (duplicate.data) {
      return new Response(null, {
        status: 409,
        statusText:
          "A coach log already exists for this school on this date.",
      });
    }

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

    // ELA Early Childhood coach (multi-selects stored comma-joined, per legacy).
    if (ecTouchpoint) parentColumns.text_mktgtahx = ecTouchpoint; // Touchpoint type
    if (ecTeacherStrategies?.length)
      parentColumns.text_mktgaftm = ecTeacherStrategies.join(", "); // Teacher strategies
    if (ecLeaderCapacityFocus?.length)
      parentColumns.text_mktggp36 = ecLeaderCapacityFocus.join(", "); // Leader capacity focus

    // NYC Reads (the client only sends these for a Reads coach). Each touchpoint
    // block is gated again here so stale hidden values are never written.
    if (readsTouchpoint) {
      if (readsIsPLSession) parentColumns.text_mkv0r1t = readsIsPLSession;
      if (readsScheduleProvided) parentColumns.text_mm1erdxw = readsScheduleProvided;
      if (readsHighImpactActivities)
        parentColumns.text_mm1ec7kg = readsHighImpactActivities;
      parentColumns.text_mktgtahx = readsTouchpoint;

      if (readsShowsTeacherBlock(readsTouchpoint)) {
        if (readsIsMultiSchool) parentColumns.text_mktgedch = readsIsMultiSchool;
        if (readsIsMultiSchool === "Yes" && readsMultiSchoolDBN)
          parentColumns.text_mkvmnx9g = readsMultiSchoolDBN;
        if (readsVisitDuration) parentColumns.text_mktgt2ah = readsVisitDuration;
        if (readsSupportedTeacherTypes?.length)
          parentColumns.text_mktgnqcx = csv(readsSupportedTeacherTypes);
        if (readsGradeBands?.length)
          parentColumns.text_mktgz9wm = csv(readsGradeBands);
        if (readsTeacherStrategies?.length)
          parentColumns.text_mktgaftm = csv(readsTeacherStrategies);
        if (readsMTSSFocus) parentColumns.text_mkv0fs1n = readsMTSSFocus;
        if (readsMajorityUsingHQIM)
          parentColumns.text_mkv0w2eq = readsMajorityUsingHQIM;
        if (readsMajorityUsingHQIM === "No" && readsHQIMContext)
          parentColumns.text_mkxspvf5 = readsHQIMContext;
      }

      if (readsShowsLeaderBlock(readsTouchpoint)) {
        if (readsSupportedLeaders?.length)
          parentColumns.text_mktg8pn8 = csv(readsSupportedLeaders);
        if (readsSupportedLeadersOther)
          parentColumns.text_mktgph5d = readsSupportedLeadersOther;
        if (readsLeaderVisitDuration)
          parentColumns.text_mktggbxt = readsLeaderVisitDuration;
        if (readsLeaderCapacityFocus?.length)
          parentColumns.text_mktggp36 = csv(readsLeaderCapacityFocus);
      }

      if (readsShowsDistrictBlock(readsTouchpoint)) {
        if (readsSupportedDistrictLeaders?.length)
          parentColumns.text_mktgzc4s = csv(readsSupportedDistrictLeaders);
        if (readsSupportedDistrictLeadersOther)
          parentColumns.text_mktgexpt = readsSupportedDistrictLeadersOther;
        if (readsDistrictSupports?.length)
          parentColumns.text_mktg32xj = csv(readsDistrictSupports);
      }

      if (mtssPracticesResponses?.some((r) => r))
        parentColumns.long_text_mkxsd1qs = mtssPracticesResponses.join(" | ");
      if (mtssAdditionalContext)
        parentColumns.long_text_mkxsxkdh = mtssAdditionalContext;
    }

    // NYC Solves (client only sends these for a Solves coach).
    if (solvesTouchpoint) {
      parentColumns.text_mkthbvw5 = solvesTouchpoint;

      if (solvesShowsTeacherBlock(solvesTouchpoint)) {
        if (solvesTeacherVisitDuration)
          parentColumns.text_mkthtzhb = solvesTeacherVisitDuration;
        if (solvesSupportedTeacherTypes?.length)
          parentColumns.text_mkthqes0 = csv(solvesSupportedTeacherTypes);
        if (solvesGradeContentAreas?.length)
          parentColumns.text_mkth9zzf = csv(solvesGradeContentAreas);
        if (solvesTeacherProtocols?.length)
          parentColumns.text_mkthqrth = csv(solvesTeacherProtocols);
        if (
          solvesTeacherProtocols?.includes(SOLVES_INTERVISITATION_PROTOCOL) &&
          solvesIntervisitationDBNs
        )
          parentColumns.text_mkth5zrt = solvesIntervisitationDBNs;
        if (solvesMajorityUsingHQIM)
          parentColumns.text_mkttj6kq = solvesMajorityUsingHQIM;
        if (solvesMajorityUsingHQIM === "No" && solvesHQIMContext)
          parentColumns.text_mkxsvgng = solvesHQIMContext;
      }

      if (solvesShowsLeaderBlock(solvesTouchpoint)) {
        if (solvesLeaderSupportDuration)
          parentColumns.text_mkth7jye = solvesLeaderSupportDuration;
        if (solvesLeaderSupportTrack)
          parentColumns.text_mkthjyrx = solvesLeaderSupportTrack;
      }

      if (solvesShowsAdditionalSupport(solvesTouchpoint)) {
        if (solvesAdditionalSupportDuration)
          parentColumns.text_mkth5kcn = solvesAdditionalSupportDuration;
        if (solvesAdditionalSupportType)
          parentColumns.text_mkthwj61 = solvesAdditionalSupportType;
      }
    }

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
