// ---------------------------------------------------------------------------
// NYC Reads & NYC Solves — option lists and conditional-display predicates.
//
// These two coach-type question sets are large and branch heavily on a
// multi-select "touchpoint type" question, so their options and show/hide
// rules live here, away from the shared coach-log constants.
// ---------------------------------------------------------------------------

import { districtKey } from "../../constants";

/** Shared 4-point frequency scale ("how often was X present and engaged?"). */
export const FREQUENCY_OPTIONS = [
  "All of the time",
  "Most of the time",
  "Some of the time",
  "None of the time",
];

/** Shown when an "Other" write-in option needs a follow-up text field. */
export const OTHER_OPTION = "Other";

/** JES Manual glossary, referenced by several capacity-building questions. */
export const JES_GLOSSARY_URL =
  "https://docs.google.com/document/d/1WiGwohRHYmXeJztoUI0cplQ3g5inr8LjjyDChNQrDpY/edit?tab=t.0#heading=h.cslg194210x2";

/**
 * Multi-select helper for the guidance/tools questions: their "N/A" option is
 * mutually exclusive with every other option — picking N/A clears the rest,
 * and picking anything else clears N/A.
 */
export function applyNAExclusivity(
  next: string[],
  previous: string[],
  naOption: string
): string[] {
  const naJustAdded = next.includes(naOption) && !previous.includes(naOption);
  if (naJustAdded) return [naOption];
  if (next.includes(naOption) && next.length > 1) {
    return next.filter((v) => v !== naOption);
  }
  return next;
}

// ===========================================================================
// NYC READS
// ===========================================================================

/** Capacity-builder question only shows for districts D9 and D75. */
export const isReadsCapacityBuilderDistrict = (district: string): boolean =>
  districtKey(district) === "9" || districtKey(district) === "75";

export const READS_TOUCHPOINT_TEACHER = "Teacher team support";
export const READS_TOUCHPOINT_LEADER =
  "School Leader/Leadership team support (ex. Principal, Asst. Principal, school based coach)";
export const READS_TOUCHPOINT_DISTRICT =
  "District team support (ex. Superintendent, Deputy Supt., district based coach)";

export const READS_TOUCHPOINT_TYPE_OPTIONS = [
  READS_TOUCHPOINT_TEACHER,
  READS_TOUCHPOINT_LEADER,
  READS_TOUCHPOINT_DISTRICT,
];

export const readsShowsTeacherBlock = (types: string[]): boolean =>
  types.includes(READS_TOUCHPOINT_TEACHER);
export const readsShowsLeaderBlock = (types: string[]): boolean =>
  types.includes(READS_TOUCHPOINT_LEADER);
export const readsShowsDistrictBlock = (types: string[]): boolean =>
  types.includes(READS_TOUCHPOINT_DISTRICT);

// --- Teacher team support ---------------------------------------------------

export const READS_VISIT_DURATION_OPTIONS = ["3", "6"];

export const READS_GRADE_BAND_OPTIONS = [
  "Grades K-2",
  "Grades 3-5",
  "Grades 6-8",
  "Grades 9-12",
];

export const READS_TEACHER_STRATEGY_OPTIONS = [
  "Unit/module internalization (Tier 1 curriculum)",
  "Unit/module internalization (intervention curriculum)",
  "Lesson internalization (Tier 1 curriculum)",
  "Lesson internalization (intervention curriculum)",
  "Lesson rehearsal (Tier 1 curriculum)",
  "Lesson rehearsal (intervention curriculum)",
  "Modeling (Tier 1 curriculum)",
  "Modeling (intervention curriculum)",
  "Side-by-side coaching (Tier 1 curriculum)",
  "Side-by-side coaching (intervention curriculum)",
  "Student work analysis meetings (Tier 1 curriculum)",
  "Student work analysis meetings (intervention curriculum)",
  "Professional learning sessions",
  "MTSS data team meetings",
];
export const MAX_READS_TEACHER_STRATEGIES = 3;

// --- School Leader/Leadership team support ----------------------------------

/** Changed for FY27: leader-visit duration is 1–4 (was 1–6). */
export const READS_LEADER_VISIT_DURATION_OPTIONS = ["1", "2", "3", "4"];

