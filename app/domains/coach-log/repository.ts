import { Errorable } from "~/utils/errorable";
import { fetchMondayData } from "~/domains/utils";
import { DistrictWithSchools } from "./model";

// Draft district/school board: parent items are districts, subitems are schools.
// TODO(labels): swap to the production board id once it is created.
const DISTRICT_SCHOOL_BOARD_ID = 18415001327;

// Coachee/teacher roster board (reused from the legacy coach log form).
const COACHEE_ROSTER_BOARD_ID = 9707212928;

const normalize = (v: unknown) => String(v ?? "").trim().toLowerCase();

export interface CoachLogRepository {
  fetchDistrictsWithSchools(): Promise<Errorable<DistrictWithSchools[]>>;
  fetchCoachees(district: string, school: string): Promise<Errorable<string[]>>;
}

export function coachLogRepository(): CoachLogRepository {
  return {
    fetchDistrictsWithSchools: async () => {
      try {
        const buildQuery = (cursor: string | null) =>
          cursor
            ? `{ next_items_page(limit: 100, cursor: "${cursor}") { cursor items { id name subitems { id name } } } }`
            : `{ boards(ids: ${DISTRICT_SCHOOL_BOARD_ID}) { items_page(limit: 100) { cursor items { id name subitems { id name } } } } }`;

        const first = await fetchMondayData(buildQuery(null));
        let page = first.data.boards[0].items_page;
        let items: any[] = page.items;
        let cursor: string | null = page.cursor;

        while (cursor) {
          const next = await fetchMondayData(buildQuery(cursor));
          items = items.concat(next.data.next_items_page.items);
          cursor = next.data.next_items_page.cursor;
        }

        const districts: DistrictWithSchools[] = items.map((item: any) => ({
          district: item.name,
          schools: (item.subitems ?? []).map((s: any) => s.name),
        }));

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
