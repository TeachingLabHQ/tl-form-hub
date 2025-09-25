export type ProjectMember = {
  name: string;
  role: string;
  projectName: string | undefined;
  budgetedHours: string | undefined;
};

export type projectsByTypes = {
  projectType: string;
  projects: string[];
};

export type ProjectLogRows = {
  projectName: string;
  projectRole: string;
  workHours: string;
  budgetedHours: string;
  activity: string;
};
export type ProgramProject = {
  projectName: string;
  projectMembers: ProjectMember[];
};

export type ProgramProjectWithHours = {
  projectName: string;
  projectRole: string;
  budgetedHours: string;
};

export type EmployeeBudgetedHours = {
  itemId: string;
  itemName: string;
  email: string;
  projectName: string;
  projectRole: string;
  budgetedHours: number;
};
