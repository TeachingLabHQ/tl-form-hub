import { MultiSelect, TextInput } from "@mantine/core";
import type { CoachLogForm } from "../../use-coach-log-form";
import {
  DISTRICT_SUPPORT_OPTIONS,
  OTHER_LEADER_OPTION,
  SUPPORTED_DISTRICT_LEADER_OPTIONS,
} from "./constants";
import { QuestionField } from "./field";

type Props = {
  form: CoachLogForm;
};

/** NYC Reads district-support questions (the "District support" touchpoint). */
export const ReadsDistrictSupport = ({ form }: Props) => (
  <>
    <QuestionField label="Which district leaders did you build capacity with today?*">
      <MultiSelect
        placeholder="Select all that apply"
        data={SUPPORTED_DISTRICT_LEADER_OPTIONS}
        {...form.getInputProps("readsSupportedDistrictLeaders")}
      />
    </QuestionField>

    {form.values.readsSupportedDistrictLeaders.includes(OTHER_LEADER_OPTION) && (
      <QuestionField label="Please specify other district leaders:*">
        <TextInput
          placeholder="Other district leaders"
          {...form.getInputProps("readsSupportedDistrictLeadersOther")}
        />
      </QuestionField>
    )}

    <QuestionField label="Please select the capacity building focus provided to district leaders.*">
      <MultiSelect
        placeholder="Select all that apply"
        data={DISTRICT_SUPPORT_OPTIONS}
        {...form.getInputProps("readsDistrictSupports")}
      />
    </QuestionField>
  </>
);
