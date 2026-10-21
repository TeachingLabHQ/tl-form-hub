import { Badge, Button } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { formatRange, todayIso } from "~/domains/contractor-availability/availability";
import { type Bookout, bookoutTypeLabel } from "~/domains/contractor-availability/model";
import { cn } from "~/utils/utils";
import { BOOKOUT_COLORS, PANEL } from "./constants";

type Props = {
  bookouts: Bookout[];
  onRemove: (id: string) => Promise<string | null>;
};

/** The contractor's bookouts from today on, each removable (two-step confirm). */
export const UpcomingBookouts = ({ bookouts, onRemove }: Props) => {
  const today = todayIso();
  const upcoming = bookouts.filter((b) => b.end >= today);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const remove = async (id: string) => {
    if (confirming !== id) {
      setConfirming(id);
      return;
    }
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
    <div className={cn(PANEL, "flex flex-col gap-2")}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Coming up</h2>
        <span className="text-sm text-white/80">{upcoming.length} logged</span>
      </div>
      {upcoming.length === 0 ? (
        <p className="text-sm text-white/80">
          Nothing logged yet. Use “Log a bookout” for any day you can't take Teaching Lab work.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-white/25">
          {upcoming.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
              <span className="min-w-[110px] font-medium tabular-nums">{formatRange(b.start, b.end)}</span>
              <Badge color={BOOKOUT_COLORS[b.type]} variant="filled">
                {bookoutTypeLabel(b.type)}
              </Badge>
              <span className="flex-1 min-w-[120px] text-white/85">
                {b.portion !== "Full day" ? `${b.portion} · ` : ""}
                {b.note}
              </span>
              <Button
                size="xs"
                variant={confirming === b.id ? "filled" : "subtle"}
                color={confirming === b.id ? "red" : "white"}
                loading={removing === b.id}
                onClick={() => remove(b.id)}
                onBlur={() => setConfirming((c) => (c === b.id && removing !== b.id ? null : c))}
              >
                {confirming === b.id ? "Confirm remove" : "Remove"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
