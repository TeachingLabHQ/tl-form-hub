import { MultiSelect, Select, TextInput } from "@mantine/core";
import { YES_NO_OPTIONS } from "../../constants";
import type { CoachLogForm } from "../../hooks/use-coach-log-form";
import {
  JES_GLOSSARY_URL,
  MAX_SOLVES_PROTOCOLS,
  OTHER_OPTION,
  SOLVES_HOURS_DURATION_OPTIONS,
  SOLVES_HSD_GRADE_CONTENT_OPTIONS,
  SOLVES_HSD_PRIMARY_RESOURCE_OPTIONS,
  SOLVES_PROTOCOL_OPTIONS,
} from "./constants";
import { QuestionField } from "./field";

type Props = {
  form: CoachLogForm;
};

/** NYC Solves "HSD Only: Supplemental Time Teacher Collaboration" touchpoint questions. */
export const SolvesHsdSupport = ({ form }: Props) => (
  <>
    <QuestionField label="What was the duration of your HSD Only: Supplemental Time Teacher Collaboration during this visit in hours? Please round to the nearest unit.*">
      <Select
        placeholder="Select duration"
        data={SOLVES_HOURS_DURATION_OPTIONS}
        {...form.getInputProps("solvesHsdVisitDuration")}
      />
    </QuestionField>

    <QuestionField label="Select ALL the grades/content areas you supported with teachers today.*">
      <MultiSelect
        placeholder="Select all that apply"
        data={SOLVES_HSD_GRADE_CONTENT_OPTIONS}
        {...form.getInputProps("solvesHsdGradeContentAreas")}
      />
    </QuestionField>

    <QuestionField label="What was/were the primary resource(s) you supported using during supplemental time?*">
      <MultiSelect
        placeholder="Select all that apply"
        data={SOLVES_HSD_PRIMARY_RESOURCE_OPTIONS}
        {...form.getInputProps("solvesHsdPrimaryResources")}
      />
    </QuestionField>

    {form.values.solvesHsdPrimaryResources.includes(OTHER_OPTION) && (
      <QuestionField label="Please specify the other primary resource used.*">
        <TextInput {...form.getInputProps("solvesHsdPrimaryResourcesOther")} />
      </QuestionField>
    )}

    <QuestionField
      label="Please select the 1-3 primary protocols/strategies used to support teachers in this visit.*"
      note={
        <>
          Make sure to select "Intervisitation Protocol" if you supported
          multiple schools in a single visit. See a detailed description of
          each in the{" "}
          <a
            href={JES_GLOSSARY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold underline"
          >
            SY 26-27 JES Manual
          </a>
          .
        </>
      }
    >
      <MultiSelect
        placeholder="Select up to 3 protocols"
        data={SOLVES_PROTOCOL_OPTIONS}
        maxValues={MAX_SOLVES_PROTOCOLS}
        searchable
        {...form.getInputProps("solvesHsdProtocols")}
      />
    </QuestionField>

    <QuestionField label="NYC Solves: Were school leader(s) present for a majority of your support visit today?*">
      <Select
        placeholder="Select Yes or No"
        data={YES_NO_OPTIONS}
        {...form.getInputProps("solvesHsdLeaderPresent")}
      />
    </QuestionField>
  </>
);
