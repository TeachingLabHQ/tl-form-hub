import { useForm, type UseFormReturnType } from "@mantine/form";
import type { CoacheeRow, YesNo } from "~/domains/coach-log/model";
import {
  CANCELED_OTHER_REASON,
  ecShowsLeaderCapacity,
  ecShowsTeacherStrategies,
  isNycCoachTypeDistrict,
  shouldShowEarlyChildhood,
  shouldShowReads,
  shouldShowSolves,
} from "../constants";
import {
  isReadsCapacityBuilderDistrict,
  OTHER_OPTION,
  READS_DISTRICT_FOCUS_DATA_STRATEGY,
  READS_DISTRICT_FOCUS_PL,
  READS_DISTRICT_FOCUS_SCHOOL_VISITS,
  READS_DISTRICT_FOCUS_STRATEGIC_PLANNING,
  READS_LEADER_FOCUS_MODELING,
  READS_LEADER_FOCUS_PL,
  READS_LEADER_FOCUS_SCHOOL_VISITS,
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
} from "../questions/nyc/constants";

/** Single source of truth for every Coach Log field. */
export type CoachLogValues = {
  // Location / context
  district: string;
  school: string;
  nycCoachType: string;
  subSchool: string;
  sessionDate: string;

  // ELA Early Childhood coach
  ecTouchpoint: string;
  ecTeacherStrategies: string[];
  ecLeaderCapacityFocus: string[];

  // NYC Reads coach
  readsIsPLSession: YesNo | "";
  readsHighImpactActivities: YesNo | "";
  readsTouchpointTypes: string[];

  // NYC Reads — Teacher team support
  readsVisitDuration: string;
  readsGradeBands: string[];
  readsTeacherStrategies: string[];
  readsTeacherSchoolLeaderPresence: string;
  readsTeacherDistrictLeaderPresence: string;
  readsMajorityUsingHQIM: YesNo | "";
  readsHQIMContext: string;
  readsInterventionsScheduled: YesNo | "";
  readsInterventionsContext: string;

  // NYC Reads — School Leader/Leadership team support
  readsLeaderVisitDuration: string;
  readsLeaderCapacityFocus: string[];
  readsLeaderFocusSchoolVisitsSubcomponent: string;
  readsLeaderFocusModelingSubcomponent: string;
  readsLeaderFocusPLSubcomponent: string;
  readsLeaderSustainability: string[];
  readsLeaderDistrictPresence: string;

  // NYC Reads — District team support
  readsDistrictCapacityFocus: string[];
  readsDistrictFocusStrategicPlanningSubcomponent: string;
  readsDistrictFocusPLSubcomponent: string;
  readsDistrictFocusDataStrategySubcomponent: string;
  readsDistrictFocusSchoolVisitsSubcomponent: string;
  readsDistrictSustainability: string[];

  // NYC Reads — shown once per submission
  readsGuidanceToolsUsed: string[];
  readsGuidanceToolsOther: string;
  readsNotes: string;

  // NYC Solves coach
  solvesTouchpointTypes: string[];

  // NYC Solves — HQIM-Based Teacher Collaboration
  solvesHqimVisitDuration: string;
  solvesHqimGradeContentAreas: string[];
  solvesHqimLeaderPresent: YesNo | "";
  solvesHqimProtocols: string[];

  // NYC Solves — HSD Only: Supplemental Time Teacher Collaboration
  solvesHsdVisitDuration: string;
  solvesHsdGradeContentAreas: string[];
  solvesHsdPrimaryResources: string[];
  solvesHsdPrimaryResourcesOther: string;
  solvesHsdProtocols: string[];
  solvesHsdLeaderPresent: YesNo | "";

  // NYC Solves — ES: Do the Math Work Shops
  solvesEsVisitDuration: string;
  solvesEsGradeLevels: string[];

  // NYC Solves — CSD: Leader Support (at one school)
  solvesCsdVisitDuration: string;
  solvesCsdTrack: string;

  // NYC Solves — District Wide Learning Support
  solvesDistrictWideVisitDuration: string;
  solvesDistrictWideSupportType: string;
  solvesDistrictWideDBNs: string;

  // NYC Solves — shown once, if HQIM/HSD/CSD selected
  solvesPostVisitSnapshot: string;
  solvesPostVisitFollowUp: string;

  // NYC Solves — shown once per submission
  solvesGuidanceToolsUsed: string[];
  solvesGuidanceToolsOther: string;
  solvesNotes: string;

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
  groupParticipantRole: string[];
  groupTopic: string;
  groupDurationMins: string;
};

