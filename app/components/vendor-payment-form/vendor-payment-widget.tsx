import { Button, Select, Text, TextInput, NumberInput } from "@mantine/core";
import { useEffect, useState } from "react";
import { cn } from "../../utils/utils";
import { IconX } from "@tabler/icons-react";
import { contentDeveloperTaskOptions, copyEditorTaskOptions, copyRightPermissionsTaskOptions, dataEvaluationTaskOptions, facilitationTaskOptions, presentationDesignTaskOptions, TaskDetails, Tier, filterVendorPaymentProjects } from "./utils";

type VendorPaymentRowKeys = keyof {
  task: string;
  project: string;
  workHours: string;
};

type taskOptions = {
  taskName: string;
  rate: number;
  maxHours: number | null;
}

export const VendorPaymentWidget = ({
  isValidated,
  vendorPaymentEntries,
  setVendorPaymentEntries,
  setTotalWorkHours,
  cfTier,
  projects,
}: {
  isValidated: boolean | null;
  vendorPaymentEntries: {
    task: string;
    project: string;
    workHours: string;
  }[];
  setVendorPaymentEntries: React.Dispatch<
    React.SetStateAction<
      {
        task: string;
        project: string;
        workHours: string;
      }[]
    >
  >;
  setTotalWorkHours: React.Dispatch<React.SetStateAction<number>>;
  cfTier: {
    type: string;
    value: string;
  }[];
  projects: string[] | undefined;
}) => {
  const programProjects = new Set(projects || []);
  const filteredProjects = filterVendorPaymentProjects(Array.from(programProjects));
  
  const projectOptions = filteredProjects.map((project) => ({
    value: project,
    label: project,
  }));

  

  // Filter tasks based on tier and rate availability
  const getAvailableTasks = () => {
    let availableTasks: taskOptions[] = [];
    if(cfTier.length === 0){
     return availableTasks;
    }
    
    for(const tier of cfTier){
      if(tier.type === "facilitator"){
        //add all tasks that has a not null and greater than 0 rate
        facilitationTaskOptions.forEach((task) => {
          const rateValue = task[tier.value as keyof TaskDetails];
          if(rateValue !== null && typeof rateValue === 'number' && rateValue > 0){
            availableTasks.push({
              taskName: task.taskName,
              rate: rateValue,
              maxHours: task.maxHours?.[tier.value as "Tier 1" | "Tier 2" | "Tier 3"] || null,
            });
          }
        });
      }
      else if(tier.type === "copyRightPermissions"){
        copyRightPermissionsTaskOptions.forEach((task: TaskDetails) => {
          const rateValue = task[tier.value as keyof TaskDetails];
          if(rateValue !== null && typeof rateValue === 'number' && rateValue > 0){
            availableTasks.push({
              taskName: task.taskName,
              rate: rateValue,
              maxHours: task.maxHours?.[tier.value as "Tier 1" | "Tier 2" | "Tier 3"] || null,
            });
          }
        });
      }
      else if(tier.type === "copyEditor"){
        copyEditorTaskOptions.forEach((task) => {
          const rateValue = task[tier.value as keyof TaskDetails];
          if(rateValue !== null && typeof rateValue === 'number' && rateValue > 0){
            availableTasks.push({
              taskName: task.taskName,
              rate: rateValue,
              maxHours: task.maxHours?.[tier.value as "Tier 1" | "Tier 2" | "Tier 3"] || null,
            });
          }
        });
      }
      else if(tier.type === "presentationDesign"){
        presentationDesignTaskOptions.forEach((task) => { 
          const rateValue = task[tier.value as keyof TaskDetails];
          if(rateValue !== null && typeof rateValue === 'number' && rateValue > 0){
            availableTasks.push({
              taskName: task.taskName,
              rate: rateValue,
              maxHours: task.maxHours?.[tier.value as "Tier 1" | "Tier 2" | "Tier 3"] || null,
            }); 
          }
        });
      }
      else if(tier.type === "contentDeveloper"){
        contentDeveloperTaskOptions.forEach((task) => {
          const rateValue = task[tier.value as keyof TaskDetails];
          if(rateValue !== null && typeof rateValue === 'number' && rateValue > 0){
            availableTasks.push({
              taskName: task.taskName,
              rate: rateValue,
              maxHours: task.maxHours?.[tier.value as "Tier 1" | "Tier 2" | "Tier 3"] || null,
            });
          } 
        });
      }
      else if(tier.type === "dataEvaluation"){
        dataEvaluationTaskOptions.forEach((task) => {
          const rateValue = task[tier.value as keyof TaskDetails];
          if(rateValue !== null && typeof rateValue === 'number' && rateValue > 0){
            availableTasks.push({
              taskName: task.taskName,
              rate: rateValue,
              maxHours: task.maxHours?.[tier.value as "Tier 1" | "Tier 2" | "Tier 3"] || null,
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

      // Get rate based on tier
      let rate = taskData.rate || 0;
      return rate * hours;
    } catch (error) {
      console.error("Error calculating total pay:", error);
      return 0;
    }
  };

  const handleAddRow = () => {
    setVendorPaymentEntries([
      ...vendorPaymentEntries,
      {
        task: "",
        project: "",
        workHours: "",
      },
    ]);
  };

  const handleChange = (
    index: number,
    field: VendorPaymentRowKeys,
    value: string | null
  ) => {
    setVendorPaymentEntries((prevEntries) => {
      const updatedRows = prevEntries.map((entry, i) => {
        if (i === index) {
          return {
            ...entry,
            [field]: value || "",
          };
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
    const updatedRows = vendorPaymentEntries.filter((_, i) => i !== index);
    setVendorPaymentEntries(updatedRows);
    updateTotalWorkHours(updatedRows, setTotalWorkHours);
  };

  const updateTotalWorkHours = (
    rows: { workHours: string }[],
    setTotalWorkHours: React.Dispatch<React.SetStateAction<number>>
  ) => {
    const total = rows.reduce((sum, row) => {
      const hours = parseFloat(row.workHours) || 0;
      return sum + hours;
    }, 0);
    setTotalWorkHours(total);
  };

  // Get available tasks for the current tier
  const listOfAvailableTasks = getAvailableTasks() || [];

  return (
    <div className="grid grid-rows gap-4">
      <div
        className={cn("grid gap-4 grid-cols-[2fr_2fr_1fr_1fr_1fr]", {
          "grid-cols-[2fr_2fr_1fr_1fr_1fr_0.5fr]": vendorPaymentEntries.length > 1,
        })}
      >
        <div className="">
          <Text fw={500} size="md">
            Task
          </Text>
        </div>
        <div className="">
          <Text fw={500} size="md">
            Project
          </Text>
        </div>
        <div className="">
          <Text fw={500} size="md">
            Work Hours
          </Text>
        </div>
        <div className="">
          <Text fw={500} size="md">
            Rate
          </Text>
        </div>
        <div className="">
          <Text fw={500} size="md">
            Total Pay
          </Text>
        </div>
      </div>
      {/* Dynamic rows */}
      {vendorPaymentEntries.map((row, index) => (
        <div
          key={index}
          className={cn("grid gap-4 grid-cols-[2fr_2fr_1fr_1fr_1fr]", {
            "grid-cols-[2fr_2fr_1fr_1fr_1fr_0.5fr]":
              vendorPaymentEntries.length > 1,
          })}
        >
          <div>
            <Select
              value={row.task || null}
              onChange={(value) => handleChange(index, "task", value)}
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
          </div>
          <div>
            <Select
              value={row.project || null}
              onChange={(value) => handleChange(index, "project", value)}
              placeholder="Select a project"
              data={projectOptions}
              searchable
              error={
                isValidated === false && !row.project
                  ? "Project is required"
                  : null
              }
            />
          </div>
          <div>
            <NumberInput
              value={parseFloat(row.workHours) || 0}
              onChange={(value) =>
                handleChange(index, "workHours", value?.toString() || "")
              }
              placeholder="Enter work hours"
              max={
                JSON.parse(row.task || "{}").maxHours || undefined
              }
              min={0}
              error={
                isValidated === false &&
                (!row.workHours || Number(row.workHours) === 0)
                  ? "Work Hours are required"
                  : null
              }
            />
          </div>
          <div>
            <TextInput
              value={row.task ? `$${JSON.parse(row.task).rate.toFixed(2)}` : "$0.00"}
              readOnly
              placeholder="Rate"
            />
          </div>
          <div>
            <TextInput
              value={`$${calculateTaskTotalPay(
                row.task || "",
                row.workHours || ""
              ).toFixed(2)}`}
              readOnly
              placeholder="Total pay"
            />
          </div>
          {vendorPaymentEntries.length > 1 && (
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
