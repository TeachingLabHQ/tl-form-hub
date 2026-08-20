import { compareTwoStrings } from "~/components/weekly-project-log/utils";
import { Errorable } from "../../utils/errorable";
import { fetchMondayData } from "../utils";
import { extractTier } from "./utils";

export interface CoachFacilitatorDetails {
  email: string;
  name: string;
  tier: {
    type: string;
    value: string;
  }[];
}

export interface CoachFacilitatorRepository {
  fetchCoachFacilitatorDetails(
    email: string
  ): Promise<Errorable<CoachFacilitatorDetails | null>>;
  fetchMondayUserByEmail(email: string): Promise<{ id: string; name: string }>;
  fetchMondayUserNameById(id: string): Promise<string>;
}

// Escape values interpolated into the GraphQL query strings below.
const escGraphqlString = (v: string) =>
  v.trim().replace(/\\/g, "\\\\").replace(/"/g, '\\"');

export function coachFacilitatorRepository(): CoachFacilitatorRepository {
  return {
    // Resolves a Monday.com platform user's real id + display name from
    // their email, so login can populate People columns (e.g. the coach
    // log's coach-profile column) the same way employee logins already do
    // via the "people" column on the employee board, and so the name
    // matches strings synced elsewhere from the same Monday users directory
    // (e.g. the PL calendar's `coach_facilitator` field — see
    // fetchSessionDates() in coach-log/repository.ts, which does an
    // exact-string match against it). Contractors aren't on the employee
    // board, so this is a separate lookup. Returns "" for both fields (not
    // an error) when the contractor has no Monday seat at all, since that's
    // a legitimate state and shouldn't block login — callers fall back to a
    // board-sourced name in that case.
    fetchMondayUserByEmail: async (email: string) => {
      try {
        const query = `{ users(emails: ["${escGraphqlString(email)}"]) { id name } }`;
        const result = await fetchMondayData(query);
        const user = result?.data?.users?.[0];
        return {
          id: user?.id ? String(user.id) : "",
          name: user?.name ? String(user.name) : "",
        };
      } catch (error) {
        console.error("Error fetching Monday user by email:", error);
        return { id: "", name: "" };
      }
    },

    // Same lookup as fetchMondayUserByEmail, but by Monday user id — used
    // for employees, whose linked Monday user id is already known via the
    // employee board's "people" column (see employeeRepository.fetchEmployee).
    fetchMondayUserNameById: async (id: string) => {
      if (!id) return "";
      try {
        const query = `{ users(ids: ["${escGraphqlString(id)}"]) { name } }`;
        const result = await fetchMondayData(query);
        const user = result?.data?.users?.[0];
        return user?.name ? String(user.name) : "";
      } catch (error) {
        console.error("Error fetching Monday user name by id:", error);
        return "";
      }
    },

    fetchCoachFacilitatorDetails: async (email: string) => {
      try {
        // Query to fetch coach/facilitator details from Monday board
        const query = `{
          boards(ids: 4084773997) {
            groups(ids: ["1680715772_coach_facilitator_d"]) {
              items_page(limit: 500) {
                items {
                  name
                  column_values(
                    ids: ["lookup42", "lookup_mkr45vx5", "color_mkr4h6fc", "color_mkr4ss46", "color_mkr4a2k5", "color_mkr4rtg", "color_mkrd296b"]
                  ) {
                    id
                    text
                    ... on MirrorValue {
                      display_value
                      id
                    }
                  }
                }
              }
            }
          }
        }`;

        const result = await fetchMondayData(query);
        const items = result.data.boards[0].groups[0].items_page.items;

        // Find the matching item by email
        const matchingItem = items.find((item: any) => {
          const emailValuefromMonday = item.column_values.find(
            (col: any) => col.id === "lookup42"
          )?.display_value;
          return compareTwoStrings(emailValuefromMonday || "", email);
        });

        if (!matchingItem) {
          return { data: null, error: null };
        }

        // Extract the required information
        const name = matchingItem.name;
        let tiers: {
          type: string;
          value: string;
        }[] = [];
        //find facilitator tier
        if(matchingItem.column_values.find(
          (col: any) => col.id === "lookup_mkr45vx5"
        )?.display_value!==null){
          tiers.push({
            type: "facilitator",
            value: extractTier(matchingItem.column_values.find(
              (col: any) => col.id === "lookup_mkr45vx5"
            )?.display_value || ""),
          });
        }
        //find copy editor tier
        if(matchingItem.column_values.find(
          (col: any) => col.id === "color_mkr4h6fc"
        )?.text!==null){
          tiers.push({
            type: "copyEditor",
            value: extractTier(matchingItem.column_values.find(
              (col: any) => col.id === "color_mkr4h6fc"
            )?.text || ""),
          });
        }
         //find copyRightPermissions tier
         if(matchingItem.column_values.find(
          (col: any) => col.id === "color_mkr4ss46"
        )?.text!==null){
          tiers.push({
            type: "copyRightPermissions",
            value: extractTier(matchingItem.column_values.find(
              (col: any) => col.id === "color_mkr4ss46"
            )?.text || ""),
          });
        }
          //find presentationDesign tier
          if(matchingItem.column_values.find(
            (col: any) => col.id === "color_mkr4a2k5"
          )?.text!==null){
            tiers.push({
              type: "presentationDesign",
              value: extractTier(matchingItem.column_values.find(
                (col: any) => col.id === "color_mkr4a2k5"
              )?.text || ""),
            });
          }
          //find contentDeveloper tier
          if(matchingItem.column_values.find(
            (col: any) => col.id === "color_mkr4rtg"
          )?.text!==null){
            tiers.push({
              type: "contentDeveloper",
              value: extractTier(matchingItem.column_values.find(
                (col: any) => col.id === "color_mkr4rtg"
              )?.text || ""),
            });
          }
           //find dataEvaluation tier
           if(matchingItem.column_values.find(
            (col: any) => col.id === "color_mkrd296b"
          )?.text!==null){
            tiers.push({
              type: "dataEvaluation",
              value: extractTier(matchingItem.column_values.find(
                (col: any) => col.id === "color_mkrd296b"
              )?.text || ""),
            });
          }
        

        const coachFacilitatorInfo: CoachFacilitatorDetails = {
          email,
          name,
          tier: tiers,
        };

        return { data: coachFacilitatorInfo, error: null };
      } catch (error) {
        console.error("Error fetching coach/facilitator data:", error);
        return {
          data: null,
          error: new Error("fetchCoachFacilitatorDetails() went wrong"),
        };
      }
    },
  };
}
