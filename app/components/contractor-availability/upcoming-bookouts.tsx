import { ActionIcon, Button, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { formatRange, todayIso } from "~/domains/contractor-availability/availability";
import { type Bookout, bookoutTypeLabel } from "~/domains/contractor-availability/model";
import {
  describeSessionWeek,
  SESSION_PORTION_NOTE,
  type SessionWeek,
  sessionWeeks,
} from "~/domains/contractor-availability/sessions";
import { cn } from "~/utils/utils";
import { BOOKOUT_CHIP } from "./constants";
import { Panel } from "./panel";

type Props = {
  bookouts: Bookout[];
  onRemove: (id: string) => Promise<string | null>;
};

// Rows shown before "Show all"
const VISIBLE_ROWS = 6;

// The calendar legend's swatch, so rows read without a badge on each
const Swatch = ({ type }: { type: Bookout["type"] }) => (
  <span aria-hidden className={cn("h-2.5 w-2.5 shrink-0 rounded-sm", BOOKOUT_CHIP[type])} />
);

type Row = { start: string; bookout: Bookout; week?: never } | { start: string; week: SessionWeek; bookout?: never };

/**
 * The contractor's bookouts from today on. Their own are removable (two-step
 * confirm); synced sessions aren't, and roll up to one row per week so a busy
 * coach's list stays short.
 */
export const UpcomingBookouts = ({ bookouts, onRemove }: Props) => {
  const today = todayIso();
  const upcoming = bookouts.filter((b) => b.end >= today);
  const rows: Row[] = [
    ...upcoming.filter((b) => !b.source).map((b) => ({ start: b.start, bookout: b })),
    ...sessionWeeks(upcoming).map((w) => ({ start: w.start, week: w })),
  ].sort((a, b) => a.start.localeCompare(b.start));
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? rows : rows.slice(0, VISIBLE_ROWS);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const remove = async (id: string) => {
    setRemoving(id);
    const error = await onRemove(id);
    setRemoving(null);
    setConfirming(null);
    notifications.show(
      error
        ? { color: "red", title: "Couldn't remove the bookout", message: error }
        : { color: "teal", title: "Bookout removed", message: "Staffing sees the change now." }
    );
  };

  return (
    <Panel
      title="Upcoming on your calendar"
      meta={rows.length > 0 && <span className="text-xs text-white/90">{rows.length}</span>}
    >
      {rows.length === 0 ? (
        <p className="text-sm text-white/90">Nothing coming up. Submit a bookout for any day you can't take Teaching Lab work.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-white/25 -my-1">
          {shown.map(({ bookout: b, week }) =>
            week ? (
              <li key={week.id} className="flex items-center gap-3 py-1.5 text-sm min-h-[40px]">
                <Swatch type="fac" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium tabular-nums">{formatRange(week.start, week.end)}</span>
                  <span className="block truncate text-xs text-white/90">{describeSessionWeek(week)}</span>
                </div>
              </li>
            ) : (
              <li key={b.id} className="flex items-center gap-3 py-1.5 text-sm min-h-[40px]">
                <Swatch type={b.type} />
                <div className="flex-1 min-w-0">
                  <span className="font-medium tabular-nums">{formatRange(b.start, b.end)}</span>
                  <span className="block truncate text-xs text-white/90">
                    {[bookoutTypeLabel(b.type), b.portion !== "Full day" && `${b.portion} only`, b.note]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                {confirming === b.id ? (
                  <Button
                    size="compact-xs"
                    color="red"
                    loading={removing === b.id}
                    onClick={() => remove(b.id)}
                    onBlur={() => setConfirming((c) => (c === b.id && removing !== b.id ? null : c))}
                    autoFocus
                  >
                    Remove
                  </Button>
                ) : (
                  <Tooltip label="Remove bookout" withArrow>
                    <ActionIcon
                      variant="subtle"
                      color="white"
                      size="sm"
                      aria-label={`Remove ${formatRange(b.start, b.end)}`}
                      onClick={() => setConfirming(b.id)}
                    >
                      <IconTrash size={15} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </li>
            )
          )}
        </ul>
      )}
      {rows.length > VISIBLE_ROWS && (
        <Button variant="subtle" color="white" size="compact-sm" mt="xs" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show fewer" : `Show all ${rows.length}`}
        </Button>
      )}
      {upcoming.some((b) => b.source === "logistics") && (
        <p className="mt-2 text-xs text-white/90">{SESSION_PORTION_NOTE}</p>
      )}
    </Panel>
  );
};
