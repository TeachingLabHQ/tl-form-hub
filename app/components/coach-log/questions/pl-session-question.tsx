import { Select, Text } from "@mantine/core";
import { YES_NO_OPTIONS } from "../constants";
import type { CoachLogForm } from "../hooks/use-coach-log-form";

type Props = {
  form: CoachLogForm;
  onChange: (value: string) => void;
};

/**
 * "Are you logging a Professional Learning Session?" — shown right after the
 * coach-type question for NYC Reads coaches. A PL session isn't a coaching
 * activity, so answering Yes hides the 1:1/group coaching questions and switches
 * the session-date field to a free calendar pick (both handled in the form).
 */
export const PlSessionQuestion = ({ form, onChange }: Props) => {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-medium text-lg">
        Are you logging a Professional Learning Session?*
      </h1>
      <Text size="sm" c="white">
        Professional Learning and coaching activities must be logged separately.
        If you are submitting a Professional Learning session, do not include any
        coaching activities in this log.
      </Text>
      <Select
        placeholder="Select Yes or No"
        data={YES_NO_OPTIONS}
        value={form.values.readsIsPLSession || null}
        onChange={(value) => onChange(value || "")}
        error={form.errors.readsIsPLSession}
      />
    </div>
  );
};
