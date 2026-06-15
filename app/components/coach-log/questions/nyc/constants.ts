// ---------------------------------------------------------------------------
// NYC Reads & NYC Solves — option lists and conditional-display predicates.
//
// These two coach-type question sets are large and branch heavily on a
// "touchpoint type" selection, so their options and show/hide rules live here,
// away from the shared coach-log constants. The teacher-strategy and
// leader-capacity-focus lists are shared with the ELA Early Childhood set and
// are re-exported from the parent constants module.
// ---------------------------------------------------------------------------

import { districtKey } from "../../constants";

export {
  LEADER_CAPACITY_FOCUS_OPTIONS,
  MAX_TEACHER_STRATEGIES,
  TEACHER_STRATEGY_OPTIONS,
} from "../../constants";

/** Shown when an "Other" leader/district-leader option needs a write-in. */
export const OTHER_LEADER_OPTION = "Other";

// --- Shared between Reads and Solves teacher blocks ------------------------

export const SUPPORTED_TEACHER_TYPE_OPTIONS = [
  "Special Education Teachers",
  "Paraprofessional Teachers",
  "English as New Language or English Language Learner Teachers",
  "Bilingual/Dual Language Teachers",
  "None of the above",
];

// ===========================================================================
// NYC READS
// ===========================================================================

export const READS_TOUCHPOINT_OPTIONS = [
  "Teacher AND leader support",
  "Teacher support ONLY",
  "School Leader/Leadership Team support ONLY",
  "District support",
  "No touchpoint",
];

export const READS_VISIT_DURATION_OPTIONS = ["3", "6"];
/** Changed for FY27: leader-visit duration is now 1–4 (was 1–6). */
export const READS_LEADER_VISIT_DURATION_OPTIONS = ["1", "2", "3", "4"];

export const READS_GRADE_BAND_OPTIONS = ["K-2", "Grades 3-5", "Grades 6-8"];

export const SUPPORTED_LEADER_OPTIONS = [
  "Principal",
  "Assistant principal",
  "School-based coach",
  "District-based staff",
  "Other",
];

export const SUPPORTED_DISTRICT_LEADER_OPTIONS = [
  "Superintendent",
  "Deputy Superintendent",
  "AIS Coordinator",
  "EDSSO",
  "Implementation Specialist",
  "Literacy Instructional Specialist",
  "MLL Specialist",
  "Other",
];

export const DISTRICT_SUPPORT_OPTIONS = [
  "Strategic planning",
  "Regular communication check-in",
  "Professional learning",
  "Data strategy",
  "School-based learning visits",
];

const READS_TEACHER_TOUCHPOINTS = new Set([
  "Teacher AND leader support",
  "Teacher support ONLY",
]);
const READS_LEADER_TOUCHPOINTS = new Set([
  "Teacher AND leader support",
  "School Leader/Leadership Team support ONLY",
]);

export const readsShowsTeacherBlock = (touchpoint: string): boolean =>
  READS_TEACHER_TOUCHPOINTS.has(touchpoint);
export const readsShowsLeaderBlock = (touchpoint: string): boolean =>
  READS_LEADER_TOUCHPOINTS.has(touchpoint);
export const readsShowsDistrictBlock = (touchpoint: string): boolean =>
  touchpoint === "District support";

/** Capacity-builder questions only show for districts D9 and D75. */
export const isReadsCapacityBuilderDistrict = (district: string): boolean =>
  districtKey(district) === "9" || districtKey(district) === "75";

// --- MTSS Pilot Schools ----------------------------------------------------

export const MTSS_PRACTICE_STATEMENTS = [
  "The school establishes and protects a consistent, designated time (e.g., SRP, WIN) at least four days per week for literacy intervention and enrichment, without replacing core instruction.",
  "The school has identified and prepared staff members to provide interventions, ensuring they are supported through professional learning and ongoing coaching.",
  "The school has and executes a professional learning plan, targeted to staff implementing interventions, to ensure effective delivery and monitoring.",
  "The school has identified and leverages an existing team, inclusive of staff with expertise in SWDs and MLLs, where MTSS responsibilities are embedded.",
  "The school uses centrally-supported and/or DOE-approved intervention programs, aligned to evidence-based practices.",
  "The school administers Beginning of Year (BOY), Middle of Year (MOY), and End of Year (EOY) universal screeners to all eligible students.",
  "The school uses centrally-supported and/or DOE-approved diagnostic assessments to validate the need for intervention.",
];

