import { google } from "googleapis";
import { parquetReadObjects } from "hyparquet";
import { Errorable } from "~/utils/errorable";
import { fetchMondayData } from "~/domains/utils";
import {
  CoachLogIdentity,
  CoachOption,
  DistrictWithSchools,
  SubSchoolRow,
} from "./model";

// Coach-log reference data lives in one Google Sheet with several tabs. Tabs are
// identified by gid (sheetId), which we resolve to a tab title before reading
// values (the values API ranges by title).
//   - District/school tab: laid out one column per district (first cell is the
//     district name, cells below it are its schools); read COLUMNS-major.
//   - Sub-school tab: one row per (Site, School, Subschool); read ROWS-major and
//     keyed on the selected district (Site) + school.
const COACH_LOG_SPREADSHEET_ID = "1hbs5d1uf2xqDvs0hG68hZG4ttmf7BhqKDuKCNNaYd54";
const DISTRICT_SCHOOL_TAB_GID = 2037785111;
const SUB_SCHOOL_TAB_GID = 1285523694;
const SHEETS_READONLY_SCOPE =
  "https://www.googleapis.com/auth/spreadsheets.readonly";

// Coachee/teacher roster board: "IN DEV: SY26-27 Participant Roster". Keeps the
// legacy column IDs (verified on this board): coaching_partners = Site/District,
// short_text66 = School, text_mkvxqh6c = Updated Participant Name (falls back to
// text_mktbkbvy = Participant Name).
const COACHEE_ROSTER_BOARD_ID = 18416567790;

// Coach Log submission board ("IN DEV: FY27 Coaching Log"). Parent-item columns
// used for the one-log-per coach/district/school/date duplicate check:
//   text88__1 = District, text5__1 = School, date__1 = Date, people__1 = Coach
//   (item name is the coach name). Shared with the submit route.
export const COACH_LOG_BOARD_ID = 18416482214;

// Session-date source: the FY27 coaching PL calendar, served as a parquet export
// by the TL data service (a Monday webhook mirror). Authenticated with a token
// query param. Columns are snake_case:
//   - session_date: ISO date (UTC midnight)
//   - coach_facilitator: coach name (matched to the logged-in mondayProfile)
//   - lr_name: site/district label (same format as the district sheet)
//   - subsite: free-form school/site label (NOT yet used for filtering — its
//     values don't match the form's school field; see fetchSessionDates)
// The endpoint doesn't support HTTP range requests, so we fetch the whole file
// (small) and parse it in memory. Fetched via Node's global fetch (undici), so
// it ignores http(s)_proxy — no proxy needed in dev, unlike the Sheets calls.
const SESSION_CALENDAR_URL =
  "https://tl-data.teachinglab.org/monday-webhook/calendar_fy27";

// Memoize the parsed calendar per process with a short TTL: it's the same data
// for every coach/district lookup, but it does change over time, so re-fetch
// periodically rather than caching for the whole process lifetime.
const CALENDAR_CACHE_TTL_MS = 5 * 60 * 1000;

type CalendarRow = {
  session_date?: unknown;
  coach_facilitator?: unknown;
  lr_name?: unknown;
  subsite?: unknown;
};

