import { useCallback, useEffect, useState } from "react";
import type { Contractor } from "~/domains/contractor-availability/model";
import { postJson } from "../utils";

/** Every active contractor, for the staffing view (loaded only when enabled). */
export function useRoster(enabled: boolean) {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { ok, data } = await postJson<{ contractors: Contractor[] }>(
        "/api/contractor-availability/roster"
      );
      if (ok) {
        setContractors(data.contractors);
        setLoadedAt(new Date());
      }
      else setError(data.error ?? "Failed to load contractors");
    } catch {
      setError("Failed to load contractors");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  // Returns null on success or an error message to show
  const saveStaffNotes = async (email: string, notes: string) => {
    const { ok, data } = await postJson("/api/contractor-availability/save-staff-notes", {
      email,
      notes,
    });
    if (!ok) return data.error ?? "Failed to save the notes";
    setContractors((list) =>
      list.map((c) => (c.email === email ? { ...c, staffNotes: notes.trim() } : c))
    );
    return null;
  };

  // Records that staff opened this contractor; best effort, so failures are silent
  const markViewed = async (email: string) => {
    const { ok, data } = await postJson<{ viewedOn: string | null }>(
      "/api/contractor-availability/mark-viewed",
      { email }
    );
    if (!ok || !data.viewedOn) return;
    setContractors((list) =>
      list.map((c) => (c.email === email ? { ...c, staffViewedOn: data.viewedOn } : c))
    );
  };

  return { contractors, loading, error, loadedAt, reload: load, saveStaffNotes, markViewed };
}
