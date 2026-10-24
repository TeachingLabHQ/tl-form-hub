import { Affix, Loader, SegmentedControl, Tooltip, Transition } from "@mantine/core";
import { IconArrowsMaximize, IconArrowsMinimize, IconMap, IconX } from "@tabler/icons-react";
import { geoMercator, geoPath } from "d3-geo";
import { useMemo, useState } from "react";
import {
  LOAD_STATUS_LABELS,
  formatDate,
  isWeekday,
  loadStatus,
  openDaysIn,
  todayIso,
} from "~/domains/contractor-availability/availability";
import type { Contractor } from "~/domains/contractor-availability/model";
import {
  type DistrictStats,
  type NycWorkDay,
  type Tier,
  boroughOf,
  districtStats,
  staffingNeed,
  workWeeks,
} from "~/domains/contractor-availability/nyc";
import { BOROUGH_LINES, NYC_DISTRICTS } from "~/domains/contractor-availability/nyc-geo";
import { cn } from "~/utils/utils";
import { FOCUS_RING, SEGMENTED_CLASSES } from "../constants";

type PanelSize = "normal" | "full";

const WEEKS = 4;

const PANEL_SIZE: Record<PanelSize, string> = {
  normal: "absolute bottom-16 left-0 w-[min(560px,calc(100vw-32px))] h-[min(680px,calc(100vh-120px))]",
  full: "fixed inset-3 md:inset-6",
};

const HEADER_BUTTON = cn("grid place-items-center h-8 w-8 rounded-full hover:bg-white/15", FOCUS_RING);

// Bivariate colors on the navy panel, [free days nearby][TL work], each low to
// high third. Work pushes toward red and free people toward blue, so red is
// lots of work with no one free nearby, lavender is busy but covered and blue
// is quiet. OKLab blends of the four corners, checked for color-blind
// separation against the panel. A district with no TL work stays empty glass.
const SURFACE = "#082040";
const EMPTY = "rgba(255,255,255,0.06)";
const NEED_FILL: Record<Tier, Record<Tier, string>> = {
  0: { 0: "#46526e", 1: "#a45e62", 2: "#ff5a47" },
  1: { 0: "#416ea8", 1: "#a384a3", 2: "#fb9297" },
  2: { 0: "#2f8ae6", 1: "#9ba8e5", 2: "#f0c0e0" },
};
const TIER_LABELS = ["Low", "Mid", "High"];

const days = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

// Projected map size; the SVG scales to its box
const W = 520;
const H = 520;
const projection = geoMercator().fitExtent(
  [
    [8, 8],
    [W - 8, H - 8],
  ],
  NYC_DISTRICTS
);
const path = geoPath(projection);
const DISTRICT_SHAPES = NYC_DISTRICTS.features.map((f) => ({
  district: f.properties.district,
  d: path(f) ?? "",
  centroid: path.centroid(f),
}));
const BOROUGH_PATH = path(BOROUGH_LINES) ?? "";

// Spread a district's residents in a small ring around its center, so dots
// don't stack. Placement is by district only: no one's address is on the map.
const dotPosition = ([cx, cy]: [number, number], i: number, n: number): [number, number] => {
  if (n === 1) return [cx, cy];
  const ring = i < 6 ? 0 : 1;
  const perRing = ring === 0 ? Math.min(n, 6) : n - 6;
  const angle = ((ring === 0 ? i : i - 6) / perRing) * Math.PI * 2 - Math.PI / 2;
  const r = ring === 0 ? 9 : 17;
  return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
};

type Hover = { x: number; y: number; flip: boolean; content: React.ReactNode };

