import { Loader, Select, Text } from "@mantine/core";
import type { SessionDateOption } from "~/domains/coach-log/model";
import type { CoachLogForm } from "../hooks/use-coach-log-form";

type Props = {
  form: CoachLogForm;
  options: SessionDateOption[];
  loading: boolean;
};

/**
 * Date-of-session selector. Options come from the coaching PL calendar, scoped
 * to the logged-in coach + the selected district (fetched once a district is
 * chosen). Values are YYYY-MM-DD so they map straight into the Monday date
 * column on submit. When the calendar has no dates for the coach + district, the
 * field is left blank (no option) so the required date can't be submitted — the
 * coach is prompted to contact the team to confirm the date first.
 */
export const SessionDateQuestion = ({ form, options, loading }: Props) => {
  const district = form.values.district;
  const noDatesFound = !!district && !loading && options.length === 0;

  const placeholder = !district
    ? "Select a district first"
    : loading
    ? "Loading dates..."
    : noDatesFound
    ? "No scheduled dates found"
    : "Select a date";

  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-medium text-lg">
        Please select the date of your coaching session*
      </h1>
      <Text size="sm" c="white">
        Note: Dates available in this dropdown are pulled directly from your district's Logistics Board in Monday.com. If the date you need is not listed, update the Logistics Board first. Once added there, the date will become available for selection in this form
      </Text>
      <Select
        placeholder={placeholder}
        data={options}
        searchable
        disabled={!district || loading}
        rightSection={loading ? <Loader size="xs" /> : undefined}
        {...form.getInputProps("sessionDate")}
      />
      {noDatesFound && (
        <Text size="sm" c="yellow">
          No scheduled dates were found for you in this district. Please contact
          the team to confirm the date before submitting this log.
        </Text>
      )}
    </div>
  );
};
