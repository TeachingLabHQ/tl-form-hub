import { MultiSelect, Textarea, TextInput } from "@mantine/core";
import type { CoachLogForm } from "../../hooks/use-coach-log-form";
import {
  applyNAExclusivity,
  OTHER_OPTION,
  SOLVES_GUIDANCE_NA_OPTION,
  SOLVES_GUIDANCE_TOOLS_OPTIONS,
} from "./constants";
import { QuestionField } from "./field";

type Props = {
  form: CoachLogForm;
};

/**
 * Shown once per NYC Solves submission (not per touchpoint block): which
 * NYC Solves guidance documents were used, plus an optional notes field.
 */
export const SolvesGuidanceNotes = ({ form }: Props) => {
  const guidanceToolsUsed = form.values.solvesGuidanceToolsUsed;

  return (
    <>
      <QuestionField label="NYC Solves: Which (if any) of these following guidance documents did you use with teachers and/or leaders during your support visit?*">
        <MultiSelect
          placeholder="Select all that apply"
          data={SOLVES_GUIDANCE_TOOLS_OPTIONS}
          value={guidanceToolsUsed}
          onChange={(next) =>
            form.setFieldValue(
              "solvesGuidanceToolsUsed",
              applyNAExclusivity(next, guidanceToolsUsed, SOLVES_GUIDANCE_NA_OPTION)
            )
          }
          error={form.errors.solvesGuidanceToolsUsed}
        />
      </QuestionField>

      {guidanceToolsUsed.includes(OTHER_OPTION) && (
        <QuestionField label="Please specify the other NYC Solves guidance, tool, or protocol used.*">
          <TextInput {...form.getInputProps("solvesGuidanceToolsOther")} />
        </QuestionField>
      )}

      <QuestionField
        label="Optional Notes"
        note="Add any notes here for your own use. There are no expectations to use this data for any analysis purposes."
      >
        <Textarea
          placeholder="Optional"
          autosize
          minRows={3}
          {...form.getInputProps("solvesNotes")}
        />
      </QuestionField>
    </>
  );
};
