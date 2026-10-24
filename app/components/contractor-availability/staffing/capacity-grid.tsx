import { memo, useCallback, useMemo, useState } from "react";
import { Portal, SegmentedControl, TextInput } from "@mantine/core";
import {
  type CapacitySort,
  type DayStatus,
  addDays,
  CAPACITY_SORT_LABELS,
  capacityBands,
  dayStatus,
  formatDate,
  formatDateWithDay,
  isWeekday,
  parseDate,
  todayIso,
} from "~/domains/contractor-availability/availability";
import { type Contractor, bookoutTypeLabel, MONTH_LABELS } from "~/domains/contractor-availability/model";
import { cn } from "~/utils/utils";
import { BOOKOUT_CHIP, SEGMENTED_CLASSES } from "../constants";

const WEEKS = 8;

const LEGEND = [
  ["bg-emerald-400/80", "Open"],
  ["bg-amber-300", "Half day open"],
  [BOOKOUT_CHIP.fac, "TL facilitation / coaching"],
  [BOOKOUT_CHIP.other, "Other TL commitment"],
  [BOOKOUT_CHIP.nontl, "Non-TL bookout"],
  ["bg-white/15", "Not a working day"],
];

const cellClass = (st: DayStatus) =>
  st.state === "off"
    ? "bg-white/15"
    : st.state === "partial"
    ? "bg-amber-300"
    : st.state === "booked" && st.bookout
    ? BOOKOUT_CHIP[st.bookout.type]
    : "bg-emerald-400/80";

const stateLabel = (st: DayStatus) =>
  st.state === "free"
    ? "Open"
    : st.state === "partial"
    ? "Half day open"
    : st.state === "booked" && st.bookout
    ? bookoutTypeLabel(st.bookout.type)
    : "Not a working day";

const formatDays = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

const DAY_LETTER = ["S", "M", "T", "W", "T", "F", "S"];

// A thin spacer column before each Monday, so weeks read as blocks while every
// day column stays the same width
const withWeekGaps = (days: string[], weekStarts: boolean[], cell: (i: number) => React.ReactNode, gap: string) =>
  days.flatMap((d, i) => [weekStarts[i] ? <td key={`gap-${d}`} aria-hidden className={gap} /> : null, cell(i)]);

// The hovered cell, with where to draw the readout (viewport coordinates)
type Hover = { row: number; col: number; x: number; y: number };

// A full-width label above each band, its text pinned to the left edge
const BandLabel = ({ cols, divider, children }: { cols: number; divider?: boolean; children: React.ReactNode }) => (
  <tr>
    <td colSpan={cols} className={cn("pb-0.5 pt-2", divider && "border-t border-white/30")}>
      <span className="sticky left-0 text-[11px] font-semibold text-white/90">{children}</span>
    </td>
  </tr>
);

// The ~5k squares, kept out of hover renders: hovering only rewrites the
// highlight <style> below, keyed off each square's data-r/data-c. Rows from
// `staleFrom` on are the stale-GAP band, dimmed.
const GridBody = memo(function GridBody({
  rows,
  staleFrom,
  statuses,
  days,
  weekStarts,
  onOpen,
  onHover,
}: {
  rows: Contractor[];
  staleFrom: number;
  statuses: DayStatus[][];
  days: string[];
  weekStarts: boolean[];
  onOpen: (email: string) => void;
  onHover: (e: React.MouseEvent | null) => void;
}) {
  const cols = 1 + days.length + weekStarts.filter(Boolean).length;
  return (
    <tbody onMouseOver={onHover} onMouseLeave={() => onHover(null)}>
      {rows.flatMap((c, r) => [
        r === 0 && staleFrom > 0 ? (
          <BandLabel key="band-current" cols={cols}>
            GAP current · {staleFrom}
          </BandLabel>
        ) : null,
        r === staleFrom ? (
          <BandLabel key="band-stale" cols={cols} divider={r > 0}>
            Stale or never-confirmed GAP · {rows.length - staleFrom}{" "}
            <span className="font-normal text-white/70">— their open days may not be real</span>
          </BandLabel>
        ) : null,
        <tr key={c.email}>
          <th data-name={r} className="sticky left-0 z-10 bg-[#1c3355] pr-3 text-left font-medium whitespace-nowrap">
            <button
              type="button"
              title={c.name}
              className={cn("block max-w-full truncate hover:underline", r >= staleFrom && "text-white/60")}
              onClick={() => onOpen(c.email)}
            >
              {c.name}
            </button>
          </th>
          {withWeekGaps(
            days,
            weekStarts,
            (i) => (
              <td key={days[i]} className={r >= staleFrom ? "opacity-40" : undefined}>
                <div data-r={r} data-c={i} className={cn("h-5 w-full rounded-[3px]", cellClass(statuses[r]![i]!))} />
              </td>
            ),
            ""
          )}
        </tr>,
      ])}
    </tbody>
  );
});

