import { SegmentedControl, Select, Tooltip } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import { useSearchParams } from "@remix-run/react";
import { useState } from "react";
import { useSession } from "~/components/auth/hooks/useSession";
import { cn } from "~/utils/utils";
import { CARD, FIELD_CLASSES, FOCUS_RING, SEGMENTED_CLASSES } from "./constants";
import { useRoster } from "./hooks/use-roster";
import { MyAvailability } from "./my-availability";
import { StaffingView } from "./staffing/staffing-view";

const COLUMN = "col-span-12 mx-4 md:mx-0 md:col-start-2 md:col-span-10 min-w-0";

// The bubble sits above the card on phones and beside its top-right corner on
// wider screens, in the grid's free last column.
const Page = ({ bubble, children }: { bubble?: React.ReactNode; children: React.ReactNode }) => (
  <div className="w-full h-full grid grid-cols-12 gap-x-8 gap-y-3 py-8">
    {bubble && (
      <div className="col-span-12 mx-4 flex justify-end row-start-1 md:mx-0 md:col-start-12 md:col-span-1 md:justify-start md:sticky md:top-6 md:self-start">
        {bubble}
      </div>
    )}
    <div className={cn(COLUMN, CARD, "h-fit p-4 md:p-8", bubble && "row-start-2 md:row-start-1")}>
      {children}
    </div>
  </div>
);

const Header = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) => (
  <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
    <div className="min-w-0">
      <h1 className="text-2xl md:text-3xl font-semibold">{title}</h1>
      <p className="text-sm text-white/90 mt-1">{subtitle}</p>
    </div>
    {children}
  </div>
);

const timeAgo = (date: Date | null) => {
  if (!date) return "";
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  return minutes < 1 ? "just now" : `${minutes} min ago`;
};

// Round glass bubble beside the main card: reloads the roster from Monday
const RefreshBubble = ({
  loading,
  loadedAt,
  onReload,
}: {
  loading: boolean;
  loadedAt: Date | null;
  onReload: () => void;
}) => (
  <div className="flex items-center gap-2 md:flex-col md:gap-1">
    <Tooltip
      label={`Refresh from Monday${loadedAt ? ` · loaded ${timeAgo(loadedAt)}` : ""}`}
      withArrow
      position="left"
    >
      <button
        type="button"
        onClick={onReload}
        disabled={loading}
        aria-label="Refresh contractors and bookouts from Monday"
        className={cn(
          "grid place-items-center h-11 w-11 rounded-full bg-[#082040]/65 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)] backdrop-blur-sm hover:bg-[#082040]/80 disabled:opacity-80",
          FOCUS_RING
        )}
      >
        <IconRefresh size={20} className={cn(loading && "animate-spin")} />
      </button>
    </Tooltip>
    <span className="rounded-full bg-[#082040]/65 px-2 py-0.5 text-[11px] font-medium text-white whitespace-nowrap backdrop-blur-sm">
      {loading ? "Refreshing…" : loadedAt ? timeAgo(loadedAt) : ""}
    </span>
  </div>
);

/**
 * Contractor Bookout System. Contractors see only their own availability;
 * staff get the admin view plus a "view as" contractor page.
 */
export const ContractorAvailability = () => {
  const { mondayProfile } = useSession();
  const isContractor = mondayProfile?.businessFunction === "contractor";
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("tab") === "contractor" ? "contractor" : "staffing";
  const roster = useRoster(!isContractor);
  const [viewAs, setViewAs] = useState<string | null>(null);

  if (isContractor) {
    const firstName = mondayProfile!.name?.split(" ")[0];
    return (
      <Page>
        <Header
          title={firstName ? `Welcome back, ${firstName}` : "Welcome back"}
          subtitle="Keep your availability profile current and submit a bookout for any day you can't take Teaching Lab work."
        />
        <MyAvailability email={mondayProfile!.email} />
      </Page>
    );
  }

  const viewAsName = roster.contractors.find((c) => c.email === viewAs)?.name;
  const switcher = (
    <SegmentedControl
      value={view}
      onChange={(v) => setSearchParams(v === "contractor" ? { tab: "contractor" } : {}, { replace: true })}
      data={[
        { value: "staffing", label: "Admin view" },
        { value: "contractor", label: "Contractor view" },
      ]}
      radius="xl"
      classNames={SEGMENTED_CLASSES}
    />
  );

  return (
    <Page
      bubble={<RefreshBubble loading={roster.loading} loadedAt={roster.loadedAt} onReload={roster.reload} />}
    >
      {view === "staffing" ? (
        <>
          <Header
            title="Bookout admin"
            subtitle="Everything contractors submit, at the individual and aggregate level."
          >
            {switcher}
          </Header>
          <StaffingView
            contractors={roster.contractors}
            loading={roster.loading}
            error={roster.error}
            onSaveStaffNotes={roster.saveStaffNotes}
            onViewed={roster.markViewed}
          />
        </>
      ) : (
        <>
          <Header
            title={viewAsName ? `Viewing as ${viewAsName}` : "Contractor view"}
            subtitle="The page each contractor sees. Changes you make here save to their profile."
          >
            {switcher}
          </Header>
          <Select
            label="Contractor"
            classNames={FIELD_CLASSES}
            className="max-w-sm mb-6"
            placeholder={roster.loading ? "Loading contractors…" : "Pick a contractor"}
            data={roster.contractors.map((c) => ({ value: c.email, label: c.name }))}
            value={viewAs}
            onChange={setViewAs}
            searchable
            disabled={roster.loading && roster.contractors.length === 0}
          />
          {viewAs && <MyAvailability key={viewAs} email={viewAs} />}
        </>
      )}
    </Page>
  );
};
