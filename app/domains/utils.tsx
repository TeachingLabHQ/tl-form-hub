export async function fetchMondayData(queryBody: string): Promise<any> {
  const response = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: import.meta.env.VITE_MONDAY_API_KEY,
      "API-Version": "2025-07",
    },
    body: JSON.stringify({
      query: queryBody,
    }),
  });
  const result = await response.json();
  return result;
}

export async function insertMondayData(query: string, vars: any): Promise<any> {
  const response = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: import.meta.env.VITE_MONDAY_API_KEY,
      "API-Version": "2025-07",
    },
    body: JSON.stringify({
      query: query,
      variables: vars,
    }),
  });
  const result = await response.json();
  return result;
}