export const READS_LEADER_FOCUS_SCHOOL_VISITS =
  "School-based learning visits and classroom visits";
export const READS_LEADER_FOCUS_MODELING =
  "Modeling and gradual release of MTSS data team meetings";
export const READS_LEADER_FOCUS_PL = "Professional learning";
export const READS_LEADER_FOCUS_INTERVISITATION =
  "Intervisitation (Pilot MTSS Middle Schools Only)";
export const READS_LEADER_FOCUS_LITERACY_INFRASTRUCTURE =
  "Supporting the establishment of a strong literacy infrastructure";

export const READS_LEADER_CAPACITY_FOCUS_OPTIONS = [
  READS_LEADER_FOCUS_SCHOOL_VISITS,
  READS_LEADER_FOCUS_MODELING,
  READS_LEADER_FOCUS_PL,
  READS_LEADER_FOCUS_INTERVISITATION,
  READS_LEADER_FOCUS_LITERACY_INFRASTRUCTURE,
];
export const MAX_READS_LEADER_CAPACITY_FOCUS = 2;

export const READS_LEADER_SCHOOL_VISITS_SUBCOMPONENT_OPTIONS = [
  "Deepening understanding of the citywide instructional shifts, priorities, and/or guidance.",
  "Norming on trends across classrooms in order to plan for professional learning and/or other support needs, while also monitoring implementation to ensure goals are met.",
  "Developing high-quality feedback",
];

export const READS_LEADER_MODELING_SUBCOMPONENT_OPTIONS = [
  "Supporting meaningful analysis of the most relevant data to make decisions about data-informed action steps",
  "Supporting with preparing for, modeling, and/or co-facilitating the actual meeting",
];

export const READS_LEADER_PL_SUBCOMPONENT_OPTIONS = [
  "Providing PL to school leadership teams to support building content-specific or structural knowledge in service of the priorities of NYC Reads.",
  "Co-facilitating professional learning for school-level staff.",
  "Planning and building capacity for the school leadership team to facilitate meetings based on jointly identified professional learning needs.",
];

/** Shared between the leader and district support blocks. */
export const READS_SUSTAINABILITY_OPTIONS = [
  "Coherence, alignment, and integrity of HQIM",
  "Professional learning and adult learning structures",
  "Data-driven instruction, assessment, and continuous improvement systems",
  "Instructional leadership across the vertical spine",
  "Stakeholder engagement and community partnership",
];
export const MAX_READS_SUSTAINABILITY = 2;

// --- District team support ---------------------------------------------------

export const READS_DISTRICT_FOCUS_STRATEGIC_PLANNING = "Strategic planning";
export const READS_DISTRICT_FOCUS_PL = "Professional learning";
export const READS_DISTRICT_FOCUS_DATA_STRATEGY = "Data strategy meetings";
export const READS_DISTRICT_FOCUS_SCHOOL_VISITS =
  "School-based learning visits and classroom visits";
export const READS_DISTRICT_FOCUS_LITERACY_INFRASTRUCTURE =
  "Supporting the establishment of a strong literacy infrastructure";

export const READS_DISTRICT_CAPACITY_FOCUS_OPTIONS = [
  READS_DISTRICT_FOCUS_STRATEGIC_PLANNING,
  READS_DISTRICT_FOCUS_PL,
  READS_DISTRICT_FOCUS_DATA_STRATEGY,
  READS_DISTRICT_FOCUS_SCHOOL_VISITS,
  READS_DISTRICT_FOCUS_LITERACY_INFRASTRUCTURE,
];
export const MAX_READS_DISTRICT_CAPACITY_FOCUS = 2;

export const READS_DISTRICT_STRATEGIC_PLANNING_SUBCOMPONENT_OPTIONS = [
  "Collaboratively monitoring and analyzing data in real time to inform adjustments to the Strategic Support Plan as needed.",
  "Developing communication plans and materials that are aligned to the citywide/district instructional focus.",
  "Planning for/co-designing/reflecting on district-wide professional learning plans",
];

export const READS_DISTRICT_PL_SUBCOMPONENT_OPTIONS = [
  "Providing professional learning to district teams to support building content-specific or structural knowledge in service of the priorities of NYC Reads and/or Solves",
  "Planning for or co-facilitating district-wide or multi-school professional learning for school leaders, teacher leaders, coaches, or teachers",
  "Building capacity for the district team to facilitate meetings based on jointly identified professional learning needs",
];