/** Floating NYC school-district map for the NYC admin view. */
export const NycMapBubble = ({
  contractors,
  work,
  loading,
  error,
  district,
  onDistrictChange,
  onOpen,
}: {
  // NYC-area contractors, unfiltered by district
  contractors: Contractor[];
  work: NycWorkDay[];
  loading: boolean;
  error: string | null;
  district: number | null;
  onDistrictChange: (district: number | null) => void;
  onOpen: (email: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<PanelSize>("normal");
  const [weekIndex, setWeekIndex] = useState("0");
  // The week picker measures its highlight on mount, which lands mid-way
  // through the pop-in's scale and goes stale when the panel resizes;
  // remounting it once the panel settles, and on each resize, fixes that
  const [settled, setSettled] = useState(false);
  const [hover, setHover] = useState<Hover | null>(null);
  const today = todayIso();

  const weeks = useMemo(() => workWeeks(today, WEEKS), [today]);
  const week = weeks[Number(weekIndex)]!;
  const { districts, citywideSessionDays } = useMemo(
    () => districtStats(contractors, work, week.days),
    [contractors, work, week]
  );
  const need = useMemo(() => staffingNeed(districts.values()), [districts]);
  const tiers = new Map(need.ranked.map((r) => [r.stats.district, r]));
  const fill = (n: number) => {
    const t = tiers.get(n);
    return t ? NEED_FILL[t.free][t.work] : EMPTY;
  };

  const offMap = contractors.filter((c) => !c.nyc?.district).length;
  const weekLabel = (i: number) =>
    i === 0 && isWeekday(today) ? "This week" : `Week of ${formatDate(weeks[i]!.monday)}`;
  const windowLabel = Number(weekIndex) === 0 && isWeekday(today) ? "the rest of this week" : weekLabel(Number(weekIndex)).toLowerCase();

  const showTip = (e: React.MouseEvent, content: React.ReactNode) => {
    const box = (e.currentTarget.closest("[data-map]") as HTMLElement).getBoundingClientRect();
    setHover({ x: e.clientX - box.left, y: e.clientY - box.top, flip: e.clientX - box.left > box.width / 2, content });
  };

  const districtTip = (s: DistrictStats) => {
    const t = tiers.get(s.district);
    return (
      <div className="tabular-nums">
        <div className="font-semibold">
          District {s.district} · {boroughOf(s.district)}
        </div>
        <div>
          TL session days: {days(s.sessionDays)}
          {t && ` (${TIER_LABELS[t.work]!.toLowerCase()})`}
        </div>
        <div>
          Free contractor days nearby: {days(s.nearbyFreeDays)}
          {t && ` (${TIER_LABELS[t.free]!.toLowerCase()})`}
        </div>
        <div className="text-white/80">
          {s.contractors.length} {s.contractors.length === 1 ? "contractor lives" : "contractors live"} here, with{" "}
          {days(s.freeDays)} free days
        </div>
      </div>
    );
  };

  // Below Mantine's drawer (z 200), so a clicked dot's profile opens on top
  return (
    <Affix position={{ bottom: 24, left: 24 }} zIndex={150}>
      <Transition
        mounted={open}
        transition="pop-bottom-left"
        duration={150}
        onEntered={() => setSettled(true)}
        onExit={() => setSettled(false)}
      >
        {(styles) => (
          <section
            style={styles}
            role="dialog"
            aria-label="NYC map of TL work and contractor availability"
            onKeyDown={(e) => e.key === "Escape" && (size === "full" ? setSize("normal") : setOpen(false))}
            className={cn(
              "flex flex-col rounded-[25px] bg-[#082040]/95 text-white text-sm shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35),0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md",
              PANEL_SIZE[size]
            )}
          >
            <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-white/15">
              <div className="min-w-0">
                <h2 className="text-base font-semibold flex items-center gap-1.5">
                  <IconMap size={18} aria-hidden /> NYC map
                </h2>
                <p className="text-xs text-white/90 mt-0.5">
                  Where TL work outpaces free contractors nearby, by community school district. Click a district to
                  filter the page.
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Tooltip label={size === "full" ? "Exit full screen" : "Full screen"} withArrow>
                  <button
                    type="button"
                    onClick={() => setSize(size === "full" ? "normal" : "full")}
                    aria-label={size === "full" ? "Exit full screen" : "Full screen"}
                    className={HEADER_BUTTON}
                  >
                    {size === "full" ? <IconArrowsMinimize size={18} /> : <IconArrowsMaximize size={18} />}
                  </button>
                </Tooltip>
                <Tooltip label="Close" withArrow>
                  <button type="button" onClick={() => setOpen(false)} aria-label="Close" className={HEADER_BUTTON}>
                    <IconX size={18} />
                  </button>
                </Tooltip>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className={cn("flex flex-col gap-3", size === "full" && "mx-auto max-w-5xl")}>
                <SegmentedControl
                  key={`${settled}-${size}`}
                  size="xs"
                  value={weekIndex}
                  onChange={setWeekIndex}
                  data={weeks.map((_, i) => ({ value: String(i), label: weekLabel(i) }))}
                  radius="xl"
                  className="self-start"
                  classNames={SEGMENTED_CLASSES}
                />

                {district && (
                  <div className="flex items-center gap-2 rounded-full bg-white/10 pl-3 pr-1 py-1 w-fit text-xs">
                    Filtering the page to District {district}
                    <button
                      type="button"
                      onClick={() => onDistrictChange(null)}
                      aria-label="Clear district filter"
                      className={cn("grid place-items-center h-6 w-6 rounded-full hover:bg-white/15", FOCUS_RING)}
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                )}

                <div
                  data-map
                  className={cn(
                    "relative mx-auto w-full",
                    size === "full" ? "max-w-[min(100%,calc(100vh-260px))]" : "max-w-[440px]"
                  )}
                  onMouseLeave={() => setHover(null)}
                >
                  <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Map of NYC school districts">
                    <g>
                      {DISTRICT_SHAPES.map(({ district: n, d }) => {
                        const s = districts.get(n)!;
                        return (
                          <path
                            key={n}
                            d={d}
                            fill={fill(n)}
                            stroke={SURFACE}
                            strokeWidth={1}
                            tabIndex={0}
                            role="button"
                            aria-pressed={district === n}
                            aria-label={`District ${n}, ${boroughOf(n)}: ${days(s.sessionDays)} TL session days, ${days(s.nearbyFreeDays)} free contractor days nearby`}
                            className="cursor-pointer outline-none hover:brightness-125 focus-visible:brightness-125"
                            onMouseMove={(e) => showTip(e, districtTip(s))}
                            onFocus={(e) => {
                              const box = (e.currentTarget.closest("[data-map]") as HTMLElement).getBoundingClientRect();
                              const r = e.currentTarget.getBoundingClientRect();
                              const x = r.left + r.width / 2 - box.left;
                              setHover({ x, y: r.top + r.height / 2 - box.top, flip: x > box.width / 2, content: districtTip(s) });
                            }}
                            onBlur={() => setHover(null)}
                            onClick={() => onDistrictChange(district === n ? null : n)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onDistrictChange(district === n ? null : n);
                              }
                            }}
                          />
                        );
                      })}
                    </g>
                    <path d={BOROUGH_PATH} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={1.5} pointerEvents="none" />
                    {/* Selected district on top, so its outline isn't covered by neighbors */}
                    {district && (
                      <path
                        d={DISTRICT_SHAPES.find((s) => s.district === district)?.d}
                        fill="none"
                        stroke="white"
                        strokeWidth={2.5}
                        pointerEvents="none"
                      />
                    )}
                    <g pointerEvents="none" className="text-[11px] font-semibold">
                      {DISTRICT_SHAPES.filter(
                        ({ district: n }) => districts.get(n)!.sessionDays > 0 || district === n
                      ).map(({ district: n, centroid: [x, y] }) => (
                        <text
                          key={n}
                          x={x}
                          y={y - (districts.get(n)!.contractors.length ? 14 : 0)}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          stroke={SURFACE}
                          strokeWidth={3}
                          paintOrder="stroke"
                        >
                          {n}
                        </text>
                      ))}
                    </g>
                    <g>
                      {DISTRICT_SHAPES.flatMap(({ district: n, centroid }) => {
                        const residents = districts.get(n)!.contractors;
                        return residents.map((c, i) => {
                          const [x, y] = dotPosition(centroid, i, residents.length);
                          return (
                            <g
                              key={c.email}
                              className="cursor-pointer"
                              onMouseMove={(e) =>
                                showTip(
                                  e,
                                  <div className="tabular-nums">
                                    <div className="font-semibold">{c.name}</div>
                                    <div>{openDaysIn(c, week.days)} open days in {windowLabel}</div>
                                    <div>
                                      District {n} · {LOAD_STATUS_LABELS[loadStatus(c.profile, c.bookouts, today)]} over 4
                                      weeks
                                    </div>
                                    <div className="text-white/80">Click to open their profile</div>
                                  </div>
                                )
                              }
                              onClick={() => onOpen(c.email)}
                            >
                              <circle cx={x} cy={y} r={10} fill="transparent" />
                              <circle cx={x} cy={y} r={4} fill="white" stroke={SURFACE} strokeWidth={2} />
                            </g>
                          );
                        });
                      })}
                    </g>
                  </svg>
                  {hover && (
                    <div
                      className="pointer-events-none absolute z-10 w-max max-w-[240px] rounded-lg bg-[#0b1b33] px-3 py-2 text-xs shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3),0_6px_18px_rgba(0,0,0,0.4)]"
                      style={{
                        left: hover.x,
                        top: hover.y,
                        transform: `translate(${hover.flip ? "calc(-100% - 12px)" : "12px"}, 12px)`,
                      }}
                    >
                      {hover.content}
                    </div>
                  )}
                  {(loading || error) && (
                    <div className="absolute inset-x-0 top-0 flex justify-center">
                      <span
                        className={cn(
                          "flex items-center gap-2 rounded-full px-3 py-1 text-xs",
                          error ? "bg-red-900/80" : "bg-white/10"
                        )}
                      >
                        {error ? error : (<><Loader size={10} color="white" /> Loading sessions…</>)}
                      </span>
                    </div>
                  )}
                </div>

                <Legend workBreaks={need.workBreaks} freeBreaks={need.freeBreaks} />

                <div>
                  <h3 className="text-xs font-semibold mb-1">Most in need of staff, {windowLabel}</h3>
                  {need.ranked.length ? (
                    <table className="w-full text-xs tabular-nums">
                      <thead className="text-white/90">
                        <tr className="text-left">
                          <th className="font-medium py-1">District</th>
                          <th className="font-medium py-1 text-right">TL session days</th>
                          <th className="font-medium py-1 text-right">Free days nearby</th>
                        </tr>
                      </thead>
                      <tbody>
                        {need.ranked.map(({ stats: s, work: w, free: f }) => (
                          <tr
                            key={s.district}
                            className={cn(
                              "border-t border-white/10 cursor-pointer hover:bg-white/10",
                              district === s.district && "bg-white/15"
                            )}
                            onClick={() => onDistrictChange(district === s.district ? null : s.district)}
                          >
                            <td className="py-1">
                              <span className="inline-flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: NEED_FILL[f][w] }} />
                                D{s.district} · {boroughOf(s.district)}
                              </span>
                            </td>
                            <td className="py-1 text-right">{days(s.sessionDays)}</td>
                            <td className="py-1 text-right">{days(s.nearbyFreeDays)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-xs text-white/90">{loading ? "Loading…" : "No TL sessions in NYC districts."}</p>
                  )}
                </div>

                <ul className="text-xs text-white/90 flex flex-col gap-1">
                  <li>
                    Session days count each person booked, a coaching day as half. Free days nearby are full free days
                    of contractors living in the district or one next to it (or just across the river).
                  </li>
                  <li>
                    Citywide work (D75, D79, CUNY, transfer schools, CBOs) has no single district and isn't shaded:{" "}
                    <span className="font-semibold text-white">{days(citywideSessionDays)} session days</span>{" "}
                    {windowLabel}.
                  </li>
                  {offMap > 0 && (
                    <li>
                      {offMap} {offMap === 1 ? "contractor lives" : "contractors live"} just outside the city or
                      only gave a borough, so {offMap === 1 ? "isn't" : "aren't"} on the map. They're in the table.
                    </li>
                  )}
                  <li>Dots are contractors, placed in their home district, not at their address.</li>
                </ul>
              </div>
            </div>
          </section>
        )}
      </Transition>

      <button
        type="button"
        onClick={() => {
          setSize("normal");
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        aria-label={open ? "Close the NYC map" : "Open the NYC map"}
        className={cn(
          "flex items-center gap-2 h-12 rounded-full bg-[#082040]/85 pl-4 pr-5 text-white font-medium shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35),0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-sm hover:bg-[#082040]",
          FOCUS_RING,
          // Hidden in full screen, where it would sit on top of the panel
          open && size === "full" && "hidden"
        )}
      >
        {open ? <IconX size={20} /> : <IconMap size={20} />}
        NYC map
      </button>
    </Affix>
  );
};

// 3×3 key: TL work left to right, free days nearby bottom to top
const Legend = ({ workBreaks, freeBreaks }: { workBreaks: [number, number]; freeBreaks: [number, number] }) => {
  const range = ([mid, high]: [number, number], t: Tier) =>
    t === 0 ? `under ${days(mid)}` : t === 1 ? `${days(mid)}–${days(high)}` : `${days(high)}+`;
  const tiers: Tier[] = [0, 1, 2];
  return (
    <div className="flex items-end gap-4 text-xs text-white/90">
      <div className="flex items-stretch gap-1.5">
        <div className="flex flex-col justify-between text-[10px] text-right leading-tight py-0.5 tabular-nums">
          {[...tiers].reverse().map((f) => (
            <span key={f}>{range(freeBreaks, f)}</span>
          ))}
        </div>
        <div>
          <div className="grid grid-cols-3 gap-0.5">
            {[...tiers].reverse().flatMap((f) =>
              tiers.map((w) => (
                <span
                  key={`${f}${w}`}
                  className="h-5 w-8 rounded-sm"
                  style={{ background: NEED_FILL[f][w] }}
                  title={`${TIER_LABELS[w]} TL work, ${TIER_LABELS[f]!.toLowerCase()} free days nearby`}
                />
              ))
            )}
          </div>
          <div className="grid grid-cols-3 gap-0.5 text-[10px] text-center mt-0.5 tabular-nums">
            {tiers.map((w) => (
              <span key={w}>{range(workBreaks, w)}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 pb-4">
        <span>
          <span className="font-semibold text-white">→ TL session days</span>
        </span>
        <span>
          <span className="font-semibold text-white">↑ Free days nearby</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: NEED_FILL[0][2] }} />
          Needs staff: lots of work, few free nearby
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ background: EMPTY, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.3)" }}
          />
          No TL work
        </span>
      </div>
    </div>
  );
};
