import type { ActionFunctionArgs } from "@vercel/remix";
import { insertMondayData } from "~/domains/utils";
import { formatDate } from "~/utils/utils";

export const action = async ({ request }: ActionFunctionArgs) => {
  const body = await request.json();
  const { name, date, projectLogEntries, comment, employeeId } = body;

  //validate Inputs
  if (!name || !date || !Array.isArray(projectLogEntries)) {
    return new Response(null, {
      status: 400,
      statusText: "Submission Inputs are not valid",
    });
  }

  //process the submission
  try {
    const formattedDate = formatDate(date);
    let totalHours = projectLogEntries.reduce((a, b) => {
      return a + parseFloat(b.workHours);
    }, 0);

    //create the parent item
    const queryParentItem =
      "mutation ($myItemName: String!, $columnVals: JSON!, $groupName: String! ) { create_item (board_id:4284585496, group_id: $groupName, item_name:$myItemName, column_values:$columnVals) { id } }";
    const varsParentItem = {
      groupName: "topics",
      myItemName: name,
      columnVals: JSON.stringify({
        date4: { date: formattedDate },
        numbers8: totalHours,
        notes: comment,
        numeric_mkq25pjh: employeeId,
      }),
    };
    const response = await insertMondayData(queryParentItem, varsParentItem);
    const parentItemId = response.data.create_item.id;
    console.log("parentItemId", parentItemId);

    //create subitems
    const querySubItems =
      "mutation ($myItemName: String!,$parentID: ID!, $columnVals: JSON! ) { create_subitem (parent_item_id:$parentID, item_name:$myItemName, column_values:$columnVals) { id } }";
    const subitemPromises = projectLogEntries.map((project) => {
      const { projectName, projectRole, workHours } = project;
      const varsSubItems = {
        myItemName: name,
        parentID: String(parentItemId),
        columnVals: JSON.stringify({
          date: { date: formattedDate },
          project_role: projectRole,
          name6: projectName,
          numbers: parseFloat(workHours),
          numeric_mkq2d9jn: employeeId,
        }),
      };
      // Return the promise for each subitem creation
      return insertMondayData(querySubItems, varsSubItems)
        .then((result) => {
          console.log(`Subitem created for project: ${projectName}`);
          return result;
        })
        .catch((error) => {
          console.error(`Error creating subitem ${projectName}:`, error);
          throw error;
        });
    });
    await Promise.all(subitemPromises);
    return new Response(null, {
      status: 200,
      statusText: "All items and subitems created successfully.",
    });
  } catch (e) {
    console.error(e);
    return new Response(null, {
      status: 500,
      statusText: "Something went wrong with submission",
    });
  }
};
