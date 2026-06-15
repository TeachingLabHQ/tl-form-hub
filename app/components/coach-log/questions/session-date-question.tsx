import { Loader, Select, Text } from "@mantine/core";
import type { SessionDateOption } from "~/domains/coach-log/model";
import type { CoachLogForm } from "../use-coach-log-form";

type Props = {
  form: CoachLogForm;
  options: SessionDateOption[];
  loading: boolean;
};

/**
 * Date-of-session selector. Options come from the coaching PL calendar, scoped
 * to the logged-in coach + the selected district (fetched once a district is
 * chosen). Real values are YYYY-MM-DD so they map straight into the Monday date
 * column on submit. When the calendar has no dates for the coach + district, an
 * "N/A" option is offered (and auto-selected by the form) so the required field
 * can still be submitted.
 */
export const SessionDateQuestion = ({ form, options, loading }: Props) => {
  const district = form.values.district;
  const noDatesFound = !!district && !loading && options.length === 0;

  const data: SessionDateOption[] = noDatesFound
    ? [{ value: "N/A", label: "N/A — no scheduled dates found" }]
    : options;

  const placeholder = !district
    ? "Select a district first"
    : loading
    ? "Loading dates..."
    : "Select a date";

  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-medium text-lg">
        Please select the date of your coaching session*
      </h1>
      <Text size="sm" c="white">
        Note: Dates in this dropdown are pulled from your coaching calendar for
        the selected district. If the date you need is not listed, please update
        your scheduled visit for this district before submitting your log.
      </Text>
      <Select
        placeholder={placeholder}
        data={data}
        searchable
        disabled={!district || loading}
        rightSection={loading ? <Loader size="xs" /> : undefined}
        {...form.getInputProps("sessionDate")}
      />
    </div>
  );
};
