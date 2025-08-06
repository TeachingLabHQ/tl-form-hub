import { Errorable } from "../../utils/errorable";
import { fetchMondayData } from "../utils";
import { EmployeeProfile } from "./model";

export interface EmployeeRepository {
  fetchEmployee(email: string): Promise<Errorable<EmployeeProfile>>;
}

export function employeeRepository(): EmployeeRepository {
  return {
    fetchEmployee: async (email: string) => {
      try {
        let queryEmployee = `{
  boards(ids: 2227132353) {
    items_page(
      limit: 1
      query_params: {rules: [{column_id: "text25", compare_value: ["${email}"]}], operator: and}
    ) {
      items {
        name
        column_values(ids: ["dropdown7", "people","text_mkpt2c0x"]) {
          id
          text
          ... on PeopleValue {
            persons_and_teams {
              id
            }
          }
        }
      }
    }
  }
}`;
        const result = await fetchMondayData(queryEmployee);
        const isEmployeePresent =
          result.data.boards[0].items_page.items.length === 0 ? false : true;

        if (!isEmployeePresent)
          return {
            data: null,
            error: new Error("Employee does not exist on Monday"),
          };
        const businessFunction: string =
          result.data.boards[0].items_page.items[0]["column_values"].find(
            (column: { id: string; text: string }) => column.id === "dropdown7"
          )?.text || "";
        const mondayProfileId: string =
          result.data.boards[0].items_page.items[0]["column_values"].find(
            (column: { id: string; persons_and_teams: { id: string }[] }) =>
              column.id === "people"
          )?.persons_and_teams[0]["id"] || "";
        const employeeId: string =
          result.data.boards[0].items_page.items[0]["column_values"].find(
            (column: { id: string; text: string }) => column.id === "text_mkpt2c0x"
          )?.text || "";
        const name: string = result.data.boards[0].items_page.items[0]["name"];
        const employeeInfo = { name, email, businessFunction, mondayProfileId, employeeId };
        return { data: employeeInfo, error: null };
      } catch (error) {
        console.error("Error fetching data:", error);
        return {
          data: null,
          error: new Error("fetchEmployee() went wrong"),
        };
      }
    },
  };
}
