import { Button, Select, Text, TextInput } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { ProjectLogRows } from "~/domains/project/model";
import { cn } from "../../utils/utils";
import {
  activityList,
  handleKeyDown,
  projectRolesList,
  updateTotalWorkHours
} from "./utils";
import { ProjectData } from "./project-log-form";

export const ProjectLogsWidget = ({
  isValidated,
  projectWorkEntries,
  setProjectWorkEntries,
  setTotalWorkHours,
  projectData,
}: {
  isValidated: boolean | null;
  projectWorkEntries: ProjectLogRows[];
  setProjectWorkEntries: React.Dispatch<
    React.SetStateAction<
      ProjectLogRows[]
    >
  >;
  setTotalWorkHours: React.Dispatch<React.SetStateAction<number>>;
  projectData: ProjectData;
}) => {

  const handleAddRow = () => {
    setProjectWorkEntries([
      ...projectWorkEntries,
      {
        projectName: "",
        projectRole: "",
        activity: "",
        workHours: "",
        budgetedHours: "N/A",
      },
    ]);
  };

  const handleChange = (
    index: number,
    field: keyof ProjectLogRows,
    value: string | null
  ) => {
      setProjectWorkEntries((prevEntries) => {
        const updatedRows = prevEntries.map((entry, i) => {
          if (i === index) {
            const updatedEntry = {
              ...entry,
              [field]: value || "",
            };
            // Auto-set project role for Internal Admin
            if (
              (value === "TL_Internal Admin" ||
                value ===
                  "ZZ_PTO, Holidays, Approved Break, or Other Paid Leave")
            ) {
              updatedEntry.projectRole = "Other";
            }

            return updatedEntry;
          }
          return entry;
        });
        if (field === "workHours") {
          updateTotalWorkHours(updatedRows, setTotalWorkHours);
        }
        return updatedRows;
      });
  };

  const handleDeleteRow = (index: number) => {
    const updatedRows = projectWorkEntries.filter((_, i) => i !== index);
    setProjectWorkEntries(updatedRows);
    updateTotalWorkHours(updatedRows, setTotalWorkHours);
  };

  const handleProjectOptions = () => {
    if (!projectData?.projectSourceNames) {
      return [];
    }

    let projects: string[] = [];
    projects = projectData.projectSourceNames;

    // Remove duplicates by converting to Set and back to array
    return [...new Set(projects)].sort((a, b) => a.localeCompare(b));
  };

  return (
    <div className="grid grid-rows gap-4">
      <div
        className={cn("grid gap-4 grid-cols-[2fr_1.3fr_1fr_1fr_1fr]", {
          "grid-cols-[2fr_1.3fr_1fr_1fr_1fr_0.5fr]":
            projectWorkEntries.length > 1,
        })}
      >
        <div className="">
          <Text fw={500} size="md">
            Project Name
          </Text>
        </div>
        <div className="">
          <Text fw={500} size="md">
            Project Role
          </Text>
        </div>
        <div className="">
          <Text fw={500} size="md">
            Activity
          </Text>
        </div>
        <div className="">
          <Text fw={500} size="md">
            Work Hours
          </Text>
        </div>
        <div className="">
          <Text fw={500} size="md">
            Budgeted Hours
          </Text>
        </div>
      </div>
      {/* Dynamic rows */}
      {projectWorkEntries.map((row, index) => (
        <div
          key={index}
          className={cn("grid gap-4 grid-cols-[2fr_1.3fr_1fr_1fr_1fr]", {
            "grid-cols-[2fr_1.3fr_1fr_1fr_1fr_0.5fr]":
              projectWorkEntries.length > 1,
          })}
        >
          <div>
            <Select
              //so the select is re-rendered when the project type is changed
              key={`project-name-${row.projectName}-${index}`}
              value={row.projectName}
              onChange={(value) => handleChange(index, "projectName", value)}
              placeholder="Select a project"
              data={handleProjectOptions()}
              searchable
              onKeyDown={handleKeyDown}
              error={
                isValidated === false && !row.projectName
                  ? "Project name is required"
                  : null
              }
            />
          </div>
          <div>
            <Select
              value={row.projectRole}
              onChange={(value) => handleChange(index, "projectRole", value)}
              placeholder="Select a role"
              data={projectRolesList}
              searchable
              disabled={row.projectName === "Internal Admin"}
              onKeyDown={handleKeyDown}
              error={
                isValidated === false && !row.projectRole
                  ? "Project Role is required"
                  : null
              }
            />
          </div>
          <div>
            <Select
              value={row.activity}
              onChange={(value) => handleChange(index, "activity", value)}
              placeholder="Select an activity"
              data={activityList}
              searchable
              onKeyDown={handleKeyDown}
              error={
                isValidated === false && !row.activity
                  ? "Activity is required"
                  : null
              }
            />
          </div>
          <div>
            <TextInput
              value={row.workHours}
              onChange={(e) => handleChange(index, "workHours", e.target.value)}
              placeholder="Enter work hours"
              onKeyDown={handleKeyDown}
              error={
                isValidated === false &&
                (!row.workHours || Number(row.workHours) === 0)
                  ? "Work Hours are required"
                  : null
              }
            />
          </div>
          <div>
            <TextInput value={row.budgetedHours} placeholder="N/A" readOnly />
          </div>
          {projectWorkEntries.length > 1 && (
            <div>
              <Button
                color="red"
                onClick={() => handleDeleteRow(index)}
                size="xs"
              >
                <IconX size={20} />
              </Button>
            </div>
          )}
        </div>
      ))}

      <Button onClick={handleAddRow}>Add New Row</Button>
    </div>
  );
};
