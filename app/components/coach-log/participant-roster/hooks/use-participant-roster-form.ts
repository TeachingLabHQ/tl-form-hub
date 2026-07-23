import { isEmail, useForm } from "@mantine/form";
import { OTHER_OPTION } from "../constants";

export type ParticipantRosterValues = {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  roleOther: string;
  supports: string[];
  contentAreas: string[];
  contentAreaOther: string;
  grades: string[];
  groupNumbers: string[];
  district: string;
  school: string;
};

const INITIAL_VALUES: ParticipantRosterValues = {
  firstName: "",
  lastName: "",
  email: "",
  role: "",
  roleOther: "",
  supports: [],
  contentAreas: [],
  contentAreaOther: "",
  grades: [],
  groupNumbers: [],
  district: "",
  school: "",
};

const required = (message: string) => (value: unknown) =>
  value && String(value).trim() ? null : message;

export function useParticipantRosterForm() {
  return useForm<ParticipantRosterValues>({
    mode: "controlled",
    initialValues: INITIAL_VALUES,
    validate: {
      firstName: required("First name is required"),
      lastName: required("Last name is required"),
      email: isEmail("Enter a valid email address"),
      role: required("Please select a role"),
      // Required only when the matching "Other" option is chosen.
      roleOther: (value, values) =>
        values.role === OTHER_OPTION && !value.trim()
          ? "Please specify the role"
          : null,
      contentAreaOther: (value, values) =>
        values.contentAreas.includes(OTHER_OPTION) && !value.trim()
          ? "Please specify the content area"
          : null,
      district: required("Please select a district"),
      school: required("Please select a school"),
    },
  });
}
