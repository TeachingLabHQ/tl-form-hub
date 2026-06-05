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

/** Coach types that reveal additional question sets (ported NYC Reads/Solves). */
export const READS_COACH_TYPE = "Reads Coach";
export const SOLVES_COACH_TYPE = "Solves Coach/D75 Math Coach";

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

/** District key that (with a Solves coach) reveals the Sub-school question. */
export const D75_DISTRICT_KEY = "75";

/** Extract the numeric district key from a label, e.g. "NY_D9" -> "9". */
export function districtKey(district: string): string {
  const match = String(district ?? "").match(/(\d+)/);
  return match?.[1] ?? "";
}

export function isNycCoachTypeDistrict(district: string): boolean {
  return NYC_COACH_TYPE_DISTRICT_KEYS.includes(districtKey(district));
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
