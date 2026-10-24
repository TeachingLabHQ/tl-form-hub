// Contractor Bookout System (CBS): 1099 coach/facilitator capacity. Each
// contractor keeps a General Availability Profile (standing preferences) and
// logs bookouts (specific dates they can't take, or are already committed).

export type TravelFormat = "virtual" | "local" | "short" | "any";
export type Weekday = "Mon" | "Tue" | "Wed" | "Thu" | "Fri";
export type BookoutType = "nontl" | "fac" | "other";
// "Half day" is only used for sessions synced from the logistics boards
export type DayPortion = "Full day" | "AM" | "PM" | "Half day";
export type SessionKind = "facilitation" | "coaching";

export interface AvailabilityProfile {
  formats: TravelFormat[];
  // "Anywhere" or region names (see REGIONS)
  regions: string[];
  longestTrip: string;
  outsideWork: string;
  outsideHours: number;
  conflicts: string;
  support: string[];
  weekdays: Weekday[];
  // 0 = not set yet
  daysPerWeek: number;
  maxDaysPerMonth: number;
  // 0-11
  months: number[];
  notes: string;
  // YYYY-MM-DD the contractor last saved or confirmed it; null = never
  confirmedOn: string | null;
}

export interface Bookout {
  id: string;
  type: BookoutType;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD, inclusive
  portion: DayPortion;
  note: string;
  // "logistics" = synced from the session calendar; read-only in CBS
  source?: "logistics";
  // Synced sessions only: what kind of day it is and for which projects
  session?: { kind: SessionKind; projects: string[] };
}

export type NewBookout = Omit<Bookout, "id">;

// One row of the Coach/Facilitator Details board (read-only intake data)
export interface ContractorIntake {
  detailsItemId: string;
  name: string;
  email: string;
  city: string;
  state: string; // two-letter code, "" if unknown
  // Coordinates of their home address. Server only: the roster swaps them for
  // `nyc` so no one's address reaches the browser.
  home: { lat: number; lng: number } | null;
  timeZone: string;
  contentAreas: string[];
  // The profile implied by their intake-form answers, used until they save one
  intakeProfile: AvailabilityProfile;
}

export type Borough = "Manhattan" | "Bronx" | "Brooklyn" | "Queens" | "Staten Island";

// Where an NYC-area contractor lives, at school-district grain
export interface NycHome {
  // Community school district (1-32); null when we only know the borough, or
  // they live just outside the city
  district: number | null;
  borough: Borough | null;
}

// One item on the CBS board (a saved profile, with bookouts as subitems)
export interface SavedProfile {
  itemId: string;
  email: string;
  profile: AvailabilityProfile;
  bookouts: Bookout[];
  // Internal staffing notes; only the staff roster reads them
  staffNotes: string;
  // YYYY-MM-DD staff last opened this contractor in the admin drawer
  staffViewedOn: string | null;
}

export interface Contractor extends Omit<ContractorIntake, "intakeProfile" | "home"> {
  // null when they don't live in or near New York City
  nyc: NycHome | null;
  profileItemId: string | null;
  profile: AvailabilityProfile;
  // "intake" until the contractor saves their own profile in CBS
  profileSource: "saved" | "intake";
  bookouts: Bookout[];
  staffNotes: string;
  staffViewedOn: string | null;
  // Their schedule notes from the onboarding form, to say where the GAP's notes came from
  intakeNotes: string;
}

// One save or confirm of a contractor's GAP, kept as a Monday item update
export interface GapHistoryEntry {
  at: string; // ISO timestamp
  text: string;
}

