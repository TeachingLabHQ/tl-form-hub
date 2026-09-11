import { MultiSelect, Select } from "@mantine/core";
import { YES_NO_OPTIONS } from "../../constants";
import type { CoachLogForm } from "../../hooks/use-coach-log-form";
import {
  isReadsCapacityBuilderDistrict,
  JES_STRATEGIES_RESOURCES_URL,
  READS_TOUCHPOINT_DISTRICT,
  READS_TOUCHPOINT_LEADER,
  READS_TOUCHPOINT_TEACHER,
  READS_TOUCHPOINT_TYPE_OPTIONS,
  readsShowsDistrictBlock,
  readsShowsLeaderBlock,
  readsShowsTeacherBlock,
} from "./constants";
import { QuestionField, TouchpointSection } from "./field";
import { ReadsDistrictSupport } from "./reads-district-support";
import { ReadsGuidanceNotes } from "./reads-guidance-notes";
import { ReadsLeaderSupport } from "./reads-leader-support";
import { ReadsTeacherSupport } from "./reads-teacher-support";

type Props = {
  form: CoachLogForm;
  district: string;
};

/**
 * NYC Reads coach question set. The "Professional Learning session?" question is
 * asked earlier (top-level, right after coach type) since it gates the coaching
 * questions and the session-date input; this set covers capacity-builder,
 * touchpoint type(s), the per-touchpoint sub-blocks, and the shared
 * guidance/notes questions at the end. Touchpoint type is a multi-select, so
 * more than one sub-block can be shown/answered in the same submission (e.g.
 * a coach can log both teacher AND district support from the same visit).
 */
const TOUCHPOINT_TYPE_NOTE = (
  <>
    Please only select school leader/school leadership team if your support
    included a specific strategy(ies) from the{" "}
    <a
      href={JES_STRATEGIES_RESOURCES_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="font-bold underline"
    >
      Key Concepts: Strategies and Resources
    </a>{" "}
    section of the JES Manual for school leader/school leadership team
    support. If support was primarily for teacher teams, please select
    teacher team support only.
  </>
);

export const ReadsQuestion = ({ form, district }: Props) => {
  const touchpointTypes = form.values.readsTouchpointTypes;

  return (
    <>
      {isReadsCapacityBuilderDistrict(district) && (
        <>
          <QuestionField label="Did the capacity builders provide a schedule prior to the visit?*">
            <Select
              placeholder="Select Yes or No"
              data={YES_NO_OPTIONS}
              {...form.getInputProps("readsScheduleProvided")}
            />
          </QuestionField>

          <QuestionField label="Did the capacity builder attend 2-3 high-impact activities during the coaching day?*">
            <Select
              placeholder="Select Yes or No"
              data={YES_NO_OPTIONS}
              {...form.getInputProps("readsHighImpactActivities")}
            />
          </QuestionField>
        </>
      )}

      <QuestionField
        label="What type of NYC Reads touchpoint are you recording?*"
        note={TOUCHPOINT_TYPE_NOTE}
      >
        <MultiSelect
          placeholder="Select all that apply"
          data={READS_TOUCHPOINT_TYPE_OPTIONS}
          {...form.getInputProps("readsTouchpointTypes")}
        />
      </QuestionField>

      {readsShowsTeacherBlock(touchpointTypes) && (
        <TouchpointSection title={READS_TOUCHPOINT_TEACHER}>
          <ReadsTeacherSupport form={form} />
        </TouchpointSection>
      )}
      {readsShowsLeaderBlock(touchpointTypes) && (
        <TouchpointSection title={READS_TOUCHPOINT_LEADER}>
          <ReadsLeaderSupport form={form} />
        </TouchpointSection>
      )}
      {readsShowsDistrictBlock(touchpointTypes) && (
        <TouchpointSection title={READS_TOUCHPOINT_DISTRICT}>
          <ReadsDistrictSupport form={form} />
        </TouchpointSection>
      )}

      {form.values.readsIsPLSession !== "Yes" && <ReadsGuidanceNotes form={form} />}
    </>
  );
};
