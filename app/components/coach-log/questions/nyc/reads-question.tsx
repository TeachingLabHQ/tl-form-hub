import { Select } from "@mantine/core";
import { YES_NO_OPTIONS } from "../../constants";
import type { CoachLogForm } from "../../hooks/use-coach-log-form";
import {
  isReadsCapacityBuilderDistrict,
  READS_TOUCHPOINT_OPTIONS,
  readsShowsDistrictBlock,
  readsShowsLeaderBlock,
  readsShowsMtssPilot,
  readsShowsTeacherBlock,
} from "./constants";
import { QuestionField } from "./field";
import { MtssPilotQuestion } from "./mtss-pilot-question";
import { ReadsDistrictSupport } from "./reads-district-support";
import { ReadsLeaderSupport } from "./reads-leader-support";
import { ReadsTeacherSupport } from "./reads-teacher-support";

type Props = {
  form: CoachLogForm;
  district: string;
  school: string;
};

/**
 * NYC Reads coach question set. The "Professional Learning session?" question is
 * asked earlier (top-level, right after coach type) since it gates the coaching
 * questions and the session-date input; this set covers capacity-builder,
 * touchpoint, and the per-touchpoint sub-blocks.
 */
export const ReadsQuestion = ({ form, district, school }: Props) => {
  const touchpoint = form.values.readsTouchpoint;

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

      <QuestionField label="What types of NYC Reads touchpoint are you recording?*">
        <Select
          placeholder="Select a touchpoint type"
          data={READS_TOUCHPOINT_OPTIONS}
          {...form.getInputProps("readsTouchpoint")}
        />
      </QuestionField>

      {readsShowsTeacherBlock(touchpoint) && <ReadsTeacherSupport form={form} />}
      {readsShowsLeaderBlock(touchpoint) && <ReadsLeaderSupport form={form} />}
      {readsShowsDistrictBlock(touchpoint) && <ReadsDistrictSupport form={form} />}
      {readsShowsMtssPilot(touchpoint, district, school) && (
        <MtssPilotQuestion form={form} />
      )}
    </>
  );
};
