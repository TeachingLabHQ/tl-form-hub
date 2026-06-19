import { Select } from "@mantine/core";
import type { CoachLogForm } from "../../hooks/use-coach-log-form";
import {
  SOLVES_TOUCHPOINT_OPTIONS,
  solvesShowsAdditionalSupport,
  solvesShowsLeaderBlock,
  solvesShowsTeacherBlock,
} from "./constants";
import { QuestionField } from "./field";
import { SolvesAdditionalSupport } from "./solves-additional-support";
import { SolvesLeaderSupport } from "./solves-leader-support";
import { SolvesTeacherSupport } from "./solves-teacher-support";

type Props = {
  form: CoachLogForm;
};

/**
 * NYC Solves coach question set. Branches on the touchpoint type into teacher,
 * leader, and additional-support sub-blocks.
 */
export const SolvesQuestion = ({ form }: Props) => {
  const touchpoint = form.values.solvesTouchpoint;

  return (
    <>
      <QuestionField
        label="What types of NYC Solves touchpoint are you recording?*"
        note="If you provided leader-specific support during this visit, you'll be asked about it after your teacher support. If you only debriefed teacher support with a school leader or had no leader interaction, select 'Teacher support ONLY'."
      >
        <Select
          placeholder="Select a touchpoint type"
          data={SOLVES_TOUCHPOINT_OPTIONS}
          {...form.getInputProps("solvesTouchpoint")}
        />
      </QuestionField>

      {solvesShowsTeacherBlock(touchpoint) && <SolvesTeacherSupport form={form} />}
      {solvesShowsLeaderBlock(touchpoint) && <SolvesLeaderSupport form={form} />}
      {solvesShowsAdditionalSupport(touchpoint) && (
        <SolvesAdditionalSupport form={form} />
      )}
    </>
  );
};
