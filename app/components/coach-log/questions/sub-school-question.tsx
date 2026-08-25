import { Select } from "@mantine/core";
import type { CoachLogForm } from "../hooks/use-coach-log-form";

type Props = {
  form: CoachLogForm;
  options: string[];
  label?: string;
  placeholder?: string;
};

/**
 * Sub-school selector, reused for two cases that share the same form field
 * and Monday column: D75 + Solves coach sessions (sheet-driven sub-school
 * names) and D11 + Solves coach sessions at K-8 schools (fixed
 * Elementary/Middle options, passed via `label`/`placeholder`/`options`).
 */
export const SubSchoolQuestion = ({
  form,
  options,
  label = "Identify Sub-school",
  placeholder = "Select a sub-school",
}: Props) => {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-medium text-lg">{label}</h1>
      <Select
        placeholder={placeholder}
        data={options}
        searchable
        {...form.getInputProps("subSchool")}
      />
    </div>
  );
};
