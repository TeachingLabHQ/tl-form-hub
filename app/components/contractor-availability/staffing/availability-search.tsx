import { Badge, Button, CloseButton, Popover, Select } from "@mantine/core";
import { DatePicker, DatePickerInput, type DatesRangeValue } from "@mantine/dates";
import { IconCalendarEvent } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import {
  type AvailabilityMatch,
  addDays,
  dateRange,
  formatDate,
  formatDateWithDay,
  formatRange,
  isWeekday,
  parseDate,
  searchAvailability,
  todayIso,
  toIsoDate,
} from "~/domains/contractor-availability/availability";
import {
  type Contractor,
  STATES,
  SUPPORT_OPTIONS,
} from "~/domains/contractor-availability/model";
import { cn } from "~/utils/utils";
import { FIELD_CLASSES, FOCUS_RING } from "../constants";

const STATE_OPTIONS = Object.entries(STATES)
  .map(([value, s]) => ({ value, label: s.name }))
  .sort((a, b) => a.label.localeCompare(b.label));

type Props = {
  contractors: Contractor[];
  contentAreas: string[];
  onOpen: (email: string) => void;
};

const SHOWN = 6;

// One dense result row: who, where from, and each requested day
const ResultRow = ({
  match,
  total,
  onOpen,
}: {
  match: AvailabilityMatch;
  total: number;
  onOpen: (email: string) => void;
}) => {
  const c = match.contractor;
  const conflicts = match.perDay.filter((d) => d.status.state !== "free");
  return (
    <button
      type="button"
      onClick={() => onOpen(c.email)}
      className="grid grid-cols-1 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 rounded-lg px-3 py-2 text-left hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
    >
      <div className="min-w-0">
        <div className="font-medium truncate">{c.name}</div>
        <div className="text-xs text-white truncate">
          {[c.city, c.state].filter(Boolean).join(", ")}
          {match.travelNote ? ` · ${match.travelNote}` : ""}
        </div>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap gap-1">
          {match.perDay.map(({ day, status }) => (
            <span
              key={day}
              title={`${formatDateWithDay(day)}: ${status.reason}`}
              className={cn(
                "rounded px-1.5 text-[11px] font-semibold tabular-nums leading-5",
                status.state === "free" && "bg-emerald-700 text-white",
                status.state === "partial" && "bg-amber-400 text-black",
                (status.state === "booked" || status.state === "off") && "bg-white/10 text-white line-through"
              )}
            >
              {formatDate(day)}
            </span>
          ))}
        </div>
        {conflicts.length > 0 && (
          <div className="text-xs text-white truncate mt-0.5">
            {conflicts.map((d) => `${formatDate(d.day)}: ${d.status.reason}`).join(" · ")}
          </div>
        )}
      </div>
      <Badge tt="none" color={match.openDays === total ? "teal.9" : "yellow.4"} autoContrast className="justify-self-start md:justify-self-end">
        {match.openDays}/{total} days
      </Badge>
    </button>
  );
};

