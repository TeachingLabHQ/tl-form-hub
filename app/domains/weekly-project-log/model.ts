export type SubmittedWeek = {
  itemId: string;
  // Monday of the reported week, YYYY-MM-DD
  week: string;
  totalHours: number;
  createdAt: string;
};

export type ExecutiveAssistantMapping = {
  executiveAssistantEmail: string;
  executiveName: string;
  executiveEmail: string;
  executiveId: string;
};

// Executive assistants who may submit project logs on an executive's behalf
export const executiveAssistantMappings: ExecutiveAssistantMapping[] = [
  {
    executiveAssistantEmail: "savanna.worthington@teachinglab.org",
    executiveName: "HaMy Vu",
    executiveEmail: "hamy.vu@teachinglab.org",
    executiveId: "2"
  },
  {
    executiveAssistantEmail: "alli.betsill@teachinglab.org",
    executiveName: "Sarah Johnson",
    executiveEmail: "sarah.johnson@teachinglab.org",
    executiveId: "30"
  },
];

export type SubitemInput = {
  itemName: string;
  columnValues: Record<string, unknown>;
};
