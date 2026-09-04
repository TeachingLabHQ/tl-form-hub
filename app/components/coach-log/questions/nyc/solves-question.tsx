import { MultiSelect } from "@mantine/core";
import type { CoachLogForm } from "../../hooks/use-coach-log-form";
import {
  SOLVES_TOUCHPOINT_CSD,
  SOLVES_TOUCHPOINT_DISTRICT_WIDE,
  SOLVES_TOUCHPOINT_ES,
  SOLVES_TOUCHPOINT_HQIM,
  SOLVES_TOUCHPOINT_HSD,
  SOLVES_TOUCHPOINT_TYPE_OPTIONS,
  solvesShowsCsd,
  solvesShowsDistrictWide,
  solvesShowsEs,
  solvesShowsHqim,
  solvesShowsHsd,
  solvesShowsPostVisitSnapshot,
} from "./constants";
import { QuestionField, TouchpointSection } from "./field";
import { SolvesCsdSupport } from "./solves-csd-support";
import { SolvesDistrictWideSupport } from "./solves-district-wide-support";
import { SolvesEsSupport } from "./solves-es-support";
import { SolvesGuidanceNotes } from "./solves-guidance-notes";
import { SolvesHqimSupport } from "./solves-hqim-support";
import { SolvesHsdSupport } from "./solves-hsd-support";
import { SolvesPostVisitSnapshot } from "./solves-post-visit-snapshot";

type Props = {
  form: CoachLogForm;
};

/**
 * NYC Solves coach question set. Touchpoint type is a multi-select — a coach
 * can log several unique kinds of support from the same visit (hours are
 * tracked separately per type so they're never double-counted), so more than
 * one sub-block below can be shown/answered in the same submission.
 */
export const SolvesQuestion = ({ form }: Props) => {
  const touchpointTypes = form.values.solvesTouchpointTypes;

  return (
    <>
      <QuestionField
        label="What type of NYC Solves touchpoint are you recording?*"
        note="Select all the unique types of support you provided during this visit. Any support hours logged should NOT be double counted in multiple support categories (ex. if you supported teachers and leaders at the same time, then only select the category that best captures that support)."
      >
        <MultiSelect
          placeholder="Select all that apply"
          data={SOLVES_TOUCHPOINT_TYPE_OPTIONS}
          {...form.getInputProps("solvesTouchpointTypes")}
        />
      </QuestionField>

      {solvesShowsHqim(touchpointTypes) && (
        <TouchpointSection title={SOLVES_TOUCHPOINT_HQIM}>
          <SolvesHqimSupport form={form} />
        </TouchpointSection>
      )}
      {solvesShowsHsd(touchpointTypes) && (
        <TouchpointSection title={SOLVES_TOUCHPOINT_HSD}>
          <SolvesHsdSupport form={form} />
        </TouchpointSection>
      )}
      {solvesShowsEs(touchpointTypes) && (
        <TouchpointSection title={SOLVES_TOUCHPOINT_ES}>
          <SolvesEsSupport form={form} />
        </TouchpointSection>
      )}
      {solvesShowsCsd(touchpointTypes) && (
        <TouchpointSection title={SOLVES_TOUCHPOINT_CSD}>
          <SolvesCsdSupport form={form} />
        </TouchpointSection>
      )}
      {solvesShowsDistrictWide(touchpointTypes) && (
        <TouchpointSection title={SOLVES_TOUCHPOINT_DISTRICT_WIDE}>
          <SolvesDistrictWideSupport form={form} />
        </TouchpointSection>
      )}

      {solvesShowsPostVisitSnapshot(touchpointTypes) && (
        <SolvesPostVisitSnapshot form={form} />
      )}

      {form.values.solvesIsPLSession !== "Yes" && <SolvesGuidanceNotes form={form} />}
    </>
  );
};
