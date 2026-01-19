export function compareTwoStrings(strA: string, strB: string) {
  const cleanA = strA.toLowerCase().replace(/\s+/g, "");
  const cleanB = strB.toLowerCase().replace(/\s+/g, "");
  return cleanA === cleanB;
}

export function containsString(strA: string, strB: string) {
  const cleanA = strA.toLowerCase().replace(/\s+/g, "");
  const cleanB = strB.toLowerCase().replace(/\s+/g, "");
  return cleanA.includes(cleanB);
}


