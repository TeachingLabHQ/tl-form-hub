import type { CoachLogSubmission } from "~/domains/coach-log/model";
import {
  isNycCoachTypeDistrict,
  shouldShowEarlyChildhood,
  shouldShowReads,
  shouldShowSchoolLevel,
  shouldShowSolves,
  shouldShowSubSchool,
} from "./constants";
import type { CoachLogValues } from "./hooks/use-coach-log-form";
import {
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
} from "./questions/nyc/constants";

type Coach = { name: string; mondayProfileId: string };

/**
 * Maps validated form values to the flat {@link CoachLogSubmission} payload,
 * re-applying the same show/hide gating used in the UI so values from a hidden
 * section are never submitted. Pure (no React) so it stays easy to read and
 * test, and keeps the form component thin.
 */
export function buildCoachLogSubmission(
  values: CoachLogValues,
  coach: Coach
): CoachLogSubmission {
  const cancelled = values.canceled === "Yes";
  const showNycCoachType = isNycCoachTypeDistrict(values.district);
  const showSubSchool =
    shouldShowSubSchool(values.district, values.nycCoachType) ||
    shouldShowSchoolLevel(values.district, values.school, values.nycCoachType);
  const sendEC =
    !cancelled && shouldShowEarlyChildhood(values.district, values.nycCoachType);
  const sendReads =
    !cancelled && shouldShowReads(values.district, values.nycCoachType);
  const sendSolves =
    !cancelled && shouldShowSolves(values.district, values.nycCoachType);
  const sendReadsGuidance = sendReads && values.readsIsPLSession !== "Yes";
  const sendSolvesGuidance = sendSolves && values.solvesIsPLSession !== "Yes";
  const sendCoachees = !cancelled && values.did1on1 === "Yes";
  const sendGroup = !cancelled && values.didGroupCoaching === "Yes";

  const readsTouchpointTypes = sendReads ? values.readsTouchpointTypes : [];
  const sendReadsTeacher = sendReads && readsShowsTeacherBlock(readsTouchpointTypes);
  const sendReadsLeader = sendReads && readsShowsLeaderBlock(readsTouchpointTypes);
  const sendReadsDistrict = sendReads && readsShowsDistrictBlock(readsTouchpointTypes);

  const solvesTouchpointTypes = sendSolves ? values.solvesTouchpointTypes : [];
  const sendSolvesHqim = sendSolves && solvesShowsHqim(solvesTouchpointTypes);
  const sendSolvesHsd = sendSolves && solvesShowsHsd(solvesTouchpointTypes);
  const sendSolvesEs = sendSolves && solvesShowsEs(solvesTouchpointTypes);
  const sendSolvesCsd = sendSolves && solvesShowsCsd(solvesTouchpointTypes);
  const sendSolvesDistrictWide =
    sendSolves && solvesShowsDistrictWide(solvesTouchpointTypes);
  const sendSolvesPostVisitSnapshot =
    sendSolves && solvesShowsPostVisitSnapshot(solvesTouchpointTypes);

  return {
    coachName: coach.name,
    coachMondayId: coach.mondayProfileId,
    district: values.district,
    school: values.school,
    subSchool: showSubSchool ? values.subSchool : "",
    nycCoachType: showNycCoachType ? values.nycCoachType : "",
    sessionDate: values.sessionDate,

    // ELA Early Childhood
    ecTouchpoint: sendEC ? values.ecTouchpoint : "",
    ecTeacherStrategies: sendEC ? values.ecTeacherStrategies : [],
    ecLeaderCapacityFocus: sendEC ? values.ecLeaderCapacityFocus : [],

    // NYC Reads
    readsIsPLSession: sendReads ? values.readsIsPLSession : "",
    readsScheduleProvided: sendReads ? values.readsScheduleProvided : "",
    readsHighImpactActivities: sendReads ? values.readsHighImpactActivities : "",
    readsTouchpointTypes,

    readsVisitDuration: sendReadsTeacher ? values.readsVisitDuration : "",
    readsGradeBands: sendReadsTeacher ? values.readsGradeBands : [],
    readsTeacherStrategies: sendReadsTeacher ? values.readsTeacherStrategies : [],
    readsTeacherSchoolLeaderPresence: sendReadsTeacher
      ? values.readsTeacherSchoolLeaderPresence
      : "",
    readsTeacherDistrictLeaderPresence: sendReadsTeacher
      ? values.readsTeacherDistrictLeaderPresence
      : "",
    readsMajorityUsingHQIM: sendReadsTeacher ? values.readsMajorityUsingHQIM : "",
    readsHQIMContext:
      sendReadsTeacher && values.readsMajorityUsingHQIM === "No"
        ? values.readsHQIMContext
        : "",
    readsInterventionsScheduled: sendReadsTeacher
      ? values.readsInterventionsScheduled
      : "",
    readsInterventionsContext:
      sendReadsTeacher && values.readsInterventionsScheduled === "No"
        ? values.readsInterventionsContext
        : "",

    readsLeaderVisitDuration: sendReadsLeader ? values.readsLeaderVisitDuration : "",
    readsLeaderCapacityFocus: sendReadsLeader ? values.readsLeaderCapacityFocus : [],
    readsLeaderFocusSchoolVisitsSubcomponent: sendReadsLeader
      ? values.readsLeaderFocusSchoolVisitsSubcomponent
      : "",
    readsLeaderFocusModelingSubcomponent: sendReadsLeader
      ? values.readsLeaderFocusModelingSubcomponent
      : "",
    readsLeaderFocusPLSubcomponent: sendReadsLeader
      ? values.readsLeaderFocusPLSubcomponent
      : "",
    readsLeaderSustainability: sendReadsLeader ? values.readsLeaderSustainability : [],
    readsLeaderDistrictPresence: sendReadsLeader
      ? values.readsLeaderDistrictPresence
      : "",

    readsDistrictCapacityFocus: sendReadsDistrict
      ? values.readsDistrictCapacityFocus
      : [],
    readsDistrictFocusStrategicPlanningSubcomponent: sendReadsDistrict
      ? values.readsDistrictFocusStrategicPlanningSubcomponent
      : "",
    readsDistrictFocusPLSubcomponent: sendReadsDistrict
      ? values.readsDistrictFocusPLSubcomponent
      : "",
    readsDistrictFocusDataStrategySubcomponent: sendReadsDistrict
      ? values.readsDistrictFocusDataStrategySubcomponent
      : "",
    readsDistrictFocusSchoolVisitsSubcomponent: sendReadsDistrict
      ? values.readsDistrictFocusSchoolVisitsSubcomponent
      : "",
    readsDistrictSustainability: sendReadsDistrict
      ? values.readsDistrictSustainability
      : [],

    readsGuidanceToolsUsed: sendReadsGuidance ? values.readsGuidanceToolsUsed : [],
    readsGuidanceToolsOther: sendReadsGuidance ? values.readsGuidanceToolsOther : "",
    readsNotes: sendReadsGuidance ? values.readsNotes : "",

    // NYC Solves
    solvesIsPLSession: sendSolves ? values.solvesIsPLSession : "",
    solvesTouchpointTypes,

    solvesHqimVisitDuration: sendSolvesHqim ? values.solvesHqimVisitDuration : "",
    solvesHqimGradeContentAreas: sendSolvesHqim
      ? values.solvesHqimGradeContentAreas
      : [],
    solvesHqimLeaderPresent:
      sendSolvesHqim && solvesShowsHqimLeaderPresent(values.solvesHqimGradeContentAreas)
        ? values.solvesHqimLeaderPresent
        : "",
    solvesHqimProtocols: sendSolvesHqim ? values.solvesHqimProtocols : [],

    solvesHsdVisitDuration: sendSolvesHsd ? values.solvesHsdVisitDuration : "",
    solvesHsdGradeContentAreas: sendSolvesHsd ? values.solvesHsdGradeContentAreas : [],
    solvesHsdPrimaryResources: sendSolvesHsd ? values.solvesHsdPrimaryResources : [],
    solvesHsdPrimaryResourcesOther: sendSolvesHsd
      ? values.solvesHsdPrimaryResourcesOther
      : "",
    solvesHsdProtocols: sendSolvesHsd ? values.solvesHsdProtocols : [],
    solvesHsdLeaderPresent: sendSolvesHsd ? values.solvesHsdLeaderPresent : "",

    solvesEsVisitDuration: sendSolvesEs ? values.solvesEsVisitDuration : "",
    solvesEsGradeLevels: sendSolvesEs ? values.solvesEsGradeLevels : [],

    solvesCsdVisitDuration: sendSolvesCsd ? values.solvesCsdVisitDuration : "",
    solvesCsdTrack: sendSolvesCsd ? values.solvesCsdTrack : "",

    solvesDistrictWideVisitDuration: sendSolvesDistrictWide
      ? values.solvesDistrictWideVisitDuration
      : "",
    solvesDistrictWideSupportType: sendSolvesDistrictWide
      ? values.solvesDistrictWideSupportType
      : "",
    solvesDistrictWideDBNs:
      sendSolvesDistrictWide &&
      solvesShowsDistrictWideDBNs(values.solvesDistrictWideSupportType)
        ? values.solvesDistrictWideDBNs.join(", ")
        : "",

    solvesPostVisitSnapshot: sendSolvesPostVisitSnapshot
      ? values.solvesPostVisitSnapshot
      : "",
    solvesPostVisitFollowUp:
      sendSolvesPostVisitSnapshot &&
      solvesShowsPostVisitFollowUp(values.solvesPostVisitSnapshot)
        ? values.solvesPostVisitFollowUp
        : "",

    solvesGuidanceToolsUsed: sendSolvesGuidance ? values.solvesGuidanceToolsUsed : [],
    solvesGuidanceToolsOther: sendSolvesGuidance ? values.solvesGuidanceToolsOther : "",
    solvesNotes: sendSolvesGuidance ? values.solvesNotes : "",

    // Cancellation
    canceled: values.canceled,
    cancelReason: cancelled ? values.cancelReason : "",
    cancelReasonOther: cancelled ? values.cancelReasonOther : "",
    rescheduled: cancelled ? values.rescheduled : "",

    // 1:1 coaching
    did1on1: cancelled ? "" : values.did1on1,
    coacheeRows: sendCoachees ? values.coacheeRows : [],

    // Group coaching
    didGroupCoaching: cancelled ? "" : values.didGroupCoaching,
    groupParticipants: sendGroup ? values.groupParticipants : [],
    groupParticipantRole: sendGroup ? values.groupParticipantRole : [],
    groupTopic: sendGroup ? values.groupTopic : "",
    groupDurationMins: sendGroup ? values.groupDurationMins : "",
  };
}
