import { Badge, Pagination, Select, Table, TextInput } from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconSearch, IconSelector } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import {
  type GapStatus,
  type LoadStatus,
  type StaffingFlags,
  type TravelReach,
  addDays,
  formatDate,
  formatRange,
  GAP_STATUS_LABELS,
  LOAD_STATUS_LABELS,
  matchesFilter,
  staffingFlags,
  staffingOrder,
  todayIso,
  travelReach,
} from "~/domains/contractor-availability/availability";
import { type Contractor, bookoutTypeLabel } from "~/domains/contractor-availability/model";
import { cn } from "~/utils/utils";
import { BOOKOUT_CHIP, FOCUS_RING } from "../constants";
import { Panel } from "../panel";

const PAGE_SIZE = 10;

// Filled badge shades that pass AA on the dark glass (autoContrast picks the text)
const LOAD_COLORS: Record<LoadStatus, string> = {
  over: "orange.4",
  booked: "yellow.3",
  room: "green.9",
  unset: "gray.7",
};
// Bar colors for the status breakdown, matching the badges
export const LOAD_BAR: Record<LoadStatus, string> = {
  over: "bg-orange-400",
  booked: "bg-yellow-300",
  room: "bg-emerald-500",
  unset: "bg-gray-300",
};
export const GAP_BAR: Record<GapStatus, string> = {
  current: "bg-teal-300",
  stale: "bg-amber-300",
  never: "bg-gray-300",
};

// Load is the badge; an out-of-date GAP and double bookings ride beside it,
// so a stale profile never hides how booked someone is. With no target there's
// no load to show, and the GAP badge says why, so it stands alone.
const StatusBadges = ({ flags }: { flags: StaffingFlags }) => (
  <div className="flex flex-wrap items-center gap-1 shrink-0">
    {(flags.load !== "unset" || flags.gap === "current") && (
      <Badge tt="none" color={LOAD_COLORS[flags.load]} autoContrast className="whitespace-nowrap">
        {LOAD_STATUS_LABELS[flags.load]}
      </Badge>
    )}
    {flags.gap !== "current" && (
      <Badge tt="none" variant="outline" color="gray.3" className="whitespace-nowrap text-white">
        {flags.gap === "stale" ? "Stale GAP" : "No GAP"}
      </Badge>
    )}
    {flags.doubleBooked.length > 0 && (
      <Badge tt="none" variant="outline" color="orange.3" className="whitespace-nowrap text-orange-200">
        {flags.doubleBooked.length} double-booked
      </Badge>
    )}
  </div>
);

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

const options = (record: Record<string, string>, prefix = "") =>
  Object.entries(record).map(([value, label]) => ({ value: prefix + value, label }));

const STATUS_FILTERS = [
  {
    group: "Staffing",
    items: [
      { value: "attention", label: "Needs attention" },
      { value: "room", label: "Has room, current GAP" },
      { value: "refresh", label: "GAP needs refresh" },
    ],
  },
  { group: "Load, next 4 weeks", items: options(LOAD_STATUS_LABELS, "load:") },
  { group: "GAP", items: options(GAP_STATUS_LABELS, "gap:") },
];

type Row = { c: Contractor; flags: StaffingFlags; upcoming: Contractor["bookouts"] };
type SortKey = "status" | "name" | "reach" | "days" | "pref" | "gap" | "upcoming";
type Sort = { key: SortKey; reversed: boolean };

const REACH_ORDER = Object.keys(REACH_SHORT);
// Each column's first-click order; a second click reverses it. Status is the
// staffing order (rank by email), the default.
const SORTS: Record<
  SortKey,
  { label: string; natural: "ascending" | "descending"; compare: (a: Row, b: Row, rank: Map<string, number>) => number }
