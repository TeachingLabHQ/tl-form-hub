import { Button, Notification } from "@mantine/core";
import { IconRefresh, IconX } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import {
  addDays,
  dateRange,
  dayStatus,
  isWeekday,
  profileAgeDays,
  STALE_PROFILE_DAYS,
  todayIso,
} from "~/domains/contractor-availability/availability";
import type { Contractor } from "~/domains/contractor-availability/model";
import { FormSkeleton } from "~/components/form-kit";
import { cn } from "~/utils/utils";
import { PANEL } from "../constants";
import { AvailabilitySearch } from "./availability-search";
import { CapacityGrid } from "./capacity-grid";
import { ContractorDrawer } from "./contractor-drawer";
import { ContractorTable } from "./contractor-table";

const Stat = ({ label, value, sub }: { label: string; value: string; sub: string }) => (
  <div className={cn(PANEL, "p-4")}>
    <div className="text-sm text-white/85">{label}</div>
    <div className="text-3xl font-semibold tabular-nums">{value}</div>
    <div className="text-xs text-white/75">{sub}</div>
  </div>
);

/** Staffing: summary, date search, capacity grid, contractor list + drawer. */
export const StaffingView = ({
  contractors,
  loading,
  error,
  onReload,
  onSaveStaffNotes,
}: {
  contractors: Contractor[];
  loading: boolean;
  error: string | null;
  onReload: () => void;
  onSaveStaffNotes: (email: string, notes: string) => Promise<string | null>;
}) => {
  const [openEmail, setOpenEmail] = useState<string | null>(null);

  const stats = useMemo(() => {
    const today = todayIso();
    const horizon = dateRange(today, addDays(today, 59)).filter(isWeekday);
    const confirmed = contractors.filter((c) => {
      const age = profileAgeDays(c.profile);
      return age !== null && age <= STALE_PROFILE_DAYS;
    }).length;
    let open = 0;
    let booked = 0;
    contractors.forEach((c) =>
      horizon.forEach((d) => {
        const s = dayStatus(c.profile, c.bookouts, d, true).state;
        if (s === "free") open++;
        else if (s === "booked") booked++;
      })
    );
    return { confirmed, open, booked };
  }, [contractors]);

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button variant="white" size="xs" leftSection={<IconRefresh size={14} />} loading={loading} onClick={onReload}>
          Refresh from Monday
        </Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Active 1099 contractors" value={String(contractors.length)} sub="Coach/Facilitator Details board" />
        <Stat
          label={`Profiles confirmed ≤ ${STALE_PROFILE_DAYS} days`}
          value={contractors.length ? `${Math.round((stats.confirmed / contractors.length) * 100)}%` : "—"}
          sub={`${stats.confirmed} of ${contractors.length} contractors`}
        />
        <Stat label="Open contractor-days" value={stats.open.toLocaleString()} sub="next 60 days, full days" />
        <Stat label="Booked contractor-days" value={stats.booked.toLocaleString()} sub="next 60 days, TL + non-TL" />
      </div>
      <AvailabilitySearch contractors={contractors} contentAreas={contentAreas} onOpen={setOpenEmail} />
      <CapacityGrid contractors={contractors} onOpen={setOpenEmail} />
      <ContractorTable contractors={contractors} onOpen={setOpenEmail} />
      <ContractorDrawer
        contractor={contractors.find((c) => c.email === openEmail) ?? null}
        onClose={() => setOpenEmail(null)}
        onSaveStaffNotes={onSaveStaffNotes}
      />
    </div>
  );
};
