import { Errorable } from "~/utils/errorable";
import { fetchMondayData, insertMondayData } from "~/domains/utils";
import { ParticipantRosterEntry } from "./model";

// Participant/teacher roster board ("IN DEV: SY26-27 Participant Roster") — the
// same board the coach log reads coachees from, so participants added here show
// up in the coach-log coachee dropdown. Column ids are inherited verbatim from
// the legacy Google Form's Apps Script (verified against the live board):
//   people3            = Coach (people)        text_mktbkbvy = Participant Name
//   email_mktht3ax     = Participant Email     email_mkthfrq7 = Responder's Email
//   dropdown_mkth66bp  = Participant Role       dropdown_mktbega2 = Service Type
//   dropdown_mkth57c8  = Content Area           dropdown_mktbacaf = Grade Level(s)
//   dropdown_mkwt4nzg  = Group Coaching Number  coaching_partners = Site/District
//   short_text66       = School
export const PARTICIPANT_ROSTER_BOARD_ID = 18416567790;
const ROSTER_GROUP_ID = "group_mktb1yqy";

// Dropdown columns take a comma-separated list of labels (matching the legacy
// serialization; no surrounding spaces, since the board's labels have none).
// create_labels_if_missing on the mutation handles any label not yet on the
// board, but our option lists already match the existing labels exactly.
const labels = (values: string[]) => values.join(",");

const normalize = (v: unknown) => String(v ?? "").trim().toLowerCase();

export interface ParticipantRosterRepository {
  createParticipant(entry: ParticipantRosterEntry): Promise<Errorable<string>>;
  /** True if a participant with this email is already on the roster for the
   * same district + school (the one-entry-per-coachee guard). */
  participantExists(
    email: string,
    district: string,
    school: string
  ): Promise<Errorable<boolean>>;
}

export function participantRosterRepository(): ParticipantRosterRepository {
  return {
    createParticipant: async (entry) => {
      try {
        const columns: Record<string, unknown> = {
          text_mktbkbvy: entry.participantName, // Participant Name
          dropdown_mkth66bp: entry.role, // Participant Role
          coaching_partners: { label: entry.district }, // Site/District (status)
          short_text66: entry.school, // School
        };
        if (entry.email)
          columns.email_mktht3ax = { email: entry.email, text: entry.email };
        if (entry.coachMondayId)
          columns.people3 = {
            personsAndTeams: [{ id: Number(entry.coachMondayId), kind: "person" }],
          };
        if (entry.responderEmail)
          columns.email_mkthfrq7 = {
            email: entry.responderEmail,
            text: entry.responderEmail,
          };
        if (entry.supports.length)
          columns.dropdown_mktbega2 = labels(entry.supports); // Service Type
        if (entry.contentAreas.length)
          columns.dropdown_mkth57c8 = labels(entry.contentAreas); // Content Area
        if (entry.grades.length)
          columns.dropdown_mktbacaf = labels(entry.grades); // Grade Level(s)
        if (entry.groupNumbers.length)
          columns.dropdown_mkwt4nzg = labels(entry.groupNumbers); // Group Number

        const query =
          "mutation ($itemName: String!, $columnVals: JSON!, $groupName: String!) { create_item (board_id: " +
          PARTICIPANT_ROSTER_BOARD_ID +
          ", group_id: $groupName, item_name: $itemName, column_values: $columnVals, create_labels_if_missing: true) { id } }";
        const vars = {
          itemName: entry.participantName || "Form Entry",
          columnVals: JSON.stringify(columns),
          groupName: ROSTER_GROUP_ID,
        };

        const res = await insertMondayData(query, vars);
        const id = res?.data?.create_item?.id;
        if (!id) {
          console.error("Participant roster create failed:", res?.errors);
          return { data: null, error: new Error("create_item returned no id") };
        }
        return { data: String(id), error: null };
      } catch (e) {
        console.error(e);
        return {
          data: null,
          error: new Error("createParticipant() went wrong"),
        };
      }
    },

    // Duplicate-coachee guard: narrow the board server-side by email + district
    // + school (all support contains_text — email is near-unique, so the result
    // set is ~0-1 items), then confirm an exact match in JS since contains_text
    // is a substring match (e.g. "NY_D1" would also match "NY_D11"). Returns
    // false when there's no email to match on.
    participantExists: async (email, district, school) => {
      try {
        const wantEmail = normalize(email);
        if (!wantEmail) return { data: false, error: null };
        const wantDistrict = normalize(district);
        const wantSchool = normalize(school);

        const esc = (v: string) =>
          v.trim().replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        const rules = `[{column_id: "email_mktht3ax", operator: contains_text, compare_value: "${esc(email)}"}, {column_id: "coaching_partners", operator: contains_text, compare_value: "${esc(district)}"}, {column_id: "short_text66", operator: contains_text, compare_value: "${esc(school)}"}]`;
        const columnIds = `["email_mktht3ax","coaching_partners","short_text66"]`;
        const buildQuery = (cursor: string | null) =>
          cursor
            ? `{ next_items_page(limit: 500, cursor: "${cursor}") { cursor items { column_values(ids:${columnIds}) { id text } } } }`
            : `{ boards(ids: ${PARTICIPANT_ROSTER_BOARD_ID}) { items_page(limit: 500, query_params: {rules: ${rules}}) { cursor items { column_values(ids:${columnIds}) { id text } } } } }`;

        const matches = (item: any): boolean => {
          const col = (id: string) =>
            item.column_values.find((c: any) => c.id === id);
          return (
            normalize(col("email_mktht3ax")?.text) === wantEmail &&
            normalize(col("coaching_partners")?.text) === wantDistrict &&
            normalize(col("short_text66")?.text) === wantSchool
          );
        };

        let response = await fetchMondayData(buildQuery(null));
        let page = response.data.boards[0].items_page;
        if (page.items.some(matches)) return { data: true, error: null };

        let cursor: string | null = page.cursor;
        while (cursor) {
          response = await fetchMondayData(buildQuery(cursor));
          page = response.data.next_items_page;
          if (page.items.some(matches)) return { data: true, error: null };
          cursor = page.cursor;
        }

        return { data: false, error: null };
      } catch (e) {
        console.error(e);
        return {
          data: null,
          error: new Error("participantExists() went wrong"),
        };
      }
    },
  };
}
