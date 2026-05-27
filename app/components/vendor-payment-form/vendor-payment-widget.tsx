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
  presentationDesignTaskOptions,
  TaskDetails,
} from "./utils";

type VendorPaymentRow = {
  task: string;
  project: string;
  workHours: string;
  note: string;
};

type taskOptions = {
  taskName: string;
  rate: number;
  maxHours: number | null;
};

const EMPTY_ROW: VendorPaymentRow = {
  task: "",
  project: "",
  workHours: "",
  note: "",
};

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
    let availableTasks: taskOptions[] = [];
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
            });
          }
        });
      }
    }
    return availableTasks;
  };

  const calculateTaskTotalPay = (task: string, workHours: string): number => {
    if (!task || !workHours) {
      return 0;
    }
    try {
      const taskData = JSON.parse(task);
      const hours = parseFloat(workHours) || 0;
      let rate = taskData.rate || 0;
      return rate * hours;
    } catch (error) {
      console.error("Error calculating total pay:", error);
      return 0;
    }
  };

  const listOfAvailableTasks = getAvailableTasks() || [];

  const gridClass = (canDelete: boolean) =>
    cn("grid gap-4 grid-cols-[2fr_2fr_1fr_1fr_1fr]", {
      "grid-cols-[2fr_2fr_1fr_1fr_1fr_0.5fr]": canDelete,
    });

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
      renderRow={(row, _index, { canDelete, updateRow, deleteRow }) => (
        <div className="flex flex-col gap-2">
          <div className={gridClass(canDelete)}>
            <Select
              value={row.task || null}
              onChange={(value) => updateRow({ task: value || "" })}
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
              max={JSON.parse(row.task || "{}").maxHours || undefined}
              min={0}
              error={
                isValidated === false &&
                (!row.workHours || Number(row.workHours) === 0)
                  ? "Work Hours are required"
                  : null
              }
            />
            <TextInput
              value={
                row.task ? `$${JSON.parse(row.task).rate.toFixed(2)}` : "$0.00"
              }
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
      )}
    />
  );
};
