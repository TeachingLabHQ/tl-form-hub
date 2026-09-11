import { useEffect, useState } from "react";
import type { CoachOption } from "~/domains/coach-log/model";
import { useSession } from "~/components/auth/hooks/useSession";
import { canOverrideCoach } from "../constants";

/**
 * Testing-only coach override, shared by the coach-log and participant-roster
 * forms. Allow-listed admins (see canOverrideCoach) get a dropdown of Monday
 * coaches; picking one (by Monday id) overrides the effective coach identity.
 * Everyone else — and the tester before picking — uses their logged-in profile.
 *
 * Returns the effective `coachName` / `coachMondayId` plus the dropdown state
 * the CoachNameQuestion needs. Forms do their own field resets in the onChange.
 */
export function useCoachOverride() {
  const { mondayProfile } = useSession();
  const canOverride = canOverrideCoach(mondayProfile?.email);
  const [coachOverrideId, setCoachOverrideId] = useState("");
  const [coachOptions, setCoachOptions] = useState<CoachOption[]>([]);
  const [loadingCoachOptions, setLoadingCoachOptions] = useState(false);

  // Load the coach dropdown options once, only for allow-listed admins.
  useEffect(() => {
    if (!canOverride) return;

    let cancelled = false;
    setLoadingCoachOptions(true);
    fetch("/api/coach-log/coach-names")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setCoachOptions(data.coaches || []);
      })
      .catch(() => {
        if (!cancelled) setCoachOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCoachOptions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canOverride]);

  const overriddenCoach =
    canOverride && coachOverrideId
      ? coachOptions.find((c) => c.mondayId === coachOverrideId)
      : undefined;
  const coachName = overriddenCoach?.name ?? mondayProfile?.name ?? "";
  const coachMondayId =
    overriddenCoach?.mondayId ?? mondayProfile?.mondayProfileId ?? "";

  return {
    canOverride,
    coachOverrideId,
    setCoachOverrideId,
    coachOptions,
    loadingCoachOptions,
    coachName,
    coachMondayId,
  };
}
