import path from "node:path";
import { google } from "googleapis";
import { asyncBufferFromFile, parquetReadObjects } from "hyparquet";
import { Errorable } from "~/utils/errorable";
import { fetchMondayData } from "~/domains/utils";
import { DistrictWithSchools, SubSchoolRow } from "./model";

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

// Interim session-date source: a parquet export of the coaching PL calendar,
// committed at the repo root. Replaced later by the AWS-backed source. Read from
// disk at request time and memoized (static interim data).
//   - "Session Date": ISO date (UTC midnight)
//   - "Coach/Facilitator": coach name (matched to the logged-in mondayProfile)
//   - "L&R name": site/district label (same format as the district sheet)
// NOTE(deploy): disk reads only work in local dev. On Vercel the service layer
// short-circuits to placeholder dates (see DUMMY_SESSION_DATES in service.ts),
// so this file isn't read or bundled in deployed environments.
const SESSION_CALENDAR_PARQUET = path.join(
  process.cwd(),
  "coaching_pl_calendar.parquet"
);

type CalendarRow = {
  "Session Date"?: unknown;
  "Coach/Facilitator"?: unknown;
  "L&R name"?: unknown;
};

let calendarRowsCache: CalendarRow[] | null = null;
async function loadCalendarRows(): Promise<CalendarRow[]> {
  if (calendarRowsCache) return calendarRowsCache;
  const file = await asyncBufferFromFile(SESSION_CALENDAR_PARQUET);
  calendarRowsCache = (await parquetReadObjects({ file })) as CalendarRow[];
  return calendarRowsCache;
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
    // the coaching PL calendar parquet. Matched on Coach/Facilitator == coach
    // name and L&R name == district (both normalized). Returns raw YYYY-MM-DD
    // values; the service dedupes, sorts, and formats labels. (The parquet has
    // no school column, so dates are not scoped by school.)
    fetchSessionDates: async (coachName: string, district: string) => {
      try {
        const coach = normalize(coachName);
        const dist = normalize(district);

        const rows = await loadCalendarRows();
        const dates = rows
          .filter(
            (r) =>
              normalize(r["Coach/Facilitator"]) === coach &&
              normalize(r["L&R name"]) === dist
          )
          .map((r) => toYmd(r["Session Date"]))
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
  };
}