export type CoachLogForm = UseFormReturnType<CoachLogValues>;

export const EMPTY_COACHEE_ROW: CoacheeRow = {
  coacheeName: "",
  role: "",
  durationMins: "",
};

const INITIAL_VALUES: CoachLogValues = {
  district: "",
  school: "",
  nycCoachType: "",
  subSchool: "",
  sessionDate: "",
  ecTouchpoint: "",
  ecTeacherStrategies: [],
  ecLeaderCapacityFocus: [],

  readsIsPLSession: "",
  readsHighImpactActivities: "",
  readsTouchpointTypes: [],

  readsVisitDuration: "",
  readsGradeBands: [],
  readsTeacherStrategies: [],
  readsTeacherSchoolLeaderPresence: "",
  readsTeacherDistrictLeaderPresence: "",
  readsMajorityUsingHQIM: "",
  readsHQIMContext: "",
  readsInterventionsScheduled: "",
  readsInterventionsContext: "",

  readsLeaderVisitDuration: "",
  readsLeaderCapacityFocus: [],
  readsLeaderFocusSchoolVisitsSubcomponent: "",
  readsLeaderFocusModelingSubcomponent: "",
  readsLeaderFocusPLSubcomponent: "",
  readsLeaderSustainability: [],
  readsLeaderDistrictPresence: "",

  readsDistrictCapacityFocus: [],
  readsDistrictFocusStrategicPlanningSubcomponent: "",
  readsDistrictFocusPLSubcomponent: "",
  readsDistrictFocusDataStrategySubcomponent: "",
  readsDistrictFocusSchoolVisitsSubcomponent: "",
  readsDistrictSustainability: [],

  readsGuidanceToolsUsed: [],
  readsGuidanceToolsOther: "",
  readsNotes: "",

  solvesTouchpointTypes: [],

  solvesHqimVisitDuration: "",
  solvesHqimGradeContentAreas: [],
  solvesHqimLeaderPresent: "",
  solvesHqimProtocols: [],

  solvesHsdVisitDuration: "",
  solvesHsdGradeContentAreas: [],
  solvesHsdPrimaryResources: [],
  solvesHsdPrimaryResourcesOther: "",
  solvesHsdProtocols: [],
  solvesHsdLeaderPresent: "",

  solvesEsVisitDuration: "",
  solvesEsGradeLevels: [],

  solvesCsdVisitDuration: "",
  solvesCsdTrack: "",

  solvesDistrictWideVisitDuration: "",
  solvesDistrictWideSupportType: "",
  solvesDistrictWideDBNs: "",

  solvesPostVisitSnapshot: "",
  solvesPostVisitFollowUp: "",

  solvesGuidanceToolsUsed: [],
  solvesGuidanceToolsOther: "",
  solvesNotes: "",

  canceled: "",
  cancelReason: "",
  cancelReasonOther: "",
  rescheduled: "",
  did1on1: "",
  coacheeRows: [{ ...EMPTY_COACHEE_ROW }],
  didGroupCoaching: "",
  groupParticipants: [],
  groupParticipantRole: [],
  groupTopic: "",
  groupDurationMins: "",
};

const required = (message: string) => (value: unknown) =>
  value ? null : message;

/** When the session is cancelled the activity questions are skipped entirely. */
const whenNotCancelled =
  (rule: (value: any, values: CoachLogValues) => string | null) =>
  (value: any, values: CoachLogValues) =>
    values.canceled === "Yes" ? null : rule(value, values);

const readsShown = (v: CoachLogValues) =>
  shouldShowReads(v.district, v.nycCoachType);
const solvesShown = (v: CoachLogValues) =>
  shouldShowSolves(v.district, v.nycCoachType);

