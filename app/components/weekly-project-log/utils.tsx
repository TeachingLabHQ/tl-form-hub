import { ProjectLogRows, ProjectMember } from "~/domains/project/model";
import { ExecutiveAssistantMapping } from "./executive-assistant-selector";
import { EmployeeProfile } from "~/domains/employee/model";
import { Link } from "@remix-run/react";
import { ReminderItem } from "./reminders";
export const projectRolesList = [
  "Analyst",
  "Client/Partnership Manager",
  "Coach Coordinator",
  "Facilitator/Coach",
  "Instructional Designer",
  "Project Lead",
  "Project Sponsor",
  "Project Management Support",
  "Subject Matter Expert",
  "Tech Engineer/Developer",
  "Other",
];

export const isProjectLogComplete = (log: {
  projectType: string;
  projectRole: string;
  projectName: string;
  workHours: string;
}) => {
  return (
    log.projectType !== "" &&
    log.projectRole !== "" &&
    log.projectName !== "" &&
    log.workHours !== ""
  );
};

export const getPreAssignedProgramProjects = (
  programProjectsStaffing: any,
  rows: {
    projectType: string;
    projectName: string;
    projectRole: string;
    workHours: string;
    budgetedHours: string;
  }[],
  setRows: React.Dispatch<
    React.SetStateAction<
      {
        projectType: string;
        projectName: string;
        projectRole: string;
        workHours: string;
        budgetedHours: string;
      }[]
    >
  >,
  mondayProfile: EmployeeProfile | null,
  allBudgetedHours: any
) => {
  let projectMembersInfo: ProjectLogRows[] = [];
  if (programProjectsStaffing) {
    for (const project of programProjectsStaffing) {
      const { projectName, projectMembers } = project;
      const member = projectMembers.find((member: any) =>
        compareTwoStrings(member.name, mondayProfile?.name || "")
      );
      if (member) {
        projectMembersInfo.push({
          projectType: "Program-related Project",
          projectRole: member.role,
          projectName: projectName,
          workHours: "",
          budgetedHours: "N/A",
        });
      }
    }
  }
  //get budgeted hours
  for (const member of projectMembersInfo) {
    const budgetedHours = getBudgetedHoursFromMonday(
      member.projectName,
      member.projectRole,
      mondayProfile?.email || "",
      allBudgetedHours
    );
    member.budgetedHours = budgetedHours;
  }
  if (projectMembersInfo.length > 0) {
    setRows(projectMembersInfo);
  }
  return projectMembersInfo;
};

export const getBudgetedHoursFromMonday = (
  projectName: string,
  projectRole: string,
  email: string,
  allBudgetedHours: any
) => {
  for (let item of allBudgetedHours) {
    let itemEmail = item.column_values.find(
      (col: any) => col.column.title === "Email"
      //access the display_value of the mirror column
    )?.display_value;
    let itemProjectName = item.column_values.find(
      (col: any) => col.column.title === "Project Name"
    )?.text;
    let itemBudgetedHours = item.column_values.find(
      (col: any) => col.column.title === "Budgeted Hours/Week"
    )?.text;
    let itemProjectRole = item.column_values.find(
      (col: any) => col.column.title === "Project Role"
    )?.text;
    if (
      compareTwoStrings(itemEmail, email) &&
      compareTwoStrings(itemProjectName, projectName) &&
      compareTwoStrings(projectRole, itemProjectRole)
    ) {
      return parseFloat(itemBudgetedHours).toString() || "N/A";
    }
  }

  return "N/A"; // Return "N/A" if no match is found
};

export function compareTwoStrings(strA: string, strB: string) {
  const cleanA = strA.toLowerCase().replace(/\s+/g, "");
  const cleanB = strB.toLowerCase().replace(/\s+/g, "");
  return cleanA === cleanB;
}