> = {
  name: { label: "Name", natural: "ascending", compare: (a, b) => a.c.name.localeCompare(b.c.name) },
  reach: {
    label: "Travel radius",
    natural: "ascending",
    compare: (a, b) =>
      REACH_ORDER.indexOf(travelReach(a.c.profile)) - REACH_ORDER.indexOf(travelReach(b.c.profile)),
  },
  days: {
    label: "Days/wk",
    natural: "descending",
    compare: (a, b) => b.c.profile.daysPerWeek - a.c.profile.daysPerWeek,
  },
  pref: {
    label: "Project pref.",
    natural: "ascending",
    compare: (a, b) => a.c.profile.support.join(" + ").localeCompare(b.c.profile.support.join(" + ")),
  },
  // Most recent first; never confirmed sorts last
  gap: {
    label: "GAP updated",
    natural: "descending",
    compare: (a, b) => (b.c.profile.confirmedOn ?? "").localeCompare(a.c.profile.confirmedOn ?? ""),
  },
  // Soonest next bookout first; none logged sorts last
  upcoming: {
    label: "Upcoming bookouts",
    natural: "ascending",
    compare: (a, b) => (a.upcoming[0]?.start ?? "9999").localeCompare(b.upcoming[0]?.start ?? "9999"),
  },
  status: {
    label: "Status",
    natural: "ascending",
    compare: (a, b, rank) => rank.get(a.c.email)! - rank.get(b.c.email)!,
  },
};
const DEFAULT_SORT: Sort = { key: "status", reversed: false };
const STATUS_ORDER_HINT =
  "Needs attention, then current GAP with room (most open days first), then mostly booked, then no target or stale GAP";

type Props = {
  contractors: Contractor[];
  contentAreas: string[];
  filter: string | null;
  onFilterChange: (filter: string | null) => void;
  onOpen: (email: string) => void;
};

