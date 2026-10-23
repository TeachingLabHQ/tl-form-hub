import { Button, Loader } from "@mantine/core";
import { useEffect, useState } from "react";
import type { GapHistoryEntry } from "~/domains/contractor-availability/model";
import { postJson } from "./utils";

const when = (at: string) =>
  new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/**
 * Every save and confirm of a contractor's GAP, newest first. Loads when
 * opened, and again when `version` changes while open (after a save).
 */
export const GapHistory = ({ email, version = 0 }: { email: string; version?: number }) => {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<GapHistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let current = true;
    setError(null);
    postJson<{ history: GapHistoryEntry[] }>("/api/contractor-availability/gap-history", { email }).then(
      ({ ok, data }) => {
        if (!current) return;
        if (ok) setHistory(data.history);
        else setError(data.error ?? "Failed to load the history");
      }
    );
    return () => {
      current = false;
    };
  }, [open, email, version]);

  return (
    <div>
      <Button variant="subtle" color="white" size="compact-sm" px={0} onClick={() => setOpen((o) => !o)}>
        {open ? "Hide GAP history" : "Show GAP history"}
      </Button>
      {open &&
        (error ? (
          <p className="text-xs text-red-300 mt-1">{error}</p>
        ) : history === null ? (
          <Loader size="xs" color="white" mt={4} />
        ) : history.length === 0 ? (
          <p className="text-xs text-white/90 mt-1">No saves recorded yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-white/15 max-h-60 overflow-y-auto mt-1 text-xs">
            {history.map((h) => (
              <li key={`${h.at}-${h.text}`} className="py-1.5">
                <span className="font-medium tabular-nums">{when(h.at)}</span>
                <span className="block text-white/90">{h.text}</span>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
};
