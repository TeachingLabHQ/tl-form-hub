import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// The form sends the picked day as a UTC-noon ISO string. Take the date text
// as-is: parsing it into a Date on the server (UTC) shifted days for US users.
export const formatDate = (date: string) => {
  // console.log("date", date);
  return date.substring(0, 10);
};

export const formatTierData = (tiers: { type: string; value: string }[]): string => {
  return tiers
    .map((tier) => {
      // Capitalize and format the type name
      const formattedType = tier.type
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/^./, (str: string) => str.toUpperCase()) // Capitalize first letter
        .trim();
      return `${formattedType}: ${tier.value}`;
    })
    .join(', ');
};
