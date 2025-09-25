import { Errorable } from "../../utils/errorable";
import { fetchMondayData } from "../utils";
import {
  ProgramProject,
  ProjectMember,
  projectsByTypes,
} from "./model";


export interface ProjectRepository {
  fetchAllProjects(): Promise<Errorable<projectsByTypes[]>>;
  fetchProgramProjects(mondayProfileId: string): Promise<Errorable<ProgramProject[]>>;
  fetchAllBudgetedHours(): Promise<Errorable<any>>;
  fetchProjectColumnBAD(): Promise<Errorable<Record<string, string>>>;
}

export function projectRepository(): ProjectRepository {
  return {
    fetchAllProjects: async () => {
      try {
        const query =
          "{boards(ids: 4271509592) { items_page (limit:500) { items { name group{title} }}}}";
        const rawMondayData = await fetchMondayData(query);
        const rawItemData = rawMondayData.data.boards[0].items_page.items;
        const internalProjectsList = rawItemData.filter((i: any) => {
          return i.group.title == "Internal Project";
        });
        const programProjectsList = rawItemData.filter((i: any) => {
          return i.group.title == "Program Project";
        });

        const allProjectsList = [
          {
            projectType: "Program-related Project",
            projects: programProjectsList.map((p: any) => p.name),
          },
          {
            projectType: "Internal Project",
            projects: internalProjectsList.map((p: any) => p.name),
          },
        ];
        return { data: allProjectsList, error: null };
      } catch (e) {
        return {
          data: null,
          error: new Error("fetchAllProjects() went wrong"),
        };
      }
    },

    fetchProgramProjects: async (mondayProfileId: string) => {
      try {
        // Define the query to fetch staffing data from Monday
        let firstQuery = "";
        // if mondayProfileId is empty, fetch all program projects
        if (mondayProfileId === "") {
         firstQuery = `{
                     boards(ids: 6902955796) {
                      items_page(limit: 500) {
                        cursor 
                        items {
                          name 
                          group {
                            id
                          } 
                          column_values(ids: ["dropdown_mkttrc1m", "project_lead2", "project_sponsor", "cpm23", "multiple_person", "sme_knowledge53", "people8", "people__1", "people5__1", "multiple_person3", "people9"]) {
                            column {
                              title
                            } 
                            text
                          }
                        }
                      }
                    }
                  }`;
        } else {
          // if mondayProfileId is not empty, fetch the program projects for the given mondayProfileId
          firstQuery = `{
  boards(ids: 6902955796) {
    items_page(
      query_params: {rules: [{column_id: "people0", compare_value: ["person-${mondayProfileId}"], operator: any_of}]}
    ) {
      cursor
      items {
        id
        name
        group {
          id
        }
        column_values(
          ids: ["dropdown_mkttrc1m", "project_lead2", "project_sponsor", "cpm23", "multiple_person", "sme_knowledge53", "people8", "people__1", "people5__1", "multiple_person3", "people9"]
        ) {
          column {
            title
          }
          text
        }
      }
    }
  }
}`;
        }

        let rawStaffingList = await fetchMondayData(firstQuery);

        let cursor: string | null =
          rawStaffingList.data.boards[0].items_page.cursor;
        let staffedProjectsList = rawStaffingList.data.boards[0].items_page.items;

        while (cursor) {
          const cursorQuery = `{
                      next_items_page(limit: 500, cursor: "${cursor}") {
                        cursor 
                        items {
                          name 
                          group {
                            id
                          } 
                          column_values(ids: ["dropdown_mkttrc1m", "project_lead2", "project_sponsor", "cpm23", "multiple_person", "sme_knowledge53", "people8", "people__1", "people5__1", "multiple_person3", "people9"]) {
                            column {
                              title
                            } 
                            text
                          }
                        }
                      }
                    }`;

          const rawAdditionalStaffingList = await fetchMondayData(cursorQuery);
          // Add the additional Monday data in the list
          staffedProjectsList.push(...rawAdditionalStaffingList.data.next_items_page.items);

          cursor = rawAdditionalStaffingList.data.next_items_page.cursor;
        }

        // Only keep the active projects (items in group FY25 Active Program Project Teams/FY25 Active Content Project Teams)
        staffedProjectsList = staffedProjectsList.filter(
          (i: { group: { id: string } }) =>
              i.group.id === "1661883063_fy23_programs_team_" ||
              i.group.id === "new_group97925"
          );
        let programProjectsList: ProgramProject[] = [];
        for (const staffedProject of staffedProjectsList) {
          const projectName = staffedProject["column_values"].find(
            (c: { column: { title: string }; title: string }) =>
              c.column.title === "Project Log Name" || c.column.title === "Project Log Name (source)"
          )?.text;
          // Only include projects with a valid project log name
          if (projectName && projectName.trim() !== "") {
          let programProject: ProgramProject = {
            projectName: "",
            projectMembers: [],
          };
          //use the project name from the Project Log Name column
              programProject.projectName = projectName;
          let projectMembers: ProjectMember[] = [];
          for (const projectMember of staffedProject["column_values"]) {
            //the names are Monday profile names
            if (projectMember.text) {
              const members = projectMember.text
                .split(",")
                .map((member: string) => {
                  return {
                    name: member.trim(),
                    role: projectMember.column.title,
                    projectName: programProject.projectName,
                    budgetedHours: undefined,
                  };
                });
              projectMembers.push(...members);
            }
          }
          programProject.projectMembers = projectMembers;
            
            
            programProjectsList.push(programProject);
          
        }
      }

        return { data: programProjectsList, error: null };
      } catch (e) {
        console.error(e);
        return {
          data: null,
          error: new Error("fetchProgramProjects() went wrong"),
        };
      }
    },
    fetchAllBudgetedHours: async (): Promise<Errorable<any>> => {
      try {
        //NOTE: Not using Monday API filtering by employeeId because it doesn't support filtering lookup columns
        let query = "";
           query = `{
            boards(ids: 9709949287) {
             items_page(
              limit: 500
            ) {
                cursor
                items {
                  id
                  name
                  column_values(ids: [
                    "lookup_mksmfdnr", 
                    "lookup_mkpvs1wj",
                    "numeric_mknhqm6d", 
                    "dropdown_mkttdgrw", 
                    "color_mknhq0s3"
                  ]) {
                    id
                    text
                    ... on StatusValue {
                      label
                    }
                    ... on MirrorValue {
                      display_value
                      id
                    }
                    column {
                      title
                    }
                  }
                }
              }
            }
          }`;

        let rawMondayData = await fetchMondayData(query);
        let cursor: string | null =
          rawMondayData.data.boards[0].items_page.cursor;
        let allItems = rawMondayData.data.boards[0].items_page.items;

        while (cursor) {
          const cursorQuery = `{
            next_items_page(limit: 500, cursor: "${cursor}") {
              cursor
              items {
                id
                name
                column_values(ids: [
                  "lookup_mksmfdnr", 
                  "lookup_mkpvs1wj",
                  "numeric_mknhqm6d", 
                  "dropdown_mkttdgrw", 
                  "color_mknhq0s3"
                ]) {
                  id
                  text
                  ... on StatusValue {
                    label
                  }
                  ... on MirrorValue {
                    display_value
                    id
                  }
                  column {
                    title
                  }
                }
              }
            }
          }`;

          const rawAdditionalData = await fetchMondayData(cursorQuery);
          // Add the additional Monday data to the list
          allItems.push(...rawAdditionalData.data.next_items_page.items);

          cursor = rawAdditionalData.data.next_items_page.cursor;
        }
       
        return { data: allItems, error: null };
      } catch (e) {
        console.error(e);
        return {
          data: null,
          error: new Error("fetchAllBudgetedHours() went wrong"),
        };
      }
    },
    //NOTE: separate query because can't read dropdown column when filtering column values by column id
    fetchProjectColumnBAD: async (): Promise<Errorable<Record<string, string>>> => {
      try {
        const query = `{
          boards(ids: 9709949287) {
            items_page(limit: 500) {
              cursor
              items {
                id
                name
                column_values(types: dropdown) {
                  id
                  column { id type title }
                  text
                  ... on DropdownValue {
                    values { id label }
                  }
                }
              }
            }
          }
        }`;

        let rawMondayData = await fetchMondayData(query);
        let cursor: string | null = rawMondayData.data.boards[0].items_page.cursor;
        let allItems = rawMondayData.data.boards[0].items_page.items;

        // Handle pagination if there are more results
        while (cursor) {
          const cursorQuery = `{
            next_items_page(limit: 500, cursor: "${cursor}") {
              cursor
              items {
                id
                name
                column_values(types: dropdown) {
                  id
                  column { id type title }
                  text
                  ... on DropdownValue {
                    values { id label }
                  }
                }
              }
            }
          }`;

          const rawAdditionalData = await fetchMondayData(cursorQuery);
          allItems.push(...rawAdditionalData.data.next_items_page.items);
          cursor = rawAdditionalData.data.next_items_page.cursor;
        }
     
        // Create a mapping of item ID to project name
        const projectNamesMap: Record<string, string> = {};
        
        allItems.forEach((item: any) => {
          // Find the dropdown column for project names (dropdown_mkttdgrw)
          // Search through all column_values to find the one with the correct column ID
          const projectNameColumn = item.column_values?.find(
            (colValue: any) => colValue.column?.id === "dropdown_mkttdgrw"
          );
          
          // Extract project name from dropdown values array
          if (projectNameColumn && projectNameColumn.values && projectNameColumn.values.length > 0) {
            // Get the label from the first value in the dropdown
            const projectName = projectNameColumn.values[0]?.label;
            if (projectName) {
              projectNamesMap[item.id] = projectName;
            }
          }
        });

        console.log(`Fetched project names for ${Object.keys(projectNamesMap).length} items`);
        return { data: projectNamesMap, error: null };
      } catch (e) {
        console.error("Error in fetchProjectNames:", e);
        return {
          data: null,
          error: new Error("fetchProjectNames() went wrong"),
        };
      }
    }
  };
}
