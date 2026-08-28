import { Select, Textarea } from "@mantine/core";
import type { CoachLogForm } from "../../hooks/use-coach-log-form";
import {
  SOLVES_POST_VISIT_SNAPSHOT_OPTIONS,
  solvesShowsPostVisitFollowUp,
} from "./constants";
import { QuestionField } from "./field";

type Props = {
  form: CoachLogForm;
};

/**
 * Shown once per submission when HQIM-Based Teacher Collaboration, HSD
 * Supplemental Time, or CSD Leader Support is selected — a single overall
 * snapshot of the visit rather than one per selected touchpoint type.
 */
export const SolvesPostVisitSnapshot = ({ form }: Props) => (
  <>
    <QuestionField label="NYC Solves: Post Visit Snapshot*">
      <Select
        placeholder="Select a snapshot"
        data={SOLVES_POST_VISIT_SNAPSHOT_OPTIONS}
        {...form.getInputProps("solvesPostVisitSnapshot")}
      />
    </QuestionField>

    {solvesShowsPostVisitFollowUp(form.values.solvesPostVisitSnapshot) && (
      <QuestionField label="NYC Solves: Additional information and follow up notes based on the Post Visit Snapshot indication.*">
        <Textarea
          autosize
          minRows={3}
          {...form.getInputProps("solvesPostVisitFollowUp")}
        />
      </QuestionField>
    )}
  </>
);