/** "Contractor-level detail": filterable, paged list; a row opens the drawer. */
export const ContractorTable = ({ contractors, contentAreas, filter, onFilterChange, onOpen }: Props) => {
  const [name, setName] = useState("");
  const [area, setArea] = useState<string | null>(null);
  const [reach, setReach] = useState<string | null>(null);
  const [range, setRange] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT);
  const today = todayIso();
  const until = range ? addDays(today, Number(range)) : null;

  const rank = useMemo(
    () => new Map(staffingOrder(contractors, today).map((c, i) => [c.email, i])),
    [contractors, today]
  );

  const rows = useMemo(
    () =>
      contractors
        .map((c) => ({
          c,
          flags: staffingFlags(c, today),
          upcoming: c.bookouts.filter((b) => b.end >= today && (!until || b.start <= until)),
        }))
        .filter(({ c, flags, upcoming }) => {
          if (name && !c.name.toLowerCase().includes(name.toLowerCase())) return false;
          if (area && !c.contentAreas.includes(area)) return false;
          if (reach && travelReach(c.profile) !== reach) return false;
          if (filter && !matchesFilter(flags, filter)) return false;
          // A date range shows who has something booked in it
          if (until && upcoming.length === 0) return false;
          return true;
        })
        .sort(
          (a, b) =>
            (sort.reversed ? -1 : 1) * SORTS[sort.key].compare(a, b, rank) || a.c.name.localeCompare(b.c.name)
        ),
    [contractors, name, area, reach, filter, today, until, sort, rank]
  );

  // Back to the first page whenever the filters or order change
  useEffect(() => setPage(1), [name, area, reach, filter, range, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, reversed: !s.reversed } : { key, reversed: false }));

  // A header that sorts by its column; the arrow shows the current direction.
  // A plain function, not a component, so a click doesn't remount the button and drop focus.
  const sortTh = (col: SortKey) => {
    const { label, natural } = SORTS[col];
    const active = sort.key === col;
    const dir = active && sort.reversed ? (natural === "ascending" ? "descending" : "ascending") : natural;
    const Icon = !active ? IconSelector : dir === "ascending" ? IconArrowUp : IconArrowDown;
    return (
      <Table.Th key={col} aria-sort={active ? dir : undefined}>
        <button
          type="button"
          onClick={() => toggleSort(col)}
          title={col === "status" ? STATUS_ORDER_HINT : `Sort by ${label.toLowerCase()}`}
          className={cn(
            "inline-flex items-center gap-1 whitespace-nowrap rounded hover:text-white",
            active && "text-white font-semibold",
            FOCUS_RING
          )}
        >
          {label}
          <Icon size={12} className={active ? "" : "opacity-60"} aria-hidden />
        </button>
      </Table.Th>
    );
  };
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Panel
      title="Contractor-level detail"
      meta={
        <span className="text-xs text-white/90">
          {rows.length === contractors.length ? contractors.length : `${rows.length} of ${contractors.length}`}
        </span>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        <TextInput
          className="col-span-2 lg:col-span-1"
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
          data={STATUS_FILTERS}
          value={filter}
          onChange={onFilterChange}
          clearable
        />
        {/* Phones get no column headers, so the order is a dropdown there */}
        <Select
          className="col-span-2 sm:hidden"
          aria-label="Sort by"
          data={(Object.keys(SORTS) as SortKey[]).map((k) => ({
            value: k,
            label: k === "status" ? "Staffing order" : SORTS[k].label,
          }))}
          value={sort.key}
          onChange={(k) => setSort(k ? { key: k as SortKey, reversed: false } : DEFAULT_SORT)}
          allowDeselect={false}
        />
      </div>

      {/* Phones: one compact card per contractor instead of a sideways-scrolling table */}
      <ul className="sm:hidden flex flex-col gap-1.5">
        {visible.map(({ c, flags, upcoming }) => (
          <li key={c.email}>
            <button
              type="button"
              onClick={() => onOpen(c.email)}
              className={cn("w-full rounded-xl bg-white/[0.06] hover:bg-white/10 px-3 py-2 text-left", FOCUS_RING)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{c.name}</div>
                  <div className="text-xs text-white/90 truncate">
                    {[c.city, c.state].filter(Boolean).join(", ") || "—"} · {REACH_SHORT[travelReach(c.profile)]}
                  </div>
                </div>
                <StatusBadges flags={flags} />
              </div>
              <div className="mt-1 text-xs text-white/90">
                GAP {c.profile.confirmedOn ? formatDate(c.profile.confirmedOn) : "never updated"} ·{" "}
                {upcoming.length === 0
                  ? "no upcoming bookouts"
                  : `${upcoming.length} upcoming, next ${formatRange(upcoming[0]!.start, upcoming[0]!.end)}`}
              </div>
            </button>
          </li>
        ))}
      </ul>

      <Table.ScrollContainer minWidth={860} className="hidden sm:block">
        <Table
          highlightOnHover
          highlightOnHoverColor="rgba(255, 255, 255, 0.08)"
          borderColor="rgba(255, 255, 255, 0.15)"
          verticalSpacing={6}
          fz="sm"
          className="bg-white/[0.06] text-white rounded-xl overflow-hidden"
        >
          <Table.Thead className="bg-white/10 text-xs text-white/90">
            <Table.Tr>
              {(["name", "reach", "days", "pref", "gap", "upcoming", "status"] as const).map(sortTh)}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {visible.map(({ c, flags, upcoming }) => (
              <Table.Tr
                key={c.email}
                className="cursor-pointer outline-none focus-visible:bg-white/10 focus-visible:shadow-[inset_3px_0_0_white]"
                tabIndex={0}
                aria-label={`Open ${c.name}'s profile`}
                onClick={() => onOpen(c.email)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpen(c.email);
                  }
                }}
              >
                <Table.Td>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-white/90">{[c.city, c.state].filter(Boolean).join(", ") || "—"}</div>
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
                    <span className="text-white/90">Never</span>
                  )}
                </Table.Td>
                <Table.Td>
                  {upcoming.length === 0 ? (
                    <span className="text-white/90">None logged</span>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      {upcoming.slice(0, 2).map((b) => (
                        <span key={b.id} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          <span className={cn("h-2 w-2 rounded-sm shrink-0", BOOKOUT_CHIP[b.type])} />
                          <span className="tabular-nums">{formatRange(b.start, b.end)}</span>
                          <span className="text-xs text-white/90">{bookoutTypeLabel(b.type)}</span>
                        </span>
                      ))}
                      {upcoming.length > 2 && (
                        <span className="text-xs text-white/90">+{upcoming.length - 2} more</span>
                      )}
                    </div>
                  )}
                </Table.Td>
                <Table.Td>
                  <StatusBadges flags={flags} />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {rows.length === 0 && <p className="text-sm text-white/90">No contractors match these filters.</p>}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/90">
        <span>Open a contractor for the full profile, every bookout, and internal staffing notes.</span>
        {pages > 1 && (
          <Pagination
            total={pages}
            value={page}
            onChange={setPage}
            size="sm"
            siblings={0}
            classNames={{ control: "border-white/40 bg-white/10 text-white data-[active]:bg-white data-[active]:text-[#0053B3]" }}
          />
        )}
      </div>
    </Panel>
  );
};
