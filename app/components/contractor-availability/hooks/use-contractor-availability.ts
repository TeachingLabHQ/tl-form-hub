import { useCallback, useEffect, useState } from "react";
import type {
  AvailabilityProfile,
  Contractor,
  NewBookout,
} from "~/domains/contractor-availability/model";
import { postJson } from "../utils";

/**
 * One contractor's profile + bookouts, with the save/add/remove calls. Each
 * call returns null on success or an error message to show.
 */
export function useContractorAvailability(email: string) {
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!email) return;
    setLoading(true);
    setLoadError(null);
    try {
      const { ok, data } = await postJson<{ contractor: Contractor }>(
        "/api/contractor-availability/contractor",
        { email }
      );
      if (ok) setContractor(data.contractor);
      else setLoadError(data.error ?? "Failed to load your profile");
    } catch {
      setLoadError("Failed to load your profile");
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    setContractor(null);
    load();
  }, [load]);

  const saveProfile = async (profile: AvailabilityProfile) => {
    const { ok, data } = await postJson<{ contractor: Contractor }>(
      "/api/contractor-availability/save-profile",
      { email, profile }
    );
    if (!ok) return data.error ?? "Failed to save your profile";
    setContractor((c) => (c ? { ...c, ...data.contractor, bookouts: c.bookouts } : data.contractor));
    return null;
  };

  const addBookout = async (bookout: NewBookout) => {
    const { ok, data } = await postJson("/api/contractor-availability/add-bookout", {
      email,
      bookout,
    });
    if (!ok) return data.error ?? "Failed to save the bookout";
    await load();
    return null;
  };

  const removeBookout = async (bookoutId: string) => {
    const { ok, data } = await postJson("/api/contractor-availability/remove-bookout", {
      email,
      bookoutId,
    });
    if (!ok) return data.error ?? "Failed to remove the bookout";
    setContractor((c) =>
      c ? { ...c, bookouts: c.bookouts.filter((b) => b.id !== bookoutId) } : c
    );
    return null;
  };

  return { contractor, loading, loadError, reload: load, saveProfile, addBookout, removeBookout };
}
