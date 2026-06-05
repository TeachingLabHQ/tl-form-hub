import { Select } from "@mantine/core";
import type { CoachLogForm } from "../use-coach-log-form";

type Props = {
  form: CoachLogForm;
};

/**
 * Sub-school selector for D75 + Solves coach sessions.
 * TODO(source): wire options to the sub-school Monday board once it is decided.
 */
export const SubSchoolQuestion = ({ form }: Props) => {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-medium text-lg">Identify Sub-school</h1>
      <Select
        placeholder="Select a sub-school"
        data={[]}
        searchable
        {...form.getInputProps("subSchool")}
      />
    </div>
  );
};
