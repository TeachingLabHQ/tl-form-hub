import { Notification, SegmentedControl, Tooltip } from "@mantine/core";
import { IconAlertTriangle, IconX } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import {
  type GapStatus,
  type LoadStatus,
  type WeekLoad,
  formatDate,
  GAP_STATUS_LABELS,
  LOAD_STATUS_LABELS,
  staffingSnapshot,
  todayIso,
  weeklyLoad,
} from "~/domains/contractor-availability/availability";
import { type Contractor, bookoutTypeLabel } from "~/domains/contractor-availability/model";
import { FormSkeleton } from "~/components/form-kit";
import { cn } from "~/utils/utils";
import { BOOKOUT_CHIP, FOCUS_RING, PANEL, SEGMENTED_CLASSES } from "../constants";
import { Panel } from "../panel";
import { AskAiBubble } from "./ask-ai-bubble";
import { AvailabilitySearch } from "./availability-search";
import { CapacityGrid } from "./capacity-grid";
import { ContractorDrawer } from "./contractor-drawer";
import { ContractorTable, GAP_BAR, LOAD_BAR } from "./contractor-table";

// Each tile picks up the color its subject has elsewhere on the page: TL work
// is blue, room matches "Open" in the capacity grid, GAPs the teal of a
// current GAP. Needs-attention turns amber only when there's something in it.
const STAT_TONE = {
  neutral: "",
  sky: "bg-sky-400/[0.09] border-l-sky-300",
  emerald: "bg-emerald-400/[0.09] border-l-emerald-400",
  teal: "bg-teal-400/[0.09] border-l-teal-300",
  amber: "bg-amber-400/[0.14] border-l-amber-300",
};

