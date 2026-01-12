export async function fetchMondayData(queryBody: string): Promise<any> {
  // Check if we're running on the server
  const isServer = typeof window === "undefined";
  
  if (isServer) {
    // Server-side: call Monday API directly
    const response = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: process.env.MONDAY_API_KEY || "",
        "API-Version": "2025-07",
      },
      body: JSON.stringify({
        query: queryBody,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Monday API returned ${response.status}`);
    }
    
    const result = await response.json();
    console.log("result", result);
    return result;
  } else {
    // Client-side: use proxy
    const response = await fetch("/api/monday/proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: queryBody,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Monday data: ${response.status}`);
    }
    
    const result = await response.json();
    console.log("result", result);
    return result;
  }
}

export async function insertMondayData(query: string, vars: any): Promise<any> {
  // Check if we're running on the server
  const isServer = typeof window === "undefined";
  
  if (isServer) {
    // Server-side: call Monday API directly
    const response = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: process.env.MONDAY_API_KEY || "",
        "API-Version": "2025-07",
      },
      body: JSON.stringify({
        query: query,
        variables: vars,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Monday API returned ${response.status}`);
    }
    
    const result = await response.json();
    return result;
  } else {
    // Client-side: use proxy
    const response = await fetch("/api/monday/proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: query,
        variables: vars,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to insert Monday data: ${response.status}`);
    }
    
    const result = await response.json();
    return result;
  }
}
