import { Select } from "@mantine/core";
import { NYC_COACH_TYPE_OPTIONS } from "../constants";
import type { CoachLogForm } from "../hooks/use-coach-log-form";

type Props = {
  form: CoachLogForm;
  onChange: (value: string) => void;
};

export const NycCoachTypeQuestion = ({ form, onChange }: Props) => {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-medium text-lg">
        Select the NYC Coach type that aligns with the session you are logging*
      </h1>
      <Select
        value={form.values.nycCoachType || null}
        onChange={(value) => onChange(value || "")}
        placeholder="Select a coach type"
        data={NYC_COACH_TYPE_OPTIONS}
        error={form.errors.nycCoachType}
      />
    </div>
  );
};
