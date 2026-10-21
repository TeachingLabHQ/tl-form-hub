import { Errorable } from "~/utils/errorable";
import { fetchMondayData, insertMondayData } from "~/domains/utils";
import { isIsoDate, profileFromIntake } from "./availability";
import {
  type AvailabilityProfile,
  type Bookout,
  type BookoutType,
  type ContractorIntake,
  type DayPortion,
  type NewBookout,
  type SavedProfile,
  type TravelFormat,
  type Weekday,
  BOOKOUT_TYPES,
  DAY_PORTIONS,
  MONTH_LABELS,
  stateCodeFromName,
  TRAVEL_FORMATS,
  WEEKDAYS,
} from "./model";

// Read-only source of the contractor list: the Coach/Facilitator Details
// board. 1099 contractors are the items whose FY27 contract status is
// "Signed" or "Sent" (full-time staff are "Signed FT Contract").
//   text60            = Email                    color_mm4b5hep = FY 27' Contract Status
//   status10__1       = Able to Support          dropdown6__1   = Scheduling/travel preference
//   dropdown5__1      = Weekdays generally available
//   long_text2__1     = Schedule/travel notes    dropdown_mkw5q2x0 = State of Residence
//   location_mkt63brt = City of Residence        status877      = Time Zone
//   dropdown44        = Content areas
export const COACH_FACILITATOR_DETAILS_BOARD_ID = 2208860812;
const CONTRACTOR_STATUSES = ["signed", "sent"];
const DETAILS_COLUMNS = [
  "text60",
  "color_mm4b5hep",
  "status10__1",
  "dropdown6__1",
  "dropdown5__1",
  "long_text2__1",
  "dropdown_mkw5q2x0",
  "location_mkt63brt",
  "status877",
  "dropdown44",
];

// Where CBS writes: "CBS Contractor Capacity (DEMO)". One item per contractor
// profile; each bookout is a subitem. Column ids were set explicitly when the
// board was created, so they read as what they hold.
export const CBS_BOARD_ID = 18436481629;
const PROFILE_COLUMNS = [
  "cbs_email",
  "cbs_details_id",
  "cbs_formats",
  "cbs_regions",
  "cbs_longest",
  "cbs_outside",
  "cbs_outside_hours",
  "cbs_cois",
  "cbs_support",
  "cbs_weekdays",
  "cbs_per_week",
  "cbs_max_month",
  "cbs_months",
  "cbs_notes",
  "cbs_confirmed",
];
const BOOKOUT_COLUMNS = ["cbs_type", "cbs_dates", "cbs_portion", "cbs_note"];

const col = (item: any, id: string) =>
  item.column_values?.find((c: any) => c.id === id);
const text = (item: any, id: string): string => String(col(item, id)?.text ?? "").trim();
// Dropdown text is the labels joined with ", " (CBS labels have no commas)
const list = (item: any, id: string): string[] =>
  text(item, id)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const num = (item: any, id: string) => Number(text(item, id)) || 0;
