import { Badge, Select, Table, TextInput } from "@mantine/core";
import { useMemo, useState } from "react";
import {
  formatRange,
  monthlyTarget,
  profileAgeDays,
  STALE_PROFILE_DAYS,
  tlDaysInMonth,
  todayIso,
  TRAVEL_REACH_LABELS,
  travelReach,
} from "~/domains/contractor-availability/availability";
import {
  type Contractor,
  bookoutTypeLabel,
  MONTH_LABELS,
  SUPPORT_OPTIONS,
} from "~/domains/contractor-availability/model";
import { cn } from "~/utils/utils";
import { ProfileAgeBadge } from "../profile-form";
import { PANEL } from "../constants";

/** Filterable list of every contractor; a row opens their profile drawer. */
export const ContractorTable = ({
  contractors,
  onOpen,
}: {
  contractors: Contractor[];
  onOpen: (email: string) => void;
}) => {
  const [name, setName] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [reach, setReach] = useState<string | null>(null);
  const [freshness, setFreshness] = useState<string | null>(null);
  const now = new Date();
  const loadMonth = { year: now.getFullYear(), month: now.getMonth() };
  const today = todayIso();

  const rows = useMemo(
    () =>
      contractors.filter((c) => {
        if (name && !c.name.toLowerCase().includes(name.toLowerCase())) return false;
        if (role && !c.profile.support.includes(role)) return false;
        if (reach && travelReach(c.profile) !== reach) return false;
        const age = profileAgeDays(c.profile);
        if (freshness === "fresh" && (age === null || age > STALE_PROFILE_DAYS)) return false;
        if (freshness === "stale" && age !== null && age <= STALE_PROFILE_DAYS) return false;
        return true;
      }),
    [contractors, name, role, reach, freshness]
  );

  return (
    <div className={cn(PANEL, "flex flex-col gap-3")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold">All contractors</h2>
        <span className="text-sm text-white/80">
          {rows.length} of {contractors.length}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <TextInput placeholder="Search by name" value={name} onChange={(e) => setName(e.currentTarget.value)} />
        <Select placeholder="All roles" data={SUPPORT_OPTIONS} value={role} onChange={setRole} clearable />
        <Select
          placeholder="Any travel reach"
          data={Object.entries(TRAVEL_REACH_LABELS).map(([value, label]) => ({ value, label }))}
          value={reach}
          onChange={setReach}
          clearable
        />
        <Select
          placeholder="Any profile status"
          data={[
            { value: "fresh", label: `Confirmed in last ${STALE_PROFILE_DAYS} days` },
            { value: "stale", label: "Stale or never confirmed" },
          ]}
          value={freshness}
          onChange={setFreshness}
          clearable
        />
      </div>
      <Table.ScrollContainer minWidth={900}>
        <Table highlightOnHover className="bg-white/90 text-black rounded-xl overflow-hidden" verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Home</Table.Th>
              <Table.Th>Supports</Table.Th>
              <Table.Th>Travel reach</Table.Th>
              <Table.Th>Target</Table.Th>
              <Table.Th>{MONTH_LABELS[loadMonth.month]} TL load</Table.Th>
              <Table.Th>Next bookout</Table.Th>
              <Table.Th>Profile</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((c) => {
              const next = c.bookouts.find((b) => b.end >= today);
              const target = monthlyTarget(c.profile);
              const load = tlDaysInMonth(c.bookouts, loadMonth.year, loadMonth.month);
              return (
                <Table.Tr key={c.email} className="cursor-pointer" onClick={() => onOpen(c.email)}>
                  <Table.Td className="font-medium">{c.name}</Table.Td>
                  <Table.Td>{[c.city, c.state].filter(Boolean).join(", ") || "—"}</Table.Td>
                  <Table.Td>{c.profile.support.join(", ") || "—"}</Table.Td>
                  <Table.Td>{TRAVEL_REACH_LABELS[travelReach(c.profile)]}</Table.Td>
                  <Table.Td className="tabular-nums">
                    {c.profile.daysPerWeek ? `${c.profile.daysPerWeek} d/wk` : "Not set"}
                  </Table.Td>
                  <Table.Td className="tabular-nums">
                    {load} {target ? `/ ${target}` : ""} days
                  </Table.Td>
                  <Table.Td>
                    {next ? (
                      <>
                        {formatRange(next.start, next.end)}{" "}
                        <span className="text-xs text-gray-500">{bookoutTypeLabel(next.type)}</span>
                      </>
                    ) : (
                      <span className="text-gray-500">None</span>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {c.profileSource === "intake" ? (
                      <Badge color="yellow" variant="light">
                        Onboarding answers
                      </Badge>
                    ) : (
                      <ProfileAgeBadge profile={c.profile} />
                    )}
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {rows.length === 0 && <p className="text-sm text-white/80">No contractors match these filters.</p>}
    </div>
  );
};
