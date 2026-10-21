import { ActionIcon, Badge, Button, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { formatRange, todayIso } from "~/domains/contractor-availability/availability";
import { type Bookout, bookoutTypeLabel } from "~/domains/contractor-availability/model";
import { BOOKOUT_COLORS } from "./constants";
import { Panel } from "./panel";

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
      meta={upcoming.length > 0 && <span className="text-xs text-white/75">{upcoming.length}</span>}
    >
      {upcoming.length === 0 ? (
        <p className="text-sm text-white/80">Nothing coming up. Submit a bookout for any day you can't take Teaching Lab work.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-white/25 -my-1">
          {upcoming.map((b) => (
            <li key={b.id} className="flex items-center gap-3 py-1.5 text-sm min-h-[40px]">
              <div className="flex-1 min-w-0">
                <span className="font-medium tabular-nums">{formatRange(b.start, b.end)}</span>
                {(b.portion !== "Full day" || b.note) && (
                  <span className="block truncate text-xs text-white/75">
                    {b.portion !== "Full day" ? `${b.portion} only` : ""}
                    {b.portion !== "Full day" && b.note ? " · " : ""}
                    {b.note}
                  </span>
                )}
              </div>
              <Badge color={BOOKOUT_COLORS[b.type]} variant="filled" size="sm" className="shrink-0">
                {bookoutTypeLabel(b.type)}
              </Badge>
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
          ))}
        </ul>
      )}
    </Panel>
  );
};
