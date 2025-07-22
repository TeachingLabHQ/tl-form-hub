export function extractTier(input: string): string {
  // Create regex to match "tier" followed by any number
  const tierPattern = /tier\s+\d+/i;
  
  const match = input.match(tierPattern);
  
  if (match) {
    // Return the full matched tier with uppercase "Tier"
    return match[0].toLowerCase().replace('tier', 'Tier');
  }
  
  return "";
}
