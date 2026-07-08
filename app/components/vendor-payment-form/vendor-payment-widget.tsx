import {
  Button,
  NumberInput,
  Select,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { RepeatableRowWidget } from "~/components/form-kit";
import { cn } from "../../utils/utils";
import {
  contentDeveloperTaskOptions,
  copyEditorTaskOptions,
  copyRightPermissionsTaskOptions,
  dataEvaluationTaskOptions,
  facilitationTaskOptions,
  filterVendorPaymentProjects,
  parseStoredTask,
  presentationDesignTaskOptions,
  StoredTask,
  TaskDetails,
} from "./utils";

type VendorPaymentRow = {
  task: string;
  project: string;
  workHours: string;
  note: string;
};

const EMPTY_ROW: VendorPaymentRow = {
  task: "",
  project: "",
  workHours: "",
  note: "",
};

function gridClass(canDelete: boolean) {
  return cn("grid gap-4 grid-cols-[2fr_2fr_1fr_1fr_1fr]", {
    "grid-cols-[2fr_2fr_1fr_1fr_1fr_0.5fr]": canDelete,
  });
}

export const VendorPaymentWidget = ({
  isValidated,
  vendorPaymentEntries,
  setVendorPaymentEntries,
  cfTier,
  projects,
}: {
  isValidated: boolean | null;
  vendorPaymentEntries: VendorPaymentRow[];
  setVendorPaymentEntries: React.Dispatch<
    React.SetStateAction<VendorPaymentRow[]>
  >;
  cfTier: {
    type: string;
    value: string;
  }[];
  projects: string[] | null;
}) => {
  const programProjects = new Set(projects || []);
  const filteredProjects = filterVendorPaymentProjects(
    Array.from(programProjects)
  );

  const projectOptions = filteredProjects.map((project) => ({
    value: project,
    label: project,
  }));

  // Filter tasks based on tier and rate availability
  const getAvailableTasks = () => {
    let availableTasks: StoredTask[] = [];
    if (cfTier.length === 0) {
      return availableTasks;
    }

    for (const tier of cfTier) {
      if (tier.type === "facilitator") {
        facilitationTaskOptions.forEach((task) => {
          const rateValue = task[tier.value as keyof TaskDetails];
          if (rateValue !== null && typeof rateValue === "number" && rateValue > 0) {
            availableTasks.push({
              taskName: task.taskName,
              rate: rateValue,
              maxHours:
                task.maxHours?.[tier.value as "Tier 1" | "Tier 2" | "Tier 3" | "Tier 4"] ||
                null,
              fixedHours: task.fixedHours ?? null,
            });
          }
        });
      } else if (tier.type === "copyRightPermissions") {
        copyRightPermissionsTaskOptions.forEach((task: TaskDetails) => {
          const rateValue = task[tier.value as keyof TaskDetails];
          if (rateValue !== null && typeof rateValue === "number" && rateValue > 0) {
            availableTasks.push({
              taskName: task.taskName,
              rate: rateValue,
              maxHours:
                task.maxHours?.[tier.value as "Tier 1" | "Tier 2" | "Tier 3" | "Tier 4"] ||
                null,
              fixedHours: task.fixedHours ?? null,
            });
          }
        });
      } else if (tier.type === "copyEditor") {
        copyEditorTaskOptions.forEach((task) => {
          const rateValue = task[tier.value as keyof TaskDetails];
          if (rateValue !== null && typeof rateValue === "number" && rateValue > 0) {
            availableTasks.push({
              taskName: task.taskName,
              rate: rateValue,
              maxHours:
                task.maxHours?.[tier.value as "Tier 1" | "Tier 2" | "Tier 3" | "Tier 4"] ||
                null,
              fixedHours: task.fixedHours ?? null,
            });
          }
        });
      } else if (tier.type === "presentationDesign") {
        presentationDesignTaskOptions.forEach((task) => {
          const rateValue = task[tier.value as keyof TaskDetails];
          if (rateValue !== null && typeof rateValue === "number" && rateValue > 0) {
            availableTasks.push({
              taskName: task.taskName,
              rate: rateValue,
              maxHours:
                task.maxHours?.[tier.value as "Tier 1" | "Tier 2" | "Tier 3" | "Tier 4"] ||
                null,
              fixedHours: task.fixedHours ?? null,
            });
          }
        });
      } else if (tier.type === "contentDeveloper") {
        contentDeveloperTaskOptions.forEach((task) => {
          const rateValue = task[tier.value as keyof TaskDetails];
          if (rateValue !== null && typeof rateValue === "number" && rateValue > 0) {
            availableTasks.push({
              taskName: task.taskName,
              rate: rateValue,
              maxHours:
                task.maxHours?.[tier.value as "Tier 1" | "Tier 2" | "Tier 3" | "Tier 4"] ||
                null,
              fixedHours: task.fixedHours ?? null,
            });
          }
        });
      } else if (tier.type === "dataEvaluation") {
        dataEvaluationTaskOptions.forEach((task) => {
          const rateValue = task[tier.value as keyof TaskDetails];
          if (rateValue !== null && typeof rateValue === "number" && rateValue > 0) {
            availableTasks.push({
              taskName: task.taskName,
              rate: rateValue,
              maxHours:
                task.maxHours?.[tier.value as "Tier 1" | "Tier 2" | "Tier 3" | "Tier 4"] ||
                null,
              fixedHours: task.fixedHours ?? null,
            });
          }
        });
      }
    }
    return availableTasks;
  };

  const calculateTaskTotalPay = (task: string, workHours: string): number => {
    const taskData = parseStoredTask(task);
    if (!taskData || !workHours) {
      return 0;
    }
    const hours = parseFloat(workHours) || 0;
    return taskData.rate * hours;
  };

  const listOfAvailableTasks = getAvailableTasks() || [];

  return (
    <RepeatableRowWidget<VendorPaymentRow>
      rows={vendorPaymentEntries}
      setRows={setVendorPaymentEntries}
      emptyRow={EMPTY_ROW}
      header={({ canDelete }) => (
        <div className={gridClass(canDelete)}>
          <Text fw={500} size="md">Task</Text>
          <Text fw={500} size="md">Project</Text>
          <Text fw={500} size="md">Work Hours</Text>
          <Text fw={500} size="md">Rate</Text>
          <Text fw={500} size="md">Total Pay</Text>
        </div>
      )}
      renderRow={(row, _index, { canDelete, updateRow, deleteRow }) => {
        const taskData = parseStoredTask(row.task);
        return (
        <div className="flex flex-col gap-2">
          <div className={gridClass(canDelete)}>
            <Select
              value={row.task || null}
              onChange={(value) => {
                const parsed = value ? JSON.parse(value) : null;
                const update: Partial<VendorPaymentRow> = { task: value || "" };
                if (parsed?.fixedHours != null) {
                  update.workHours = parsed.fixedHours.toString();
                }
                updateRow(update);
              }}
              placeholder="Select a task"
              data={listOfAvailableTasks.map((option) => ({
                value: JSON.stringify(option),
                label: option.taskName,
              }))}
              searchable
              error={
                isValidated === false && !row.task ? "Task is required" : null
              }
            />
            <Select
              value={row.project || null}
              onChange={(value) => updateRow({ project: value || "" })}
              placeholder="Select a project"
              data={projectOptions}
              searchable
              error={
                isValidated === false && !row.project
                  ? "Project is required"
                  : null
              }
            />
            <NumberInput
              value={parseFloat(row.workHours) || 0}
              onChange={(value) =>
                updateRow({ workHours: value?.toString() || "" })
              }
              placeholder="Enter work hours"
              max={taskData?.maxHours ?? undefined}
              min={0}
              readOnly={taskData?.fixedHours != null}
              error={
                isValidated === false &&
                (!row.workHours || Number(row.workHours) === 0)
                  ? "Work Hours are required"
                  : null
              }
            />
            <TextInput
              value={`$${(taskData?.rate ?? 0).toFixed(2)}`}
              readOnly
              placeholder="Rate"
            />
            <TextInput
              value={`$${calculateTaskTotalPay(
                row.task || "",
                row.workHours || ""
              ).toFixed(2)}`}
              readOnly
              placeholder="Total pay"
            />
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

          <div>
            <Textarea
              value={row.note}
              onChange={(e) => updateRow({ note: e.currentTarget.value })}
              placeholder="Memo (optional)"
              autosize
              minRows={2}
              maxLength={2000}
            />
            <Text size="xs" c="white" className="opacity-80 mt-1 text-right">
              {(row.note || "").length}/2000
            </Text>
          </div>
        </div>
        );
      }}
    />
  );
};
