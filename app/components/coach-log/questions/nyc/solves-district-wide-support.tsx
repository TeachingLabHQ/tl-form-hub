import { MultiSelect, Select } from "@mantine/core";
import type { DbnOption } from "~/domains/coach-log/model";
import type { CoachLogForm } from "../../hooks/use-coach-log-form";
import {
  SOLVES_DISTRICT_WIDE_SUPPORT_OPTIONS,
  SOLVES_HOURS_DURATION_OPTIONS,
  solvesShowsDistrictWideDBNs,
} from "./constants";
import { QuestionField } from "./field";

type Props = {
  form: CoachLogForm;
  dbnOptions: DbnOption[];
};

/** NYC Solves "District Wide Learning Support" touchpoint questions. */
export const SolvesDistrictWideSupport = ({ form, dbnOptions }: Props) => (
  <>
    <QuestionField label="What was the duration of your district wide support during this visit in hours? Please round to the nearest unit.*">
      <Select
        placeholder="Select duration"
        data={SOLVES_HOURS_DURATION_OPTIONS}
        {...form.getInputProps("solvesDistrictWideVisitDuration")}
      />
    </QuestionField>

    <QuestionField label="Please select which additional support you provided during this visit.*">
      <Select
        placeholder="Select a support type"
        data={SOLVES_DISTRICT_WIDE_SUPPORT_OPTIONS}
        {...form.getInputProps("solvesDistrictWideSupportType")}
      />
    </QuestionField>

    {solvesShowsDistrictWideDBNs(form.values.solvesDistrictWideSupportType) && (
      <QuestionField label="Select the DBN(s) for all other schools that were participating in the intervisitation.*">
        <MultiSelect
          placeholder="Select DBNs"
          data={dbnOptions}
          searchable
          {...form.getInputProps("solvesDistrictWideDBNs")}
        />
      </QuestionField>
    )}
  </>
);
