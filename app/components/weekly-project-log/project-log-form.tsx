import { Button, Loader, Notification, Textarea } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { IconAlertTriangle, IconCheck, IconX } from "@tabler/icons-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { LoadingSpinner } from "~/utils/LoadingSpinner";
import { useSession } from "../auth/hooks/useSession";
import { ProjectLogsWidget } from "./project-logs-widget";
import { Reminders } from "./reminders";
import {
  getClosestMonday,
  REMINDER_ITEMS,
  setPreAssignedProjectsFromBudgetedHours,
  addSharedOperationsRow,
  type ProjectData,
} from "./utils";
import { ProjectLogRows } from "~/domains/project/model";
import type { SubmittedWeek } from "~/domains/weekly-project-log/model";

// Local-calendar YYYY-MM-DD, matching the Date column the server writes
const toWeekKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const formatWeek = (week: string) =>
  new Date(`${week}T12:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

export type FormValues = {
  email: string;
  date: Date | null;
  comment: string;
};

export type SubmissionUser = {
  name: string;
  email: string;
  employeeId: string;
};


type ProjectLogFormProps = {
  projectData: ProjectData;
};

export const ProjectLogForm: React.FC<ProjectLogFormProps> = ({ projectData }) => {
  const { mondayProfile } = useSession();

  const [isValidated, setIsValidated] = useState<boolean | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState<boolean | null>(null);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);
  const [submittedWeeks, setSubmittedWeeks] = useState<SubmittedWeek[]>([]);
  // A ref, not state, so a double click can't start two submissions before
  // React re-renders with the button disabled
  const isSubmittingRef = useRef(false);
  const [projectWorkEntries, setProjectWorkEntries] = useState<ProjectLogRows[]>([
    {
      projectName: "",
      projectRole: "",
      workHours: "",
      budgetedHours: "N/A",
      activity: "",
    },
  ]);
  const xIcon = <IconX size={20} />;
  const checkIcon = <IconCheck size={20} />;
  const totalWorkHours = useMemo(
    () =>
      projectWorkEntries.reduce(
        (sum, row) => sum + (parseFloat(row.workHours) || 0),
        0
      ),
    [projectWorkEntries]
  );

  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    const today = new Date();
    return getClosestMonday(today, false);
  });

  const handleDateChange = (date: Date | null) => {
    // Clear the last submission's result so it isn't read as this week's
    setIsSuccessful(null);
    setSubmitErrorMessage(null);
    if (!date) {
      setSelectedDate(null);
      return;
    }
    setSelectedDate(getClosestMonday(date, true));
  };

  const [submissionUser, setSubmissionUser] = useState<SubmissionUser>(() => ({
    name: mondayProfile?.name || "",
    email: mondayProfile?.email || "",
    employeeId: mondayProfile?.employeeId || "",
  }));

  // Load the weeks this person already logged so a repeat week is blocked up
  // front. If it fails the form still works; the server rejects duplicates.
  useEffect(() => {
    if (!submissionUser.employeeId) {
      setSubmittedWeeks([]);
      return;
    }
    let isCurrent = true;
    const loadSubmittedWeeks = async () => {
      try {
        const response = await fetch("/api/weekly-project-log/submitted-weeks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeId: submissionUser.employeeId }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          // The submit route still rejects a duplicate week; this only loses
          // the early warning
          console.error(
            `Could not load submitted weeks (${response.status}):`,
            data.error
          );
        }
        if (isCurrent) {
          setSubmittedWeeks(data.submittedWeeks || []);
        }
      } catch (error) {
        console.error("Error loading submitted weeks:", error);
        if (isCurrent) {
          setSubmittedWeeks([]);
        }
      }
    };
    loadSubmittedWeeks();
    return () => {
      isCurrent = false;
    };
  }, [submissionUser.employeeId]);

  const existingLogForWeek = selectedDate
    ? submittedWeeks.find((week) => week.week === toWeekKey(selectedDate))
    : undefined;

  // The signed-in user is always the person the log is for, so the project
  // data the parent route fetched is the only set the form ever shows.
  const currentProjectData = projectData;

  // Pre-fill the rows from the user's budgeted hours once the data arrives
  useEffect(() => {
    if (projectData?.employeeBudgetedHours && projectData.employeeBudgetedHours.length > 0) {
      setPreAssignedProjectsFromBudgetedHours(
        projectData.employeeBudgetedHours,
        setProjectWorkEntries
      );
    }
  }, [projectData]);

  useEffect(() => {
    if (mondayProfile?.email) {
      setSubmissionUser({
        name: mondayProfile.name,
        email: mondayProfile.email,
        employeeId: mondayProfile.employeeId || "",
      });
    }
     // Add Shared Operations row if user is from Shared Operations
     if (mondayProfile?.businessFunction === "Shared Operations") {
      addSharedOperationsRow(setProjectWorkEntries);
    }
  }, [mondayProfile?.email,mondayProfile?.businessFunction]);

  const form = useForm({
    initialValues: {
      date: selectedDate,
      comment: "",
    },
    validate: {
      date: (value) => (value ? null : "date is required"),
    },
  });

  const handleSubmit = async (
    values: typeof form.values,
    event: React.FormEvent<HTMLFormElement> | undefined
  ) => {
    if (!mondayProfile?.name) {
      console.error("Please log in first");
      return;
    }

    // Check if date is selected
    if (!values.date) {
      setIsValidated(false);
      return;
    }

    // Check if all project logs are complete
    const areAllLogsComplete = projectWorkEntries.every(
      (entry) =>
        entry.projectName &&
        entry.projectRole &&
        entry.activity &&
        entry.workHours &&
        Number(entry.workHours) > 0
    );

    if (!areAllLogsComplete) {
      setIsValidated(false);
      return;
    }

    if (isSubmittingRef.current || existingLogForWeek) {
      return;
    }
    isSubmittingRef.current = true;

    try {
      setIsSubmitted(true);
      setIsValidated(true);
      setIsSuccessful(null);
      setSubmitErrorMessage(null);

      const response = await fetch("/api/weekly-project-log/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: submissionUser.name,
          employeeId: submissionUser.employeeId,
          //send the date in iso format to avoid timezone issues in the server
          date: selectedDate
            ? new Date(
                Date.UTC(
                  selectedDate.getFullYear(),
                  selectedDate.getMonth(),
                  selectedDate.getDate(),
                  12,
                  0,
                  0
                )
              ).toISOString()
            : null,
          projectLogEntries: projectWorkEntries,
          comment: values.comment,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error("Form submission went wrong", response.status, result?.error);
        // Already logged: record it so the week shows as submitted
        if (response.status === 409 && result?.existing) {
          setSubmittedWeeks((weeks) => [...weeks, result.existing]);
          setIsSuccessful(null);
        } else {
          setSubmitErrorMessage(result?.error || null);
          setIsSuccessful(false);
        }
        setIsSubmitted(false);
        setIsValidated(null);
        return;
      }

      if (result?.submitted) {
        setSubmittedWeeks((weeks) => [...weeks, result.submitted]);
      }
      setIsSuccessful(true);
      setIsSubmitted(false);
      setIsValidated(null);
      console.log("Form submitted successfully");
    } catch (e) {
      console.error(e);
      setIsSuccessful(false);
      setIsSubmitted(false);
      setIsValidated(null);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="w-full h-full grid grid-cols-12 grid-rows-[auto_auto] gap-8 py-8">
      <div className="row-start-1 col-start-2 col-span-10">
        <Reminders items={REMINDER_ITEMS} />
      </div>

      <div className="row-start-2 col-start-2 col-span-8 h-fit p-8 rounded-[25px] bg-white/30 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)] text-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(form.values, e);
          }}
          className="flex flex-col gap-4"
        >
          <h1 className="font-bold text-3xl">Weekly Project Log Form</h1>
          <div className="flex flex-col gap-1">
            <h1 className="font-medium text-lg">
              Enter the Monday of the week:
            </h1>
            <DateInput
              value={selectedDate}
              placeholder="Date input"
              excludeDate={(date) => date.getDay() !== 1}
              error={
                isValidated === false && !selectedDate
                  ? "Date is required"
                  : null
              }
              onChange={handleDateChange}
            />
          </div>
          <div>
            <ProjectLogsWidget
              isValidated={isValidated}
              projectWorkEntries={projectWorkEntries}
              setProjectWorkEntries={setProjectWorkEntries}
              projectData={currentProjectData}
            />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="font-medium text-lg">
              Do you have any additional comments?
            </h1>
            <Textarea
              placeholder=""
              key={form.key("comment")}
              {...form.getInputProps("comment")}
            />
          </div>
          {existingLogForWeek && isSuccessful !== true && selectedDate && (
            <Notification
              icon={<IconAlertTriangle size={20} />}
              color="yellow"
              title={`A project log for the week of ${formatWeek(existingLogForWeek.week)} has already been submitted (${existingLogForWeek.totalHours} hours).`}
              withCloseButton={false}
            >
              To make changes,{" "}
              <a
                href={`https://teachinglab.monday.com/boards/4284585496/pulses/${existingLogForWeek.itemId}`}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                edit it on Monday
              </a>
              . To log a different week, change the date above.
            </Notification>
          )}
          {/* Stays visible but locked once the selected week has a log;
              picking another week unlocks it */}
          <Button
            type="submit"
            loading={isSubmitted && isValidated === true && isSuccessful === null}
            disabled={Boolean(existingLogForWeek)}
          >
            {existingLogForWeek
              ? isSuccessful === true
                ? "Submitted"
                : "Already submitted"
              : "Submit"}
          </Button>
          {isSuccessful === true && (
            <Notification
              icon={checkIcon}
              color="teal"
              title="Form is submitted successfully!"
              mt="md"
              withCloseButton={false}
            >
              To log another week, change the date above.
            </Notification>
          )}
          {isSuccessful === false && (
            <Notification
              icon={xIcon}
              color="red"
              title={submitErrorMessage || "Something went wrong"}
              withCloseButton={false}
            ></Notification>
          )}
        </form>
      </div>

      <div className="row-start-2 col-start-10 col-span-2 flex flex-col items-center">
        <div className="w-fit py-5 px-10 rounded-[25px] bg-white/30 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)] text-white flex flex-col items-center gap-3">
          <h3 className="text-xl font-bold">Total Time</h3>
          <h1 className="text-xl font-bold">{totalWorkHours}</h1>
        </div>
      </div>
    </div>
  );
};
