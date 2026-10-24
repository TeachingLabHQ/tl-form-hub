import { useCallback, useEffect, useState } from "react";
import type { NycWorkDay } from "~/domains/contractor-availability/nyc";
import { postJson } from "../utils";

/** TL session work in NYC by day and district (loaded only when enabled). */
export function useNycWork(enabled: boolean) {
  const [work, setWork] = useState<NycWorkDay[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { ok, data } = await postJson<{ work: NycWorkDay[] }>("/api/contractor-availability/nyc-work");
      if (ok) setWork(data.work);
      else setError(data.error ?? "Failed to load NYC sessions");
    } catch {
      setError("Failed to load NYC sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  return { work, loading, error, reload: load };
}
