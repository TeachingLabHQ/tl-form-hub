import { useForm, type UseFormReturnType } from "@mantine/form";
import type { CoacheeRow, YesNo } from "~/domains/coach-log/model";
import {
  CANCELED_OTHER_REASON,
  ecShowsLeaderCapacity,
  ecShowsTeacherStrategies,
  isNycCoachTypeDistrict,
  shouldShowEarlyChildhood,
} from "./constants";

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
  canceled: "",
  cancelReason: "",
  cancelReasonOther: "",
  rescheduled: "",
  did1on1: "",
  coacheeRows: [{ ...EMPTY_COACHEE_ROW }],
  didGroupCoaching: "",
  groupParticipants: [],
  groupParticipantRole: "",
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
      groupParticipantRole: whenNotCancelled((value, values) =>
        values.didGroupCoaching === "Yes" && !value ? "Role is required" : null
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