let calendarCache: { rows: CalendarRow[]; fetchedAt: number } | null = null;
async function loadCalendarRows(): Promise<CalendarRow[]> {
  if (calendarCache && Date.now() - calendarCache.fetchedAt < CALENDAR_CACHE_TTL_MS) {
    return calendarCache.rows;
  }

  const token = cleanEnv(process.env.CALENDAR_API_TOKEN);
  const url = `${SESSION_CALENDAR_URL}?token=${encodeURIComponent(token)}&format=parquet`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Calendar fetch failed: ${res.status} ${res.statusText}`);
  }

  const buffer = await res.arrayBuffer();
  const file = {
    byteLength: buffer.byteLength,
    slice: (start: number, end?: number) => buffer.slice(start, end),
  };
  const rows = (await parquetReadObjects({ file })) as CalendarRow[];

  calendarCache = { rows, fetchedAt: Date.now() };
  return rows;
}

const normalize = (v: unknown) => String(v ?? "").trim().toLowerCase();

// Reduce a Session Date (Date or ISO string, UTC midnight) to YYYY-MM-DD.
const toYmd = (v: unknown): string => {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10); // "2025-07-14T00:00:00.000Z" -> "2025-07-14"
};

// Service-account credentials live in two env vars (see .env). Depending on how
// the value is stored/loaded it can arrive with surrounding whitespace and/or
// quotes, and the private key keeps its newlines as escaped "\n" sequences — so
// trim, unquote, and restore real newlines before handing it to the JWT client.
const cleanEnv = (v: string | undefined) =>
  (v ?? "").trim().replace(/^"|"$/g, "");

function sheetsClient() {
  const auth = new google.auth.JWT({
    email: cleanEnv(process.env.GOOGLE_SERVICE_CLIENTEMAIL),
    key: cleanEnv(process.env.GOOGLE_SERVICE_PRIVATEKEY).replace(/\\n/g, "\n"),
    scopes: [SHEETS_READONLY_SCOPE],
  });
  return google.sheets({ version: "v4", auth });
}

// Resolve a tab gid (sheetId) to its title so the values API can range by it.
async function tabTitleByGid(
  sheets: ReturnType<typeof sheetsClient>,
  gid: number
): Promise<string> {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: COACH_LOG_SPREADSHEET_ID,
    fields: "sheets.properties(sheetId,title)",
  });
  const title = meta.data.sheets?.find(
    (s) => s.properties?.sheetId === gid
  )?.properties?.title;
  if (!title) throw new Error(`Tab gid ${gid} not found`);
  return title;
}

export interface CoachLogRepository {
  fetchDistrictsWithSchools(): Promise<Errorable<DistrictWithSchools[]>>;
  fetchCoachees(district: string, school: string): Promise<Errorable<string[]>>;
  fetchSubSchoolRows(): Promise<Errorable<SubSchoolRow[]>>;
  fetchSessionDates(
    coachName: string,
    district: string
  ): Promise<Errorable<string[]>>;
  fetchCoaches(): Promise<Errorable<CoachOption[]>>;
  hasExistingLog(query: CoachLogIdentity): Promise<Errorable<boolean>>;
}

export function coachLogRepository(): CoachLogRepository {
  return {
    fetchDistrictsWithSchools: async () => {
      try {
        const sheets = sheetsClient();
        const tabTitle = await tabTitleByGid(sheets, DISTRICT_SCHOOL_TAB_GID);

        const res = await sheets.spreadsheets.values.get({
          spreadsheetId: COACH_LOG_SPREADSHEET_ID,
          range: tabTitle,
          majorDimension: "COLUMNS",
        });

        // Each column is a district: [districtName, ...schools]. Skip blank
        // columns and trailing empty cells; business rules ("All Schools",
        // "N/A" fallback) are applied in the service layer.
        const columns = res.data.values ?? [];
        const districts: DistrictWithSchools[] = columns
          .map((col) => (col ?? []).map((cell) => String(cell ?? "").trim()))
          .map((col) => ({
            district: col[0] ?? "",
            schools: col.slice(1).filter((name) => name !== ""),
          }))
          .filter((d) => d.district !== "");

        return { data: districts, error: null };
      } catch (e) {
        console.error(e);
        return {
          data: null,
          error: new Error("fetchDistrictsWithSchools() went wrong"),
        };
      }
    },

    // Mirrors the legacy roster lookup: filter the roster board by district
    // (coaching_partners) and, when a single school is chosen, by school
    // (short_text66); the coachee display name comes from the "updated name"
    // column, falling back to the "original name" column.
    // TODO(rules): confirm these filter columns/values still match now that
    // district & school come from board 18415001327.
    fetchCoachees: async (district: string, school: string) => {
      try {
        const districtFilter = normalize(district);
        const schoolFilter = normalize(school);

        let rules = `[{column_id: "coaching_partners", operator: contains_terms, compare_value: ["${districtFilter}"]}`;
        if (schoolFilter && schoolFilter !== "all schools") {
          rules += `, {column_id: "short_text66", operator: contains_text, compare_value: ["${schoolFilter}"]}`;
        }
        rules += `]`;

        const columnIds = `["text_mktbkbvy","text_mkvxqh6c","coaching_partners","short_text66"]`;
        const buildQuery = (cursor: string | null) =>
          cursor
            ? `{ next_items_page(limit: 500, cursor: "${cursor}") { cursor items { column_values(ids:${columnIds}) { text column { id } } } } }`
            : `{ boards(ids: ${COACHEE_ROSTER_BOARD_ID}) { items_page(limit: 500, query_params: {rules: ${rules}}) { cursor items { column_values(ids:${columnIds}) { text column { id } } } } } }`;

        const first = await fetchMondayData(buildQuery(null));
        let page = first.data.boards[0].items_page;
        let items: any[] = page.items;
        let cursor: string | null = page.cursor;

        while (cursor) {
          const next = await fetchMondayData(buildQuery(cursor));
          items = items.concat(next.data.next_items_page.items);
          cursor = next.data.next_items_page.cursor;
        }

        const names: string[] = items
          .map((item: any) => {
            const get = (id: string) =>
              item.column_values.find((c: any) => c.column.id === id)?.text;
            const updated = get("text_mkvxqh6c");
            const original = get("text_mktbkbvy");
            return updated && updated.trim() !== "" ? updated : original;
          })
          .filter(Boolean);

        return { data: names, error: null };
      } catch (e) {
        console.error(e);
        return { data: null, error: new Error("fetchCoachees() went wrong") };
      }
    },

    // Raw rows from the sub-school tab — one [Site (district), School, Subschool]
    // per row. Returned unfiltered (the service builds the lookup map); the
    // header row is dropped here.
    fetchSubSchoolRows: async () => {
      try {
        const sheets = sheetsClient();
        const tabTitle = await tabTitleByGid(sheets, SUB_SCHOOL_TAB_GID);

        const res = await sheets.spreadsheets.values.get({
          spreadsheetId: COACH_LOG_SPREADSHEET_ID,
          range: tabTitle,
          majorDimension: "ROWS",
        });

        const rows = res.data.values ?? [];
        const subSchoolRows: SubSchoolRow[] = rows
          .slice(1) // drop the "Site | School | Subschool" header row
          .map((row) => ({
            district: String(row?.[0] ?? "").trim(),
            school: String(row?.[1] ?? "").trim(),
            subSchool: String(row?.[2] ?? "").trim(),
          }))
          .filter((r) => r.district && r.school && r.subSchool);

        return { data: subSchoolRows, error: null };
      } catch (e) {
        console.error(e);
        return {
          data: null,
          error: new Error("fetchSubSchoolRows() went wrong"),
        };
      }
    },

    // Session dates for the logged-in coach at the selected district, read from
    // the coaching PL calendar parquet. Matched on coach_facilitator == coach
    // name and lr_name == district (both normalized). Returns raw YYYY-MM-DD
    // values; the service dedupes, sorts, and formats labels.
    // NOTE: not scoped by school yet. The calendar's `subsite` column carries a
    // school/site label, but its values (e.g. "M035: _Direct to Teacher") are
    // free-form and don't match the form's `school` field, so filtering on it
    // would drop all dates. Wire school scoping once the join is defined.
    fetchSessionDates: async (coachName: string, district: string) => {
      try {
        const coach = normalize(coachName);
        const dist = normalize(district);

        const rows = await loadCalendarRows();
        const dates = rows
          .filter(
            (r) =>
              normalize(r.coach_facilitator) === coach &&
              normalize(r.lr_name) === dist
          )
          .map((r) => toYmd(r.session_date))
          .filter((d) => d !== "");

        return { data: dates, error: null };
      } catch (e) {
        console.error(e);
        return {
          data: null,
          error: new Error("fetchSessionDates() went wrong"),
        };
      }
    },

    // Coaches for the testing-only override, sourced from Monday users (the
    // legacy form's approach) so each carries a Monday profile id — used to
    // populate the people column when an allow-listed admin impersonates a
    // coach. Paginated; the service dedupes and sorts.
    fetchCoaches: async () => {
      try {
        const buildQuery = (page: number) =>
          `{ users(limit: 500, page: ${page}) { id name } }`;

        const coaches: CoachOption[] = [];
        for (let page = 1; ; page++) {
          const res = await fetchMondayData(buildQuery(page));
          const users: { id: unknown; name: unknown }[] = res?.data?.users ?? [];
          for (const u of users) {
            const name = String(u?.name ?? "").trim();
            const mondayId = String(u?.id ?? "").trim();
            if (name && mondayId) coaches.push({ name, mondayId });
          }
          if (users.length < 500) break;
        }

        return { data: coaches, error: null };
      } catch (e) {
        console.error(e);
        return { data: null, error: new Error("fetchCoaches() went wrong") };
      }
    },

    // True if a coach log already exists for this coach + district + school +
    // date (one-log-per-day rule; cancelled logs count). Narrows the board to
    // the district + school via Monday filters, then matches coach + date
    // exactly in JS (the coach matches on the people column id, falling back to
    // the item name). Returns false when there's no date to dedupe on.
    hasExistingLog: async (query: CoachLogIdentity) => {
      try {
        const date = query.sessionDate.trim();
        if (!date) return { data: false, error: null };

        const district = normalize(query.district);
        const school = normalize(query.school);
        const coachId = query.coachMondayId.trim();
        const coachName = normalize(query.coachName);

        // Escape values interpolated into the GraphQL rule strings.
        const esc = (v: string) =>
          v.trim().replace(/\\/g, "\\\\").replace(/"/g, '\\"');

        // Filter on the board server-side by district + school + date (exact)
        // and, when we have one, the coach's Monday profile id. People columns
        // filter by id only via the "person-<id>" form with any_of (name/raw-id
        // forms don't match on this board). The result set is 0–1 items; every
        // field is still verified exactly in JS below.
        const ruleParts = [
          `{column_id: "text88__1", operator: contains_text, compare_value: "${esc(query.district)}"}`,
          `{column_id: "text5__1", operator: contains_text, compare_value: "${esc(query.school)}"}`,
          `{column_id: "date__1", operator: any_of, compare_value: ["EXACT", "${esc(date)}"]}`,
        ];
        if (coachId) {
          ruleParts.push(
            `{column_id: "people__1", operator: any_of, compare_value: ["person-${esc(coachId)}"]}`
          );
        }
        const rules = `[${ruleParts.join(", ")}]`;

        const columnIds = `["text88__1","text5__1","date__1","people__1"]`;
        const buildQuery = (cursor: string | null) =>
          cursor
            ? `{ next_items_page(limit: 500, cursor: "${cursor}") { cursor items { name column_values(ids:${columnIds}) { id text value } } } }`
            : `{ boards(ids: ${COACH_LOG_BOARD_ID}) { items_page(limit: 500, query_params: {rules: ${rules}}) { cursor items { name column_values(ids:${columnIds}) { id text value } } } } }`;

        const matchesItem = (item: any): boolean => {
          const col = (id: string) =>
            item.column_values.find((c: any) => c.id === id);
          let itemDate = "";
          try {
            itemDate = JSON.parse(col("date__1")?.value || "null")?.date ?? "";
          } catch {
            itemDate = "";
          }
          // Exact people-column ids (e.g. ["31288444"]) for a precise match
          // against the logged-in coach's Monday profile id.
          let peopleIds: string[] = [];
          try {
            const parsed = JSON.parse(col("people__1")?.value || "null");
            peopleIds = (parsed?.personsAndTeams ?? []).map((p: any) =>
              String(p.id)
            );
          } catch {
            peopleIds = [];
          }

          const districtOk = normalize(col("text88__1")?.text) === district;
          const schoolOk = normalize(col("text5__1")?.text) === school;
          const dateOk = itemDate.trim() === date;
          // Prefer matching by Monday profile id; fall back to the item name
          // (the coach name) only when no id is available.
          const coachOk =
            coachId !== ""
              ? peopleIds.includes(coachId)
              : coachName !== "" && normalize(item.name) === coachName;
          return districtOk && schoolOk && dateOk && coachOk;
        };

        let response = await fetchMondayData(buildQuery(null));
        let page = response.data.boards[0].items_page;
        if (page.items.some(matchesItem)) return { data: true, error: null };

        let cursor: string | null = page.cursor;
        while (cursor) {
          response = await fetchMondayData(buildQuery(cursor));
          page = response.data.next_items_page;
          if (page.items.some(matchesItem)) return { data: true, error: null };
          cursor = page.cursor;
        }

        return { data: false, error: null };
      } catch (e) {
        console.error(e);
        return { data: null, error: new Error("hasExistingLog() went wrong") };
      }
    },
  };
}
