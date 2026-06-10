import { google } from "googleapis";
import { Errorable } from "~/utils/errorable";
import { fetchMondayData } from "~/domains/utils";
import { DistrictWithSchools } from "./model";

// District/school source: a Google Sheet. The tab is laid out one column per
// district — the first cell is the district name and the cells below it are its
// schools — so we read it with a COLUMNS major dimension and treat each column
// as a district. The tab is identified by its gid (sheetId), which we resolve
// to the tab title before reading values (the values API ranges by title).
const DISTRICT_SCHOOL_SPREADSHEET_ID =
  "1hbs5d1uf2xqDvs0hG68hZG4ttmf7BhqKDuKCNNaYd54";
const DISTRICT_SCHOOL_TAB_GID = 2037785111;
const SHEETS_READONLY_SCOPE =
  "https://www.googleapis.com/auth/spreadsheets.readonly";

// Coachee/teacher roster board (reused from the legacy coach log form).
const COACHEE_ROSTER_BOARD_ID = 9707212928;

const normalize = (v: unknown) => String(v ?? "").trim().toLowerCase();

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

export interface CoachLogRepository {
  fetchDistrictsWithSchools(): Promise<Errorable<DistrictWithSchools[]>>;
  fetchCoachees(district: string, school: string): Promise<Errorable<string[]>>;
}

export function coachLogRepository(): CoachLogRepository {
  return {
    fetchDistrictsWithSchools: async () => {
      try {
        const sheets = sheetsClient();

        // Resolve the tab gid -> title; the values API ranges by tab title.
        const meta = await sheets.spreadsheets.get({
          spreadsheetId: DISTRICT_SCHOOL_SPREADSHEET_ID,
          fields: "sheets.properties(sheetId,title)",
        });
        const tabTitle = meta.data.sheets?.find(
          (s) => s.properties?.sheetId === DISTRICT_SCHOOL_TAB_GID
        )?.properties?.title;
        if (!tabTitle) {
          throw new Error(`Tab gid ${DISTRICT_SCHOOL_TAB_GID} not found`);
        }

        const res = await sheets.spreadsheets.values.get({
          spreadsheetId: DISTRICT_SCHOOL_SPREADSHEET_ID,
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
  };
}
