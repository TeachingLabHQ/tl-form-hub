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
}

export function coachFacilitatorRepository(): CoachFacilitatorRepository {
  return {
    fetchCoachFacilitatorDetails: async (email: string) => {
      try {
        //NOTE: Not using Monday API filtering by email because it doesn't support filtering mirror columns (lookup42)
        const itemFields = `
          items {
            name
            column_values(
              ids: ["lookup42", "lookup_mkr45vx5", "color_mkr4h6fc", "color_mkr4ss46", "color_mkr4a2k5", "color_mkr4rtg", "color_mkrd296b", "boolean_mm40wz9b"]
            ) {
              id
              text
              ... on MirrorValue {
                display_value
                id
              }
              ... on CheckboxValue {
                checked
              }
            }
          }`;

        // Query to fetch coach/facilitator details from Monday board
        const query = `{
          boards(ids: 4084773997) {
            groups(ids: ["1680715772_coach_facilitator_d"]) {
              items_page(limit: 500) {
                cursor
                ${itemFields}
              }
            }
          }
        }`;

        const findByEmail = (items: any[]) =>
          items.find((item: any) => {
            // Only accounts marked "Active in FY27" are considered
            const isActive = item.column_values.find(
              (col: any) => col.id === "boolean_mm40wz9b"
            )?.checked === true;
            const emailValuefromMonday = item.column_values.find(
              (col: any) => col.id === "lookup42"
            )?.display_value;
            return isActive && compareTwoStrings(emailValuefromMonday || "", email);
          });

        const result = await fetchMondayData(query);
        const firstPage = result.data.boards[0].groups[0].items_page;
        let matchingItem = findByEmail(firstPage.items);
        let cursor: string | null = firstPage.cursor;

        // Page through the rest of the group until a match is found
        while (!matchingItem && cursor) {
          const cursorQuery = `{
            next_items_page(limit: 500, cursor: "${cursor}") {
              cursor
              ${itemFields}
            }
          }`;
          const nextResult = await fetchMondayData(cursorQuery);
          matchingItem = findByEmail(nextResult.data.next_items_page.items);
          cursor = nextResult.data.next_items_page.cursor;
        }

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
