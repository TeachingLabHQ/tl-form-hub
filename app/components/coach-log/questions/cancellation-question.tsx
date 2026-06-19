import { Select, Textarea } from "@mantine/core";
import {
  CANCELED_OTHER_REASON,
  CANCELLATION_REASON_OPTIONS,
  YES_NO_OPTIONS,
} from "../constants";
import type { CoachLogForm } from "../hooks/use-coach-log-form";

type Props = {
  form: CoachLogForm;
};

export const CancellationQuestion = ({ form }: Props) => {
  const { canceled, cancelReason } = form.values;

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="font-medium text-lg">Was the Coaching Session Canceled?</h1>
        <Select
          placeholder="Select Yes or No"
          data={YES_NO_OPTIONS}
          {...form.getInputProps("canceled")}
        />
      </div>

      {canceled === "Yes" && (
        <>
          <div className="flex flex-col gap-1">
            <h1 className="font-medium text-lg">
              Why did the session not take place?
            </h1>
            <Select
              placeholder="Select a reason"
              data={CANCELLATION_REASON_OPTIONS}
              {...form.getInputProps("cancelReason")}
            />
          </div>

          {cancelReason === CANCELED_OTHER_REASON && (
            <div className="flex flex-col gap-1">
              <h1 className="font-medium text-lg">
                What was the reason the activity did not take place?
              </h1>
              <Textarea
                placeholder="Please describe"
                {...form.getInputProps("cancelReasonOther")}
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <h1 className="font-medium text-lg">
              Has the coaching activity been rescheduled or will it be?
            </h1>
            <Select
              placeholder="Select Yes or No"
              data={YES_NO_OPTIONS}
              {...form.getInputProps("rescheduled")}
            />
          </div>
        </>
      )}
    </>
  );
};
