export type YesNo = "Yes" | "No";

/**
 * A district with its schools, sourced from the district/school Google Sheet
 * (one column per district; see the coach-log repository). The service layer
 * augments the school list with "All Schools"/"N/A" options before it reaches
 * the form.
 */
export type DistrictWithSchools = {
  district: string;
  schools: string[];
};

/** One row of the sub-school sheet: a (district, school) -> sub-school mapping. */
export type SubSchoolRow = {
  district: string;
  school: string;
  subSchool: string;
};

/**
 * Sub-school options keyed by {@link subSchoolKey}. Loaded once (server-side)
 * and filtered client-side by the selected district + school.
 */
export type SubSchoolMap = Record<string, string[]>;

/**
 * Stable lookup key for sub-schools by district + school. Used by both the
 * service (building the map) and the form (reading it) so they can't drift.
 */
export const subSchoolKey = (district: string, school: string) =>
  `${district.trim().toLowerCase()}|${school.trim().toLowerCase()}`;

/**
 * One selectable session date for the date dropdown. `value` is YYYY-MM-DD (maps
 * straight into the Monday date column); `label` is a human-friendly rendering.
 * Sourced from the coaching PL calendar, scoped to the logged-in coach + the
 * selected district + school.
 */
export type SessionDateOption = {
  value: string;
  label: string;
};

/**
 * A raw calendar row matched to a coach + district: the session date (YYYY-MM-DD)
 * and the free-form `subsite` label. The service resolves `subsite` to a canonical
 * school (see resolveSubsiteSchool in the service) to scope dates by school.
 */
export type SessionDateRow = {
  date: string;
  subsite: string;
};

/**
 * A selectable coach for the testing-only coach override. Sourced from Monday
 * users (legacy form's approach) so it carries the Monday profile id — `name`
 * is matched against the calendar's Coach/Facilitator for session dates and
 * becomes the log's item name; `mondayId` populates the people column.
 */
export type CoachOption = {
  name: string;
  mondayId: string;
};

/**
 * The fields that uniquely identify a coach log for the duplicate check: one log
 * per coach + district + school + date. `coachMondayId` is preferred for the
 * coach match; `coachName` (the item name) is the fallback.
 */
export type CoachLogIdentity = {
  coachMondayId: string;
  coachName: string;
  district: string;
  school: string;
  sessionDate: string;
  /** NYC Coach Type — the same coach can log different types (e.g. Solves vs
   * Reads) for the same school/date, so it's part of the duplicate key. Empty
   * for non-NYC districts (matches other empty-coach-type logs). */
  nycCoachType: string;
};

/** One 1:1 coaching entry. Each row becomes a Monday subitem on submission. */
export type CoacheeRow = {
  coacheeName: string;
  role: string;
  durationMins: string;
};

/**
 * Everything the client sends to the coach-log submit endpoint.
 * This is intentionally a flat, serializable shape (no Date objects / functions).
 */
export type CoachLogSubmission = {
  // Identity (auto-populated from the logged-in mondayProfile)
  coachName: string;
  coachMondayId: string;

  // Location / context
  district: string;
  school: string;
  subSchool: string;
  nycCoachType: string;
  sessionDate: string;

  // ELA Early Childhood coach
  ecTouchpoint: string;
  ecTeacherStrategies: string[];
  ecLeaderCapacityFocus: string[];

  // NYC Reads coach
  readsIsPLSession: YesNo | "";
  readsScheduleProvided: YesNo | "";
  readsHighImpactActivities: YesNo | "";
  readsTouchpoint: string;
  readsIsMultiSchool: YesNo | "";
  readsMultiSchoolDBN: string;
  readsVisitDuration: string;
  readsSupportedTeacherTypes: string[];
  readsGradeBands: string[];
  readsTeacherStrategies: string[];
  readsMTSSFocus: YesNo | "";
  readsMajorityUsingHQIM: YesNo | "";
  readsHQIMContext: string;
  readsSupportedLeaders: string[];
  readsSupportedLeadersOther: string;
  readsLeaderVisitDuration: string;
  readsLeaderCapacityFocus: string[];
  readsSupportedDistrictLeaders: string[];
  readsSupportedDistrictLeadersOther: string;
  readsDistrictSupports: string[];
  mtssPracticesResponses: string[];
  mtssAdditionalContext: string;

  // NYC Solves coach
  solvesTouchpoint: string;
  solvesTeacherVisitDuration: string;
  solvesSupportedTeacherTypes: string[];
  solvesGradeContentAreas: string[];
  solvesTeacherProtocols: string[];
  solvesIntervisitationDBNs: string;
  solvesMajorityUsingHQIM: YesNo | "";
  solvesHQIMContext: string;
  solvesLeaderSupportDuration: string;
  solvesLeaderSupportTrack: string;
  solvesAdditionalSupportDuration: string;
  solvesAdditionalSupportType: string;

  // Cancellation
  canceled: YesNo | "";
  cancelReason: string;
  cancelReasonOther: string;
  rescheduled: YesNo | "";

  // 1:1 coaching
  did1on1: YesNo | "";
  coacheeRows: CoacheeRow[];

  // Group coaching
  didGroupCoaching: YesNo | "";
  groupParticipants: string[];
  groupParticipantRole: string;
  groupTopic: string;
  groupDurationMins: string;
};
