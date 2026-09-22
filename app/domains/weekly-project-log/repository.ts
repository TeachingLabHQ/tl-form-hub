import { Errorable } from "../../utils/errorable";
import { fetchMondayData, insertMondayData, MondayApiStatusError } from "../utils";
import { SubitemInput, SubmittedWeek } from "./model";

export const WEEKLY_PROJECT_LOG_BOARD_ID = "4284585496";

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
// Known trade-off: an error inside a 200 is assumed to mean nothing was
// written. If Monday ever errors after the write lands, a create retry would
// duplicate the row, and a delete retry would report failure for an item
// that's already gone.
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
      if (!(error instanceof MondayApiStatusError)) {
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

export interface WeeklyProjectLogRepository {
  fetchSubmittedWeeks(employeeId: string): Promise<Errorable<SubmittedWeek[]>>;
  createParentItem(
    itemName: string,
    columnValues: Record<string, unknown>
  ): Promise<Errorable<{ id: string }>>;
  createSubitems(
    parentItemId: string,
    subitems: SubitemInput[]
  ): Promise<Errorable<{ id: string }>[]>;
  updateItemColumns(
    itemId: string,
    columnValues: Record<string, unknown>
  ): Promise<Errorable<{ id: string }>>;
  deleteItem(itemId: string): Promise<Errorable<{ id: string }>>;
}

export function weeklyProjectLogRepository(): WeeklyProjectLogRepository {
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
      type LogItem = {
        id: string;
        created_at: string;
        column_values: { id: string; text: string | null }[];
      };
      const itemFields = `items {
        id
        created_at
        column_values(ids: ["date4", "numbers8"]) {
          id
          text
        }
      }`;
      try {
        const firstPage = await fetchMondayData(`{
  boards(ids: ${WEEKLY_PROJECT_LOG_BOARD_ID}) {
    items_page(
      limit: 500
      query_params: {rules: [{column_id: "numeric_mkq25pjh", compare_value: [${trimmedId}], operator: any_of}]}
    ) {
      cursor
      ${itemFields}
    }
  }
}`);
        if (firstPage?.errors) {
          return {
            data: null,
            error: new Error(`Monday error: ${JSON.stringify(firstPage.errors)}`),
          };
        }
        const items: LogItem[] = [
          ...(firstPage?.data?.boards?.[0]?.items_page?.items || []),
        ];
        // Follow the cursor so a long history can't hide an existing week
        let cursor: string | null = firstPage?.data?.boards?.[0]?.items_page?.cursor ?? null;
        while (cursor) {
          const page = await fetchMondayData(
            `{ next_items_page(limit: 500, cursor: ${JSON.stringify(cursor)}) { cursor ${itemFields} } }`
          );
          // Keep the pages already fetched: a partial history still catches
          // most duplicates, where an error would let every week through
          if (page?.errors) {
            console.warn(
              `Stopped paging submitted weeks for employee ${trimmedId}:`,
              JSON.stringify(page.errors)
            );
            break;
          }
          items.push(...(page?.data?.next_items_page?.items || []));
          cursor = page?.data?.next_items_page?.cursor ?? null;
        }
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

    createSubitems: async (
      parentItemId: string,
      subitems: SubitemInput[]
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

    // Single attempt: a failure caused by bad column values wouldn't succeed
    // on a retry anyway
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

    // Single attempt, like createParentItem: a rejected People value (e.g. a
    // deactivated manager) wouldn't succeed on a retry
    updateItemColumns: async (
      itemId: string,
      columnValues: Record<string, unknown>
    ) =>
      mutateWithRetry(
        `mutation ($itemId: ID!, $columnVals: JSON!) { change_multiple_column_values (board_id: ${WEEKLY_PROJECT_LOG_BOARD_ID}, item_id: $itemId, column_values: $columnVals) { id } }`,
        { itemId, columnVals: JSON.stringify(columnValues) },
        "change_multiple_column_values",
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
