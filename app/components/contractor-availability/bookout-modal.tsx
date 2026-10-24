import { Button, Group, Modal, Select, Text, Textarea } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useEffect, useState } from "react";
import { parseDate, toIsoDate } from "~/domains/contractor-availability/availability";
import {
  type BookoutType,
  type DayPortion,
  type NewBookout,
} from "~/domains/contractor-availability/model";

type Props = {
  opened: boolean;
  // Pre-filled start date (YYYY-MM-DD), or null for empty dates
  startDay: string | null;
  onClose: () => void;
  onSubmit: (bookout: NewBookout) => Promise<string | null>;
};

const TYPE_OPTIONS = [
  { value: "nontl", label: "Non-TL bookout (outside conflict)" },
  { value: "fac", label: "TL facilitation date" },
  { value: "other", label: "TL other commitment (travel, meeting, admin, content dev)" },
];

const PORTION_OPTIONS = [
  { value: "Full day", label: "Full day" },
  { value: "AM", label: "AM only" },
  { value: "PM", label: "PM only" },
];

export const BookoutModal = ({ opened, startDay, onClose, onSubmit }: Props) => {
  const [type, setType] = useState<BookoutType>("nontl");
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);
  const [portion, setPortion] = useState<DayPortion>("Full day");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fresh form each time it opens
  useEffect(() => {
    if (!opened) return;
    const day = startDay ? parseDate(startDay) : null;
    setType("nontl");
    setStart(day);
    setEnd(day);
    setPortion("Full day");
    setNote("");
    setError(null);
  }, [opened, startDay]);

  const submit = async () => {
    if (!start || !end) {
      setError("Start and end dates are required.");
      return;
    }
    if (end < start) {
      setError("The end date is before the start date.");
      return;
    }
    setSaving(true);
    const message = await onSubmit({
      type,
      start: toIsoDate(start),
      end: toIsoDate(end),
      portion,
      note: note.trim(),
    });
    setSaving(false);
    if (message) setError(message);
    else onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Submit a bookout" centered>
      <div className="flex flex-col gap-3">
        <Select
          label="Type"
          data={TYPE_OPTIONS}
          value={type}
          allowDeselect={false}
          onChange={(v) => v && setType(v as BookoutType)}
        />
        <Group grow align="flex-start">
          <DateInput
            label="Start date"
            placeholder="Pick a date"
            value={start}
            onChange={(d) => {
              setStart(d);
              // Keep the range valid: a one-day bookout by default
              if (d && (!end || end < d)) setEnd(d);
            }}
          />
          <DateInput
            label="End date"
            placeholder="Pick a date"
            value={end}
            minDate={start ?? undefined}
            onChange={setEnd}
          />
        </Group>
        <Select
          label="Day portion"
          data={PORTION_OPTIONS}
          value={portion}
          allowDeselect={false}
          onChange={(v) => v && setPortion(v as DayPortion)}
        />
        <Textarea
          label="Notes (optional)"
          placeholder="e.g. Family travel, out of town"
          autosize
          minRows={2}
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
        />
        {error && (
          <Text size="sm" c="red">
            {error}
          </Text>
        )}
        <Group grow mt="xs">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={submit}>
            Submit
          </Button>
        </Group>
      </div>
    </Modal>
  );
};
