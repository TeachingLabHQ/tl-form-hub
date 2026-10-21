import { Notification, SegmentedControl } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import {
  type ContractorStatus,
  bookoutDaysByType,
  CONTRACTOR_STATUS_LABELS,
  confirmedThisQuarter,
  contractorStatus,
  openDaysLeftInMonth,
  parseDate,
  todayIso,
} from "~/domains/contractor-availability/availability";
import { type Contractor, BOOKOUT_TYPES, MONTH_LABELS } from "~/domains/contractor-availability/model";
import { FormSkeleton } from "~/components/form-kit";
import { cn } from "~/utils/utils";
import { BOOKOUT_CHIP, FOCUS_RING, PANEL, SEGMENTED_CLASSES } from "../constants";
import { Panel } from "../panel";
import { AvailabilitySearch } from "./availability-search";
import { CapacityGrid } from "./capacity-grid";
import { ContractorDrawer } from "./contractor-drawer";
import { ContractorTable, STATUS_BAR } from "./contractor-table";

const Stat = ({ label, value, sub }: { label: string; value: string; sub: string }) => (
  <div className={cn(PANEL, "p-4 md:p-4")}>
    <div className="text-xs font-medium text-white/90">{label}</div>
    <div className="text-2xl font-semibold tabular-nums leading-tight mt-1">{value}</div>
    <div className="text-xs text-white/90 mt-0.5">{sub}</div>
  </div>
);

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

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Admin view: roll-ups, contractor table + drawer, then search and capacity tools. */
export const StaffingView = ({
  contractors,
  loading,
  error,
  onSaveStaffNotes,
}: {
  contractors: Contractor[];
  loading: boolean;
  error: string | null;
  onSaveStaffNotes: (email: string, notes: string) => Promise<string | null>;
}) => {
  const [openEmail, setOpenEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [tool, setTool] = useState("search");
  const today = todayIso();
  const thisMonth = parseDate(today);
  const monthLabel = MONTH_LABELS[thisMonth.getMonth()]!;

  const stats = useMemo(() => {
    const withTarget = contractors.filter((c) => c.profile.daysPerWeek > 0);
    const statusCounts: Record<ContractorStatus, number> = { available: 0, booked: 0, stale: 0 };
    contractors.forEach((c) => statusCounts[contractorStatus(c.profile, c.bookouts, today)]++);
    return {
      confirmed: contractors.filter((c) => confirmedThisQuarter(c.profile, today)).length,
      open: openDaysLeftInMonth(contractors, today),
      avgDays: withTarget.length
        ? withTarget.reduce((a, c) => a + c.profile.daysPerWeek, 0) / withTarget.length
        : null,
      withTarget: withTarget.length,
      byType: bookoutDaysByType(contractors, thisMonth.getFullYear(), thisMonth.getMonth()),
      statusCounts,
    };
  }, [contractors, today]);

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
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Active contractors" value={String(n)} sub="FY27 contract signed or sent" />
        <Stat
          label="GAPs updated this quarter"
          value={n ? `${Math.round((stats.confirmed / n) * 100)}%` : "—"}
          sub={`${stats.confirmed} of ${n} contractors`}
        />
        <Stat
          label={`Open days left in ${monthLabel}`}
          value={stats.open.toLocaleString()}
          sub="contractor-days with nothing booked"
        />
        <Stat
          label="Avg days/week available"
          value={stats.avgDays === null ? "—" : stats.avgDays.toFixed(1)}
          sub={`${stats.withTarget} of ${n} have set this`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title={`Bookout days by type (${monthLabel})`}>
          <Bars
            unit={(v) => plural(v, "day")}
            bars={BOOKOUT_TYPES.map((t) => ({
              key: t.value,
              label: t.label,
              value: stats.byType[t.value],
              color: BOOKOUT_CHIP[t.value],
            }))}
          />
        </Panel>
        <Panel
          title="Contractor status"
          meta={<span className="text-xs text-white/90">Click to filter the table</span>}
        >
          <Bars
            unit={(v) => String(v)}
            onSelect={(key) => setStatus((s) => (s === key ? null : key))}
            bars={(Object.keys(CONTRACTOR_STATUS_LABELS) as ContractorStatus[]).map((s) => ({
              key: s,
              label: CONTRACTOR_STATUS_LABELS[s],
              value: stats.statusCounts[s],
              color: STATUS_BAR[s],
              active: status === s,
            }))}
          />
        </Panel>
      </div>

      <ContractorTable
        contractors={contractors}
        contentAreas={contentAreas}
        status={status}
        onStatusChange={setStatus}
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
      />
    </div>
  );
};
