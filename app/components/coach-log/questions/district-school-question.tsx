import { Select } from "@mantine/core";
import { useMemo } from "react";
import type { DistrictWithSchools } from "~/domains/coach-log/model";
import type { CoachLogForm } from "../hooks/use-coach-log-form";

type Props = {
  form: CoachLogForm;
  districts: DistrictWithSchools[];
  onDistrictChange: (value: string) => void;
  onSchoolChange: (value: string) => void;
};

export const DistrictSchoolQuestion = ({
  form,
  districts,
  onDistrictChange,
  onSchoolChange,
}: Props) => {
  const { district, school } = form.values;

  const districtOptions = useMemo(
    () => districts.map((d) => d.district),
    [districts]
  );
  const schoolOptions = useMemo(
    () => districts.find((d) => d.district === district)?.schools ?? [],
    [districts, district]
  );

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="font-medium text-lg">
          What district was your coaching session for?*
        </h1>
        <Select
          value={district || null}
          onChange={(value) => onDistrictChange(value || "")}
          placeholder="Select a district"
          data={districtOptions}
          searchable
          error={form.errors.district}
        />
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="font-medium text-lg">
          What school was your coaching session for?*
        </h1>
        <Select
          value={school || null}
          onChange={(value) => onSchoolChange(value || "")}
          placeholder={district ? "Select a school" : "Select a district first"}
          data={schoolOptions}
          searchable
          disabled={!district}
          error={form.errors.school}
        />
      </div>
    </>
  );
};
