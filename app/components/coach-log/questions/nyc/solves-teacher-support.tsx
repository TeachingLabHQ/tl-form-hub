import { MultiSelect, Select, Textarea, TextInput } from "@mantine/core";
import { YES_NO_OPTIONS } from "../../constants";
import type { CoachLogForm } from "../../use-coach-log-form";
import {
  JES_GLOSSARY_URL,
  MAX_SOLVES_PROTOCOLS,
  SOLVES_GRADE_CONTENT_OPTIONS,
  SOLVES_INTERVISITATION_PROTOCOL,
  SOLVES_PROTOCOL_OPTIONS,
  SOLVES_TEACHER_VISIT_DURATION_OPTIONS,
  SUPPORTED_TEACHER_TYPE_OPTIONS,
} from "./constants";
import { QuestionField } from "./field";

type Props = {
  form: CoachLogForm;
};

/** NYC Solves teacher support questions (teacher-inclusive touchpoints). */
export const SolvesTeacherSupport = ({ form }: Props) => (
  <>
    <QuestionField label="What was the duration of this visit in hours?*">
      <Select
        placeholder="Select duration"
        data={SOLVES_TEACHER_VISIT_DURATION_OPTIONS}
        {...form.getInputProps("solvesTeacherVisitDuration")}
      />
    </QuestionField>

    <QuestionField label="Did you support any of the following teachers during this visit?*">
      <MultiSelect
        placeholder="Select all that apply"
        data={SUPPORTED_TEACHER_TYPE_OPTIONS}
        {...form.getInputProps("solvesSupportedTeacherTypes")}
      />
    </QuestionField>

    <QuestionField label="Select ALL the grades/content areas you supported with teachers today.*">
      <MultiSelect
        placeholder="Select all that apply"
        data={SOLVES_GRADE_CONTENT_OPTIONS}
        {...form.getInputProps("solvesGradeContentAreas")}
      />
    </QuestionField>

    <QuestionField
      label="Please select the 1–3 primary protocols/strategies used to support teachers in this visit.*"
      note={
        <>
          Make sure to select "Intervisitation Protocol" if you supported
          multiple schools in a single visit. See a detailed description of each
          in the{" "}
          <a
            href={JES_GLOSSARY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold underline"
          >
            Glossary of the JES Manual
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
        {...form.getInputProps("solvesTeacherProtocols")}
      />
    </QuestionField>

    {form.values.solvesTeacherProtocols.includes(SOLVES_INTERVISITATION_PROTOCOL) && (
      <QuestionField label="Please list the DBN's of all the schools participating in the intervisitation.*">
        <TextInput
          placeholder="e.g. 09X022, 09X011"
          {...form.getInputProps("solvesIntervisitationDBNs")}
        />
      </QuestionField>
    )}

    <QuestionField label="Were a majority of the teachers you worked with today using HQIM?*">
      <Select
        placeholder="Select Yes or No"
        data={YES_NO_OPTIONS}
        {...form.getInputProps("solvesMajorityUsingHQIM")}
      />
    </QuestionField>

    {form.values.solvesMajorityUsingHQIM === "No" && (
      <QuestionField label="Because a majority of teachers were NOT using HQIM during your visit, please share additional context on your response.*">
        <Textarea
          placeholder="Describe what you saw when you would have expected to see HQIM in place."
          autosize
          minRows={3}
          {...form.getInputProps("solvesHQIMContext")}
        />
      </QuestionField>
    )}
  </>
);