export const TRAVEL_FORMATS: { value: TravelFormat; label: string }[] = [
  { value: "virtual", label: "Virtual" },
  { value: "local", label: "In person - local only" },
  { value: "short", label: "In person - 2 to 3 days" },
  { value: "any", label: "In person - no limits" },
];
export const REGIONS = ["Anywhere", "Northeast", "Southeast", "Midwest", "Southwest", "West"];
export const LONGEST_TRIP_OPTIONS = ["Day trips only", "Overnight OK", "Multi-day OK"];
export const OUTSIDE_WORK_OPTIONS = ["None", "Part-time elsewhere", "Full-time elsewhere"];
export const SUPPORT_OPTIONS = ["Coaching", "Facilitation", "Content development"];
export const WEEKDAYS: Weekday[] = ["Mon", "Tue", "Wed", "Thu", "Fri"];
export const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const BOOKOUT_TYPES: { value: BookoutType; label: string }[] = [
  { value: "nontl", label: "Non-TL bookout" },
  { value: "fac", label: "TL facilitation / coaching" },
  { value: "other", label: "Other TL commitment" },
];
export const DAY_PORTIONS: DayPortion[] = ["Full day", "AM", "PM"];

export const bookoutTypeLabel = (type: BookoutType) =>
  BOOKOUT_TYPES.find((t) => t.value === type)?.label ?? type;

export const STATES: Record<string, { name: string; region: string }> = {
  AL: { name: "Alabama", region: "Southeast" }, AK: { name: "Alaska", region: "West" },
  AZ: { name: "Arizona", region: "Southwest" }, AR: { name: "Arkansas", region: "Southeast" },
  CA: { name: "California", region: "West" }, CO: { name: "Colorado", region: "West" },
  CT: { name: "Connecticut", region: "Northeast" }, DE: { name: "Delaware", region: "Northeast" },
  DC: { name: "Washington DC", region: "Northeast" }, FL: { name: "Florida", region: "Southeast" },
  GA: { name: "Georgia", region: "Southeast" }, HI: { name: "Hawaii", region: "West" },
  ID: { name: "Idaho", region: "West" }, IL: { name: "Illinois", region: "Midwest" },
  IN: { name: "Indiana", region: "Midwest" }, IA: { name: "Iowa", region: "Midwest" },
  KS: { name: "Kansas", region: "Midwest" }, KY: { name: "Kentucky", region: "Southeast" },
  LA: { name: "Louisiana", region: "Southeast" }, ME: { name: "Maine", region: "Northeast" },
  MD: { name: "Maryland", region: "Northeast" }, MA: { name: "Massachusetts", region: "Northeast" },
  MI: { name: "Michigan", region: "Midwest" }, MN: { name: "Minnesota", region: "Midwest" },
  MS: { name: "Mississippi", region: "Southeast" }, MO: { name: "Missouri", region: "Midwest" },
  MT: { name: "Montana", region: "West" }, NE: { name: "Nebraska", region: "Midwest" },
  NV: { name: "Nevada", region: "West" }, NH: { name: "New Hampshire", region: "Northeast" },
  NJ: { name: "New Jersey", region: "Northeast" }, NM: { name: "New Mexico", region: "Southwest" },
  NY: { name: "New York", region: "Northeast" }, NC: { name: "North Carolina", region: "Southeast" },
  ND: { name: "North Dakota", region: "Midwest" }, OH: { name: "Ohio", region: "Midwest" },
  OK: { name: "Oklahoma", region: "Southwest" }, OR: { name: "Oregon", region: "West" },
  PA: { name: "Pennsylvania", region: "Northeast" }, RI: { name: "Rhode Island", region: "Northeast" },
  SC: { name: "South Carolina", region: "Southeast" }, SD: { name: "South Dakota", region: "Midwest" },
  TN: { name: "Tennessee", region: "Southeast" }, TX: { name: "Texas", region: "Southwest" },
  UT: { name: "Utah", region: "West" }, VT: { name: "Vermont", region: "Northeast" },
  VA: { name: "Virginia", region: "Southeast" }, WA: { name: "Washington", region: "West" },
  WV: { name: "West Virginia", region: "Southeast" }, WI: { name: "Wisconsin", region: "Midwest" },
  WY: { name: "Wyoming", region: "West" },
};

export const stateCodeFromName = (name: string): string => {
  const n = name.trim().toLowerCase();
  if (!n) return "";
  const code = Object.keys(STATES).find(
    (k) => STATES[k]!.name.toLowerCase() === n || k.toLowerCase() === n
  );
  return code ?? "";
};
