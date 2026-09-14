export type EmployeeProfile = {
  name: string;
  email: string;
  businessFunction: string;
  mondayProfileId: string;
  employeeId: string;
};

// Monday user ids linked to an employee on the FTE/PTE Details board,
// used to tag the People columns on weekly project log submissions.
export type EmployeePeopleTags = {
  employeeProfileIds: string[];
  homeManagerIds: string[];
};
