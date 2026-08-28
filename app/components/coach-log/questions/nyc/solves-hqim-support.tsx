import { MultiSelect, Select } from "@mantine/core";
import { YES_NO_OPTIONS } from "../../constants";
import type { CoachLogForm } from "../../hooks/use-coach-log-form";
import {
  JES_GLOSSARY_URL,
  MAX_SOLVES_PROTOCOLS,
  SOLVES_HOURS_DURATION_OPTIONS,
  SOLVES_HQIM_GRADE_CONTENT_OPTIONS,
  SOLVES_PROTOCOL_OPTIONS,
  solvesShowsHqimLeaderPresent,
} from "./constants";
import { QuestionField } from "./field";

type Props = {
  form: CoachLogForm;
};

/** NYC Solves "HQIM-Based Teacher Collaboration" touchpoint questions. */
export const SolvesHqimSupport = ({ form }: Props) => {
  const gradeContentAreas = form.values.solvesHqimGradeContentAreas;

  return (
    <>
      <QuestionField label="What was the duration of this teacher support in hours? Please round to the nearest unit.*">
        <Select
          placeholder="Select duration"
          data={SOLVES_HOURS_DURATION_OPTIONS}
          {...form.getInputProps("solvesHqimVisitDuration")}
        />
      </QuestionField>

      <QuestionField label="Select ALL the grades/content areas you supported with teachers today.*">
        <MultiSelect
          placeholder="Select all that apply"
          data={SOLVES_HQIM_GRADE_CONTENT_OPTIONS}
          searchable
          {...form.getInputProps("solvesHqimGradeContentAreas")}
        />
      </QuestionField>

      {solvesShowsHqimLeaderPresent(gradeContentAreas) && (
        <QuestionField label="NYC Solves: Were school leader(s) present for a majority of your support visit today?*">
          <Select
            placeholder="Select Yes or No"
            data={YES_NO_OPTIONS}
            {...form.getInputProps("solvesHqimLeaderPresent")}
          />
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
              Key Concepts of the SY 26-27 JES Manual
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
          {...form.getInputProps("solvesHqimProtocols")}
        />
      </QuestionField>
    </>
  );
};