const Stat = ({
  label,
  value,
  sub,
  tone = "neutral",
  icon,
  active,
  onClick,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: keyof typeof STAT_TONE;
  icon?: React.ReactNode;
  active?: boolean;
  // Tiles that count contractors filter the table to them
  onClick?: () => void;
}) => {
  const Tile = onClick ? "button" : "div";
  return (
    <Tile
      {...(onClick && { type: "button" as const, onClick, "aria-pressed": !!active })}
      className={cn(
        PANEL,
        "p-4 md:p-4 border-l-[3px] border-l-white/40 text-left",
        STAT_TONE[tone],
        onClick && cn("hover:bg-white/10", FOCUS_RING),
        active && "shadow-[inset_0_0_0_2px_white]"
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-white/90">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-semibold tabular-nums leading-tight mt-1">{value}</div>
      <div className="text-xs text-white/90 mt-0.5">{sub}</div>
    </Tile>
  );
};

// Work by contractors with no stated capacity is shown, but kept out of the percent
const UNTARGETED = "bg-white/45";
const LOAD_LEGEND = [
  [BOOKOUT_CHIP.fac, bookoutTypeLabel("fac")],
  [BOOKOUT_CHIP.other, bookoutTypeLabel("other")],
  [UNTARGETED, "TL work, no capacity set"],
] as const;

const days = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

// TL days booked each week against the roster's stated capacity, one row per
// week. The white tick is the capacity; past it the row's percent turns amber.
const WeeklyLoad = ({ weeks }: { weeks: WeekLoad[] }) => {
  const max = Math.max(1, ...weeks.map((w) => Math.max(w.target, w.days.fac + w.days.other + w.untargeted)));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/90">
        {LOAD_LEGEND.map(([color, label]) => (
          <span key={label} className="inline-flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-sm", color)} />
            {label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-0.5 bg-white" />
          Stated capacity
        </span>
      </div>
      <div className="flex flex-col gap-1">
        {weeks.map((w) => {
          const tl = w.days.fac + w.days.other;
          const pct = w.target ? Math.round((tl / w.target) * 100) : null;
          return (
            <Tooltip
              key={w.start}
              multiline
              withArrow
              label={
                <div className="text-xs tabular-nums">
                  <div className="font-semibold">Week of {formatDate(w.start)}</div>
                  <div>{bookoutTypeLabel("fac")}: {days(w.days.fac)} days</div>
                  <div>{bookoutTypeLabel("other")}: {days(w.days.other)} days</div>
                  <div>Stated capacity: {Math.round(w.target)} days</div>
                  <div>TL work, no capacity set: {days(w.untargeted)} days</div>
                  <div>{bookoutTypeLabel("nontl")}: {days(w.days.nontl)} days</div>
                </div>
              }
            >
              <div
                tabIndex={0}
                aria-label={`Week of ${formatDate(w.start)}: ${days(tl)} TL days of ${Math.round(w.target)} days stated capacity`}
                className={cn(
                  "grid grid-cols-[52px_minmax(0,1fr)_auto] sm:grid-cols-[60px_minmax(0,1fr)_150px] items-center gap-3 rounded-md px-1.5 py-1 text-sm hover:bg-white/10",
                  FOCUS_RING
                )}
              >
                <span className="tabular-nums">{formatDate(w.start)}</span>
                <span className="relative h-3 rounded-full bg-white/20">
                  <span
                    className="absolute inset-y-0 left-0 flex gap-0.5 overflow-hidden rounded-full"
                    style={{ width: `${((tl + w.untargeted) / max) * 100}%` }}
                  >
                    {/* Empty segments are left out so the 2px gaps only sit between real ones */}
                    {(
                      [
                        [BOOKOUT_CHIP.fac, w.days.fac],
                        [BOOKOUT_CHIP.other, w.days.other],
                        [UNTARGETED, w.untargeted],
                      ] as const
                    ).map(([color, n]) => n > 0 && <span key={color} className={cn("h-full", color)} style={{ flexGrow: n }} />)}
                  </span>
                  {w.target > 0 && (
                    <span className="absolute -inset-y-1 w-0.5 bg-white" style={{ left: `${(w.target / max) * 100}%` }} />
                  )}
                </span>
                <span className="text-right tabular-nums text-xs text-white/90 whitespace-nowrap">
                  {pct !== null && (
                    <span className={cn("font-semibold", pct > 100 ? "text-amber-300" : "text-white")}>{pct}% · </span>
                  )}
                  {days(tl)} of {Math.round(w.target)}
                </span>
              </div>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};

type Bar = { key: string; label: string; value: number; color: string; active?: boolean };

// Horizontal share bars; clickable when onSelect is given
const Bars = ({
  bars,
  unit,
  onSelect,
}: {
  bars: Bar[];
  unit: (n: number) => string;
  onSelect?: (key: string) => void;
}) => {
  const total = bars.reduce((a, b) => a + b.value, 0);
  return (
    <div className="flex flex-col gap-1">
      {bars.map((b) => {
        const pct = total ? Math.round((b.value / total) * 100) : 0;
        const Row = onSelect ? "button" : "div";
        return (
          <Row
            key={b.key}
            {...(onSelect && {
              type: "button" as const,
              onClick: () => onSelect(b.key),
              "aria-pressed": !!b.active,
            })}
            className={cn(
              // Phones: label and value on one line, the bar full width under them
              "grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,190px)_minmax(0,1fr)_112px] items-center gap-x-3 gap-y-1 rounded-md px-1.5 py-1 text-left text-sm",
              onSelect && cn("hover:bg-white/10", FOCUS_RING),
              b.active && "bg-white/15"
            )}
          >
            <span className="truncate">{b.label}</span>
            <span className="h-2.5 rounded-full bg-white/20 overflow-hidden col-span-2 order-last sm:col-span-1 sm:order-none">
              <span className={cn("block h-full rounded-full", b.color)} style={{ width: `${pct}%` }} />
            </span>
            <span className="text-right tabular-nums text-xs text-white/90 whitespace-nowrap">
              <span className="font-semibold text-white">{pct}%</span> · {unit(b.value)}
            </span>
          </Row>
        );
      })}
      {total === 0 && <p className="text-xs text-white/90 px-1.5">Nothing logged yet.</p>}
    </div>
  );
};

/** Admin view: roll-ups, contractor table + drawer, then search and capacity tools. */
export const StaffingView = ({
  contractors,
  loading,
  error,
  onSaveStaffNotes,
  onViewed,
  extras,
}: {
  contractors: Contractor[];
  loading: boolean;
  error: string | null;
  onSaveStaffNotes: (email: string, notes: string) => Promise<string | null>;
  onViewed: (email: string) => void;
  // More floating tools beside Ask AI, given a way to open a contractor's drawer
  extras?: (onOpen: (email: string) => void) => React.ReactNode;
}) => {
  const [openEmail, setOpenEmail] = useState<string | null>(null);
  // A roster filter (see matchesFilter), set by the tiles, the status bars or the table
  const [filter, setFilter] = useState<string | null>(null);
  const [tool, setTool] = useState("search");
  const today = todayIso();
  const toggle = (key: string) => setFilter((f) => (f === key ? null : key));

  const snapshot = useMemo(() => staffingSnapshot(contractors, today), [contractors, today]);
  const weeks = useMemo(() => weeklyLoad(contractors, today), [contractors, today]);

  const contentAreas = useMemo(
    () => [...new Set(contractors.flatMap((c) => c.contentAreas))].filter((a) => a !== "Not Applicable").sort(),
    [contractors]
  );

  if (loading && contractors.length === 0) return <FormSkeleton message="Loading contractors…" rows={6} />;
  if (error && contractors.length === 0) {
    return (
      <Notification
        icon={<IconX size={20} />}
        color="red"
        title="Couldn't load contractors from Monday. Please try again or contact the technology team."
        withCloseButton={false}
      />
    );
  }

  const n = contractors.length;
  const { capacity, gap } = snapshot;
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          label="TL utilization, next 4 weeks"
          tone="sky"
          value={capacity ? `${Math.round((snapshot.tlBooked / capacity) * 100)}%` : "—"}
          sub={`${days(snapshot.tlBooked)} of ${Math.round(capacity)} days of stated capacity · ${snapshot.withTarget} of ${n} gave one`}
        />
        <Stat
          label="Contractors with room"
          tone="emerald"
          value={String(snapshot.withRoom)}
          sub={`${snapshot.openDaysWithRoom.toLocaleString()} open days among them`}
          active={filter === "room"}
          onClick={() => toggle("room")}
        />
        <Stat
          label="GAPs current"
          tone="teal"
          value={n ? `${Math.round((gap.current / n) * 100)}%` : "—"}
          sub={`${gap.stale} stale · ${gap.never} never confirmed`}
          active={filter === "refresh"}
          onClick={() => toggle("refresh")}
        />
        <Stat
          label="Needs attention"
          tone={snapshot.attention ? "amber" : "neutral"}
          icon={snapshot.attention ? <IconAlertTriangle size={14} className="text-amber-300" /> : undefined}
          value={String(snapshot.attention)}
          sub={`${snapshot.overTarget} over capacity · ${snapshot.doubleBookedDays} double-booked ${
            snapshot.doubleBookedDays === 1 ? "day" : "days"
          }`}
          active={filter === "attention"}
          onClick={() => toggle("attention")}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel
          title="TL load by week"
          meta={<span className="text-xs text-white/90">Percent of stated capacity, from those who gave one</span>}
        >
          <WeeklyLoad weeks={weeks} />
        </Panel>
        <Panel title="Contractor status" meta={<span className="text-xs text-white/90">Click to filter the table</span>}>
          <div className="flex flex-col gap-3">
            <div>
              <h3 className="text-xs font-medium text-white/90 px-1.5 mb-1">
                Load, next 4 weeks · the {snapshot.withTarget} who stated capacity
              </h3>
              {/* Those with no stated capacity are the never-confirmed GAPs below; counting them twice would swamp these bars */}
              <Bars
                unit={String}
                onSelect={(key) => toggle(`load:${key}`)}
                bars={(["over", "booked", "room"] as LoadStatus[]).map((s) => ({
                  key: s,
                  label: LOAD_STATUS_LABELS[s],
                  value: snapshot.load[s],
                  color: LOAD_BAR[s],
                  active: filter === `load:${s}`,
                }))}
              />
            </div>
            <div>
              <h3 className="text-xs font-medium text-white/90 px-1.5 mb-1">GAP</h3>
              <Bars
                unit={String}
                onSelect={(key) => toggle(`gap:${key}`)}
                bars={(Object.keys(GAP_STATUS_LABELS) as GapStatus[]).map((s) => ({
                  key: s,
                  label: GAP_STATUS_LABELS[s],
                  value: gap[s],
                  color: GAP_BAR[s],
                  active: filter === `gap:${s}`,
                }))}
              />
            </div>
          </div>
        </Panel>
      </div>

      <ContractorTable
        contractors={contractors}
        contentAreas={contentAreas}
        filter={filter}
        onFilterChange={setFilter}
        onOpen={setOpenEmail}
      />

      <Panel
        title="Staffing tools"
        actions={
          <SegmentedControl
            size="xs"
            value={tool}
            onChange={setTool}
            data={[
              { value: "search", label: "Find contractors" },
              { value: "capacity", label: "Capacity, 8 weeks" },
            ]}
            radius="xl"
            classNames={SEGMENTED_CLASSES}
          />
        }
      >
        {tool === "search" ? (
          <AvailabilitySearch contractors={contractors} contentAreas={contentAreas} onOpen={setOpenEmail} />
        ) : (
          <CapacityGrid contractors={contractors} onOpen={setOpenEmail} />
        )}
      </Panel>

      <ContractorDrawer
        contractor={contractors.find((c) => c.email === openEmail) ?? null}
        onClose={() => setOpenEmail(null)}
        onSaveStaffNotes={onSaveStaffNotes}
        onViewed={onViewed}
      />

      <AskAiBubble contractors={contractors} onOpen={setOpenEmail} />
      {extras?.(setOpenEmail)}
    </div>
  );
};
