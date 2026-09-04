import { MultiSelect, Select, Textarea } from "@mantine/core";
import { YES_NO_OPTIONS } from "../../constants";
import type { CoachLogForm } from "../../hooks/use-coach-log-form";
import {
  FREQUENCY_OPTIONS,
  JES_TEACHER_GLOSSARY_URL,
  MAX_READS_TEACHER_STRATEGIES,
  READS_GRADE_BAND_OPTIONS,
  READS_TEACHER_STRATEGY_OPTIONS,
  READS_VISIT_DURATION_OPTIONS,
} from "./constants";
import { QuestionField } from "./field";

type Props = {
  form: CoachLogForm;
};

const GLOSSARY_NOTE = (
  <>
    See a detailed description of each capacity building focus in the{" "}
    <a
      href={JES_TEACHER_GLOSSARY_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="font-bold underline"
    >
      Key Concepts of the JES Manual
    </a>
    .
  </>
);

/** NYC Reads teacher-team support questions ("Teacher team support" touchpoint). */
export const ReadsTeacherSupport = ({ form }: Props) => (
  <>
    <QuestionField label="What was the duration of teacher support during this visit in hours? Please round to the nearest unit.*">
      <Select
        placeholder="Select duration"
        data={READS_VISIT_DURATION_OPTIONS}
        {...form.getInputProps("readsVisitDuration")}
      />
    </QuestionField>

    <QuestionField label="Select the grade band(s) you supported today.*">
      <MultiSelect
        placeholder="Select all that apply"
        data={READS_GRADE_BAND_OPTIONS}
        {...form.getInputProps("readsGradeBands")}
      />
    </QuestionField>

    <QuestionField
      label="Please select the 1-3 main strategies you used to build capacity with teacher teams today.*"
      note={GLOSSARY_NOTE}
    >
      <MultiSelect
        placeholder="Select up to 3 strategies"
        data={READS_TEACHER_STRATEGY_OPTIONS}
        maxValues={MAX_READS_TEACHER_STRATEGIES}
        searchable
        {...form.getInputProps("readsTeacherStrategies")}
      />
    </QuestionField>

    <QuestionField label="How often were school leader(s) present and engaged during your support time with teachers?*">
      <Select
        placeholder="Select a response"
        data={FREQUENCY_OPTIONS}
        {...form.getInputProps("readsTeacherSchoolLeaderPresence")}
      />
    </QuestionField>

    <QuestionField label="How often were district leader(s) present and engaged during your support time with teachers?*">
      <Select
        placeholder="Select a response"
        data={FREQUENCY_OPTIONS}
        {...form.getInputProps("readsTeacherDistrictLeaderPresence")}
      />
    </QuestionField>

    <QuestionField label="Were a majority of the teachers you worked with today using approved HQIM (Tier 1 curriculum and/or intervention curriculum)?*">
      <Select
        placeholder="Select Yes or No"
        data={YES_NO_OPTIONS}
        {...form.getInputProps("readsMajorityUsingHQIM")}
      />
    </QuestionField>

    {form.values.readsMajorityUsingHQIM === "No" && (
      <QuestionField
        label="Please share additional context on your response.*"
        note='For example, please describe what you saw when you would have expected to see HQIM in place. If you selected "No" to the prior question in error, please go back and correct your response.'
      >
        <Textarea
          autosize
          minRows={3}
          {...form.getInputProps("readsHQIMContext")}
        />
      </QuestionField>
    )}

    <QuestionField label="Are intervention blocks scheduled at this school?*">
      <Select
        placeholder="Select Yes or No"
        data={YES_NO_OPTIONS}
        {...form.getInputProps("readsInterventionsScheduled")}
      />
    </QuestionField>

    {form.values.readsInterventionsScheduled === "No" && (
      <QuestionField
        label="Please share additional context on your response.*"
        note='For example, please describe what you saw when you would have expected to see interventions. If you selected "No" to the prior question in error, please go back and correct your response.'
      >
        <Textarea
          autosize
          minRows={3}
          {...form.getInputProps("readsInterventionsContext")}
        />
      </QuestionField>
    )}
  </>
);
