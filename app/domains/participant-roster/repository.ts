import { Errorable } from "~/utils/errorable";
import { insertMondayData } from "~/domains/utils";
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

export interface ParticipantRosterRepository {
  createParticipant(entry: ParticipantRosterEntry): Promise<Errorable<string>>;
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
  };
}
