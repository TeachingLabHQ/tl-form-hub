import { MultiSelect, Select, TextInput } from "@mantine/core";
import type { CoachLogForm } from "../../use-coach-log-form";
import {
  JES_GLOSSARY_URL,
  LEADER_CAPACITY_FOCUS_OPTIONS,
  OTHER_LEADER_OPTION,
  READS_LEADER_VISIT_DURATION_OPTIONS,
  SUPPORTED_LEADER_OPTIONS,
} from "./constants";
import { QuestionField } from "./field";

type Props = {
  form: CoachLogForm;
};

/** NYC Reads school-leader support questions (leader-inclusive touchpoints). */
export const ReadsLeaderSupport = ({ form }: Props) => (
  <>
    <QuestionField label="Which school leaders/leadership team members did you build capacity with today?*">
      <MultiSelect
        placeholder="Select all that apply"
        data={SUPPORTED_LEADER_OPTIONS}
        {...form.getInputProps("readsSupportedLeaders")}
      />
    </QuestionField>

    {form.values.readsSupportedLeaders.includes(OTHER_LEADER_OPTION) && (
      <QuestionField label="Please specify other school leaders:*">
        <TextInput
          placeholder="Other school leaders"
          {...form.getInputProps("readsSupportedLeadersOther")}
        />
      </QuestionField>
    )}

    <QuestionField label="What was the duration of your visit with school leaders in hours?*">
      <Select
        placeholder="Select duration"
        data={READS_LEADER_VISIT_DURATION_OPTIONS}
        {...form.getInputProps("readsLeaderVisitDuration")}
      />
    </QuestionField>

    <QuestionField
      label="Please select the primary focus of the capacity building provided to leaders in this school.*"
      note={
        <>
          See a detailed description of each capacity building focus in the{" "}
          <a
            href={JES_GLOSSARY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold underline"
          >
            Glossary of the JES Manual
          </a>
          .
        </>
      }
    >
      <MultiSelect
        placeholder="Select all that apply"
        data={LEADER_CAPACITY_FOCUS_OPTIONS}
        {...form.getInputProps("readsLeaderCapacityFocus")}
      />
    </QuestionField>
  </>
);
