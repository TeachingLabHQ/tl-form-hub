import { MultiSelect, Select, Textarea, TextInput } from "@mantine/core";
import { YES_NO_OPTIONS } from "../../constants";
import type { CoachLogForm } from "../../use-coach-log-form";
import {
  MAX_TEACHER_STRATEGIES,
  READS_GRADE_BAND_OPTIONS,
  READS_VISIT_DURATION_OPTIONS,
  SUPPORTED_TEACHER_TYPE_OPTIONS,
  TEACHER_STRATEGY_OPTIONS,
} from "./constants";
import { QuestionField } from "./field";

type Props = {
  form: CoachLogForm;
};

/** NYC Reads teacher-team support questions (teacher-inclusive touchpoints). */
export const ReadsTeacherSupport = ({ form }: Props) => (
  <>
    <QuestionField label="Is this a multi-school support visit?*">
      <Select
        placeholder="Select Yes or No"
        data={YES_NO_OPTIONS}
        {...form.getInputProps("readsIsMultiSchool")}
      />
    </QuestionField>

    {form.values.readsIsMultiSchool === "Yes" && (
      <QuestionField label="Please list the DBN of all the schools supported on this multi-school visit.*">
        <TextInput
          placeholder="e.g. 09X022, 09X011"
          {...form.getInputProps("readsMultiSchoolDBN")}
        />
      </QuestionField>
    )}

    <QuestionField label="What was the duration of this visit in hours?*">
      <Select
        placeholder="Select duration"
        data={READS_VISIT_DURATION_OPTIONS}
        {...form.getInputProps("readsVisitDuration")}
      />
    </QuestionField>

    <QuestionField label="Did you support any of the following teachers during this visit?*">
      <MultiSelect
        placeholder="Select all that apply"
        data={SUPPORTED_TEACHER_TYPE_OPTIONS}
        {...form.getInputProps("readsSupportedTeacherTypes")}
      />
    </QuestionField>

    <QuestionField label="Select the grade bands you supported today.*">
      <MultiSelect
        placeholder="Select all that apply"
        data={READS_GRADE_BAND_OPTIONS}
        {...form.getInputProps("readsGradeBands")}
      />
    </QuestionField>

    <QuestionField label="Please select the 1–5 strategies you used to build capacity with teacher teams today.*">
      <MultiSelect
        placeholder="Select up to 5 strategies"
        data={TEACHER_STRATEGY_OPTIONS}
        maxValues={MAX_TEACHER_STRATEGIES}
        searchable
        {...form.getInputProps("readsTeacherStrategies")}
      />
    </QuestionField>

    <QuestionField label="Did you explicitly focus on components of the MTSS framework during your visit?*">
      <Select
        placeholder="Select Yes or No"
        data={YES_NO_OPTIONS}
        {...form.getInputProps("readsMTSSFocus")}
      />
    </QuestionField>

    <QuestionField label="Were a majority of the teachers you worked with today using HQIM?*">
      <Select
        placeholder="Select Yes or No"
        data={YES_NO_OPTIONS}
        {...form.getInputProps("readsMajorityUsingHQIM")}
      />
    </QuestionField>

    {form.values.readsMajorityUsingHQIM === "No" && (
      <QuestionField label="Because a majority of teachers were NOT using HQIM during your visit, please share additional context on your response.*">
        <Textarea
          placeholder="Describe what you saw when you would have expected to see HQIM in place."
          autosize
          minRows={3}
          {...form.getInputProps("readsHQIMContext")}
        />
      </QuestionField>
    )}
  </>
);
