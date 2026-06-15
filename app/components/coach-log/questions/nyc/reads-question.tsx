import { Select } from "@mantine/core";
import type { YesNo } from "~/domains/coach-log/model";
import { YES_NO_OPTIONS } from "../../constants";
import type { CoachLogForm } from "../../use-coach-log-form";
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
 * NYC Reads coach question set. Orchestrates the standalone questions (PL
 * session, capacity-builder, touchpoint) and delegates each touchpoint branch
 * to a focused sub-block.
 */
export const ReadsQuestion = ({ form, district, school }: Props) => {
  const touchpoint = form.values.readsTouchpoint;

  // A Professional Learning Session isn't a coaching activity, so selecting
  // "Yes" auto-answers the 1:1 and group coaching questions "No".
  const handlePLSessionChange = (value: string | null) => {
    const next = (value ?? "") as YesNo | "";
    form.setFieldValue("readsIsPLSession", next);
    if (next === "Yes") {
      form.setFieldValue("did1on1", "No");
      form.setFieldValue("didGroupCoaching", "No");
    }
  };

  return (
    <>
      <QuestionField label="Are you logging a Professional Learning Session?*">
        <Select
          placeholder="Select Yes or No"
          data={YES_NO_OPTIONS}
          value={form.values.readsIsPLSession || null}
          onChange={handlePLSessionChange}
          error={form.errors.readsIsPLSession}
        />
      </QuestionField>

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
