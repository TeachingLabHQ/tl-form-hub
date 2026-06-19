import { useEffect, useState } from "react";
import type { CoachLogIdentity } from "~/domains/coach-log/model";

/**
 * Checks whether a coach log already exists for this coach + district + school +
 * date (the one-log-per-day rule). Re-runs whenever any of those change, calling
 * the `/api/coach-log/exists` endpoint, and exposes:
 *  - `duplicateExists`: true when a matching log was found
 *  - `checking`: true while the check is in flight
 *  - `checkError`: true when the check couldn't complete (so the form can warn
 *    the coach instead of silently assuming "no duplicate")
 *  - `setDuplicateExists`: so the submit handler can flip it on a server 409
 *
 * The check is skipped (and state reset) until all four fields are present. The
 * authoritative guard still lives in the submit route.
 */
export function useDuplicateCheck(query: CoachLogIdentity) {
  const { coachMondayId, coachName, district, school, sessionDate } = query;
  const [duplicateExists, setDuplicateExists] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState(false);

  useEffect(() => {
    if (!district || !school || !sessionDate) {
      setDuplicateExists(false);
      setChecking(false);
      setCheckError(false);
      return;
    }

    let cancelled = false;
    setChecking(true);
    setCheckError(false);
    fetch("/api/coach-log/exists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coachMondayId,
        coachName,
        district,
        school,
        sessionDate,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setCheckError(true);
          setDuplicateExists(false);
        } else {
          setCheckError(false);
          setDuplicateExists(!!data.exists);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCheckError(true);
          setDuplicateExists(false);
        }
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [coachMondayId, coachName, district, school, sessionDate]);

  return { duplicateExists, checking, checkError, setDuplicateExists };
}
