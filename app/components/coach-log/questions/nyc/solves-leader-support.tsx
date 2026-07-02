import { Select } from "@mantine/core";
import type { CoachLogForm } from "../../hooks/use-coach-log-form";
import {
  SOLVES_LEADER_SUPPORT_DURATION_OPTIONS,
  SOLVES_LEADER_SUPPORT_TRACK_OPTIONS,
} from "./constants";
import { QuestionField } from "./field";

type Props = {
  form: CoachLogForm;
};

/** NYC Solves school-leader support questions (leader-inclusive touchpoints). */
export const SolvesLeaderSupport = ({ form }: Props) => (
  <>
    <QuestionField label="What was the duration of your support for school leaders during this visit in hours?*">
      <Select
        placeholder="Select duration"
        data={SOLVES_LEADER_SUPPORT_DURATION_OPTIONS}
        {...form.getInputProps("solvesLeaderSupportDuration")}
      />
    </QuestionField>

    <QuestionField label="Please select the track of support used to support leaders in this visit.*">
      <Select
        placeholder="Select a track"
        data={SOLVES_LEADER_SUPPORT_TRACK_OPTIONS}
        {...form.getInputProps("solvesLeaderSupportTrack")}
      />
    </QuestionField>
  </>
);
