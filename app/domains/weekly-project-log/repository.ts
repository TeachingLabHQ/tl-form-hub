import { Errorable } from "../../utils/errorable";
import { executiveAssistantMappings } from "~/components/weekly-project-log/utils";
import { employeeRepository } from "../employee/repository";
import { fetchMondayData, insertMondayData } from "../utils";

export const WEEKLY_PROJECT_LOG_BOARD_ID = "4284585496";

export type SubmittedWeek = {
  itemId: string;
  // Monday of the reported week, YYYY-MM-DD
  week: string;
  totalHours: number;
  createdAt: string;
};

type MondayGraphQLError = {
  message?: string;
  extensions?: { code?: string; error_data?: Record<string, unknown> };
};

// How many subitems to create at once. Monday rejects concurrent subitem
// creation on the same parent with "Item link max locks exceeded" when too
// many run in parallel (9 of 30 failed at 30); 4 was clean in testing.
const SUBITEM_CONCURRENCY = 4;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Runs a Monday mutation, retrying failures where Monday answered but didn't
// write: errors inside an HTTP 200 (lock contention, complexity limits) and
// non-2xx statuses like 429. A dropped connection isn't retried, since the
// write may have landed and a retry would duplicate it.
// Returns the created/deleted id or the last error.
const mutateWithRetry = async (
  query: string,
  variables: Record<string, unknown>,
  field: string,
  maxAttempts: number
): Promise<Errorable<{ id: string }>> => {
  let lastError = "unknown error";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await insertMondayData(query, variables);
      const id = response?.data?.[field]?.id;
      if (id) {
        return { data: { id: String(id) }, error: null };
      }
      const errors: MondayGraphQLError[] =
        response?.errors ?? [{ message: response?.error_message }];
      lastError = JSON.stringify({
        errors,
        request_id: response?.extensions?.request_id,
      });
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (!lastError.startsWith("Monday API returned")) {
        break;
      }
    }
    if (attempt < maxAttempts) {
      // 0.5s, 1s, 2s plus jitter so parallel retries don't collide again
      await sleep(500 * 2 ** (attempt - 1) + Math.random() * 250);
    }
  }
  return { data: null, error: new Error(lastError) };
};

// Maps items to their results with at most `limit` in flight at once.
const mapWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index] as T);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return results;
};

export function weeklyProjectLogRepository() {
  return {
    // Every week an employee has already logged, keyed by the entry's Date.
    fetchSubmittedWeeks: async (
      employeeId: string
    ): Promise<Errorable<SubmittedWeek[]>> => {
      const trimmedId = String(employeeId ?? "").trim();
      // Digits only: this also keeps the id safe to interpolate into the query
      if (!/^\d+$/.test(trimmedId)) {
        return { data: null, error: new Error(`Invalid employee id "${trimmedId}"`) };
      }
      try {
        const result = await fetchMondayData(`{
  boards(ids: ${WEEKLY_PROJECT_LOG_BOARD_ID}) {
    items_page(
      limit: 500
      query_params: {rules: [{column_id: "numeric_mkq25pjh", compare_value: [${trimmedId}], operator: any_of}]}
    ) {
      items {
        id
        created_at
        column_values(ids: ["date4", "numbers8"]) {
          id
          text
        }
      }
    }
  }
}`);
        if (result?.errors) {
          return {
            data: null,
            error: new Error(`Monday error: ${JSON.stringify(result.errors)}`),
          };
        }
        const items: {
          id: string;
          created_at: string;
          column_values: { id: string; text: string | null }[];
        }[] = result?.data?.boards?.[0]?.items_page?.items || [];
        const weeks = items
          .map((item) => {
            const text = (id: string) =>
              item.column_values.find((column) => column.id === id)?.text || "";
            return {
              itemId: String(item.id),
              week: text("date4"),
              totalHours: parseFloat(text("numbers8")) || 0,
              createdAt: item.created_at,
            };
          })
          .filter((week) => week.week !== "");
        return { data: weeks, error: null };
      } catch (error) {
        console.error("Error fetching submitted weeks:", error);
        return { data: null, error: new Error("fetchSubmittedWeeks() went wrong") };
      }
    },

    // Whether `email` may submit a log for `employeeId`: their own, or an
    // executive they're mapped to as an executive assistant.
    canSubmitFor: async (
      email: string,
      employeeId: string
    ): Promise<Errorable<boolean>> => {
      const trimmedId = String(employeeId ?? "").trim();
      const isAssistantFor = executiveAssistantMappings.some(
        (mapping) =>
          mapping.executiveAssistantEmail.toLowerCase() === email.toLowerCase() &&
          mapping.executiveId === trimmedId
      );
      if (isAssistantFor) {
        return { data: true, error: null };
      }
      const { data: employee, error } = await employeeRepository().fetchEmployee(email);
      if (error || !employee) {
        return { data: null, error: error ?? new Error("Employee not found") };
      }
      return { data: employee.employeeId.trim() === trimmedId, error: null };
    },

    createSubitems: async (
      parentItemId: string,
      subitems: { itemName: string; columnValues: Record<string, unknown> }[]
    ) => {
      const query =
        "mutation ($myItemName: String!, $parentID: ID!, $columnVals: JSON!) { create_subitem (parent_item_id: $parentID, item_name: $myItemName, column_values: $columnVals) { id } }";
      return mapWithConcurrency(subitems, SUBITEM_CONCURRENCY, (subitem) =>
        mutateWithRetry(
          query,
          {
            myItemName: subitem.itemName,
            parentID: parentItemId,
            columnVals: JSON.stringify(subitem.columnValues),
          },
          "create_subitem",
          4
        )
      );
    },

    // Single attempt: the submit route has its own untagged fallback, and a
    // failure caused by bad column values wouldn't succeed on a retry anyway
    createParentItem: async (
      itemName: string,
      columnValues: Record<string, unknown>
    ) =>
      mutateWithRetry(
        `mutation ($myItemName: String!, $columnVals: JSON!, $groupName: String!) { create_item (board_id: ${WEEKLY_PROJECT_LOG_BOARD_ID}, group_id: $groupName, item_name: $myItemName, column_values: $columnVals) { id } }`,
        {
          groupName: "topics",
          myItemName: itemName,
          columnVals: JSON.stringify(columnValues),
        },
        "create_item",
        1
      ),

    deleteItem: async (itemId: string) =>
      mutateWithRetry(
        "mutation ($itemId: ID!) { delete_item (item_id: $itemId) { id } }",
        { itemId },
        "delete_item",
        3
      ),
  };
}