const parseJson = (raw: unknown) => {
  try {
    return typeof raw === "string" ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const labels = (values: string[]) => ({ labels: values });

export function profileToColumns(profile: AvailabilityProfile) {
  const formatLabels = profile.formats
    .map((f) => TRAVEL_FORMATS.find((t) => t.value === f)?.label)
    .filter((l): l is string => Boolean(l));
  return {
    cbs_formats: labels(formatLabels),
    cbs_regions: labels(profile.regions),
    cbs_longest: labels(profile.longestTrip ? [profile.longestTrip] : []),
    cbs_outside: labels(profile.outsideWork ? [profile.outsideWork] : []),
    cbs_outside_hours: String(profile.outsideHours || 0),
    cbs_cois: { text: profile.conflicts },
    cbs_support: labels(profile.support),
    cbs_weekdays: labels(profile.weekdays),
    cbs_per_week: String(profile.daysPerWeek || 0),
    cbs_max_month: String(profile.maxDaysPerMonth || 0),
    cbs_months: labels(profile.months.map((m) => MONTH_LABELS[m]).filter((m): m is string => Boolean(m))),
    cbs_notes: { text: profile.notes },
    cbs_confirmed: profile.confirmedOn ? { date: profile.confirmedOn } : null,
  };
}

export function profileFromItem(item: any): AvailabilityProfile {
  const confirmed = text(item, "cbs_confirmed");
  return {
    formats: list(item, "cbs_formats")
      .map((l) => TRAVEL_FORMATS.find((t) => t.label === l)?.value)
      .filter((v): v is TravelFormat => Boolean(v)),
    regions: list(item, "cbs_regions"),
    longestTrip: text(item, "cbs_longest"),
    outsideWork: text(item, "cbs_outside"),
    outsideHours: num(item, "cbs_outside_hours"),
    conflicts: text(item, "cbs_cois"),
    support: list(item, "cbs_support"),
    weekdays: list(item, "cbs_weekdays").filter((d): d is Weekday =>
      WEEKDAYS.includes(d as Weekday)
    ),
    daysPerWeek: num(item, "cbs_per_week"),
    maxDaysPerMonth: num(item, "cbs_max_month"),
    months: list(item, "cbs_months")
      .map((m) => MONTH_LABELS.indexOf(m))
      .filter((m) => m >= 0),
    notes: text(item, "cbs_notes"),
    confirmedOn: isIsoDate(confirmed) ? confirmed : null,
  };
}

export function bookoutFromSubitem(sub: any): Bookout | null {
  const dates = parseJson(col(sub, "cbs_dates")?.value);
  if (!isIsoDate(dates?.from) || !isIsoDate(dates?.to)) return null;
  const typeLabel = text(sub, "cbs_type");
  const portion = text(sub, "cbs_portion") as DayPortion;
  return {
    id: String(sub.id),
    type: (BOOKOUT_TYPES.find((t) => t.label === typeLabel)?.value ?? "nontl") as BookoutType,
    start: dates.from,
    end: dates.to,
    portion: DAY_PORTIONS.includes(portion) ? portion : "Full day",
    note: text(sub, "cbs_note"),
  };
}

const isContractorItem = (item: any) =>
  CONTRACTOR_STATUSES.includes(text(item, "color_mm4b5hep").toLowerCase()) &&
  Boolean(text(item, "text60"));

function contractorFromItem(item: any): ContractorIntake {
  const state = stateCodeFromName(text(item, "dropdown_mkw5q2x0"));
  return {
    detailsItemId: String(item.id),
    name: String(item.name).trim(),
    email: text(item, "text60").toLowerCase(),
    // Location text is a full address; keep the first part (city)
    city: (text(item, "location_mkt63brt").split(",")[0] ?? "").trim(),
    state,
    timeZone: text(item, "status877"),
    contentAreas: list(item, "dropdown44"),
    intakeProfile: profileFromIntake({
      travel: text(item, "dropdown6__1"),
      weekdays: text(item, "dropdown5__1"),
      support: text(item, "status10__1"),
      scheduleNotes: text(item, "long_text2__1"),
      state,
    }),
  };
}

const savedProfileFromItem = (item: any): SavedProfile => ({
  itemId: String(item.id),
  email: text(item, "cbs_email").toLowerCase(),
  profile: profileFromItem(item),
  bookouts: (item.subitems ?? [])
    .map(bookoutFromSubitem)
    .filter((b: Bookout | null): b is Bookout => b !== null),
});

const DETAILS_FIELDS = `id name column_values(ids: ${JSON.stringify(DETAILS_COLUMNS)}) { id text }`;
const PROFILE_FIELDS = `id name column_values(ids: ${JSON.stringify(PROFILE_COLUMNS)}) { id text }
  subitems { id name column_values(ids: ${JSON.stringify(BOOKOUT_COLUMNS)}) { id text value } }`;

export interface ContractorAvailabilityRepository {
  /** Active 1099 contractors from the Coach/Facilitator Details board. */
  fetchContractors(): Promise<Errorable<ContractorIntake[]>>;
  /** One active contractor by email (null if they aren't one). */
  fetchContractorByEmail(email: string): Promise<Errorable<ContractorIntake | null>>;
  /** Every saved profile on the CBS board, with its bookouts. */
  fetchSavedProfiles(): Promise<Errorable<SavedProfile[]>>;
  /** One contractor's saved profile and bookouts by email (null if none yet). */
  fetchSavedProfileByEmail(email: string): Promise<Errorable<SavedProfile | null>>;
  /** Creates the contractor's CBS item; returns its id. */
  createProfile(
    contractor: Pick<ContractorIntake, "name" | "email" | "detailsItemId" | "city" | "state">,
    profile: AvailabilityProfile
  ): Promise<Errorable<string>>;
  updateProfile(itemId: string, profile: AvailabilityProfile): Promise<Errorable<string>>;
  /** Adds a bookout subitem under the contractor's CBS item; returns its id. */
  createBookout(
    profileItemId: string,
    itemName: string,
    bookout: NewBookout
  ): Promise<Errorable<string>>;
  deleteBookout(bookoutId: string): Promise<Errorable<string>>;
}

export function contractorAvailabilityRepository(): ContractorAvailabilityRepository {
  // Pages through a board's items with the given item field selection.
  const fetchAllItems = async (boardId: number, itemFields: string) => {
    const first = await fetchMondayData(
      `{ boards(ids: ${boardId}) { items_page(limit: 500) { cursor items { ${itemFields} } } } }`
    );
    if (first?.errors) throw new Error(JSON.stringify(first.errors));
    const page = first?.data?.boards?.[0]?.items_page;
    const items: any[] = [...(page?.items ?? [])];
    let cursor: string | null = page?.cursor ?? null;
    while (cursor) {
      const next = await fetchMondayData(
        `{ next_items_page(limit: 500, cursor: "${cursor}") { cursor items { ${itemFields} } } }`
      );
      if (next?.errors) throw new Error(JSON.stringify(next.errors));
      items.push(...(next?.data?.next_items_page?.items ?? []));
      cursor = next?.data?.next_items_page?.cursor ?? null;
    }
    return items;
  };

  // Items whose column equals the email. Monday's any_of matches text and
  // email columns case-insensitively; the exact check guards the rest.
  const fetchItemsByEmail = async (
    boardId: number,
    columnId: string,
    email: string,
    itemFields: string
  ) => {
    const want = email.trim().toLowerCase();
    const res = await fetchMondayData(
      `{ boards(ids: ${boardId}) { items_page(limit: 25, query_params: {rules: [{column_id: "${columnId}", compare_value: ${JSON.stringify([want])}, operator: any_of}]}) { items { ${itemFields} } } } }`
    );
    if (res?.errors) throw new Error(JSON.stringify(res.errors));
    const items: any[] = res?.data?.boards?.[0]?.items_page?.items ?? [];
    return items.filter((item) => text(item, columnId).toLowerCase() === want);
  };

  const mutate = async (query: string, vars: Record<string, unknown>, field: string) => {
    const res = await insertMondayData(query, vars);
    const id = res?.data?.[field]?.id;
    if (!id) {
      console.error(`Monday ${field} failed:`, res?.errors ?? res?.error_message);
      return { data: null, error: new Error(`${field} returned no id`) };
    }
    return { data: String(id), error: null };
  };

  return {
    fetchContractors: async () => {
      try {
        const items = await fetchAllItems(
          COACH_FACILITATOR_DETAILS_BOARD_ID,
          DETAILS_FIELDS
        );
        const contractors = items.filter(isContractorItem).map(contractorFromItem);
        return { data: contractors, error: null };
      } catch (e) {
        console.error(e);
        return { data: null, error: new Error("fetchContractors() went wrong") };
      }
    },

    fetchContractorByEmail: async (email) => {
      try {
        const items = await fetchItemsByEmail(
          COACH_FACILITATOR_DETAILS_BOARD_ID,
          "text60",
          email,
          DETAILS_FIELDS
        );
        const item = items.find(isContractorItem);
        return { data: item ? contractorFromItem(item) : null, error: null };
      } catch (e) {
        console.error(e);
        return { data: null, error: new Error("fetchContractorByEmail() went wrong") };
      }
    },

    fetchSavedProfiles: async () => {
      try {
        const items = await fetchAllItems(
          CBS_BOARD_ID,
          PROFILE_FIELDS
        );
        const profiles = items.filter((item) => text(item, "cbs_email")).map(savedProfileFromItem);
        return { data: profiles, error: null };
      } catch (e) {
        console.error(e);
        return { data: null, error: new Error("fetchSavedProfiles() went wrong") };
      }
    },

    fetchSavedProfileByEmail: async (email) => {
      try {
        const items = await fetchItemsByEmail(CBS_BOARD_ID, "cbs_email", email, PROFILE_FIELDS);
        return { data: items[0] ? savedProfileFromItem(items[0]) : null, error: null };
      } catch (e) {
        console.error(e);
        return { data: null, error: new Error("fetchSavedProfileByEmail() went wrong") };
      }
    },

    createProfile: async (contractor, profile) => {
      try {
        const columns = {
          cbs_email: { email: contractor.email, text: contractor.email },
          cbs_details_id: contractor.detailsItemId,
          cbs_home_city: contractor.city,
          cbs_home_state: contractor.state,
          ...profileToColumns(profile),
        };
        return await mutate(
          `mutation ($name: String!, $cols: JSON!) { create_item (board_id: ${CBS_BOARD_ID}, item_name: $name, column_values: $cols, create_labels_if_missing: true) { id } }`,
          { name: contractor.name, cols: JSON.stringify(columns) },
          "create_item"
        );
      } catch (e) {
        console.error(e);
        return { data: null, error: new Error("createProfile() went wrong") };
      }
    },

    updateProfile: async (itemId, profile) => {
      try {
        return await mutate(
          `mutation ($item: ID!, $cols: JSON!) { change_multiple_column_values (board_id: ${CBS_BOARD_ID}, item_id: $item, column_values: $cols, create_labels_if_missing: true) { id } }`,
          { item: itemId, cols: JSON.stringify(profileToColumns(profile)) },
          "change_multiple_column_values"
        );
      } catch (e) {
        console.error(e);
        return { data: null, error: new Error("updateProfile() went wrong") };
      }
    },

    createBookout: async (profileItemId, itemName, bookout) => {
      try {
        const columns = {
          cbs_type: labels([BOOKOUT_TYPES.find((t) => t.value === bookout.type)!.label]),
          cbs_dates: { from: bookout.start, to: bookout.end },
          cbs_portion: labels([bookout.portion]),
          cbs_note: { text: bookout.note },
        };
        return await mutate(
          `mutation ($parent: ID!, $name: String!, $cols: JSON!) { create_subitem (parent_item_id: $parent, item_name: $name, column_values: $cols, create_labels_if_missing: true) { id } }`,
          { parent: profileItemId, name: itemName, cols: JSON.stringify(columns) },
          "create_subitem"
        );
      } catch (e) {
        console.error(e);
        return { data: null, error: new Error("createBookout() went wrong") };
      }
    },

    deleteBookout: async (bookoutId) => {
      try {
        return await mutate(
          `mutation ($id: ID!) { delete_item (item_id: $id) { id } }`,
          { id: bookoutId },
          "delete_item"
        );
      } catch (e) {
        console.error(e);
        return { data: null, error: new Error("deleteBookout() went wrong") };
      }
    },
  };
}