const ResultGroup = ({
  title,
  matches,
  total,
  onOpen,
}: {
  title: string;
  matches: AvailabilityMatch[];
  total: number;
  onOpen: (email: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  if (matches.length === 0) return null;
  const shown = expanded ? matches : matches.slice(0, SHOWN);
  return (
    <div className="flex flex-col">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-white px-3 pb-1">
        {title} · {matches.length}
      </h3>
      <div className="flex flex-col divide-y divide-white/15 rounded-xl bg-white/10">
        {shown.map((m) => (
          <ResultRow key={m.contractor.email} match={m} total={total} onOpen={onOpen} />
        ))}
      </div>
      {matches.length > SHOWN && (
        <Button variant="subtle" color="white" size="compact-sm" className="self-start mt-1" onClick={() => setExpanded((e) => !e)}>
          {expanded ? "Show fewer" : `Show all ${matches.length}`}
        </Button>
      )}
    </div>
  );
};
// A "Dates needed" chip: click it to pick a new day or range in a calendar
const RangeChip = ({
  range: [start, end],
  onChange,
  onRemove,
}: {
  range: [string, string];
  onChange: (range: [string, string]) => void;
  onRemove: () => void;
}) => {
  const [opened, setOpened] = useState(false);
  const [value, setValue] = useState<DatesRangeValue>([parseDate(start), parseDate(end)]);
  const label = formatRange(start, end);

  const pick = (next: DatesRangeValue) => {
    setValue(next);
    const [from, to] = next;
    if (from && to) {
      onChange([toIsoDate(from), toIsoDate(to)]);
      setOpened(false);
    }
  };

  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-start" withArrow shadow="md" trapFocus>
      <Popover.Target>
        <span className="inline-flex items-center rounded-full bg-white/25 pl-1 pr-1 text-sm">
          <button
            type="button"
            aria-label={`Change ${label}`}
            aria-expanded={opened}
            onClick={() => {
              setValue([parseDate(start), parseDate(end)]);
              setOpened((o) => !o);
            }}
            className={cn("inline-flex items-center gap-1 rounded-full px-2 hover:bg-white/15", FOCUS_RING)}
          >
            <IconCalendarEvent size={14} aria-hidden />
            {label}
          </button>
          <CloseButton size="xs" variant="transparent" c="white" aria-label={`Remove ${label}`} onClick={onRemove} />
        </span>
      </Popover.Target>
      <Popover.Dropdown>
        <DatePicker
          type="range"
          allowSingleDateInRange
          value={value}
          onChange={pick}
          defaultDate={parseDate(start)}
        />
      </Popover.Dropdown>
    </Popover>
  );
};

/** "Who can take these dates?" — the staffing query from the planning doc. */
export const AvailabilitySearch = ({ contractors, contentAreas, onOpen }: Props) => {
  const [ranges, setRanges] = useState<[string, string][]>(() => {
    // Start with the next full work week as an example query
    let monday = addDays(todayIso(), 7);
    while (parseDate(monday).getDay() !== 1) monday = addDays(monday, 1);
    return [[monday, addDays(monday, 4)]];
  });
  const [picker, setPicker] = useState<DatesRangeValue>([null, null]);
  const [role, setRole] = useState("Facilitation");
  const [format, setFormat] = useState<"inperson" | "virtual">("inperson");
  const [state, setState] = useState("NY");
  const [portion, setPortion] = useState("Full day");
  const [contentArea, setContentArea] = useState("");

  const days = useMemo(() => {
    const all = new Set<string>();
    ranges.forEach(([a, b]) => dateRange(a, b).filter(isWeekday).forEach((d) => all.add(d)));
    return [...all].sort();
  }, [ranges]);

  const matches = useMemo(
    () =>
      searchAvailability(contractors, {
        days,
        role,
        format,
        state,
        fullDay: portion === "Full day",
        contentArea,
      }),
    [contractors, days, role, format, state, portion, contentArea]
  );
  const eligible = matches.filter((m) => m.eligible && m.openDays > 0);
  const all = eligible.filter((m) => m.openDays === days.length);
  const some = eligible.filter((m) => m.openDays < days.length);
  const excluded = matches.filter((m) => !m.eligible || m.openDays === 0);

  const addRange = (value: DatesRangeValue) => {
    setPicker(value);
    const [from, to] = value;
    if (from && to) {
      setRanges((r) => [...r, [toIsoDate(from), toIsoDate(to)]]);
      setPicker([null, null]);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
        <DatePickerInput
          className="col-span-2 md:col-span-1"
          type="range"
          allowSingleDateInRange
          label="Add dates"
          classNames={FIELD_CLASSES}
          placeholder="Pick a day or range"
          value={picker}
          onChange={addRange}
        />
        <Select label="Role" classNames={FIELD_CLASSES} data={SUPPORT_OPTIONS} value={role} allowDeselect={false} onChange={(v) => v && setRole(v)} />
        <Select
          label="Format"
          classNames={FIELD_CLASSES}
          data={[
            { value: "inperson", label: "In person" },
            { value: "virtual", label: "Virtual" },
          ]}
          value={format}
          allowDeselect={false}
          onChange={(v) => v && setFormat(v as "inperson" | "virtual")}
        />
        <Select
          label="Location"
          classNames={FIELD_CLASSES}
          data={STATE_OPTIONS}
          value={state}
          searchable
          disabled={format === "virtual"}
          allowDeselect={false}
          onChange={(v) => v && setState(v)}
        />
        <Select
          label="Day portion"
          classNames={FIELD_CLASSES}
          data={["Full day", "Half day"]}
          value={portion}
          allowDeselect={false}
          onChange={(v) => v && setPortion(v)}
        />
        <Select
          label="Content area"
          classNames={FIELD_CLASSES}
          data={[{ value: "", label: "Any" }, ...contentAreas.map((a) => ({ value: a, label: a }))]}
          value={contentArea}
          allowDeselect={false}
          onChange={(v) => setContentArea(v ?? "")}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-sm text-white mr-1">Dates needed:</span>
        {ranges.map((range, i) => (
          <RangeChip
            key={`${range[0]}-${range[1]}-${i}`}
            range={range}
            onChange={(next) => setRanges((r) => r.map((x, j) => (j === i ? next : x)))}
            onRemove={() => setRanges((r) => r.filter((_, j) => j !== i))}
          />
        ))}
        {ranges.length === 0 && <span className="text-sm text-white">none yet. Add a day or range above.</span>}
      </div>

      {days.length > 0 && (
        <>
          <p className="text-sm">
            <span className="text-lg font-semibold">{all.length}</span>{" "}
            <span className="text-white">
              can take all {days.length} weekdays · {some.length} can take some ·{" "}
              {format === "virtual" ? "virtual" : `in person, ${STATES[state]?.name}`} · {role.toLowerCase()}
            </span>
          </p>
          <ResultGroup title="Available every date" matches={all} total={days.length} onOpen={onOpen} />
          <ResultGroup title="Available some dates" matches={some} total={days.length} onOpen={onOpen} />
          {excluded.length > 0 && (
            <details>
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-white px-3">
                Not a match · {excluded.length}
              </summary>
              <ul className="mt-2 flex flex-col divide-y divide-white/15 rounded-xl bg-white/10 text-sm max-h-72 overflow-y-auto">
                {excluded.map((m) => (
                  <li key={m.contractor.email} className="flex flex-wrap gap-x-3 px-3 py-1.5">
                    <button
                      type="button"
                      className="font-medium underline-offset-2 hover:underline"
                      onClick={() => onOpen(m.contractor.email)}
                    >
                      {m.contractor.name}
                    </button>
                    <span className="text-white">{m.reasons.join(" · ") || "Booked on every date"}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
};
