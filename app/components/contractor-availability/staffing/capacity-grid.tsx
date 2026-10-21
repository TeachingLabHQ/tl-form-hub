import { useMemo, useState } from "react";
import { TextInput } from "@mantine/core";
import {
  addDays,
  dayStatus,
  formatDate,
  formatDateWithDay,
  isWeekday,
  parseDate,
  todayIso,
} from "~/domains/contractor-availability/availability";
import type { Contractor } from "~/domains/contractor-availability/model";
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

/** Contractor × weekday grid for the next 8 weeks. */
export const CapacityGrid = ({
  contractors,
  onOpen,
}: {
  contractors: Contractor[];
  onOpen: (email: string) => void;
}) => {
  const [filter, setFilter] = useState("");
  const days = useMemo(() => {
    const out: string[] = [];
    for (let d = todayIso(); out.length < WEEKS * 5; d = addDays(d, 1)) if (isWeekday(d)) out.push(d);
    return out;
  }, []);
  const rows = contractors.filter((c) => c.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/90">Weekdays only. Hover a square for details; click a name for the profile.</p>
        <TextInput
          placeholder="Filter by name"
          value={filter}
          onChange={(e) => setFilter(e.currentTarget.value)}
          className="w-full sm:w-56"
        />
      </div>
      <div className="overflow-auto max-h-[440px] rounded-lg">
        <table className="border-separate border-spacing-[2px] text-xs">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="sticky left-0 z-20 bg-[#1c3355] backdrop-blur-sm" />
              {days.map((d, i) => (
                <th
                  key={d}
                  className={cn(
                    "font-normal text-[10px] text-white/90 w-4 leading-3 bg-[#1c3355] backdrop-blur-sm",
                    i > 0 && parseDate(d).getDay() === 1 && "pl-1.5"
                  )}
                >
                  {parseDate(d).getDay() === 1 || i === 0 ? formatDate(d).replace(" ", "\n") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.email}>
                <th className="sticky left-0 z-10 bg-[#1c3355] backdrop-blur-sm pr-3 text-left font-medium whitespace-nowrap">
                  <button type="button" className="hover:underline" onClick={() => onOpen(c.email)}>
                    {c.name}
                  </button>
                </th>
                {days.map((d, i) => {
                  const st = dayStatus(c.profile, c.bookouts, d, false);
                  const cls =
                    st.state === "off"
                      ? "bg-white/15"
                      : st.state === "partial"
                        ? "bg-amber-300"
                        : st.state === "booked" && st.bookout
                          ? BOOKOUT_CHIP[st.bookout.type]
                          : "bg-emerald-400/80";
                  return (
                    <td
                      key={d}
                      className={cn(i > 0 && parseDate(d).getDay() === 1 && "pl-1.5")}
                    >
                      <div
                        className={cn("h-[18px] w-4 rounded-[3px]", cls)}
                        title={`${c.name} · ${formatDateWithDay(d)}: ${st.reason}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="text-sm text-white/90 py-2">No contractors match.</p>}
      </div>
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
