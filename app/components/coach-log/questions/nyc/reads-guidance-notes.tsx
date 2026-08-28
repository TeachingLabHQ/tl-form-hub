import { MultiSelect, Textarea, TextInput } from "@mantine/core";
import type { CoachLogForm } from "../../hooks/use-coach-log-form";
import {
  applyNAExclusivity,
  OTHER_OPTION,
  READS_GUIDANCE_NA_OPTION,
  READS_GUIDANCE_TOOLS_OPTIONS,
} from "./constants";
import { QuestionField } from "./field";

type Props = {
  form: CoachLogForm;
};

/**
 * Shown once per NYC Reads submission (not per touchpoint block): which
 * NYC Reads guidance/tools/protocols were used, plus an optional notes field.
 */
export const ReadsGuidanceNotes = ({ form }: Props) => {
  const guidanceToolsUsed = form.values.readsGuidanceToolsUsed;

  return (
    <>
      <QuestionField
        label="During your support, did you use or reference any of the following NYC Reads guidance, tools, or protocols with teachers or leaders? Please select all that apply.*"
        note="We are interested in learning how the updated NYC Reads guidance, tools, or protocols may be informing JES."
      >
        <MultiSelect
          placeholder="Select all that apply"
          data={READS_GUIDANCE_TOOLS_OPTIONS}
          value={guidanceToolsUsed}
          onChange={(next) =>
            form.setFieldValue(
              "readsGuidanceToolsUsed",
              applyNAExclusivity(next, guidanceToolsUsed, READS_GUIDANCE_NA_OPTION)
            )
          }
          error={form.errors.readsGuidanceToolsUsed}
        />
      </QuestionField>

      {guidanceToolsUsed.includes(OTHER_OPTION) && (
        <QuestionField label="Please specify the other NYC Reads guidance, tool, or protocol used.*">
          <TextInput {...form.getInputProps("readsGuidanceToolsOther")} />
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
          {...form.getInputProps("readsNotes")}
        />
      </QuestionField>
    </>
  );
};
