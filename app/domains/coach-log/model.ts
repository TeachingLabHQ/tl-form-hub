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
