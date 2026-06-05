import { Select, Text } from "@mantine/core";
import type { CoachLogForm } from "../use-coach-log-form";

type Props = {
  form: CoachLogForm;
};

/**
 * Date-of-session selector.
 * TODO(source): options are pulled from the project's logistics board. Using
 * dummy dates for now; values are YYYY-MM-DD so they map straight into the
 * Monday date column on submit.
 */
const DUMMY_DATE_OPTIONS = [
  { value: "2026-06-01", label: "Monday, June 1, 2026" },
  { value: "2026-06-03", label: "Wednesday, June 3, 2026" },
  { value: "2026-06-08", label: "Monday, June 8, 2026" },
  { value: "2026-06-10", label: "Wednesday, June 10, 2026" },
  { value: "2026-06-15", label: "Monday, June 15, 2026" },
];

export const SessionDateQuestion = ({ form }: Props) => {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-medium text-lg">
        Please select the date of your coaching session*
      </h1>
      <Text size="sm" c="white">
        Note: Dates in this dropdown are pulled directly from the project's
        logistics board. If the date you need is not listed, please update the
        expected visit date for this district and school in the logistics board
        before submitting your log.
      </Text>
      <Select
        placeholder="Select a date"
        data={DUMMY_DATE_OPTIONS}
        searchable
        {...form.getInputProps("sessionDate")}
      />
     
    </div>
  );
};
