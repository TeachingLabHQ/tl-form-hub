import { ProjectLogRows, ProjectMember } from "~/domains/project/model";
import { ExecutiveAssistantMapping } from "./executive-assistant-selector";
import { EmployeeProfile } from "~/domains/employee/model";
import { Link } from "@remix-run/react";
import { ReminderItem } from "./reminders";
export const projectRolesList = [
  "Analyst",
  "Client/Partnership Manager",
  "Coach Coordinator",
  "Content Alignment Lead",
  "Facilitator/Coach",
  "Instructional Designer",
  "Project Lead",
  "Project Sponsor",
  "Project Management Support",
  "Subject Matter Expert",
  "Tech Engineer/Developer",
  "Other",
];

export const activityList = [
  "Project Execution",
  "Content Development",
  "Business Development",
  "PTO/Leave(Paid Time Off)",
];
export const setPreAssignedProjectsFromBudgetedHours = (
  employeeBudgetedHours: any[],
  setRows: React.Dispatch<React.SetStateAction<ProjectLogRows[]>>
) => {
  if (!employeeBudgetedHours || employeeBudgetedHours.length === 0) {
    return [];
  }

  // Transform employeeBudgetedHours data into ProjectLogRows format
  const projectMembersInfo: ProjectLogRows[] = employeeBudgetedHours.map((budgetItem) => {
    // Normalize coach/facilitator roles
    let normalizedRole = budgetItem.projectRole;
    if (budgetItem.projectRole.toLowerCase().includes("coach") || 
        budgetItem.projectRole.toLowerCase().includes("facilitator")) {
      normalizedRole = "Facilitator/Coach";
    }

    return {
      projectName: budgetItem.projectName,
      projectRole: normalizedRole,
      activity: "",
      workHours: "",
      budgetedHours: budgetItem.budgetedHours?.toString() || "N/A",
    };
  });

  // Remove duplicates (same project + role combination)
  const uniqueProjects: ProjectLogRows[] = [];
  projectMembersInfo.forEach((item) => {
    const exists = uniqueProjects.some(
      (existing) => 
        existing.projectName === item.projectName && 
        existing.projectRole === item.projectRole
    );
    if (!exists) {
      uniqueProjects.push(item);
    }
  });

  if (uniqueProjects.length > 0) {
    setRows(uniqueProjects);
  }
  
  return uniqueProjects;
};


export function compareTwoStrings(strA: string, strB: string) {
  const cleanA = strA.toLowerCase().replace(/\s+/g, "");
  const cleanB = strB.toLowerCase().replace(/\s+/g, "");
  return cleanA === cleanB;
}
export function containsString(strA: string, strB: string) {
  const cleanA = strA.toLowerCase().replace(/\s+/g, "");
  const cleanB = strB.toLowerCase().replace(/\s+/g, "");
  return cleanA.includes(cleanB);
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
    title: 
    (<>
    - For More information on how to fill out your project log, please reference our <Link to="https://drive.google.com/file/d/1VdDQCeYWjFGWn6CjKp6PpsbYODgaDzMq/view" target="_blank" style={{ textDecoration: "underline" }}>Project Log SOP</Link>
      </>)
    ,
    content:
      '',
  },
  {
    title: "NEW! Activity Column: ",
    content:
      '- For each project, team members should log the specific activities they performed. We use defined activity categories to track how time is spent across key functions. This helps us understand effort allocation and project costs. If you completed more than one activity for each project and role, please add another row of data. Each row of data should reflect one project, one role, and one activity.',
  },
  {
    title: "Budgeted Hours Column: ",
    content: (
      <>
        - The “Budgeted Hours” Column is autopopulated as a reminder of how many hours you have been estimated to work on each of your projects as set by your project lead and project budget. This number serves as a compass for your weekly allocations, not a prescription. To see a round up of all your Project Allocations, reference our{" "}
        <Link to="/staffing-dashboard" style={{ textDecoration: "underline" }}>
          Staffing Utilization Dashboard
        </Link>
      </>
    ),
  },
  {
    title: "Q: Need to adjust your hours post-submission?",
    content: (
      <>
        - Please contact{" "}
        <a
          href="mailto:project.log@teachinglab.org"
          style={{ textDecoration: "underline" }}
        >
          project.log@teachinglab.org
        </a>
        , attn: Savanna Worthington.
      </>
    ),
  },
  {
    title: "Q: Don't see your project?",
    content: (
      <>
        - Please contact{" "}
        <a
          href="mailto:finance@teachinglab.org"
          style={{ textDecoration: "underline" }}
        >
         finance@teachinglab.org
        </a>
        , attn: Eric Van Donge.
      </>
    ),
  },
];
