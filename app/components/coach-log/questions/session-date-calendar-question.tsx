import { DateInput } from "@mantine/dates";
import { Text } from "@mantine/core";
import type { CoachLogForm } from "../hooks/use-coach-log-form";

type Props = {
  form: CoachLogForm;
};

// YYYY-MM-DD <-> Date using LOCAL date parts, so the calendar day never shifts
// across a timezone boundary (form state stays YYYY-MM-DD, like the scheduled
// dropdown, so submission + the duplicate check are unchanged).
const toDate = (ymd: string): Date | null => {
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const toYmd = (date: Date | null): string => {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/**
 * Free calendar date picker for the session date, used for Professional Learning
 * sessions (where the date isn't drawn from the coaching PL calendar). Writes
 * the same YYYY-MM-DD `sessionDate` value the scheduled dropdown does.
 */
export const SessionDateCalendarQuestion = ({ form }: Props) => {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-medium text-lg">
        Please select the date of your Professional Learning session*
      </h1>
      <Text size="sm" c="white">
        Select the date this Professional Learning session took place.
      </Text>
      <DateInput
        placeholder="Select a date"
        value={toDate(form.values.sessionDate)}
        onChange={(date) => form.setFieldValue("sessionDate", toYmd(date))}
        error={form.errors.sessionDate}
      />
    </div>
  );
};
