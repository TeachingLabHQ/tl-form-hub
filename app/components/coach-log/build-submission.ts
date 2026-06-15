import type { CoachLogSubmission } from "~/domains/coach-log/model";
import {
  isNycCoachTypeDistrict,
  shouldShowEarlyChildhood,
  shouldShowReads,
  shouldShowSolves,
  shouldShowSubSchool,
} from "./constants";
import type { CoachLogValues } from "./use-coach-log-form";

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
  const showSubSchool = shouldShowSubSchool(values.district, values.nycCoachType);
  const sendEC =
    !cancelled && shouldShowEarlyChildhood(values.district, values.nycCoachType);
  const sendReads =
    !cancelled && shouldShowReads(values.district, values.nycCoachType);
  const sendSolves =
    !cancelled && shouldShowSolves(values.district, values.nycCoachType);
  const sendCoachees = !cancelled && values.did1on1 === "Yes";
  const sendGroup = !cancelled && values.didGroupCoaching === "Yes";

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
    readsTouchpoint: sendReads ? values.readsTouchpoint : "",
    readsIsMultiSchool: sendReads ? values.readsIsMultiSchool : "",
    readsMultiSchoolDBN: sendReads ? values.readsMultiSchoolDBN : "",
    readsVisitDuration: sendReads ? values.readsVisitDuration : "",
    readsSupportedTeacherTypes: sendReads ? values.readsSupportedTeacherTypes : [],
    readsGradeBands: sendReads ? values.readsGradeBands : [],
    readsTeacherStrategies: sendReads ? values.readsTeacherStrategies : [],
    readsMTSSFocus: sendReads ? values.readsMTSSFocus : "",
    readsMajorityUsingHQIM: sendReads ? values.readsMajorityUsingHQIM : "",
    readsHQIMContext: sendReads ? values.readsHQIMContext : "",
    readsSupportedLeaders: sendReads ? values.readsSupportedLeaders : [],
    readsSupportedLeadersOther: sendReads ? values.readsSupportedLeadersOther : "",
    readsLeaderVisitDuration: sendReads ? values.readsLeaderVisitDuration : "",
    readsLeaderCapacityFocus: sendReads ? values.readsLeaderCapacityFocus : [],
    readsSupportedDistrictLeaders: sendReads
      ? values.readsSupportedDistrictLeaders
      : [],
    readsSupportedDistrictLeadersOther: sendReads
      ? values.readsSupportedDistrictLeadersOther
      : "",
    readsDistrictSupports: sendReads ? values.readsDistrictSupports : [],
    mtssPracticesResponses: sendReads ? values.mtssPracticesResponses : [],
    mtssAdditionalContext: sendReads ? values.mtssAdditionalContext : "",

    // NYC Solves
    solvesTouchpoint: sendSolves ? values.solvesTouchpoint : "",
    solvesTeacherVisitDuration: sendSolves ? values.solvesTeacherVisitDuration : "",
    solvesSupportedTeacherTypes: sendSolves
      ? values.solvesSupportedTeacherTypes
      : [],
    solvesGradeContentAreas: sendSolves ? values.solvesGradeContentAreas : [],
    solvesTeacherProtocols: sendSolves ? values.solvesTeacherProtocols : [],
    solvesIntervisitationDBNs: sendSolves ? values.solvesIntervisitationDBNs : "",
    solvesMajorityUsingHQIM: sendSolves ? values.solvesMajorityUsingHQIM : "",
    solvesHQIMContext: sendSolves ? values.solvesHQIMContext : "",
    solvesLeaderSupportDuration: sendSolves
      ? values.solvesLeaderSupportDuration
      : "",
    solvesLeaderSupportTrack: sendSolves ? values.solvesLeaderSupportTrack : "",
    solvesAdditionalSupportDuration: sendSolves
      ? values.solvesAdditionalSupportDuration
      : "",
    solvesAdditionalSupportType: sendSolves
      ? values.solvesAdditionalSupportType
      : "",

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
    groupParticipantRole: sendGroup ? values.groupParticipantRole : "",
    groupTopic: sendGroup ? values.groupTopic : "",
    groupDurationMins: sendGroup ? values.groupDurationMins : "",
  };
}
