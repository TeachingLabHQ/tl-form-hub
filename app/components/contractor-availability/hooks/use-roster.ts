import { useCallback, useEffect, useState } from "react";
import type { Contractor } from "~/domains/contractor-availability/model";
import { postJson } from "../constants";

/** Every active contractor, for the staffing view (loaded only when enabled). */
export function useRoster(enabled: boolean) {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { ok, data } = await postJson<{ contractors: Contractor[] }>(
        "/api/contractor-availability/roster"
      );
      if (ok) setContractors(data.contractors);
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

  return { contractors, loading, error, reload: load };
}