/**
 * Contractor × weekday grid for the next 8 weeks, current GAPs above stale
 * ones, busiest first by default so busy rows group and crunch weeks show as
 * columns. Hovering a square
 * highlights its row and day and shows what's booked plus how many of the
 * listed contractors are open that day; the bottom row totals each day.
 */
export const CapacityGrid = ({
  contractors,
  onOpen,
}: {
  contractors: Contractor[];
  onOpen: (email: string) => void;
}) => {
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<CapacitySort>("busiest");
  const [hover, setHover] = useState<Hover | null>(null);
  const days = useMemo(() => {
    const out: string[] = [];
    for (let d = todayIso(); out.length < WEEKS * 5; d = addDays(d, 1)) if (isWeekday(d)) out.push(d);
    return out;
  }, []);
  const bands = useMemo(
    () =>
      capacityBands(
        contractors.filter((c) => c.name.toLowerCase().includes(filter.toLowerCase())),
        days,
        sort
      ),
    [contractors, filter, days, sort]
  );
  const rows = useMemo(() => [...bands.current, ...bands.stale], [bands]);
  const statuses = useMemo(
    () => rows.map((c) => days.map((d) => dayStatus(c.profile, c.bookouts, d, false))),
    [rows, days]
  );
  // Open contractor-days per day; a half day open counts as half
  const openByDay = useMemo(
    () =>
      days.map((_, i) =>
        statuses.reduce((n, r) => n + (r[i]!.state === "free" ? 1 : r[i]!.state === "partial" ? 0.5 : 0), 0)
      ),
    [statuses, days]
  );
  const weekStarts = useMemo(() => days.map((d, i) => i > 0 && parseDate(d).getDay() === 1), [days]);
  // One delegated listener for every square; bails out while still on the same one
  const onHover = useCallback((e: React.MouseEvent | null) => {
    const cell = e && (e.target as HTMLElement).closest<HTMLElement>("[data-c]");
    if (!cell) return setHover(null);
    const row = Number(cell.dataset.r);
    const col = Number(cell.dataset.c);
    setHover((h) => {
      if (h?.row === row && h.col === col) return h;
      const rect = cell.getBoundingClientRect();
      return { row, col, x: rect.left + rect.width / 2, y: rect.top };
    });
  }, []);
  const hovered = hover && rows[hover.row] ? { c: rows[hover.row]!, st: statuses[hover.row]![hover.col]! } : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/90">
          Weekdays only. Busiest sorts by TL days in these 8 weeks. Hover a square for details; click a name for the
          profile.
        </p>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <SegmentedControl
            size="xs"
            radius="xl"
            classNames={SEGMENTED_CLASSES}
            aria-label="Sort rows"
            value={sort}
            onChange={(v) => setSort(v as CapacitySort)}
            data={Object.entries(CAPACITY_SORT_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <TextInput
            placeholder="Filter by name"
            value={filter}
            onChange={(e) => setFilter(e.currentTarget.value)}
            className="w-full sm:w-56"
          />
        </div>
      </div>
      <div className="overflow-auto max-h-[480px] rounded-lg" onScroll={() => setHover(null)}>
        {hover && (
          <style>{`
            [data-capacity-grid] [data-c] { opacity: 0.6 }
            [data-capacity-grid] [data-r="${hover.row}"], [data-capacity-grid] [data-c="${hover.col}"] { opacity: 1 }
            [data-capacity-grid] [data-r="${hover.row}"][data-c="${hover.col}"] { box-shadow: 0 0 0 2px #fff }
            [data-capacity-grid] [data-name="${hover.row}"] { color: #fde68a }
          `}</style>
        )}
        <table
          data-capacity-grid
          className="w-full min-w-[900px] table-fixed border-separate border-spacing-[2px] text-xs"
        >
          <colgroup>
            <col className="w-[180px]" />
            {days.flatMap((d, i) => [weekStarts[i] ? <col key={`gap-${d}`} className="w-1" /> : null, <col key={d} />])}
          </colgroup>
          <thead className="sticky top-0 z-30 bg-[#1c3355]">
            <tr>
              <th rowSpan={2} className="sticky left-0 z-20 bg-[#1c3355]" />
              {withWeekGaps(
                days,
                weekStarts,
                (i) => (
                  // Month name where it starts (and on the first column), overflowing to the right
                  <th key={days[i]} className="overflow-visible whitespace-nowrap text-left text-[10px] font-semibold">
                    {i === 0 || parseDate(days[i]!).getDate() < parseDate(days[i - 1]!).getDate()
                      ? MONTH_LABELS[parseDate(days[i]!).getMonth()]
                      : ""}
                  </th>
                ),
                ""
              )}
            </tr>
            <tr>
              {withWeekGaps(
                days,
                weekStarts,
                (i) => (
                  <th
                    key={days[i]}
                    className={cn(
                      "pb-1 text-center text-[10px] font-normal leading-3 tabular-nums text-white/90",
                      hover?.col === i && "text-white font-semibold"
                    )}
                  >
                    <span className="block text-white/60">{DAY_LETTER[parseDate(days[i]!).getDay()]}</span>
                    {parseDate(days[i]!).getDate()}
                  </th>
                ),
                ""
              )}
            </tr>
          </thead>
          <GridBody
            rows={rows}
            staleFrom={bands.current.length}
            statuses={statuses}
            days={days}
            weekStarts={weekStarts}
            onOpen={onOpen}
            onHover={onHover}
          />
          {rows.length > 0 && (
            <tfoot className="sticky bottom-0 z-30">
              <tr>
                <th className="sticky left-0 z-20 bg-[#1c3355] pr-3 pt-1 text-left font-medium whitespace-nowrap">
                  Open that day
                </th>
                {withWeekGaps(
                  days,
                  weekStarts,
                  (i) => (
                    <td
                      key={days[i]}
                      className={cn(
                        "bg-[#1c3355] pt-1 text-center text-[10px] tabular-nums text-white/90",
                        hover?.col === i && "text-white font-semibold"
                      )}
                    >
                      {formatDays(openByDay[i]!)}
                    </td>
                  ),
                  "bg-[#1c3355]"
                )}
              </tr>
            </tfoot>
          )}
        </table>
        {rows.length === 0 && <p className="text-sm text-white/90 py-2">No contractors match.</p>}
      </div>
      {/* Portaled: the page card's backdrop blur would otherwise anchor `fixed` to the card */}
      {hover && hovered && (
        <Portal>
          <div
            role="tooltip"
            className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-lg bg-[#082040] px-3 py-2 text-xs text-white shadow-lg ring-1 ring-white/25"
            style={{ left: hover.x, top: hover.y - 6 }}
          >
            <div className="text-sm font-semibold">{stateLabel(hovered.st)}</div>
            <div className="text-white/90">
              {hovered.c.name} · {formatDateWithDay(days[hover.col]!)}
            </div>
            {hovered.st.reason !== stateLabel(hovered.st) && (
              <div className="max-w-64 text-white/90">{hovered.st.reason}</div>
            )}
            <div className="mt-1 border-t border-white/20 pt-1 text-white/90">
              <span className="font-semibold text-white">{formatDays(openByDay[hover.col]!)}</span> of {rows.length}{" "}
              listed open that day
            </div>
          </div>
        </Portal>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/90">
        {LEGEND.map(([cls, label]) => (
          <span key={label} className="inline-flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-sm", cls)} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
};
