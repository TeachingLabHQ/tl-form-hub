import { ActionIcon, Button } from "@mantine/core";
import { IconChevronLeft, IconChevronRight, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import {
  bookoutsOn,
  dayStatus,
  todayIso,
  toIsoDate,
} from "~/domains/contractor-availability/availability";
import {
  type AvailabilityProfile,
  type Bookout,
  BOOKOUT_TYPES,
} from "~/domains/contractor-availability/model";
import { cn } from "~/utils/utils";
import { BOOKOUT_CHIP, PANEL } from "./constants";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type Props = {
  profile: AvailabilityProfile;
  bookouts: Bookout[];
  onAdd: (day: string | null) => void;
};

/** Month calendar of the contractor's bookouts. Tap a day to log one. */
export const BookoutCalendar = ({ profile, bookouts, onAdd }: Props) => {
  const today = todayIso();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const move = (delta: number) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const firstDow = new Date(cursor.year, cursor.month, 1).getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) =>
    toIsoDate(new Date(cursor.year, cursor.month, i + 1))
  );

  return (
    <div className={cn(PANEL, "flex flex-col gap-3")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <ActionIcon variant="subtle" color="white" onClick={() => move(-1)} aria-label="Previous month">
            <IconChevronLeft size={18} />
          </ActionIcon>
          <h2 className="text-base font-semibold min-w-[140px] text-center">
            {MONTHS[cursor.month]} {cursor.year}
          </h2>
          <ActionIcon variant="subtle" color="white" onClick={() => move(1)} aria-label="Next month">
            <IconChevronRight size={18} />
          </ActionIcon>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={() => onAdd(null)}>
          Submit a bookout
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {DOW.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-white/80 py-1">
            {d}
          </div>
        ))}
        {Array.from({ length: firstDow }, (_, i) => (
          <div key={`blank-${i}`} aria-hidden="true" />
        ))}
        {days.map((day) => {
          const items = bookoutsOn(bookouts, day);
          const off = dayStatus(profile, [], day, false).state === "off";
          return (
            <button
              key={day}
              type="button"
              onClick={() => onAdd(day)}
              aria-label={`${day}${items.length ? `, ${items.length} bookout${items.length > 1 ? "s" : ""}` : ""}`}
              className={cn(
                "min-h-[48px] md:min-h-[64px] rounded-md p-1 text-left flex flex-col gap-0.5 min-w-0",
                "bg-white/20 hover:bg-white/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white",
                off && !items.length && "bg-black/10",
                day < today && "opacity-60"
              )}
            >
              <span
                className={cn(
                  "text-xs tabular-nums",
                  day === today && "self-start rounded-full bg-white text-[#0053B3] px-1.5 font-semibold"
                )}
              >
                {Number(day.slice(8))}
              </span>
              {items.map((b) => (
                <span
                  key={b.id}
                  className={cn(
                    "truncate rounded px-1 text-[10px] font-semibold leading-4 hidden md:block",
                    BOOKOUT_CHIP[b.type]
                  )}
                >
                  {b.portion !== "Full day" ? `${b.portion} · ` : ""}
                  {b.note || BOOKOUT_TYPES.find((t) => t.value === b.type)?.label}
                </span>
              ))}
              {items.length > 0 && (
                <span className={cn("md:hidden h-1.5 rounded", BOOKOUT_CHIP[items[0]!.type])} />
              )}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/90">
        {BOOKOUT_TYPES.map((t) => (
          <span key={t.value} className="inline-flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-sm", BOOKOUT_CHIP[t.value])} />
            {t.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 text-white/75">
          <span className="h-2.5 w-2.5 rounded-sm bg-black/15" />
          Outside your usual days
        </span>
        <span className="ml-auto text-white/75">Tap a day to start a bookout there</span>
      </div>
    </div>
  );
};
