import type { BookoutType } from "~/domains/contractor-availability/model";

// Inner panel on the forms' glass card
export const PANEL =
  "rounded-2xl bg-white/15 p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.45)] min-w-0";

export const BOOKOUT_COLORS: Record<BookoutType, string> = {
  nontl: "violet",
  fac: "blue",
  other: "teal",
};

// Tailwind classes for calendar chips / capacity squares, by bookout type
export const BOOKOUT_CHIP: Record<BookoutType, string> = {
  nontl: "bg-violet-600 text-white",
  fac: "bg-blue-700 text-white",
  other: "bg-teal-700 text-white",
};
