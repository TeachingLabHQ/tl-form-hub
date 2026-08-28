import { MultiSelect, Select } from "@mantine/core";
import type { CoachLogForm } from "../../hooks/use-coach-log-form";
import { SOLVES_ES_GRADE_LEVEL_OPTIONS, SOLVES_HOURS_DURATION_OPTIONS } from "./constants";
import { QuestionField } from "./field";

type Props = {
  form: CoachLogForm;
};

/** NYC Solves "ES: Do the Math Work Shops" touchpoint questions. */
export const SolvesEsSupport = ({ form }: Props) => (
  <>
    <QuestionField label="What was the duration of your district wide support during this visit in hours? Please round to the nearest unit.*">
      <Select
        placeholder="Select duration"
        data={SOLVES_HOURS_DURATION_OPTIONS}
        {...form.getInputProps("solvesEsVisitDuration")}
      />
    </QuestionField>

    <QuestionField label='Please select which grade level(s) you worked with during your support for Elementary "Doing the Math" School Based Workshops.*'>
      <MultiSelect
        placeholder="Select all that apply"
        data={SOLVES_ES_GRADE_LEVEL_OPTIONS}
        {...form.getInputProps("solvesEsGradeLevels")}
      />
    </QuestionField>
  </>
);
