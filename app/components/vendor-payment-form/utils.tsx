import { ReminderItem } from "../weekly-project-log/reminders";

export enum Tier {
  TIER_1 = "Tier 1",
  TIER_2 = "Tier 2",
  TIER_3 = "Tier 3",
}

export type TaskDetails = {
  taskName: string;
  "Tier 1": number | null;
  "Tier 2": number | null;
  "Tier 3": number | null;
  maxHours: {
    "Tier 1": number | null;
    "Tier 2": number | null;
    "Tier 3": number | null;
  }|null;
};

export const facilitationTaskOptions: TaskDetails[] = [
  {
    taskName: "Onboarding",
    "Tier 1": 500,
    "Tier 2": null,
    "Tier 3": null,
    maxHours: {
      "Tier 1": 1,
      "Tier 2": null,
      "Tier 3": null,
    },
  },
  {
    taskName:
      "Lead coaching activities: 1-1 coaching sessions, micro group PL, or walkthrough",
    "Tier 1": 110,
    "Tier 2": 125,
    "Tier 3": 140,
    maxHours: {
      "Tier 1": 6,
      "Tier 2": 6,
      "Tier 3": 6,
    },
  },
  {
    taskName:
      "Lead coaching preparation & follow-up: internalization or preparation for coaching sessions; follow-up activities; completion of Coaching Action Plans and Coaching Logs",
    "Tier 1": 50,
    "Tier 2": 50,
    "Tier 3": 50,
    maxHours: {
      "Tier 1": 1.5,
      "Tier 2": 1.5,
      "Tier 3": 1.5,
    },
  },
  {
    taskName: "Lead Facilitation of group Professional Learning course",
    "Tier 1": 150,
    "Tier 2": 165,
    "Tier 3": 180,
    maxHours: {
      "Tier 1": 6,
      "Tier 2": 6,
      "Tier 3": 6,
    },
  },
  {
    taskName:
      "Tech/Support Facilitation of group Professional Learning courses",
    "Tier 1": 50,
    "Tier 2": 50,
    "Tier 3": 50,
    maxHours: null,
  },
  {
    taskName: "Second Facilitation of group Professional Learning courses",
    "Tier 1": 100,
    "Tier 2": null,
    "Tier 3": null,
    maxHours: {
      "Tier 1": 6,
      "Tier 2": null,
      "Tier 3": null,
    },
  },
  {
    taskName: "Mentoring of other Facilitation Contractors",
    "Tier 1": null,
    "Tier 2": 80,
    "Tier 3": 80,
    maxHours: null,
  },
  {
    taskName: "Tech/Support Facilitation of virtual group PL courses",
    "Tier 1": 50,
    "Tier 2": 50,
    "Tier 3": 50,
    maxHours: null,
  },
  {
    taskName: "Site Context + Support: Meetings and collaborations with project team members and/or partners to support the overall project success",
    "Tier 1": 50,
    "Tier 2": 50,
    "Tier 3": 50,
    maxHours: null,
  },
  {
    taskName: "Content Training: Training to internalize the content of PL courses, curricula, or coaching framework. ",
    "Tier 1": 50,
    "Tier 2": 50,
    "Tier 3": 50,
    maxHours: null,
  },
  {
    taskName: "Learning Opportunities: Quarterly Paid Office Hours, Book Clubs, Observations, Kick Offs, etc.",
    "Tier 1": 50,
    "Tier 2": 50,
    "Tier 3": 50,
    maxHours: null,
  },
  {
    taskName: "Content Training Make-Up Work",
    "Tier 1": 25,
    "Tier 2": 25,
    "Tier 3": 25,
    maxHours: null,
  },
  {
    taskName: "Local Travel",
    "Tier 1": 20,
    "Tier 2": 20,
    "Tier 3": 20,
    maxHours: {
      "Tier 1": 3,
      "Tier 2": 3,
      "Tier 3": 3,
    },
  },
  {
    taskName: "Non-Local Travel",
    "Tier 1": 20,
    "Tier 2": 20,
    "Tier 3": 20,
    maxHours: {
      "Tier 1": 16,
      "Tier 2": 16,
      "Tier 3": 16,
    },
  },
];

export const copyEditorTaskOptions: TaskDetails[] = [
  {
    taskName: "Copy Editing",
    "Tier 1": 40,
    "Tier 2": 45,
    "Tier 3": 50,
    maxHours: null,
  },
]

export const copyRightPermissionsTaskOptions: TaskDetails[] = [
  {
    taskName: "Copy Right Permissions",
    "Tier 1": 40,
    "Tier 2": 45,
    "Tier 3": 50,
    maxHours: null,
  },
]

export const presentationDesignTaskOptions: TaskDetails[] = [
  {
    taskName: "Presentation Design",
    "Tier 1": 40,
    "Tier 2": 45,
    "Tier 3": 50,
    maxHours: null,
  },
]
export const contentDeveloperTaskOptions: TaskDetails[] = [
  {
    taskName: "Content Development",
    "Tier 1": 70,
    "Tier 2": 85,
    "Tier 3": 100,
    maxHours: null,
  },
]

export const dataEvaluationTaskOptions: TaskDetails[] = [
  {
    taskName: "Data Evaluation",
    "Tier 1": 27,
    "Tier 2": null,
    "Tier 3": null,
    maxHours: null,
  },
]


export const REMINDER_ITEMS: ReminderItem[] = [
  {
    title: "Submission Deadline:",
    content:
      `Please log your hours and submit your payment on the same day you work. To ensure accuracy, review your "Submission History" regularly. If you need to correct your hours for a specific day, you must delete the incorrect entry and resubmit the correct hours for that day.\nAll submissions must be reviewed and finalized by the 5th of each month. On the 6th, all entries from the previous month will be automatically submitted for payment processing.\nIf you missed the monthly submission deadline, please contact the finance team: finance@teachinglab.org`,
  },
 
];

export const shouldExcludeVendorPaymentDate = (date: Date): boolean => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const currentDay = today.getDate();
  
  const dateMonth = date.getMonth();
  const dateYear = date.getFullYear();
  
  // If today is 6th or earlier, allow prior month dates + ALL current month dates
  if (currentDay <= 6) {
    const priorMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const priorMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    // Allow all prior month dates
    if (dateYear === priorMonthYear && dateMonth === priorMonth) {
      return false; // Don't exclude prior month dates
    }
    
    // Allow ALL current month dates (including future dates)
    if (dateYear === currentYear && dateMonth === currentMonth) {
      return false; // Don't exclude any current month dates
    }
  } else {
    // If today is 7th or later, only allow current month dates from today onwards
    if (dateYear === currentYear && dateMonth === currentMonth ) {
      return false; // Don't exclude current month dates from today onwards
    }
  }
  
  // Exclude all other dates
  return true;
};

export const filterVendorPaymentProjects = (projects: string[]): string[] => {
  // Projects to exclude from the dropdown
  const excludedProjects = [
    "TL_Business Development",
    "TL_Conferences", 
    "TL_Onboarding Revamp",
    "TL_Facilitation/Coach Development",
    "TL_Internal Professional Learning (Non project specific)",
    "TL_Programmatic Admin",
    "TL_Internal Student Work Grading",
    "TL_Coaching Program",
    "TL_Math Playbook and Walkthrough Tool"
  ];
  
  return projects.filter((project) => {
    // Filter out projects containing "ZZ"
    if (project.includes("ZZ")) {
      return false;
    }
    // Filter out specific excluded projects
    if (excludedProjects.includes(project)) {
      return false;
    }
    return true;
  });
};
