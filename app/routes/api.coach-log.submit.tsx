import type { ActionFunctionArgs } from "@vercel/remix";
import type { CoachLogSubmission } from "~/domains/coach-log/model";
import {
  COACH_LOG_BOARD_ID,
  coachLogRepository,
} from "~/domains/coach-log/repository";
import { coachLogService } from "~/domains/coach-log/service";
import { insertMondayData } from "~/domains/utils";
import {
  OTHER_OPTION,
  readsShowsDistrictBlock,
  readsShowsLeaderBlock,
  readsShowsTeacherBlock,
  solvesShowsCsd,
  solvesShowsDistrictWide,
  solvesShowsDistrictWideDBNs,
  solvesShowsEs,
  solvesShowsHqim,
  solvesShowsHqimLeaderPresent,
  solvesShowsHsd,
  solvesShowsPostVisitFollowUp,
  solvesShowsPostVisitSnapshot,
} from "~/components/coach-log/questions/nyc/constants";

// Joins a multi-select array into the comma-separated string the Monday text
// columns expect (matching the legacy form's serialization).
const csv = (values: string[] | undefined) => (values ?? []).join(", ");

// Some "Other" write-ins share their parent multi-select's Monday column
// (rather than getting their own), so the write-in replaces the literal
// "Other" entry in the serialized list instead of being written separately
// (which would just have one silently overwrite the other).
const csvWithOtherDetail = (values: string[] | undefined, otherText: string) =>
  (values ?? [])
    .map((v) => (v === OTHER_OPTION && otherText ? `Other: ${otherText}` : v))
    .join(", ");

// Session date is YYYY-MM-DD (required); guard against an empty value just in
// case so we never write a blank date column.
const isRealDate = (value: string) => !!value;

// Reuses the legacy Coach Log Form board + column schema.
const BOARD_ID = COACH_LOG_BOARD_ID;
const GROUP_ID = "topics";