export const handleProjectTypeByTeam = (businessFunction: string) => {
  const projectTypes = ["Internal Project", "Program-related Project"];

  switch (businessFunction) {
    case "Operations&Technology":
      return projectTypes;
    case "Finance":
      return projectTypes;
    case "Strategy & Communications":
      return ["Internal Project"];
    case "People & Culture":
      return projectTypes;
    case "Strategic Growth & Marketing":
      return ["Program-related Project"];
    case "Program":
      return ["Program-related Project"];
    case "Innovation Studio":
      return projectTypes;
    case "Learning & Research":
      return projectTypes;
    case "Office of the CEO":
      return projectTypes;
    case "Shared Operations":
      return projectTypes;
    case "Facilitation":
      return projectTypes;
    case "":
      return projectTypes;
    default:
      return projectTypes;
  }
};

export const updateTotalWorkHours = (
  updatedProjectLogEntries: ProjectLogRows[],
  setTotalWorkHours: React.Dispatch<React.SetStateAction<number>>
) => {
  let totalWorkHours = 0;
  for (const projectLog of updatedProjectLogEntries) {
    const { workHours } = projectLog;
    totalWorkHours += Number(workHours);
  }
  setTotalWorkHours(totalWorkHours);
};

export const executiveAssistantMappings: ExecutiveAssistantMapping[] = [
  {
    executiveAssistantEmail: "savanna.worthington@teachinglab.org",
    executiveName: "HaMy Vu",
    executiveEmail: "hamy.vu@teachinglab.org",
  },
  {
    executiveAssistantEmail: "alli.franken@teachinglab.org",
    executiveName: "Sarah Johnson",
    executiveEmail: "sarah.johnson@teachinglab.org",
  },
];

export const getClosestMonday = (date: Date, onChange: boolean): Date => {
  const currentMonday = new Date(date);
  const dayOfWeek = currentMonday.getDay();
  // Adjust to closest Monday
  currentMonday.setDate(
    currentMonday.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
  );
  // Calculate the last week's Monday
  const lastMonday = new Date(currentMonday);
  lastMonday.setDate(currentMonday.getDate() - 7);

  // If today is between Thursday and Sunday, return current Monday
  if (dayOfWeek >= 4 || dayOfWeek === 0 || (dayOfWeek === 1 && onChange)) {
    //ensure a Monday is returned
    if (currentMonday.getDay() === 1) {
      return currentMonday;
    }
    currentMonday.setDate(
      currentMonday.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
    );
    return currentMonday;
  }
  //if today is between Monday and Wednesday, return last Monday
  //ensure a Monday is returned
  if (lastMonday.getDay() === 1) {
    return lastMonday;
  }
  lastMonday.setDate(
    lastMonday.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
  );
  return lastMonday;
};

export const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === "Enter") {
    e.preventDefault();
  }
};

export const REMINDER_ITEMS: ReminderItem[] = [
  {
    title: "NEW Budgeted Hours Column:",
    content:
      '- The "Budgeted Hours" column displays estimated hours for program projects. You are free to log hours below or above the displayed amount. If needed, please provide additional context or reasons in the comment section.',
  },
  {
    title: "Staffing Utilization Dashboard",
    content: (
      <>
        - To find information on your program project assignments and budgeted
        hours for each project role, please visit the{" "}
        <Link to="/staffing-dashboard" style={{ textDecoration: "underline" }}>
          Staffing Utilization Dashboard
        </Link>{" "}
        in the navigation bar.
      </>
    ),
  },
  {
    title: "Q: Need to adjust your hours post submission?",
    content: (
      <>
        - To adjust submitted hours, please send an email to the{" "}
        <a
          href="mailto:project.log@teachinglab.org"
          style={{ textDecoration: "underline" }}
        >
          project log service
        </a>
        , addressed to Savanna Worthington.
      </>
    ),
  },
  {
    title: "Q: Don't see your project?",
    content: (
      <>
        - New projects are created when partner contracts have been signed, or
        internal project budgets have been created. If you do not see your
        client project listed in the drop down, please contact finance team,
        attention{" "}
        <a
          href="mailto:eric.vandonge@teachinglab.org"
          style={{ textDecoration: "underline" }}
        >
          Eric Van Donge
        </a>
        .
      </>
    ),
  },
];
