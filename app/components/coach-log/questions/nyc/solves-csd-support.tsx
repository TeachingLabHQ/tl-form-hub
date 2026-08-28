import { Select } from "@mantine/core";
import type { CoachLogForm } from "../../hooks/use-coach-log-form";
import { SOLVES_CSD_TRACK_OPTIONS, SOLVES_HOURS_DURATION_OPTIONS } from "./constants";
import { QuestionField } from "./field";

type Props = {
  form: CoachLogForm;
};

/** NYC Solves "CSD: Leader Support (at one school)" touchpoint questions. */
export const SolvesCsdSupport = ({ form }: Props) => (
  <>
    <QuestionField label="What was the duration of your support for school leaders during this visit in hours? Please round to the nearest unit.*">
      <Select
        placeholder="Select duration"
        data={SOLVES_HOURS_DURATION_OPTIONS}
        {...form.getInputProps("solvesCsdVisitDuration")}
      />
    </QuestionField>

    <QuestionField label="Please select the track of support used to support leaders in this visit.*">
      <Select
        placeholder="Select a track"
        data={SOLVES_CSD_TRACK_OPTIONS}
        {...form.getInputProps("solvesCsdTrack")}
      />
    </QuestionField>
  </>
);
