import { MultiSelect } from "@mantine/core";
import type { CoachLogForm } from "../../hooks/use-coach-log-form";
import {
  applyNAExclusivity,
  MAX_SUSTAINABILITY,
  SUSTAINABILITY_NONE_OPTION,
  SUSTAINABILITY_OPTIONS,
  SUSTAINABILITY_REFLECTION_TOOL_URL,
} from "./constants";
import { QuestionField } from "./field";

type Props = {
  form: CoachLogForm;
  field:
    | "readsLeaderSustainability"
    | "readsDistrictSustainability"
    | "solvesSustainability";
  /** Prefix for the label, e.g. "NYC Solves: ". */
  labelPrefix?: string;
};

const SUSTAINABILITY_NOTE = (
  <>
    See a detailed description of each sustainability factor in the{" "}
    <a
      href={SUSTAINABILITY_REFLECTION_TOOL_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="font-bold underline"
    >
      Sustainability Reflection Tool
    </a>
    .
  </>
);

/**
 * "Select at most 2 conditions of sustainability" — asked in the Reads leader
 * and district blocks and once per Solves submission. "None of the above" is
 * an exclusive response.
 */
export const SustainabilityQuestion = ({ form, field, labelPrefix = "" }: Props) => {
  const selected = form.values[field];

  return (
    <QuestionField
      label={`${labelPrefix}Select at most 2 conditions of sustainability that were most closely aligned to the support given today.*`}
      note={SUSTAINABILITY_NOTE}
    >
      <MultiSelect
        placeholder="Select up to 2 conditions"
        data={SUSTAINABILITY_OPTIONS}
        maxValues={MAX_SUSTAINABILITY}
        value={selected}
        onChange={(next) =>
          form.setFieldValue(
            field,
            applyNAExclusivity(next, selected, SUSTAINABILITY_NONE_OPTION)
          )
        }
        error={form.errors[field]}
      />
    </QuestionField>
  );
};
