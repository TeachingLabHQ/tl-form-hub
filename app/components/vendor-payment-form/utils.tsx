import { z } from "zod";
import { ReminderItem } from "../weekly-project-log/reminders";

export const storedTaskSchema = z.object({
  taskName: z.string(),
  rate: z.number(),
  maxHours: z.number().nullable(),
});

export type StoredTask = z.infer<typeof storedTaskSchema>;

/**
 * Safely parse a task string stored from the task Select (JSON.stringify(option)).
 * Returns null for empty/whitespace strings or any malformed/invalid JSON.
 */
export const parseStoredTask = (task: string): StoredTask | null => {
  if (!task || !task.trim()) {
    return null;
  }
  try {
    const result = storedTaskSchema.safeParse(JSON.parse(task));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
};

export enum Tier {
  TIER_1 = "Tier 1",
  TIER_2 = "Tier 2",
  TIER_3 = "Tier 3",
  TIER_4 = "Tier 4",
}

export type TaskDetails = {
  taskName: string;
  "Tier 1": number | null;
  "Tier 2": number | null;
  "Tier 3": number | null;
  "Tier 4": number | null;
  maxHours: {
    "Tier 1": number | null;
    "Tier 2": number | null;
    "Tier 3": number | null;
    "Tier 4": number | null;
  }|null;
};

export const facilitationTaskOptions: TaskDetails[] = [
  {
    taskName: "Onboarding",
    "Tier 1": 500,
    "Tier 2": null,
    "Tier 3": null,
    "Tier 4": null,
    maxHours: {
      "Tier 1": 1,
      "Tier 2": null,
      "Tier 3": null,
      "Tier 4": null,
    },
  },
  {
    taskName:
      "Lead coaching activities: 1-1 coaching sessions, micro group PL, or walkthrough",
    "Tier 1": 110,
    "Tier 2": 125,
    "Tier 3": 140,
    "Tier 4": null,
    maxHours: {
      "Tier 1": 6,
      "Tier 2": 6,
      "Tier 3": 6,
      "Tier 4": null,
    },
  },
  {
    taskName:
      "Lead coaching preparation & follow-up: internalization or preparation for coaching sessions; follow-up activities; completion of Coaching Action Plans and Coaching Logs",
    "Tier 1": 50,
    "Tier 2": 50,
    "Tier 3": 50,
    "Tier 4": null,
    maxHours: {
      "Tier 1": 1.5,
      "Tier 2": 1.5,
      "Tier 3": 1.5,
      "Tier 4": null,
    },
  },
  {
    taskName: "Lead Facilitation of group Professional Learning course",
    "Tier 1": 150,
    "Tier 2": 165,
    "Tier 3": 180,
    "Tier 4": null,
    maxHours: {
      "Tier 1": 6,
      "Tier 2": 6,
      "Tier 3": 6,
      "Tier 4": null,
    },
  },
  {
    taskName:
      "Tech/Support Facilitation of group Professional Learning courses",
    "Tier 1": 50,
    "Tier 2": 50,
    "Tier 3": 50,
    "Tier 4": null,
    maxHours: null,
  },
  {
    taskName: "Second Facilitation of group Professional Learning courses",
    "Tier 1": 100,
    "Tier 2": null,
    "Tier 3": null,
    "Tier 4": null,
    maxHours: {
      "Tier 1": 6,
      "Tier 2": null,
      "Tier 3": null,
      "Tier 4": null,
    },
  },
  {
    taskName: "Mentoring of other Facilitation Contractors",
    "Tier 1": null,
    "Tier 2": 80,
    "Tier 3": 80,
    "Tier 4": null,
    maxHours: null,
  },
  {
    taskName: "Tech/Support Facilitation of virtual group PL courses",
    "Tier 1": 50,
    "Tier 2": 50,
    "Tier 3": 50,
    "Tier 4": null,
    maxHours: null,
  },
  {
    taskName: "Site Context + Support: Meetings and collaborations with project team members and/or partners to support the overall project success",
    "Tier 1": 50,
    "Tier 2": 50,
    "Tier 3": 50,
    "Tier 4": null,
    maxHours: null,
  },
  {
    taskName: "Content Training: Training to internalize the content of PL courses, curricula, or coaching framework. ",
    "Tier 1": 50,
    "Tier 2": 50,
    "Tier 3": 50,
    "Tier 4": null,
    maxHours: null,
  },
  {
    taskName: "Learning Opportunities: Quarterly Paid Office Hours, Book Clubs, Observations, Kick Offs, etc.",
    "Tier 1": 50,
    "Tier 2": 50,
    "Tier 3": 50,
    "Tier 4": null,
    maxHours: null,
  },
  {
    taskName: "Local Travel",
    "Tier 1": 20,
    "Tier 2": 20,
    "Tier 3": 20,
    "Tier 4": null,
    maxHours: {
      "Tier 1": 3,
      "Tier 2": 3,
      "Tier 3": 3,
      "Tier 4": null,
    },
  },
  {
    taskName: "Non-Local Travel",
    "Tier 1": 20,
    "Tier 2": 20,
    "Tier 3": 20,
    "Tier 4": null,
    maxHours: {
      "Tier 1": 16,
      "Tier 2": 16,
      "Tier 3": 16,
      "Tier 4": null,
    },
  },
];

export const copyEditorTaskOptions: TaskDetails[] = [
  {
    taskName: "Copy Editing",
    "Tier 1": 30,
    "Tier 2": 35,
    "Tier 3": 40,
    "Tier 4": null,
    maxHours: null,
  },
]

export const copyRightPermissionsTaskOptions: TaskDetails[] = [
  {
    taskName: "Copy Right Permissions",
    "Tier 1": 40,
    "Tier 2": 45,
    "Tier 3": 50,
    "Tier 4": null,
    maxHours: null,
  },
]

export const presentationDesignTaskOptions: TaskDetails[] = [
  {
    taskName: "Presentation Design",
    "Tier 1": 40,
    "Tier 2": 45,
    "Tier 3": 50,
    "Tier 4": null,
    maxHours: null,
  },
]
export const contentDeveloperTaskOptions: TaskDetails[] = [
  {
    taskName: "Content Development",
    "Tier 1": 70,
    "Tier 2": 85,
    "Tier 3": 100,
    "Tier 4": 125,
    maxHours: null,
  },
]

export const dataEvaluationTaskOptions: TaskDetails[] = [
  {
    taskName: "Data Evaluation",
    "Tier 1": 27,
    "Tier 2": null,
    "Tier 3": null,
    "Tier 4": null,
    maxHours: null,
  },
  {
    taskName: "Analysis, Visualization & Interpretation",
    "Tier 1": 30,
    "Tier 2": null,
    "Tier 3": null,
    "Tier 4": null,
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
  
    // If today is 5th or earlier, only allow prior month dates (the prior month is
    // still being finalized until the 5th). Current month dates stay locked until
    // the 6th so nothing can be logged for the current month before then.
    if (currentDay <= 5) {
      const priorMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const priorMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      // Allow all prior month dates
      if (dateYear === priorMonthYear && dateMonth === priorMonth) {
        return false; // Don't exclude prior month dates
      }
    } else {
      // If today is 6th or later, only allow current month dates from today onwards
      if (dateYear === currentYear && dateMonth === currentMonth ) {
        return false; // Don't exclude current month dates from today onwards
      }
    }
  
  // Exclude all other dates
  return true;
};

/**
 * Default date to pre-select in the work date picker.
 * Before the 6th, current-month dates are locked (see shouldExcludeVendorPaymentDate),
 * so default to the last day of the previous month — a valid, selectable date —
 * instead of today, which would otherwise let users submit for the current month.
 */
export const getDefaultVendorPaymentDate = (): Date => {
  const today = new Date();
  if (today.getDate() <= 5) {
    // Day 0 of the current month resolves to the last day of the previous month.
    return new Date(today.getFullYear(), today.getMonth(), 0);
  }
  return today;
};

/**
 * Whether to show the notice asking coaches to hold off on July submissions
 * until July 15. Shows only through July 15 and clears itself afterwards.
 */
export const shouldShowJulyHoldNotice = (): boolean => {
  const today = new Date();
  const JULY = 6; // zero-based month index
  return today.getMonth() === JULY && today.getDate() <= 15;
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
