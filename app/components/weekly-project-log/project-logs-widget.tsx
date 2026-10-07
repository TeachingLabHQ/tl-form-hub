import { ActionIcon, NumberInput, Select, Text, TextInput } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useMemo } from "react";
import { RepeatableRowWidget } from "~/components/form-kit";
import { ProjectLogRows } from "~/domains/project/model";
import { cn } from "../../utils/utils";
import {
  activityList,
  handleKeyDown,
  projectRolesList,
  type ProjectData,
} from "./utils";

const EMPTY_ROW: ProjectLogRows = {
  projectName: "",
  projectRole: "",
  activity: "",
  workHours: "",
  budgetedHours: "N/A",
};

function gridClass(canDelete: boolean) {
  // Activity gets the most room after the project (its longest option is
  // long); hours and the read-only budget only ever hold short numbers
  return cn(
    "grid gap-3 grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1.6fr)_6.5rem_7.5rem]",
    {
      "grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1.6fr)_6.5rem_7.5rem_2.25rem]":
        canDelete,
    }
  );
}

export const ProjectLogsWidget = ({
  isValidated,
  projectWorkEntries,
  setProjectWorkEntries,
  projectData,
}: {
  isValidated: boolean | null;
  projectWorkEntries: ProjectLogRows[];
  setProjectWorkEntries: React.Dispatch<React.SetStateAction<ProjectLogRows[]>>;
  projectData: ProjectData;
}) => {
  const projectOptions = useMemo((): string[] => {
    if (!projectData?.projectSourceNames) {
      return [];
    }
    const projects: string[] = projectData.projectSourceNames;
    return [...new Set(projects)].sort((a, b) => a.localeCompare(b));
  }, [projectData]);

  return (
    <RepeatableRowWidget<ProjectLogRows>
      rows={projectWorkEntries}
      setRows={setProjectWorkEntries}
      emptyRow={EMPTY_ROW}
      header={({ canDelete }) => (
        <div className={gridClass(canDelete)}>
          <Text fw={600} size="sm">Project Name</Text>
          <Text fw={600} size="sm">Project Role</Text>
          <Text fw={600} size="sm">Activity</Text>
          <Text fw={600} size="sm">Work Hours</Text>
          <Text fw={600} size="sm">Budgeted Hours</Text>
        </div>
      )}
      renderRow={(row, index, { canDelete, updateRow, deleteRow }) => (
        <div className={gridClass(canDelete)}>
          <Select
            key={`project-name-${row.projectName}-${index}`}
            value={row.projectName}
            onChange={(value) => updateRow({ projectName: value || "" })}
            placeholder="Select a project"
            data={projectOptions}
            searchable
            onKeyDown={handleKeyDown}
            error={
              isValidated === false && !row.projectName
                ? "Project name is required"
                : null
            }
          />
          <Select
            value={row.projectRole}
            onChange={(value) => updateRow({ projectRole: value || "" })}
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
          <Select
            value={row.activity}
            onChange={(value) => updateRow({ activity: value || "" })}
            placeholder="Select activity"
            data={activityList}
            searchable
            onKeyDown={handleKeyDown}
            error={
              isValidated === false && !row.activity
                ? "Activity is required"
                : null
            }
          />
          <NumberInput
            value={parseFloat(row.workHours) || ""}
            onChange={(value) => {
              if (
                value === undefined ||
                value === null ||
                value === "" ||
                (typeof value === "number" && value > 0)
              ) {
                updateRow({ workHours: value?.toString() || "" });
              }
            }}
            placeholder="Hours"
            onKeyDown={handleKeyDown}
            min={0.01}
            decimalScale={2}
            allowNegative={false}
            error={
              isValidated === false &&
              (!row.workHours || Number(row.workHours) <= 0)
                ? "Work Hours must be greater than 0"
                : null
            }
          />
          <TextInput value={row.budgetedHours} placeholder="N/A" readOnly />
          {canDelete && (
            <ActionIcon
                variant="subtle"
                color="red"
                size="input-sm"
                onClick={deleteRow}
                aria-label="Remove row"
              >
                <IconTrash size={18} />
              </ActionIcon>
          )}
        </div>
      )}
    />
  );
};
