import { Select } from "@mantine/core";
import type { CoachLogForm } from "../../hooks/use-coach-log-form";
import {
  SOLVES_ADDITIONAL_SUPPORT_DURATION_OPTIONS,
  SOLVES_ADDITIONAL_SUPPORT_TYPE_OPTIONS,
} from "./constants";
import { QuestionField } from "./field";

type Props = {
  form: CoachLogForm;
};

/** NYC Solves "Additional support to facilitate protocols" questions. */
export const SolvesAdditionalSupport = ({ form }: Props) => (
  <>
    <QuestionField label="What was the duration of your additional facilitation support during this visit in hours?*">
      <Select
        placeholder="Select duration"
        data={SOLVES_ADDITIONAL_SUPPORT_DURATION_OPTIONS}
        {...form.getInputProps("solvesAdditionalSupportDuration")}
      />
    </QuestionField>

    <QuestionField label="Please select which additional support you provided during this visit.*">
      <Select
        placeholder="Select a support type"
        data={SOLVES_ADDITIONAL_SUPPORT_TYPE_OPTIONS}
        {...form.getInputProps("solvesAdditionalSupportType")}
      />
    </QuestionField>
  </>
);
