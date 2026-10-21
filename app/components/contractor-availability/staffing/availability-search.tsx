import { Badge, Button, CloseButton, Select, Text } from "@mantine/core";
import { DatePickerInput, type DatesRangeValue } from "@mantine/dates";
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
import { PANEL } from "../constants";

const STATE_OPTIONS = Object.entries(STATES)
  .map(([value, s]) => ({ value, label: s.name }))
  .sort((a, b) => a.label.localeCompare(b.label));

type Props = {
  contractors: Contractor[];
  contentAreas: string[];
  onOpen: (email: string) => void;
};

const ResultCard = ({
  match,
  total,
  onOpen,
}: {
  match: AvailabilityMatch;
  total: number;
  onOpen: (email: string) => void;
}) => {
  const conflicts = match.perDay.filter((d) => d.status.state !== "free");
  const c = match.contractor;
  return (
    <div className="rounded-xl bg-white/20 p-3 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{c.name}</span>
        <span className="text-xs text-white/80">
          {[c.city, c.state].filter(Boolean).join(", ")}
          {match.travelNote ? ` · ${match.travelNote}` : ""}
        </span>
        {c.profileSource === "intake" && (
          <Badge size="xs" color="yellow" variant="light">
            Onboarding answers
          </Badge>
        )}
        <Badge className="ml-auto" color={match.openDays === total ? "teal" : "yellow"}>
          {match.openDays} of {total} days
        </Badge>
        <Button size="compact-xs" variant="white" onClick={() => onOpen(c.email)}>
          Profile
        </Button>
      </div>
      <div className="flex flex-wrap gap-1">
        {match.perDay.map(({ day, status }) => (
          <span
            key={day}
            title={`${formatDateWithDay(day)}: ${status.reason}`}
            className={cn(
              "rounded px-1.5 text-[11px] font-semibold tabular-nums",
              status.state === "free" && "bg-emerald-600 text-white",
              status.state === "partial" && "bg-amber-400 text-black",
              (status.state === "booked" || status.state === "off") &&
                "bg-white/25 text-white/80 line-through"
            )}
          >
            {formatDate(day)}
          </span>
        ))}
      </div>
      {conflicts.length > 0 && (
        <p className="text-xs text-white/85">
          {conflicts
            .slice(0, 4)
            .map((d) => `${formatDate(d.day)}: ${d.status.reason}`)
            .join(" · ")}
          {conflicts.length > 4 ? ` · +${conflicts.length - 4} more` : ""}
        </p>
      )}
    </div>
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
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-6 items-start">
      <div className={cn(PANEL, "flex flex-col gap-4")}>
        <h2 className="text-xl font-semibold">Find available contractors</h2>
        <div className="flex flex-col gap-2">
          <h1 className="font-medium text-lg">Dates needed</h1>
          <div className="flex flex-wrap gap-1.5">
            {ranges.map(([a, b], i) => (
              <span
                key={`${a}-${b}-${i}`}
                className="inline-flex items-center gap-1 rounded-full bg-white/25 pl-3 pr-1 text-sm"
              >
                {formatRange(a, b)}
                <CloseButton
                  size="xs"
                  variant="transparent"
                  c="white"
                  aria-label={`Remove ${formatRange(a, b)}`}
                  onClick={() => setRanges((r) => r.filter((_, j) => j !== i))}
                />
              </span>
            ))}
            {ranges.length === 0 && <span className="text-sm text-white/80">Add at least one date.</span>}
          </div>
          <DatePickerInput
            type="range"
            allowSingleDateInRange
            placeholder="Add a day or a range"
            value={picker}
            onChange={addRange}
          />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="font-medium text-lg">Role</h1>
          <Select data={SUPPORT_OPTIONS} value={role} allowDeselect={false} onChange={(v) => v && setRole(v)} />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="font-medium text-lg">Format</h1>
          <Select
            data={[
              { value: "inperson", label: "In person" },
              { value: "virtual", label: "Virtual" },
            ]}
            value={format}
            allowDeselect={false}
            onChange={(v) => v && setFormat(v as "inperson" | "virtual")}
          />
        </div>
        {format === "inperson" && (
          <div className="flex flex-col gap-2">
            <h1 className="font-medium text-lg">Location</h1>
            <Select
              data={STATE_OPTIONS}
              value={state}
              searchable
              allowDeselect={false}
              onChange={(v) => v && setState(v)}
            />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <h1 className="font-medium text-lg">Day portion</h1>
          <Select
            data={["Full day", "Half day"]}
            value={portion}
            allowDeselect={false}
            onChange={(v) => v && setPortion(v)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="font-medium text-lg">Content area</h1>
          <Select
            data={[{ value: "", label: "Any" }, ...contentAreas.map((a) => ({ value: a, label: a }))]}
            value={contentArea}
            allowDeselect={false}
            onChange={(v) => setContentArea(v ?? "")}
          />
        </div>
      </div>

      <div className={cn(PANEL, "flex flex-col gap-3")}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold">
            {days.length ? `${all.length} can take every date` : "Results"}
          </h2>
          {days.length > 0 && (
            <span className="text-sm text-white/80">
              {days.length} weekdays · {format === "virtual" ? "virtual" : `in person, ${STATES[state]?.name}`} ·{" "}
              {role.toLowerCase()}
            </span>
          )}
        </div>
        {days.length === 0 ? (
          <Text size="sm" c="white">
            Add dates on the left to see who can take them.
          </Text>
        ) : (
          <>
            {all.length > 0 && <h3 className="text-sm font-semibold text-white/85">Available every date</h3>}
            {all.map((m) => (
              <ResultCard key={m.contractor.email} match={m} total={days.length} onOpen={onOpen} />
            ))}
            {all.length === 0 && (
              <p className="text-sm text-white/85">No one is open on every date. Partial matches are below.</p>
            )}
            {some.length > 0 && <h3 className="text-sm font-semibold text-white/85 pt-2">Available some dates</h3>}
            {some.map((m) => (
              <ResultCard key={m.contractor.email} match={m} total={days.length} onOpen={onOpen} />
            ))}
            {excluded.length > 0 && (
              <details className="pt-2">
                <summary className="cursor-pointer text-sm font-semibold text-white/85">
                  {excluded.length} not a match
                </summary>
                <ul className="mt-2 flex flex-col divide-y divide-white/20 text-sm">
                  {excluded.map((m) => (
                    <li key={m.contractor.email} className="flex flex-wrap gap-3 py-1.5">
                      <button
                        type="button"
                        className="font-medium underline-offset-2 hover:underline"
                        onClick={() => onOpen(m.contractor.email)}
                      >
                        {m.contractor.name}
                      </button>
                      <span className="text-white/80">{m.reasons.join(" · ") || "Booked on every date"}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  );
};
