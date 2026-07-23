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
  OTHER_LEADER_OPTION,
  readsShowsDistrictBlock,
  readsShowsLeaderBlock,
  readsShowsMtssPilot,
  readsShowsTeacherBlock,
  SOLVES_INTERVISITATION_PROTOCOL,
  solvesShowsAdditionalSupport,
  solvesShowsLeaderBlock,
  solvesShowsTeacherBlock,
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
  readsScheduleProvided: "",
  readsHighImpactActivities: "",
  readsTouchpoint: "",
  readsIsMultiSchool: "",
  readsMultiSchoolDBN: "",
  readsVisitDuration: "",
  readsSupportedTeacherTypes: [],
  readsGradeBands: [],
  readsTeacherStrategies: [],
  readsMTSSFocus: "",
  readsMajorityUsingHQIM: "",
  readsHQIMContext: "",
  readsSupportedLeaders: [],
  readsSupportedLeadersOther: "",
  readsLeaderVisitDuration: "",
  readsLeaderCapacityFocus: [],
  readsSupportedDistrictLeaders: [],
  readsSupportedDistrictLeadersOther: "",
  readsDistrictSupports: [],
  mtssPracticesResponses: ["", "", "", "", "", "", ""],
  mtssAdditionalContext: "",
  solvesTouchpoint: "",
  solvesTeacherVisitDuration: "",
  solvesSupportedTeacherTypes: [],
  solvesGradeContentAreas: [],
  solvesTeacherProtocols: [],
  solvesIntervisitationDBNs: "",
  solvesMajorityUsingHQIM: "",
  solvesHQIMContext: "",
  solvesLeaderSupportDuration: "",
  solvesLeaderSupportTrack: "",
  solvesAdditionalSupportDuration: "",
  solvesAdditionalSupportType: "",
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
      readsScheduleProvided: whenNotCancelled((value, values) =>
        readsShown(values) &&
        isReadsCapacityBuilderDistrict(values.district) &&
        !value
          ? PICK_YES_NO
          : null
      ),
      readsHighImpactActivities: whenNotCancelled((value, values) =>
        readsShown(values) &&
        isReadsCapacityBuilderDistrict(values.district) &&
        !value
          ? PICK_YES_NO
          : null
      ),
      readsTouchpoint: whenNotCancelled((value, values) =>
        readsShown(values) && !value ? "Please select a touchpoint type" : null
      ),
      readsIsMultiSchool: whenNotCancelled((value, values) =>
        readsShown(values) && readsShowsTeacherBlock(values.readsTouchpoint) && !value
          ? PICK_YES_NO
          : null
      ),
      readsMultiSchoolDBN: whenNotCancelled((value, values) =>
        readsShown(values) &&
        readsShowsTeacherBlock(values.readsTouchpoint) &&
        values.readsIsMultiSchool === "Yes" &&
        !value
          ? "Please list the school DBNs"
          : null
      ),
      readsVisitDuration: whenNotCancelled((value, values) =>
        readsShown(values) && readsShowsTeacherBlock(values.readsTouchpoint) && !value
          ? PICK_ONE
          : null
      ),
      readsSupportedTeacherTypes: whenNotCancelled((value: string[], values) =>
        readsShown(values) &&
        readsShowsTeacherBlock(values.readsTouchpoint) &&
        value.length === 0
          ? PICK_AT_LEAST_ONE
          : null
      ),
      readsGradeBands: whenNotCancelled((value: string[], values) =>
        readsShown(values) &&
        readsShowsTeacherBlock(values.readsTouchpoint) &&
        value.length === 0
          ? PICK_AT_LEAST_ONE
          : null
      ),
      readsTeacherStrategies: whenNotCancelled((value: string[], values) =>
        readsShown(values) &&
        readsShowsTeacherBlock(values.readsTouchpoint) &&
        value.length === 0
          ? "Please select at least one strategy"
          : null
      ),
      readsMTSSFocus: whenNotCancelled((value, values) =>
        readsShown(values) && readsShowsTeacherBlock(values.readsTouchpoint) && !value
          ? PICK_YES_NO
          : null
      ),
      readsMajorityUsingHQIM: whenNotCancelled((value, values) =>
        readsShown(values) && readsShowsTeacherBlock(values.readsTouchpoint) && !value
          ? PICK_YES_NO
          : null
      ),
      readsHQIMContext: whenNotCancelled((value, values) =>
        readsShown(values) &&
        readsShowsTeacherBlock(values.readsTouchpoint) &&
        values.readsMajorityUsingHQIM === "No" &&
        !value
          ? "Please share additional context"
          : null
      ),
      readsSupportedLeaders: whenNotCancelled((value: string[], values) =>
        readsShown(values) &&
        readsShowsLeaderBlock(values.readsTouchpoint) &&
        value.length === 0
          ? PICK_AT_LEAST_ONE
          : null
      ),
      readsSupportedLeadersOther: whenNotCancelled((value, values) =>
        readsShown(values) &&
        readsShowsLeaderBlock(values.readsTouchpoint) &&
        values.readsSupportedLeaders.includes(OTHER_LEADER_OPTION) &&
        !value
          ? "Please specify other school leaders"
          : null
      ),
      readsLeaderVisitDuration: whenNotCancelled((value, values) =>
        readsShown(values) && readsShowsLeaderBlock(values.readsTouchpoint) && !value
          ? PICK_ONE
          : null
      ),
      readsLeaderCapacityFocus: whenNotCancelled((value: string[], values) =>
        readsShown(values) &&
        readsShowsLeaderBlock(values.readsTouchpoint) &&
        value.length === 0
          ? PICK_AT_LEAST_ONE
          : null
      ),
      readsSupportedDistrictLeaders: whenNotCancelled((value: string[], values) =>
        readsShown(values) &&
        readsShowsDistrictBlock(values.readsTouchpoint) &&
        value.length === 0
          ? PICK_AT_LEAST_ONE
          : null
      ),
      readsSupportedDistrictLeadersOther: whenNotCancelled((value, values) =>
        readsShown(values) &&
        readsShowsDistrictBlock(values.readsTouchpoint) &&
        values.readsSupportedDistrictLeaders.includes(OTHER_LEADER_OPTION) &&
        !value
          ? "Please specify other district leaders"
          : null
      ),
      readsDistrictSupports: whenNotCancelled((value: string[], values) =>
        readsShown(values) &&
        readsShowsDistrictBlock(values.readsTouchpoint) &&
        value.length === 0
          ? PICK_AT_LEAST_ONE
          : null
      ),
      mtssPracticesResponses: whenNotCancelled((value: string[], values) =>
        readsShown(values) &&
        readsShowsMtssPilot(values.readsTouchpoint, values.district, values.school) &&
        value.some((r) => !r)
          ? "Please respond to every MTSS practice statement"
          : null
      ),

      // --- NYC Solves ---------------------------------------------------
      solvesTouchpoint: whenNotCancelled((value, values) =>
        solvesShown(values) && !value ? "Please select a touchpoint type" : null
      ),
      solvesTeacherVisitDuration: whenNotCancelled((value, values) =>
        solvesShown(values) && solvesShowsTeacherBlock(values.solvesTouchpoint) && !value
          ? PICK_ONE
          : null
      ),
      solvesSupportedTeacherTypes: whenNotCancelled((value: string[], values) =>
        solvesShown(values) &&
        solvesShowsTeacherBlock(values.solvesTouchpoint) &&
        value.length === 0
          ? PICK_AT_LEAST_ONE
          : null
      ),
      solvesGradeContentAreas: whenNotCancelled((value: string[], values) =>
        solvesShown(values) &&
        solvesShowsTeacherBlock(values.solvesTouchpoint) &&
        value.length === 0
          ? PICK_AT_LEAST_ONE
          : null
      ),
      solvesTeacherProtocols: whenNotCancelled((value: string[], values) =>
        solvesShown(values) &&
        solvesShowsTeacherBlock(values.solvesTouchpoint) &&
        value.length === 0
          ? "Please select at least one protocol"
          : null
      ),
      solvesIntervisitationDBNs: whenNotCancelled((value, values) =>
        solvesShown(values) &&
        solvesShowsTeacherBlock(values.solvesTouchpoint) &&
        values.solvesTeacherProtocols.includes(SOLVES_INTERVISITATION_PROTOCOL) &&
        !value
          ? "Please list the school DBNs"
          : null
      ),
      solvesMajorityUsingHQIM: whenNotCancelled((value, values) =>
        solvesShown(values) && solvesShowsTeacherBlock(values.solvesTouchpoint) && !value
          ? PICK_YES_NO
          : null
      ),
      solvesHQIMContext: whenNotCancelled((value, values) =>
        solvesShown(values) &&
        solvesShowsTeacherBlock(values.solvesTouchpoint) &&
        values.solvesMajorityUsingHQIM === "No" &&
        !value
          ? "Please share additional context"
          : null
      ),
      solvesLeaderSupportDuration: whenNotCancelled((value, values) =>
        solvesShown(values) && solvesShowsLeaderBlock(values.solvesTouchpoint) && !value
          ? PICK_ONE
          : null
      ),
      solvesLeaderSupportTrack: whenNotCancelled((value, values) =>
        solvesShown(values) && solvesShowsLeaderBlock(values.solvesTouchpoint) && !value
          ? PICK_ONE
          : null
      ),
      solvesAdditionalSupportDuration: whenNotCancelled((value, values) =>
        solvesShown(values) &&
        solvesShowsAdditionalSupport(values.solvesTouchpoint) &&
        !value
          ? PICK_ONE
          : null
      ),
      solvesAdditionalSupportType: whenNotCancelled((value, values) =>
        solvesShown(values) &&
        solvesShowsAdditionalSupport(values.solvesTouchpoint) &&
        !value
          ? PICK_ONE
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