// ---------------------------------------------------------------------------
// Monday column IDs for the FY27 NYC Reads/Solves overhaul, on board
// `COACH_LOG_BOARD_ID` (see coach-log/repository.ts). A few reuse a column
// from the pre-overhaul field of the same shape (touchpoint-type selects,
// readsDistrictCapacityFocus); everything else is a newly added column.
// ---------------------------------------------------------------------------
const COLUMN = {
  // NYC Reads — top-level
  readsTouchpointTypes: "text_mktgtahx", // reused: pre-overhaul readsTouchpoint/ecTouchpoint column
  // NYC Reads — Teacher team support
  readsTeacherSchoolLeaderPresence: "text_mm6n1qtd",
  readsTeacherDistrictLeaderPresence: "text_mm6nqxvh",
  readsInterventionsScheduled: "text_mm6n77va",
  readsInterventionsContext: "text_mm6ndxbw",
  // NYC Reads — School Leader/Leadership team support
  readsLeaderFocusSchoolVisitsSubcomponent: "text_mm6ngab7",
  readsLeaderFocusModelingSubcomponent: "text_mm6n1fgs",
  readsLeaderFocusPLSubcomponent: "text_mm6ne4nr",
  readsLeaderSustainability: "text_mm6nbxvj",
  readsLeaderDistrictPresence: "text_mm6nc9gw",
  // NYC Reads — District team support
  readsDistrictCapacityFocus: "text_mktg32xj", // reused: pre-overhaul readsDistrictSupports column
  readsDistrictFocusStrategicPlanningSubcomponent: "text_mm6naqm5",
  readsDistrictFocusPLSubcomponent: "text_mm6nnpxr",
  readsDistrictFocusDataStrategySubcomponent: "text_mm6nns49",
  readsDistrictFocusSchoolVisitsSubcomponent: "text_mm6n32z3",
  readsDistrictSustainability: "text_mm6n46cw",
  // NYC Reads — shown once per submission
  readsGuidanceToolsUsed: "text_mm6ngq1v", // also holds the "Other" write-in (see csvWithOtherDetail)
  readsNotes: "text_mm6nqjfn",

  // NYC Solves — top-level
  solvesTouchpointTypes: "text_mkthbvw5", // reused: pre-overhaul solvesTouchpoint column
  // NYC Solves — HQIM-Based Teacher Collaboration
  solvesHqimVisitDuration: "text_mkthtzhb",
  solvesHqimGradeContentAreas: "text_mkth9zzf",
  solvesHqimLeaderPresent: "text_mm6nt9f8",
  solvesHqimProtocols: "text_mkthqrth",
  // NYC Solves — HSD Only: Supplemental Time Teacher Collaboration
  solvesHsdVisitDuration: "text_mm6nqx9x",
  solvesHsdGradeContentAreas: "text_mm6ny98w",
  solvesHsdPrimaryResources: "text_mkthjyrx", // also holds the "Other" write-in (see csvWithOtherDetail)
  solvesHsdProtocols: "text_mm6n3qbz",
  solvesHsdLeaderPresent: "text_mm6nk3m3",
  // NYC Solves — ES: Do the Math Work Shops
  solvesEsVisitDuration: "text_mm6nv7jp",
  solvesEsGradeLevels: "text_mm6ne01j",
  // NYC Solves — CSD: Leader Support (at one school)
  solvesCsdVisitDuration: "text_mm6nvcvz",
  solvesCsdTrack: "text_mm6nhv0b",
  // NYC Solves — District Wide Learning Support
  solvesDistrictWideVisitDuration: "text_mm6nx5fv",
  solvesDistrictWideSupportType: "text_mm6n3zqp",
  solvesDistrictWideDBNs: "text_mm6ncnt7",
  // NYC Solves — shown once, if HQIM/HSD/CSD selected
  solvesPostVisitSnapshot: "text_mm6n9813",
  solvesPostVisitFollowUp: "text_mm6ne4t8",
  // NYC Solves — shown once per submission
  solvesGuidanceToolsUsed: "text_mm6n3rjz", // also holds the "Other" write-in (see csvWithOtherDetail)
  solvesNotes: "text_mm6ntz5c",
} as const;

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
    readsHighImpactActivities,
    readsTouchpointTypes,
    readsVisitDuration,
    readsGradeBands,
    readsTeacherStrategies,
    readsTeacherSchoolLeaderPresence,
    readsTeacherDistrictLeaderPresence,
    readsMajorityUsingHQIM,
    readsHQIMContext,
    readsInterventionsScheduled,
    readsInterventionsContext,
    readsLeaderVisitDuration,
    readsLeaderCapacityFocus,
    readsLeaderFocusSchoolVisitsSubcomponent,
    readsLeaderFocusModelingSubcomponent,
    readsLeaderFocusPLSubcomponent,
    readsLeaderSustainability,
    readsLeaderDistrictPresence,
    readsDistrictCapacityFocus,
    readsDistrictFocusStrategicPlanningSubcomponent,
    readsDistrictFocusPLSubcomponent,
    readsDistrictFocusDataStrategySubcomponent,
    readsDistrictFocusSchoolVisitsSubcomponent,
    readsDistrictSustainability,
    readsGuidanceToolsUsed,
    readsGuidanceToolsOther,
    readsNotes,
    solvesTouchpointTypes,
    solvesHqimVisitDuration,
    solvesHqimGradeContentAreas,
    solvesHqimLeaderPresent,
    solvesHqimProtocols,
    solvesHsdVisitDuration,
    solvesHsdGradeContentAreas,
    solvesHsdPrimaryResources,
    solvesHsdPrimaryResourcesOther,
    solvesHsdProtocols,
    solvesHsdLeaderPresent,
    solvesEsVisitDuration,
    solvesEsGradeLevels,
    solvesCsdVisitDuration,
    solvesCsdTrack,
    solvesDistrictWideVisitDuration,
    solvesDistrictWideSupportType,
    solvesDistrictWideDBNs,
    solvesPostVisitSnapshot,
    solvesPostVisitFollowUp,
    solvesGuidanceToolsUsed,
    solvesGuidanceToolsOther,
    solvesNotes,
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
    // One log per coach + district + school + date + coach type + sub-school
    // (cancelled logs count). This is the authoritative check; the form also
    // pre-checks for a better UX. `subSchool` is already gated to "" by the
    // client when sub-school doesn't apply, so it only narrows the key for
    // D75 + Solves logs, or D11 + Solves logs at the 8 K-8 schools (where it
    // holds "Elementary"/"Middle" instead of a sub-school name).
    const service = coachLogService(coachLogRepository());
    const duplicate = await service.hasExistingLog({
      coachMondayId,
      coachName,
      district,
      school,
      sessionDate,
      nycCoachType,
      subSchool,
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
    if (readsTouchpointTypes?.length) {
      if (readsIsPLSession) parentColumns.text_mkv0r1t = readsIsPLSession;
      if (readsHighImpactActivities)
        parentColumns.text_mm1ec7kg = readsHighImpactActivities;
      parentColumns[COLUMN.readsTouchpointTypes] = csv(readsTouchpointTypes);

      if (readsShowsTeacherBlock(readsTouchpointTypes)) {
        if (readsVisitDuration) parentColumns.text_mktgt2ah = readsVisitDuration;
        if (readsGradeBands?.length)
          parentColumns.text_mktgz9wm = csv(readsGradeBands);
        if (readsTeacherStrategies?.length)
          parentColumns.text_mktgaftm = csv(readsTeacherStrategies);
        if (readsTeacherSchoolLeaderPresence)
          parentColumns[COLUMN.readsTeacherSchoolLeaderPresence] =
            readsTeacherSchoolLeaderPresence;
        if (readsTeacherDistrictLeaderPresence)
          parentColumns[COLUMN.readsTeacherDistrictLeaderPresence] =
            readsTeacherDistrictLeaderPresence;
        if (readsMajorityUsingHQIM)
          parentColumns.text_mkv0w2eq = readsMajorityUsingHQIM;
        if (readsMajorityUsingHQIM === "No" && readsHQIMContext)
          parentColumns.text_mkxspvf5 = readsHQIMContext;
        if (readsInterventionsScheduled)
          parentColumns[COLUMN.readsInterventionsScheduled] =
            readsInterventionsScheduled;
        if (readsInterventionsScheduled === "No" && readsInterventionsContext)
          parentColumns[COLUMN.readsInterventionsContext] =
            readsInterventionsContext;
      }

      if (readsShowsLeaderBlock(readsTouchpointTypes)) {
        if (readsLeaderVisitDuration)
          parentColumns.text_mktggbxt = readsLeaderVisitDuration;
        if (readsLeaderCapacityFocus?.length)
          parentColumns.text_mktggp36 = csv(readsLeaderCapacityFocus);
        if (readsLeaderFocusSchoolVisitsSubcomponent)
          parentColumns[COLUMN.readsLeaderFocusSchoolVisitsSubcomponent] =
            readsLeaderFocusSchoolVisitsSubcomponent;
        if (readsLeaderFocusModelingSubcomponent)
          parentColumns[COLUMN.readsLeaderFocusModelingSubcomponent] =
            readsLeaderFocusModelingSubcomponent;
        if (readsLeaderFocusPLSubcomponent)
          parentColumns[COLUMN.readsLeaderFocusPLSubcomponent] =
            readsLeaderFocusPLSubcomponent;
        if (readsLeaderSustainability?.length)
          parentColumns[COLUMN.readsLeaderSustainability] = csv(
            readsLeaderSustainability
          );
        if (readsLeaderDistrictPresence)
          parentColumns[COLUMN.readsLeaderDistrictPresence] =
            readsLeaderDistrictPresence;
      }

      if (readsShowsDistrictBlock(readsTouchpointTypes)) {
        if (readsDistrictCapacityFocus?.length)
          parentColumns[COLUMN.readsDistrictCapacityFocus] = csv(
            readsDistrictCapacityFocus
          );
        if (readsDistrictFocusStrategicPlanningSubcomponent)
          parentColumns[COLUMN.readsDistrictFocusStrategicPlanningSubcomponent] =
            readsDistrictFocusStrategicPlanningSubcomponent;
        if (readsDistrictFocusPLSubcomponent)
          parentColumns[COLUMN.readsDistrictFocusPLSubcomponent] =
            readsDistrictFocusPLSubcomponent;
        if (readsDistrictFocusDataStrategySubcomponent)
          parentColumns[COLUMN.readsDistrictFocusDataStrategySubcomponent] =
            readsDistrictFocusDataStrategySubcomponent;
        if (readsDistrictFocusSchoolVisitsSubcomponent)
          parentColumns[COLUMN.readsDistrictFocusSchoolVisitsSubcomponent] =
            readsDistrictFocusSchoolVisitsSubcomponent;
        if (readsDistrictSustainability?.length)
          parentColumns[COLUMN.readsDistrictSustainability] = csv(
            readsDistrictSustainability
          );
      }

      if (readsGuidanceToolsUsed?.length)
        parentColumns[COLUMN.readsGuidanceToolsUsed] = csvWithOtherDetail(
          readsGuidanceToolsUsed,
          readsGuidanceToolsOther
        );
      if (readsNotes) parentColumns[COLUMN.readsNotes] = readsNotes;
    }

    // NYC Solves (client only sends these for a Solves coach).
    if (solvesTouchpointTypes?.length) {
      parentColumns[COLUMN.solvesTouchpointTypes] = csv(solvesTouchpointTypes);

      if (solvesShowsHqim(solvesTouchpointTypes)) {
        if (solvesHqimVisitDuration)
          parentColumns[COLUMN.solvesHqimVisitDuration] = solvesHqimVisitDuration;
        if (solvesHqimGradeContentAreas?.length)
          parentColumns[COLUMN.solvesHqimGradeContentAreas] = csv(
            solvesHqimGradeContentAreas
          );
        if (
          solvesShowsHqimLeaderPresent(solvesHqimGradeContentAreas ?? []) &&
          solvesHqimLeaderPresent
        )
          parentColumns[COLUMN.solvesHqimLeaderPresent] = solvesHqimLeaderPresent;
        if (solvesHqimProtocols?.length)
          parentColumns[COLUMN.solvesHqimProtocols] = csv(solvesHqimProtocols);
      }

      if (solvesShowsHsd(solvesTouchpointTypes)) {
        if (solvesHsdVisitDuration)
          parentColumns[COLUMN.solvesHsdVisitDuration] = solvesHsdVisitDuration;
        if (solvesHsdGradeContentAreas?.length)
          parentColumns[COLUMN.solvesHsdGradeContentAreas] = csv(
            solvesHsdGradeContentAreas
          );
        if (solvesHsdPrimaryResources?.length)
          parentColumns[COLUMN.solvesHsdPrimaryResources] = csvWithOtherDetail(
            solvesHsdPrimaryResources,
            solvesHsdPrimaryResourcesOther
          );
        if (solvesHsdProtocols?.length)
          parentColumns[COLUMN.solvesHsdProtocols] = csv(solvesHsdProtocols);
        if (solvesHsdLeaderPresent)
          parentColumns[COLUMN.solvesHsdLeaderPresent] = solvesHsdLeaderPresent;
      }

      if (solvesShowsEs(solvesTouchpointTypes)) {
        if (solvesEsVisitDuration)
          parentColumns[COLUMN.solvesEsVisitDuration] = solvesEsVisitDuration;
        if (solvesEsGradeLevels?.length)
          parentColumns[COLUMN.solvesEsGradeLevels] = csv(solvesEsGradeLevels);
      }

      if (solvesShowsCsd(solvesTouchpointTypes)) {
        if (solvesCsdVisitDuration)
          parentColumns[COLUMN.solvesCsdVisitDuration] = solvesCsdVisitDuration;
        if (solvesCsdTrack) parentColumns[COLUMN.solvesCsdTrack] = solvesCsdTrack;
      }

      if (solvesShowsDistrictWide(solvesTouchpointTypes)) {
        if (solvesDistrictWideVisitDuration)
          parentColumns[COLUMN.solvesDistrictWideVisitDuration] =
            solvesDistrictWideVisitDuration;
        if (solvesDistrictWideSupportType)
          parentColumns[COLUMN.solvesDistrictWideSupportType] =
            solvesDistrictWideSupportType;
        if (
          solvesDistrictWideSupportType &&
          solvesShowsDistrictWideDBNs(solvesDistrictWideSupportType) &&
          solvesDistrictWideDBNs
        )
          parentColumns[COLUMN.solvesDistrictWideDBNs] = solvesDistrictWideDBNs;
      }

      if (solvesShowsPostVisitSnapshot(solvesTouchpointTypes)) {
        if (solvesPostVisitSnapshot)
          parentColumns[COLUMN.solvesPostVisitSnapshot] = solvesPostVisitSnapshot;
        if (
          solvesPostVisitSnapshot &&
          solvesShowsPostVisitFollowUp(solvesPostVisitSnapshot) &&
          solvesPostVisitFollowUp
        )
          parentColumns[COLUMN.solvesPostVisitFollowUp] = solvesPostVisitFollowUp;
      }

      if (solvesGuidanceToolsUsed?.length)
        parentColumns[COLUMN.solvesGuidanceToolsUsed] = csvWithOtherDetail(
          solvesGuidanceToolsUsed,
          solvesGuidanceToolsOther
        );
      if (solvesNotes) parentColumns[COLUMN.solvesNotes] = solvesNotes;
    }

    if (canceled === "Yes") {
      parentColumns.text51__1 = cancelReason; // Why session did not take place
      parentColumns.text99__1 = cancelReasonOther; // "Canceled Other" write-in
      parentColumns.text_mkssvd55 = rescheduled; // Rescheduled?
    }

    if (didGroupCoaching === "Yes") {
      parentColumns.text7__1 = groupParticipants.join(", "); // Participants
      parentColumns.text29__1 = groupParticipantRole.join(", "); // Participant role
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
