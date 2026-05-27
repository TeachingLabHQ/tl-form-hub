import { Button, NumberInput, Select, Text, TextInput } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
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
  const projectOptions: string[] = (() => {
    if (!projectData?.projectSourceNames) {
      return [];
    }
    const projects: string[] = projectData.projectSourceNames;
    return [...new Set(projects)].sort((a, b) => a.localeCompare(b));
  })();

  const gridClass = (canDelete: boolean) =>
    cn("grid gap-4 grid-cols-[2fr_1.3fr_1fr_1fr_1fr]", {
      "grid-cols-[2fr_1.3fr_1fr_1fr_1fr_0.5fr]": canDelete,
    });

  return (
    <RepeatableRowWidget<ProjectLogRows>
      rows={projectWorkEntries}
      setRows={setProjectWorkEntries}
      emptyRow={EMPTY_ROW}
      header={({ canDelete }) => (
        <div className={gridClass(canDelete)}>
          <Text fw={500} size="md">Project Name</Text>
          <Text fw={500} size="md">Project Role</Text>
          <Text fw={500} size="md">Activity</Text>
          <Text fw={500} size="md">Work Hours</Text>
          <Text fw={500} size="md">Budgeted Hours</Text>
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
            placeholder="Enter work hours"
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
            <Button
              color="red"
              onClick={deleteRow}
              size="xs"
            >
              <IconX size={20} />
            </Button>
          )}
        </div>
      )}
    />
  );
};
