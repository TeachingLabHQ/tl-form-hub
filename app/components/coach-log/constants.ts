// ---------------------------------------------------------------------------
// Coach Log form — shared option lists and conditional-display configuration.
// ---------------------------------------------------------------------------

/** Roles list, shared by 1:1 coaching and group coaching. */
export const ROLE_OPTIONS = [
  "Teacher",
  "School-based coach",
  "School-based leader",
  "District/Network leader",
  "CPS only - Teacher Team Lead",
];

/** Duration (mins): 15–90 in 5-min steps, then 120/140/160/180. */
export const DURATION_OPTIONS: string[] = (() => {
  const values: number[] = [];
  for (let m = 15; m <= 90; m += 5) values.push(m);
  values.push(120, 140, 160, 180);
  return values.map(String);
})();

export const NYC_COACH_TYPE_OPTIONS = [
  "Reads Coach",
  "ELA Coach (non-Reads)",
  "ELA Early Childhood Coach",
  "Solves Coach/D75 Math Coach",
  "Math Coach (non-Solves/non-D75)",
];

// Testing-only: emails allowed to override the coach identity (pick any coach
// from a dropdown) so they can verify session dates populate for everyone. For
// all other users the coach is the logged-in profile and no dropdown shows.
export const COACH_OVERRIDE_TESTER_EMAILS = ["yancheng.pan@teachinglab.org"];

export const canOverrideCoach = (email: string | undefined | null) =>
  !!email &&
  COACH_OVERRIDE_TESTER_EMAILS.includes(email.trim().toLowerCase());

/** Coach types that reveal additional question sets (ported NYC Reads/Solves). */
export const READS_COACH_TYPE = "Reads Coach";
export const SOLVES_COACH_TYPE = "Solves Coach/D75 Math Coach";
export const ELA_EARLY_CHILDHOOD_COACH_TYPE = "ELA Early Childhood Coach";

// ---------------------------------------------------------------------------
// ELA Early Childhood Coach — touchpoint + capacity-building question set.
// ---------------------------------------------------------------------------

export const EC_TOUCHPOINT_OPTIONS = [
  "Teacher AND leader support",
  "Teacher support ONLY",
  "School Leader/Leadership Team support ONLY",
];

/** Strategies used to build capacity with teacher teams (select up to 5). */
export const TEACHER_STRATEGY_OPTIONS = [
  "Unit/module internalization",
  "Lesson internalization",
  "Deepening understanding of content/standards/instructional shifts",
  "Lesson rehearsal",
  "Professional learning sessions",
  "Modeling",
  "Side-by-side coaching",
  "Classroom visits",
  "Unit reflection",
  "Book Club",
  "Student Work Analysis Meetings",
  "Data meetings",
];
export const MAX_TEACHER_STRATEGIES = 5;

/** Primary focus of the capacity building provided to school leaders. */
export const LEADER_CAPACITY_FOCUS_OPTIONS = [
  "Strategic planning",
  "Regular communication check-in",
  "Classroom learning visits",
  "Modeling/gradual release of MTSS data team meetings",
  "Knowledge-building professional learning",
  "Intervisitation (Pilot MTSS Middle Schools Only)",
];

/** Touchpoints that include teacher-team support (-> teacher strategies). */
const EC_TEACHER_TOUCHPOINTS = new Set([
  "Teacher AND leader support",
  "Teacher support ONLY",
]);
/** Touchpoints that include leader support (-> leader capacity focus). */
const EC_LEADER_TOUCHPOINTS = new Set([
  "Teacher AND leader support",
  "School Leader/Leadership Team support ONLY",
]);

export const ecShowsTeacherStrategies = (touchpoint: string): boolean =>
  EC_TEACHER_TOUCHPOINTS.has(touchpoint);
export const ecShowsLeaderCapacity = (touchpoint: string): boolean =>
  EC_LEADER_TOUCHPOINTS.has(touchpoint);

export const CANCELLATION_REASON_OPTIONS = [
  "Partner Canceled",
  "School Canceled",
  "Coachee Canceled",
  "Group Unavailable",
  "TL Coach Canceled",
  "Canceled Other",
];
export const CANCELED_OTHER_REASON = "Canceled Other";

export const YES_NO_OPTIONS = ["Yes", "No"];

// ---------------------------------------------------------------------------
// PENDING CONFIRMATION — district label rules (board 18415001327).
//
// The user will confirm the exact district label format. Until then we derive a
// numeric "district key" from the label so gating works for common formats
// ("NY_D9", "NYC District 9", "D75", ...). Update the lists/predicates below
// once the real labels are known.
// ---------------------------------------------------------------------------

/** Show the NYC Coach Type question only for these district keys. */
export const NYC_COACH_TYPE_DISTRICT_KEYS = ["9", "11", "12", "13", "16", "25", "75"];

/** NYC districts without a numeric key that also reveal the coach-type question. */
export const NYC_COACH_TYPE_DISTRICT_LABELS = [
  "NY_Transfer High Schools",
  "NY_CUNY/UA",
];

/** District key that (with a Solves coach) reveals the Sub-school question. */
export const D75_DISTRICT_KEY = "75";

/** Extract the numeric district key from a label, e.g. "NY_D9" -> "9". */
export function districtKey(district: string): string {
  const match = String(district ?? "").match(/(\d+)/);
  return match?.[1] ?? "";
}

export function isNycCoachTypeDistrict(district: string): boolean {
  return (
    NYC_COACH_TYPE_DISTRICT_KEYS.includes(districtKey(district)) ||
    NYC_COACH_TYPE_DISTRICT_LABELS.includes(String(district ?? "").trim())
  );
}

export function isD75District(district: string): boolean {
  return districtKey(district) === D75_DISTRICT_KEY;
}

/** Sub-school is shown only for D75 + Solves coach. Source board still TBD. */
export function shouldShowSubSchool(
  district: string,
  nycCoachType: string
): boolean {
  return isD75District(district) && nycCoachType === SOLVES_COACH_TYPE;
}

/** ELA Early Childhood question set shows for an EC coach in an NYC district. */
export function shouldShowEarlyChildhood(
  district: string,
  nycCoachType: string
): boolean {
  return (
    isNycCoachTypeDistrict(district) &&
    nycCoachType === ELA_EARLY_CHILDHOOD_COACH_TYPE
  );
}

/** NYC Reads question set shows for a Reads coach in an NYC district. */
export function shouldShowReads(
  district: string,
  nycCoachType: string
): boolean {
  return isNycCoachTypeDistrict(district) && nycCoachType === READS_COACH_TYPE;
}

/** NYC Solves question set shows for a Solves coach in an NYC district. */
export function shouldShowSolves(
  district: string,
  nycCoachType: string
): boolean {
  return isNycCoachTypeDistrict(district) && nycCoachType === SOLVES_COACH_TYPE;
}
