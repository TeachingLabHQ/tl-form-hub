export type SubmittedWeek = {
  itemId: string;
  // Monday of the reported week, YYYY-MM-DD
  week: string;
  totalHours: number;
  createdAt: string;
};

export type SubitemInput = {
  itemName: string;
  columnValues: Record<string, unknown>;
};
