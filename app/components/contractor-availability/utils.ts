/**
 * POSTs JSON to a CBS api route. Never throws: a network failure comes back
 * as { ok: false } with an error message, so callers' spinners always stop.
 */
export async function postJson<T = any>(
  url: string,
  body: unknown = {}
): Promise<{ ok: boolean; data: T & { error?: string } }> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  } catch {
    return {
      ok: false,
      data: { error: "Couldn't reach Form Hub. Check your connection and try again." } as T & {
        error?: string;
      },
    };
  }
}