export const READS_DISTRICT_DATA_STRATEGY_SUBCOMPONENT_OPTIONS = [
  "Supporting meaningful analysis of the most relevant data to make decisions about data-informed action steps",
  "Supporting with preparing for, modeling, and/or co-facilitating the actual meeting",
];

export const READS_DISTRICT_SCHOOL_VISITS_SUBCOMPONENT_OPTIONS = [
  "Deepening understanding of the citywide instructional shifts, priorities, and/or guidance.",
  "Norming on trends across the district in order to plan for professional learning and/or other support needs, while also monitoring implementation to ensure goals are met.",
];

// --- Guidance/tools used (shown once per Reads submission) -----------------

export const READS_GUIDANCE_NA_OPTION =
  "N/A- Did not use any NYC Reads guidance/tools/protocols";

export const READS_GUIDANCE_TOOLS_OPTIONS = [
  "Unit Internalization Protocol",
  "Curriculum-Specific Lesson Internalization Protocols",
  "Explicit Instruction Guidance",
  "Small Group Instruction Guidance",
  OTHER_OPTION,
  READS_GUIDANCE_NA_OPTION,
];

// ===========================================================================
// NYC SOLVES
// ===========================================================================

export const SOLVES_TOUCHPOINT_INITIAL_PLANNING = "Initial Planning Conversation";
export const SOLVES_TOUCHPOINT_HQIM = "HQIM-Based Teacher Collaboration";
export const SOLVES_TOUCHPOINT_HSD =
  "HSD Only: Supplemental Time Teacher Collaboration";
export const SOLVES_TOUCHPOINT_ES = "ES: Do the Math Work Shops";
export const SOLVES_TOUCHPOINT_CSD = "CSD: Leader Support (at one school)";
export const SOLVES_TOUCHPOINT_DISTRICT_WIDE = "District Wide Learning Support";

export const SOLVES_TOUCHPOINT_TYPE_OPTIONS = [
  SOLVES_TOUCHPOINT_INITIAL_PLANNING,
  SOLVES_TOUCHPOINT_HQIM,
  SOLVES_TOUCHPOINT_HSD,
  SOLVES_TOUCHPOINT_ES,
  SOLVES_TOUCHPOINT_CSD,
  SOLVES_TOUCHPOINT_DISTRICT_WIDE,
];

export const solvesShowsHqim = (types: string[]): boolean =>
  types.includes(SOLVES_TOUCHPOINT_HQIM);
export const solvesShowsHsd = (types: string[]): boolean =>
  types.includes(SOLVES_TOUCHPOINT_HSD);
export const solvesShowsEs = (types: string[]): boolean =>
  types.includes(SOLVES_TOUCHPOINT_ES);
export const solvesShowsCsd = (types: string[]): boolean =>
  types.includes(SOLVES_TOUCHPOINT_CSD);
export const solvesShowsDistrictWide = (types: string[]): boolean =>
  types.includes(SOLVES_TOUCHPOINT_DISTRICT_WIDE);

/** Post Visit Snapshot shows once per submission if any of these three apply. */
export const solvesShowsPostVisitSnapshot = (types: string[]): boolean =>
  solvesShowsHqim(types) || solvesShowsHsd(types) || solvesShowsCsd(types);

export const SOLVES_HOURS_DURATION_OPTIONS = ["1", "2", "3", "4", "5", "6"];

/** Shared between the HQIM and HSD teacher-support blocks. */
export const SOLVES_PROTOCOL_OPTIONS = [
  "Data Protocol",
  "Do the Math Protocol",
  "Intervisitation Protocol",
  "Lesson Internalization Protocol",
  "Unit Internalization Protocol",
  "Unit Reflection Protocol",
  "Role Play Protocol",
  "Classroom visits",
  "Modeling",
  "Professional Book Club",
  "Side-by-side coaching",
];
export const MAX_SOLVES_PROTOCOLS = 3;

// --- HQIM-Based Teacher Collaboration ---------------------------------------

export const SOLVES_HQIM_GRADE_CONTENT_OPTIONS = [
  "Kindergarten",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Algebra I",
  "Geometry",
  "Algebra II",
];

