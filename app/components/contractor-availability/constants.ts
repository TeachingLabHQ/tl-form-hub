import type { BookoutType } from "~/domains/contractor-availability/model";

// The page card: navy-tinted glass, dark enough for white text to meet WCAG AA
// over the lightest part of the background image
export const CARD =
  "rounded-[25px] bg-[#082040]/65 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)] backdrop-blur-sm text-white";

// Inner panel on the card. Keep the tint faint: a lighter panel lowers contrast.
export const PANEL =
  "rounded-2xl bg-white/[0.06] p-4 md:p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)] min-w-0";

// Segmented switches on the card (Admin/Contractor view, staffing tools)
export const SEGMENTED_CLASSES = {
  root: "bg-white/10 p-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)]",
  indicator: "bg-white shadow-sm",
  label: "text-white/90 data-[active]:text-[#0053B3] hover:text-white font-medium px-3",
  control: "before:hidden",
};

// Visible keyboard focus on clickable rows, bars and cells
export const FOCUS_RING =
  "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

// Mantine field labels on the glass card: white, one step below panel titles
export const FIELD_CLASSES = {
  label: "text-white text-sm font-medium mb-1",
  description: "text-white/90",
};

// Mantine shades dark enough for white badge text (WCAG AA), matching BOOKOUT_CHIP
export const BOOKOUT_COLORS: Record<BookoutType, string> = {
  nontl: "violet.7",
  fac: "blue.8",
  other: "teal.9",
};

// Tailwind classes for calendar chips / capacity squares, by bookout type
export const BOOKOUT_CHIP: Record<BookoutType, string> = {
  nontl: "bg-violet-600 text-white",
  fac: "bg-blue-700 text-white",
  other: "bg-teal-700 text-white",
};
