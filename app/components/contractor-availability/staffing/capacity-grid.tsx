import { useMemo, useState } from "react";
import { Portal, TextInput } from "@mantine/core";
import {
  type DayStatus,
  addDays,
  dayStatus,
  formatDate,
  formatDateWithDay,
  isWeekday,
  parseDate,
  todayIso,
} from "~/domains/contractor-availability/availability";
import { type Contractor, bookoutTypeLabel } from "~/domains/contractor-availability/model";
import { cn } from "~/utils/utils";
import { BOOKOUT_CHIP } from "../constants";

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

// The hovered cell, with where to draw the readout (viewport coordinates)
type Hover = { row: number; col: number; x: number; y: number };

/**
 * Contractor × weekday grid for the next 8 weeks. Hovering a square
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
  const [hover, setHover] = useState<Hover | null>(null);
  const days = useMemo(() => {
    const out: string[] = [];
    for (let d = todayIso(); out.length < WEEKS * 5; d = addDays(d, 1)) if (isWeekday(d)) out.push(d);
    return out;
  }, []);
  const rows = useMemo(
    () => contractors.filter((c) => c.name.toLowerCase().includes(filter.toLowerCase())),
    [contractors, filter]
  );
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
  const weekStart = (i: number) => i > 0 && parseDate(days[i]!).getDay() === 1;
  const hovered = hover && rows[hover.row] ? { c: rows[hover.row]!, st: statuses[hover.row]![hover.col]! } : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/90">
          Weekdays only. Hover a square for details; click a name for the profile.
        </p>
        <TextInput
          placeholder="Filter by name"
          value={filter}
          onChange={(e) => setFilter(e.currentTarget.value)}
          className="w-full sm:w-56"
        />
      </div>
      <div className="overflow-auto max-h-[480px] rounded-lg" onScroll={() => setHover(null)}>
        <table className="w-full min-w-[720px] border-separate border-spacing-[2px] text-xs">
          <thead className="sticky top-0 z-30">
            <tr>
              <th className="sticky left-0 z-20 w-px bg-[#1c3355]" />
              {days.map((d, i) => (
                <th
                  key={d}
                  className={cn(
                    "font-normal text-[10px] text-white/90 leading-3 bg-[#1c3355] whitespace-pre",
                    weekStart(i) && "pl-1.5",
                    hover?.col === i && "text-white font-semibold"
                  )}
                >
                  {weekStart(i) || i === 0 ? formatDate(d).replace(" ", "\n") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody onMouseLeave={() => setHover(null)}>
            {rows.map((c, r) => (
              <tr key={c.email}>
                <th
                  className={cn(
                    "sticky left-0 z-10 bg-[#1c3355] pr-3 text-left font-medium whitespace-nowrap",
                    hover?.row === r && "text-amber-200"
                  )}
                >
                  <button type="button" className="hover:underline" onClick={() => onOpen(c.email)}>
                    {c.name}
                  </button>
                </th>
                {days.map((d, i) => (
                  <td key={d} className={cn(weekStart(i) && "pl-1.5")}>
                    <div
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHover({ row: r, col: i, x: rect.left + rect.width / 2, y: rect.top });
                      }}
                      className={cn(
                        "h-5 min-w-3 w-full rounded-[3px] transition-opacity",
                        cellClass(statuses[r]![i]!),
                        hover && hover.row !== r && hover.col !== i && "opacity-60",
                        hover?.row === r && hover.col === i && "ring-2 ring-white"
                      )}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="sticky bottom-0 z-30">
              <tr>
                <th className="sticky left-0 z-20 bg-[#1c3355] pr-3 pt-1 text-left font-medium whitespace-nowrap">
                  Open that day
                </th>
                {openByDay.map((n, i) => (
                  <td
                    key={days[i]}
                    className={cn(
                      "bg-[#1c3355] pt-1 text-center text-[10px] tabular-nums text-white/90",
                      weekStart(i) && "pl-1.5",
                      hover?.col === i && "text-white font-semibold"
                    )}
                  >
                    {formatDays(n)}
                  </td>
                ))}
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