const SOLVES_LEADER_PRESENT_GATE_GRADES = new Set([
  "Algebra I",
  "Geometry",
  "Algebra II",
]);

/** "Were school leader(s) present..." only shows when a HS math course was selected. */
export const solvesShowsHqimLeaderPresent = (gradeContentAreas: string[]): boolean =>
  gradeContentAreas.some((g) => SOLVES_LEADER_PRESENT_GATE_GRADES.has(g));

// --- HSD Only: Supplemental Time Teacher Collaboration ----------------------

export const SOLVES_HSD_GRADE_CONTENT_OPTIONS = ["Algebra I", "Geometry", "Algebra II"];

export const SOLVES_HSD_PRIMARY_RESOURCE_OPTIONS = [
  "Core instructional materials only (Illustrative Math, IReady, Amplify)",
  "Unit access guides with core instructional materials",
  "Imagine Math",
  "Math 180",
  "Transition to Algebra",
  OTHER_OPTION,
];

// --- ES: Do the Math Work Shops ---------------------------------------------

export const SOLVES_ES_GRADE_LEVEL_OPTIONS = [
  "Kindergarten",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
];

// --- CSD: Leader Support (at one school) ------------------------------------

export const SOLVES_CSD_TRACK_OPTIONS = [
  "Unpacking teacher practice",
  "Classroom observation & feedback practice",
];

// --- District Wide Learning Support ------------------------------------------

export const SOLVES_DISTRICT_WIDE_ADMIN_COLLABORATIVE_COACHING =
  "Admin Collaborative Coaching";
export const SOLVES_DISTRICT_WIDE_TEACHER_COLLABORATIVE_PLANNING =
  "Teacher Collaborative Planning Sessions";
export const SOLVES_DISTRICT_WIDE_FACILITATED_INTERVISITATION =
  "Facilitated Intervisitation";

export const SOLVES_DISTRICT_WIDE_SUPPORT_OPTIONS = [
  SOLVES_DISTRICT_WIDE_ADMIN_COLLABORATIVE_COACHING,
  SOLVES_DISTRICT_WIDE_TEACHER_COLLABORATIVE_PLANNING,
  SOLVES_DISTRICT_WIDE_FACILITATED_INTERVISITATION,
];

/** DBN write-in shows for the two intervisitation-flavored support types. */
export const solvesShowsDistrictWideDBNs = (supportType: string): boolean =>
  supportType === SOLVES_DISTRICT_WIDE_ADMIN_COLLABORATIVE_COACHING ||
  supportType === SOLVES_DISTRICT_WIDE_FACILITATED_INTERVISITATION;

// --- Post Visit Snapshot (shown once, if HQIM/HSD/CSD selected) ------------

export const SOLVES_POST_VISIT_SNAPSHOT_HQIM_NOT_USED = "HQIM not used this visit";
export const SOLVES_POST_VISIT_SNAPSHOT_IMMEDIATE_ATTENTION =
  "Immediate Attention Needed";

export const SOLVES_POST_VISIT_SNAPSHOT_OPTIONS = [
  "School to Learn From",
  "Median School",
  "School Experiencing Challenges",
  SOLVES_POST_VISIT_SNAPSHOT_HQIM_NOT_USED,
  SOLVES_POST_VISIT_SNAPSHOT_IMMEDIATE_ATTENTION,
];

export const solvesShowsPostVisitFollowUp = (snapshot: string): boolean =>
  snapshot === SOLVES_POST_VISIT_SNAPSHOT_HQIM_NOT_USED ||
  snapshot === SOLVES_POST_VISIT_SNAPSHOT_IMMEDIATE_ATTENTION;

// --- Guidance/tools used (shown once per Solves submission) ----------------

export const SOLVES_GUIDANCE_NA_OPTION =
  "N/A- Did not use any NYC Solves guidance/tools/protocols";

export const SOLVES_GUIDANCE_TOOLS_OPTIONS = [
  "Beyond Core",
  "Additional Time",
  "MTSS Quick Guide",
  "MLR",
  "ICT",
  "EL",
  "Fluency",
  "Learning Gap Guidance",
  OTHER_OPTION,
  SOLVES_GUIDANCE_NA_OPTION,
];
