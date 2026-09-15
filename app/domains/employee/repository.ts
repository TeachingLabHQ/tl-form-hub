import { Errorable } from "../../utils/errorable";
import { fetchMondayData } from "../utils";
import { EmployeePeopleTags, EmployeeProfile } from "./model";

export interface EmployeeRepository {
  fetchEmployee(email: string): Promise<Errorable<EmployeeProfile>>;
  fetchEmployeePeopleTags(
    employeeId: string
  ): Promise<Errorable<EmployeePeopleTags>>;
}

type PeopleColumnValue = {
  id: string;
  text: string;
  persons_and_teams?: { id: string; kind: string }[];
};

const personIds = (columnValues: PeopleColumnValue[], columnId: string) =>
  (columnValues.find((column) => column.id === columnId)?.persons_and_teams || [])
    .filter((entity) => entity.kind === "person")
    .map((entity) => String(entity.id));

export function employeeRepository(): EmployeeRepository {
  return {
    // Looks up an employee by Employee ID on the FTE/PTE Details board and
    // returns the linked "Employee" and "Home Manager" Monday users.
    // Replaces the VLOOKUP Auto-link marketplace app that used to tag these.
    fetchEmployeePeopleTags: async (employeeId: string) => {
      const trimmedId = String(employeeId ?? "").trim();
      // Digits only: this also keeps the id safe to interpolate into the query
      if (!/^\d+$/.test(trimmedId)) {
        return {
          data: null,
          error: new Error(`Invalid employee id "${trimmedId}"`),
        };
      }
      try {
        const query = `{
  boards(ids: 2227132353) {
    items_page(
      limit: 5
      query_params: {rules: [{column_id: "text_mkpt2c0x", compare_value: ["${trimmedId}"], operator: any_of}]}
    ) {
      items {
        name
        column_values(ids: ["text_mkpt2c0x", "people", "people6"]) {
          id
          text
          ... on PeopleValue {
            persons_and_teams {
              id
              kind
            }
          }
        }
      }
    }
  }
}`;
        const result = await fetchMondayData(query);
        const matches: { column_values: PeopleColumnValue[] }[] = (
          result?.data?.boards?.[0]?.items_page?.items || []
        ).filter(
          (item: { column_values: PeopleColumnValue[] }) =>
            item.column_values
              .find((column) => column.id === "text_mkpt2c0x")
              ?.text?.trim() === trimmedId
        );
        const [match] = matches;
        if (!match || matches.length > 1) {
          return {
            data: null,
            error: new Error(
              `Expected 1 employee with id ${trimmedId} on Monday, found ${matches.length}`
            ),
          };
        }
        return {
          data: {
            employeeProfileIds: personIds(match.column_values, "people"),
            homeManagerIds: personIds(match.column_values, "people6"),
          },
          error: null,
        };
      } catch (error) {
        console.error("Error fetching employee people tags:", error);
        return {
          data: null,
          error: new Error("fetchEmployeePeopleTags() went wrong"),
        };
      }
    },
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
          )?.persons_and_teams[0]?.id || "";
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
