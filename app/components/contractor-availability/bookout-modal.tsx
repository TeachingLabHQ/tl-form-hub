import { Button, Group, Modal, Select, Text, Textarea } from "@mantine/core";
import { DatePickerInput, type DatesRangeValue } from "@mantine/dates";
import { useEffect, useState } from "react";
import {
  parseDate,
  toIsoDate,
} from "~/domains/contractor-availability/availability";
import {
  type BookoutType,
  type DayPortion,
  type NewBookout,
  DAY_PORTIONS,
} from "~/domains/contractor-availability/model";

type Props = {
  opened: boolean;
  // Pre-filled start date (YYYY-MM-DD), or null for an empty range
  startDay: string | null;
  onClose: () => void;
  onSubmit: (bookout: NewBookout) => Promise<string | null>;
};

const TYPE_OPTIONS = [
  { value: "nontl", label: "Non-TL bookout (outside conflict)" },
  { value: "other", label: "Other TL commitment (travel, meeting, admin, content dev)" },
  { value: "fac", label: "TL facilitation or coaching date" },
];

export const BookoutModal = ({ opened, startDay, onClose, onSubmit }: Props) => {
  const [type, setType] = useState<BookoutType>("nontl");
  const [range, setRange] = useState<DatesRangeValue>([null, null]);
  const [portion, setPortion] = useState<DayPortion>("Full day");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fresh form each time it opens
  useEffect(() => {
    if (!opened) return;
    const start = startDay ? parseDate(startDay) : null;
    setType("nontl");
    setRange([start, start]);
    setPortion("Full day");
    setNote("");
    setError(null);
  }, [opened, startDay]);

  const submit = async () => {
    const [from, to] = range;
    if (!from) {
      setError("Pick the dates you're booked.");
      return;
    }
    setSaving(true);
    const message = await onSubmit({
      type,
      start: toIsoDate(from),
      end: toIsoDate(to ?? from),
      portion,
      note: note.trim(),
    });
    setSaving(false);
    if (message) setError(message);
    else onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Log a bookout" centered>
      <div className="flex flex-col gap-4">
        <Select
          label="What is it?"
          data={TYPE_OPTIONS}
          value={type}
          allowDeselect={false}
          onChange={(v) => v && setType(v as BookoutType)}
        />
        <DatePickerInput
          type="range"
          allowSingleDateInRange
          label="Dates"
          description="Pick one day, or a start and end day"
          placeholder="Pick dates"
          value={range}
          onChange={setRange}
        />
        <Select
          label="Day portion"
          data={DAY_PORTIONS}
          value={portion}
          allowDeselect={false}
          onChange={(v) => v && setPortion(v as DayPortion)}
        />
        <Textarea
          label="Note (optional)"
          placeholder="e.g. Family travel. Staffing sees this."
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
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={submit}>
            Save bookout
          </Button>
        </Group>
      </div>
    </Modal>
  );
};

