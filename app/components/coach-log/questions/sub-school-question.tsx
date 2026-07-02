import { Select } from "@mantine/core";
import type { CoachLogForm } from "../hooks/use-coach-log-form";

type Props = {
  form: CoachLogForm;
  options: string[];
};

/**
 * Sub-school selector for D75 + Solves coach sessions. Options are filtered from
 * the loader's sub-school map by the selected district + school.
 */
export const SubSchoolQuestion = ({ form, options }: Props) => {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-medium text-lg">Identify Sub-school</h1>
      <Select
        placeholder="Select a sub-school"
        data={options}
        searchable
        {...form.getInputProps("subSchool")}
      />
    </div>
  );
};
