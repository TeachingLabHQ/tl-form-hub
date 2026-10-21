import { Badge, Pagination, Select, Table, TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import {
  type ContractorStatus,
  type TravelReach,
  addDays,
  CONTRACTOR_STATUS_LABELS,
  contractorStatus,
  formatDate,
  formatRange,
  todayIso,
  travelReach,
} from "~/domains/contractor-availability/availability";
import { type Contractor, bookoutTypeLabel } from "~/domains/contractor-availability/model";
import { cn } from "~/utils/utils";
import { BOOKOUT_CHIP } from "../constants";
import { Panel } from "../panel";

const PAGE_SIZE = 10;

const STATUS_COLORS: Record<ContractorStatus, string> = {
  available: "green",
  booked: "orange",
  stale: "gray",
};
// Bar colors for the status breakdown, matching the badges
export const STATUS_BAR: Record<ContractorStatus, string> = {
  available: "bg-emerald-500",
  booked: "bg-orange-400",
  stale: "bg-gray-300",
};

const REACH_SHORT: Record<TravelReach, string> = {
  any: "Anywhere in country",
  regional: "Regional",
  local: "Local only",
  virtual: "Virtual only",
};

const RANGES = [
  { value: "30", label: "Next 30 days" },
  { value: "90", label: "Next 90 days" },
];

const options = (record: Record<string, string>) =>
  Object.entries(record).map(([value, label]) => ({ value, label }));

type Props = {
  contractors: Contractor[];
  contentAreas: string[];
  status: string | null;
  onStatusChange: (status: string | null) => void;
  onOpen: (email: string) => void;
};

/** "Contractor-level detail": filterable, paged list; a row opens the drawer. */
export const ContractorTable = ({ contractors, contentAreas, status, onStatusChange, onOpen }: Props) => {
  const [name, setName] = useState("");
  const [area, setArea] = useState<string | null>(null);
  const [reach, setReach] = useState<string | null>(null);
  const [range, setRange] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const today = todayIso();
  const until = range ? addDays(today, Number(range)) : null;

  const rows = useMemo(
    () =>
      contractors
        .map((c) => ({
          c,
          status: contractorStatus(c.profile, c.bookouts, today),
          upcoming: c.bookouts.filter((b) => b.end >= today && (!until || b.start <= until)),
        }))
        .filter(({ c, status: s, upcoming }) => {
          if (name && !c.name.toLowerCase().includes(name.toLowerCase())) return false;
          if (area && !c.contentAreas.includes(area)) return false;
          if (reach && travelReach(c.profile) !== reach) return false;
          if (status && s !== status) return false;
          // A date range shows who has something booked in it
          if (until && upcoming.length === 0) return false;
          return true;
        }),
    [contractors, name, area, reach, status, today, until]
  );

  // Back to the first page whenever the filters change
  useEffect(() => setPage(1), [name, area, reach, status, range]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Panel
      title="Contractor-level detail"
      meta={
        <span className="text-xs text-white/75">
          {rows.length === contractors.length ? contractors.length : `${rows.length} of ${contractors.length}`}
        </span>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        <TextInput
          placeholder="Search by name"
          leftSection={<IconSearch size={14} />}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />
        <Select placeholder="All content areas" data={contentAreas} value={area} onChange={setArea} clearable searchable />
        <Select placeholder="All travel radii" data={options(REACH_SHORT)} value={reach} onChange={setReach} clearable />
        <Select placeholder="Any date range" data={RANGES} value={range} onChange={setRange} clearable />
        <Select
          placeholder="Any status"
          data={options(CONTRACTOR_STATUS_LABELS)}
          value={status}
          onChange={onStatusChange}
          clearable
        />
      </div>

      <Table.ScrollContainer minWidth={860}>
        <Table
          highlightOnHover
          verticalSpacing={6}
          fz="sm"
          className="bg-white/95 text-gray-900 rounded-xl overflow-hidden"
        >
          <Table.Thead className="bg-gray-100 text-xs text-gray-600">
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Travel radius</Table.Th>
              <Table.Th>Days/wk</Table.Th>
              <Table.Th>Project pref.</Table.Th>
              <Table.Th>GAP updated</Table.Th>
              <Table.Th>Upcoming bookouts</Table.Th>
              <Table.Th>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {visible.map(({ c, status: s, upcoming }) => (
              <Table.Tr
                key={c.email}
                className="cursor-pointer"
                tabIndex={0}
                onClick={() => onOpen(c.email)}
                onKeyDown={(e) => e.key === "Enter" && onOpen(c.email)}
              >
                <Table.Td>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-gray-500">{[c.city, c.state].filter(Boolean).join(", ") || "—"}</div>
                </Table.Td>
                <Table.Td>{REACH_SHORT[travelReach(c.profile)]}</Table.Td>
                <Table.Td className="tabular-nums">
                  {c.profile.daysPerWeek ? (c.profile.daysPerWeek >= 4 ? "4+" : c.profile.daysPerWeek) : "—"}
                </Table.Td>
                <Table.Td>{c.profile.support.join(" + ") || "—"}</Table.Td>
                <Table.Td className="whitespace-nowrap">
                  {c.profile.confirmedOn ? (
                    formatDate(c.profile.confirmedOn)
                  ) : (
                    <span className="text-gray-500">Never</span>
                  )}
                </Table.Td>
                <Table.Td>
                  {upcoming.length === 0 ? (
                    <span className="text-gray-500">None logged</span>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      {upcoming.slice(0, 2).map((b) => (
                        <span key={b.id} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          <span className={cn("h-2 w-2 rounded-sm shrink-0", BOOKOUT_CHIP[b.type])} />
                          <span className="tabular-nums">{formatRange(b.start, b.end)}</span>
                          <span className="text-xs text-gray-500">{bookoutTypeLabel(b.type)}</span>
                        </span>
                      ))}
                      {upcoming.length > 2 && (
                        <span className="text-xs text-gray-500">+{upcoming.length - 2} more</span>
                      )}
                    </div>
                  )}
                </Table.Td>
                <Table.Td>
                  <Badge color={STATUS_COLORS[s]} variant="light" className="whitespace-nowrap">
                    {CONTRACTOR_STATUS_LABELS[s]}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {rows.length === 0 && <p className="text-sm text-white/80">No contractors match these filters.</p>}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/80">
        <span>Click a row for the full profile, every bookout, and internal staffing notes.</span>
        {pages > 1 && (
          <Pagination
            total={pages}
            value={page}
            onChange={setPage}
            size="sm"
            classNames={{ control: "border-white/40 bg-white/20 text-white data-[active]:bg-white data-[active]:text-[#0053B3]" }}
          />
        )}
      </div>
    </Panel>
  );
};
