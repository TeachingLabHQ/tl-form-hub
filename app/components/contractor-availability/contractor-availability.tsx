import { Select, Tabs } from "@mantine/core";
import { useSearchParams } from "@remix-run/react";
import { useState } from "react";
import { useSession } from "~/components/auth/hooks/useSession";
import { useRoster } from "./hooks/use-roster";
import { MyAvailability } from "./my-availability";
import { StaffingView } from "./staffing/staffing-view";

const GlassCard = ({ children }: { children: React.ReactNode }) => (
  <div className="w-full h-full grid grid-cols-12 gap-8 py-8">
    <div className="col-span-12 mx-4 md:mx-0 md:col-start-2 md:col-span-10 h-fit p-4 md:p-8 rounded-[25px] bg-white/30 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)] text-white min-w-0">
      {children}
    </div>
  </div>
);

/**
 * Contractor Bookout System. Contractors see only their own availability;
 * staff get the staffing view plus a "view as" contractor page.
 */
export const ContractorAvailability = () => {
  const { mondayProfile } = useSession();
  const isContractor = mondayProfile?.businessFunction === "contractor";
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "contractor" ? "contractor" : "staffing";
  const roster = useRoster(!isContractor);
  const [viewAs, setViewAs] = useState<string | null>(null);

  if (isContractor) {
    return (
      <GlassCard>
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-semibold">My availability</h1>
            <p className="text-white/85">
              Keep your profile current and log anything that takes you off the table. Staffing sees
              changes right away.
            </p>
          </div>
          <MyAvailability email={mondayProfile!.email} />
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <Tabs
        value={tab}
        onChange={(v) => setSearchParams(v === "contractor" ? { tab: "contractor" } : {}, { replace: true })}
      >
        <Tabs.List>
          <Tabs.Tab value="staffing" className="hover:bg-white/10">
            Staffing
          </Tabs.Tab>
          <Tabs.Tab value="contractor" className="hover:bg-white/10">
            Contractor view
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="staffing" pt="lg">
          <StaffingView
            contractors={roster.contractors}
            loading={roster.loading}
            error={roster.error}
            onReload={roster.reload}
          />
        </Tabs.Panel>

        <Tabs.Panel value="contractor" pt="lg">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 max-w-md">
              <h1 className="font-medium text-lg">View as contractor</h1>
              <Select
                placeholder={roster.loading ? "Loading contractors…" : "Pick a contractor"}
                data={roster.contractors.map((c) => ({ value: c.email, label: c.name }))}
                value={viewAs}
                onChange={setViewAs}
                searchable
                disabled={roster.loading}
              />
              <p className="text-sm text-white/80">
                This is the page each contractor sees. Changes you make here save to their profile.
              </p>
            </div>
            {viewAs && <MyAvailability key={viewAs} email={viewAs} />}
          </div>
        </Tabs.Panel>
      </Tabs>
    </GlassCard>
  );
};