export const MTSS_RESPONSE_OPTIONS = [
  "Always",
  "Mostly",
  "Sometimes",
  "Not Yet",
];

/** Pilot school codes (matched against the hub's 3-digit school value), per
 * district key. MTSS pilot questions only show for these district + school
 * combinations. */
const MTSS_PILOT_SCHOOLS: Record<string, string[]> = {
  "9": ["022", "215", "303", "323", "361"],
  "11": ["089", "108", "144", "355", "529", "175"],
  "12": ["129", "214", "286", "318", "341"],
  "13": ["266", "301", "113", "313", "351"],
};

/** MTSS pilot is gated on teacher/leader (not district) touchpoints. */
const READS_MTSS_TOUCHPOINTS = new Set([
  "Teacher AND leader support",
  "Teacher support ONLY",
  "School Leader/Leadership Team support ONLY",
]);

export const isMtssPilotSchool = (
  district: string,
  school: string
): boolean =>
  (MTSS_PILOT_SCHOOLS[districtKey(district)] ?? []).includes(school.trim());

export const readsShowsMtssPilot = (
  touchpoint: string,
  district: string,
  school: string
): boolean =>
  READS_MTSS_TOUCHPOINTS.has(touchpoint) && isMtssPilotSchool(district, school);

// ===========================================================================
// NYC SOLVES
// ===========================================================================

export const SOLVES_TOUCHPOINT_OPTIONS = [
  "Teacher AND leader support",
  "Teacher support ONLY",
  "Leader support ONLY",
  "Additional support to facilitate protocols",
  "No touchpoint",
];

export const SOLVES_TEACHER_VISIT_DURATION_OPTIONS = ["3", "4", "5", "6"];
export const SOLVES_LEADER_SUPPORT_DURATION_OPTIONS = ["1", "2", "3", "4", "5", "6"];
export const SOLVES_ADDITIONAL_SUPPORT_DURATION_OPTIONS = ["1", "2", "3", "4", "5", "6"];

export const SOLVES_GRADE_CONTENT_OPTIONS = [
  "Middle School Math: Grades 6-8",
  "Algebra I",
  "Geometry",
  "Algebra II",
];

export const SOLVES_PROTOCOL_OPTIONS = [
  "Unit Internalization Protocol",
  "Lesson Internalization Protocol",
  "Do the Math Protocol",
  "Role Play Protocol",
  "Professional Book Club Protocol",
  "Intervisitation Protocol",
  "Modeling",
  "Side-by-side coaching",
  "Classroom visits",
  "Unit Reflection Protocol",
  "Student work analysis meetings",
  "Data meetings",
];
export const MAX_SOLVES_PROTOCOLS = 3;
export const SOLVES_INTERVISITATION_PROTOCOL = "Intervisitation Protocol";

export const SOLVES_LEADER_SUPPORT_TRACK_OPTIONS = [
  "Facilitated intervisitation",
  "Unpacking teacher practice",
  "Classroom observation & feedback practice",
];

export const SOLVES_ADDITIONAL_SUPPORT_TYPE_OPTIONS = [
  "AP Community of Practice",
  "Principal Professional Development",
  "Teacher Collaborative Planning sessions",
];

const SOLVES_TEACHER_TOUCHPOINTS = new Set([
  "Teacher AND leader support",
  "Teacher support ONLY",
]);
const SOLVES_LEADER_TOUCHPOINTS = new Set([
  "Teacher AND leader support",
  "Leader support ONLY",
]);

export const solvesShowsTeacherBlock = (touchpoint: string): boolean =>
  SOLVES_TEACHER_TOUCHPOINTS.has(touchpoint);
export const solvesShowsLeaderBlock = (touchpoint: string): boolean =>
  SOLVES_LEADER_TOUCHPOINTS.has(touchpoint);
export const solvesShowsAdditionalSupport = (touchpoint: string): boolean =>
  touchpoint === "Additional support to facilitate protocols";

/** Shared JES Manual glossary link (Solves protocols + leader capacity focus). */
export const JES_GLOSSARY_URL =
  "https://docs.google.com/document/d/1WiGwohRHYmXeJztoUI0cplQ3g5inr8LjjyDChNQrDpY/edit?tab=t.0#heading=h.cslg194210x2";