/** Guidance/tools + notes questions are hidden entirely for a PL session log. */
const readsShownNotPL = (v: CoachLogValues) =>
  readsShown(v) && v.readsIsPLSession !== "Yes";

const PICK_YES_NO = "Please select Yes or No";
const PICK_ONE = "Please select an option";
const PICK_AT_LEAST_ONE = "Please select at least one option";

export function useCoachLogForm() {
  return useForm<CoachLogValues>({
    mode: "controlled",
    initialValues: INITIAL_VALUES,
    validate: {
      district: required("District is required"),
      school: required("School is required"),
      nycCoachType: (value, values) =>
        isNycCoachTypeDistrict(values.district) && !value
          ? "Coach type is required"
          : null,
      sessionDate: required("Date of session is required"),

      ecTouchpoint: whenNotCancelled((value, values) =>
        shouldShowEarlyChildhood(values.district, values.nycCoachType) && !value
          ? "Please select a touchpoint type"
          : null
      ),
      ecTeacherStrategies: whenNotCancelled((value: string[], values) =>
        shouldShowEarlyChildhood(values.district, values.nycCoachType) &&
        ecShowsTeacherStrategies(values.ecTouchpoint) &&
        value.length === 0
          ? "Please select at least one strategy"
          : null
      ),
      ecLeaderCapacityFocus: whenNotCancelled((value: string[], values) =>
        shouldShowEarlyChildhood(values.district, values.nycCoachType) &&
        ecShowsLeaderCapacity(values.ecTouchpoint) &&
        value.length === 0
          ? "Please select at least one focus area"
          : null
      ),

      // --- NYC Reads ----------------------------------------------------
      readsIsPLSession: whenNotCancelled((value, values) =>
        readsShown(values) && !value ? PICK_YES_NO : null
      ),
      readsHighImpactActivities: whenNotCancelled((value, values) =>
        readsShown(values) &&
        isReadsCapacityBuilderDistrict(values.district) &&
        !value
          ? PICK_YES_NO
          : null
      ),
      readsTouchpointTypes: whenNotCancelled((value: string[], values) =>
        readsShown(values) && value.length === 0
          ? "Please select at least one touchpoint type"
          : null
      ),

      readsVisitDuration: whenNotCancelled((value, values) =>
        readsShown(values) && readsShowsTeacherBlock(values.readsTouchpointTypes) && !value
          ? PICK_ONE
          : null
      ),
      readsGradeBands: whenNotCancelled((value: string[], values) =>
        readsShown(values) &&
        readsShowsTeacherBlock(values.readsTouchpointTypes) &&
        value.length === 0
          ? PICK_AT_LEAST_ONE
          : null
      ),
      readsTeacherStrategies: whenNotCancelled((value: string[], values) =>
        readsShown(values) &&
        readsShowsTeacherBlock(values.readsTouchpointTypes) &&
        value.length === 0
          ? "Please select at least one strategy"
          : null
      ),
      readsTeacherSchoolLeaderPresence: whenNotCancelled((value, values) =>
        readsShown(values) && readsShowsTeacherBlock(values.readsTouchpointTypes) && !value
          ? PICK_ONE
          : null
      ),
      readsTeacherDistrictLeaderPresence: whenNotCancelled((value, values) =>
        readsShown(values) && readsShowsTeacherBlock(values.readsTouchpointTypes) && !value
          ? PICK_ONE
          : null
      ),
      readsMajorityUsingHQIM: whenNotCancelled((value, values) =>
        readsShown(values) && readsShowsTeacherBlock(values.readsTouchpointTypes) && !value
          ? PICK_YES_NO
          : null
      ),
      readsHQIMContext: whenNotCancelled((value, values) =>
        readsShown(values) &&
        readsShowsTeacherBlock(values.readsTouchpointTypes) &&
        values.readsMajorityUsingHQIM === "No" &&
        !value
          ? "Please share additional context"
          : null
      ),
      readsInterventionsScheduled: whenNotCancelled((value, values) =>
        readsShown(values) && readsShowsTeacherBlock(values.readsTouchpointTypes) && !value
          ? PICK_YES_NO
          : null
      ),
      readsInterventionsContext: whenNotCancelled((value, values) =>
        readsShown(values) &&
        readsShowsTeacherBlock(values.readsTouchpointTypes) &&
        values.readsInterventionsScheduled === "No" &&
        !value
          ? "Please share additional context"
          : null
      ),

      readsLeaderVisitDuration: whenNotCancelled((value, values) =>
        readsShown(values) && readsShowsLeaderBlock(values.readsTouchpointTypes) && !value
          ? PICK_ONE
          : null
      ),
      readsLeaderCapacityFocus: whenNotCancelled((value: string[], values) =>
        readsShown(values) &&
        readsShowsLeaderBlock(values.readsTouchpointTypes) &&
        value.length === 0
          ? PICK_AT_LEAST_ONE
          : null
      ),
      readsLeaderFocusSchoolVisitsSubcomponent: whenNotCancelled((value, values) =>
        readsShown(values) &&
        readsShowsLeaderBlock(values.readsTouchpointTypes) &&
        values.readsLeaderCapacityFocus.includes(READS_LEADER_FOCUS_SCHOOL_VISITS) &&
        !value
          ? PICK_ONE
          : null
      ),
      readsLeaderFocusModelingSubcomponent: whenNotCancelled((value, values) =>
        readsShown(values) &&
        readsShowsLeaderBlock(values.readsTouchpointTypes) &&
        values.readsLeaderCapacityFocus.includes(READS_LEADER_FOCUS_MODELING) &&
        !value
          ? PICK_ONE
          : null
      ),
      readsLeaderFocusPLSubcomponent: whenNotCancelled((value, values) =>
        readsShown(values) &&
        readsShowsLeaderBlock(values.readsTouchpointTypes) &&
        values.readsLeaderCapacityFocus.includes(READS_LEADER_FOCUS_PL) &&
        !value
          ? PICK_ONE
          : null
      ),
      readsLeaderSustainability: whenNotCancelled((value: string[], values) =>
        readsShown(values) &&
        readsShowsLeaderBlock(values.readsTouchpointTypes) &&
        value.length === 0
          ? PICK_AT_LEAST_ONE
          : null
      ),
      readsLeaderDistrictPresence: whenNotCancelled((value, values) =>
        readsShown(values) && readsShowsLeaderBlock(values.readsTouchpointTypes) && !value
          ? PICK_ONE
          : null
      ),

      readsDistrictCapacityFocus: whenNotCancelled((value: string[], values) =>
        readsShown(values) &&
        readsShowsDistrictBlock(values.readsTouchpointTypes) &&
        value.length === 0
          ? PICK_AT_LEAST_ONE
          : null
      ),
      readsDistrictFocusStrategicPlanningSubcomponent: whenNotCancelled((value, values) =>
        readsShown(values) &&
        readsShowsDistrictBlock(values.readsTouchpointTypes) &&
        values.readsDistrictCapacityFocus.includes(READS_DISTRICT_FOCUS_STRATEGIC_PLANNING) &&
        !value
          ? PICK_ONE
          : null
      ),
      readsDistrictFocusPLSubcomponent: whenNotCancelled((value, values) =>
        readsShown(values) &&
        readsShowsDistrictBlock(values.readsTouchpointTypes) &&
        values.readsDistrictCapacityFocus.includes(READS_DISTRICT_FOCUS_PL) &&
        !value
          ? PICK_ONE
          : null
      ),
      readsDistrictFocusDataStrategySubcomponent: whenNotCancelled((value, values) =>
        readsShown(values) &&
        readsShowsDistrictBlock(values.readsTouchpointTypes) &&
        values.readsDistrictCapacityFocus.includes(READS_DISTRICT_FOCUS_DATA_STRATEGY) &&
        !value
          ? PICK_ONE
          : null
      ),
      readsDistrictFocusSchoolVisitsSubcomponent: whenNotCancelled((value, values) =>
        readsShown(values) &&
        readsShowsDistrictBlock(values.readsTouchpointTypes) &&
        values.readsDistrictCapacityFocus.includes(READS_DISTRICT_FOCUS_SCHOOL_VISITS) &&
        !value
          ? PICK_ONE
          : null
      ),
      readsDistrictSustainability: whenNotCancelled((value: string[], values) =>
        readsShown(values) &&
        readsShowsDistrictBlock(values.readsTouchpointTypes) &&
        value.length === 0
          ? PICK_AT_LEAST_ONE
          : null
      ),

      readsGuidanceToolsUsed: whenNotCancelled((value: string[], values) =>
        readsShownNotPL(values) && value.length === 0 ? PICK_AT_LEAST_ONE : null
      ),
      readsGuidanceToolsOther: whenNotCancelled((value, values) =>
        readsShownNotPL(values) &&
        values.readsGuidanceToolsUsed.includes(OTHER_OPTION) &&
        !value
          ? "Please specify"
          : null
      ),

      // --- NYC Solves ---------------------------------------------------
      solvesTouchpointTypes: whenNotCancelled((value: string[], values) =>
        solvesShown(values) && value.length === 0
          ? "Please select at least one touchpoint type"
          : null
      ),

      solvesHqimVisitDuration: whenNotCancelled((value, values) =>
        solvesShown(values) && solvesShowsHqim(values.solvesTouchpointTypes) && !value
          ? PICK_ONE
          : null
      ),
      solvesHqimGradeContentAreas: whenNotCancelled((value: string[], values) =>
        solvesShown(values) &&
        solvesShowsHqim(values.solvesTouchpointTypes) &&
        value.length === 0
          ? PICK_AT_LEAST_ONE
          : null
      ),
      solvesHqimLeaderPresent: whenNotCancelled((value, values) =>
        solvesShown(values) &&
        solvesShowsHqim(values.solvesTouchpointTypes) &&
        solvesShowsHqimLeaderPresent(values.solvesHqimGradeContentAreas) &&
        !value
          ? PICK_YES_NO
          : null
      ),
      solvesHqimProtocols: whenNotCancelled((value: string[], values) =>
        solvesShown(values) &&
        solvesShowsHqim(values.solvesTouchpointTypes) &&
        value.length === 0
          ? "Please select at least one protocol"
          : null
      ),

      solvesHsdVisitDuration: whenNotCancelled((value, values) =>
        solvesShown(values) && solvesShowsHsd(values.solvesTouchpointTypes) && !value
          ? PICK_ONE
          : null
      ),
      solvesHsdGradeContentAreas: whenNotCancelled((value: string[], values) =>
        solvesShown(values) &&
        solvesShowsHsd(values.solvesTouchpointTypes) &&
        value.length === 0
          ? PICK_AT_LEAST_ONE
          : null
      ),
      solvesHsdPrimaryResources: whenNotCancelled((value: string[], values) =>
        solvesShown(values) &&
        solvesShowsHsd(values.solvesTouchpointTypes) &&
        value.length === 0
          ? PICK_AT_LEAST_ONE
          : null
      ),
      solvesHsdPrimaryResourcesOther: whenNotCancelled((value, values) =>
        solvesShown(values) &&
        solvesShowsHsd(values.solvesTouchpointTypes) &&
        values.solvesHsdPrimaryResources.includes(OTHER_OPTION) &&
        !value
          ? "Please specify"
          : null
      ),
      solvesHsdProtocols: whenNotCancelled((value: string[], values) =>
        solvesShown(values) &&
        solvesShowsHsd(values.solvesTouchpointTypes) &&
        value.length === 0
          ? "Please select at least one protocol"
          : null
      ),
      solvesHsdLeaderPresent: whenNotCancelled((value, values) =>
        solvesShown(values) && solvesShowsHsd(values.solvesTouchpointTypes) && !value
          ? PICK_YES_NO
          : null
      ),

      solvesEsVisitDuration: whenNotCancelled((value, values) =>
        solvesShown(values) && solvesShowsEs(values.solvesTouchpointTypes) && !value
          ? PICK_ONE
          : null
      ),
      solvesEsGradeLevels: whenNotCancelled((value: string[], values) =>
        solvesShown(values) &&
        solvesShowsEs(values.solvesTouchpointTypes) &&
        value.length === 0
          ? PICK_AT_LEAST_ONE
          : null
      ),

      solvesCsdVisitDuration: whenNotCancelled((value, values) =>
        solvesShown(values) && solvesShowsCsd(values.solvesTouchpointTypes) && !value
          ? PICK_ONE
          : null
      ),
      solvesCsdTrack: whenNotCancelled((value, values) =>
        solvesShown(values) && solvesShowsCsd(values.solvesTouchpointTypes) && !value
          ? PICK_ONE
          : null
      ),

      solvesDistrictWideVisitDuration: whenNotCancelled((value, values) =>
        solvesShown(values) && solvesShowsDistrictWide(values.solvesTouchpointTypes) && !value
          ? PICK_ONE
          : null
      ),
      solvesDistrictWideSupportType: whenNotCancelled((value, values) =>
        solvesShown(values) && solvesShowsDistrictWide(values.solvesTouchpointTypes) && !value
          ? PICK_ONE
          : null
      ),
      solvesDistrictWideDBNs: whenNotCancelled((value, values) =>
        solvesShown(values) &&
        solvesShowsDistrictWide(values.solvesTouchpointTypes) &&
        solvesShowsDistrictWideDBNs(values.solvesDistrictWideSupportType) &&
        !value
          ? "Please list the school DBNs"
          : null
      ),

      solvesPostVisitSnapshot: whenNotCancelled((value, values) =>
        solvesShown(values) &&
        solvesShowsPostVisitSnapshot(values.solvesTouchpointTypes) &&
        !value
          ? PICK_ONE
          : null
      ),
      solvesPostVisitFollowUp: whenNotCancelled((value, values) =>
        solvesShown(values) &&
        solvesShowsPostVisitSnapshot(values.solvesTouchpointTypes) &&
        solvesShowsPostVisitFollowUp(values.solvesPostVisitSnapshot) &&
        !value
          ? "Please share additional information"
          : null
      ),

      solvesGuidanceToolsUsed: whenNotCancelled((value: string[], values) =>
        solvesShown(values) && value.length === 0 ? PICK_AT_LEAST_ONE : null
      ),
      solvesGuidanceToolsOther: whenNotCancelled((value, values) =>
        solvesShown(values) &&
        values.solvesGuidanceToolsUsed.includes(OTHER_OPTION) &&
        !value
          ? "Please specify"
          : null
      ),

      canceled: required("Please select Yes or No"),
      cancelReason: (value, values) =>
        values.canceled === "Yes" && !value ? "A reason is required" : null,
      cancelReasonOther: (value, values) =>
        values.canceled === "Yes" &&
        values.cancelReason === CANCELED_OTHER_REASON &&
        !value
          ? "Please describe the reason"
          : null,
      rescheduled: (value, values) =>
        values.canceled === "Yes" && !value
          ? "Please select Yes or No"
          : null,

      did1on1: whenNotCancelled((value) =>
        value ? null : "Please select Yes or No"
      ),
      coacheeRows: {
        coacheeName: whenNotCancelled((value, values) =>
          values.did1on1 === "Yes" && !value ? "Coachee is required" : null
        ),
        role: whenNotCancelled((value, values) =>
          values.did1on1 === "Yes" && !value ? "Role is required" : null
        ),
        durationMins: whenNotCancelled((value, values) =>
          values.did1on1 === "Yes" && !value ? "Duration is required" : null
        ),
      },

      didGroupCoaching: whenNotCancelled((value) =>
        value ? null : "Please select Yes or No"
      ),
      groupParticipants: whenNotCancelled((value: string[], values) =>
        values.didGroupCoaching === "Yes" && value.length === 0
          ? "At least one participant is required"
          : null
      ),
      groupParticipantRole: whenNotCancelled((value: string[], values) =>
        values.didGroupCoaching === "Yes" && value.length === 0
          ? "Role is required"
          : null
      ),
      groupTopic: whenNotCancelled((value, values) =>
        values.didGroupCoaching === "Yes" && !value
          ? "Topic of session is required"
          : null
      ),
      groupDurationMins: whenNotCancelled((value, values) =>
        values.didGroupCoaching === "Yes" && !value
          ? "Duration is required"
          : null
      ),
    },
  });
}
