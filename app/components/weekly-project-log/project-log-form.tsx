import { Button, Loader, Notification, Textarea } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { IconCheck, IconX } from "@tabler/icons-react";
import React, { useEffect, useState } from "react";
import { useSession } from "../hooks/useSession";
import { ExecutiveAssistantSelector } from "./executive-assistant-selector";
import { ProjectLogsWidget } from "./project-logs-widget";
import { Reminders } from "./reminders";
import { executiveAssistantMappings, getClosestMonday } from "./utils";

export type FormValues = {
  email: string;
  date: Date | null;
  comment: string;
};

export type SubmissionUser = {
  name: string;
  email: string;
  isExecutiveAssistant: boolean;
  submittedForYourself: boolean | null;
  executiveDetails?: {
    name: string;
    email: string;
  };
};

export const ProjectLogForm = () => {
  const { session, setSession, isAuthenticated } = useSession();
  const [totalWorkHours, setTotalWorkHours] = useState<number>(0);
  const [isValidated, setIsValidated] = useState<boolean | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState<boolean | null>(null);
  const [projectWorkEntries, setProjectWorkEntries] = useState([
    {
      projectType: "",
      projectName: "",
      projectRole: "",
      workHours: "",
      budgetedHours: "N/A",
    },
  ]);
  const xIcon = <IconX size={20} />;
  const checkIcon = <IconCheck size={20} />;

  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    const today = new Date();
    return getClosestMonday(today, false);
  });

  const handleDateChange = (date: Date | null) => {
    if (!date) {
      setSelectedDate(null);
      return;
    }
    setSelectedDate(getClosestMonday(date, true));
  };

  const [submissionUser, setSubmissionUser] = useState<SubmissionUser>(() => ({
    name: session?.name || "",
    email: session?.email || "",
    isExecutiveAssistant: false,
    submittedForYourself: null,
  }));

  useEffect(() => {
    if (session?.email) {
      const isEA = executiveAssistantMappings.some(
        (mapping) => mapping.executiveAssistantEmail === session.email
      );
      setSubmissionUser({
        name: session.name,
        email: session.email,
        isExecutiveAssistant: isEA,
        submittedForYourself: true,
      });
    }
  }, [session?.email]);

  const handleExecutiveSelection = (executiveName: string | null) => {
    if (!executiveName) {
      setSubmissionUser({
        name: session?.name || "",
        email: session?.email || "",
        isExecutiveAssistant: true,
        submittedForYourself: true,
      });
      return;
    }

    const mapping = executiveAssistantMappings.find(
      (m) => m.executiveName === executiveName
    );
    if (mapping) {
      setSubmissionUser({
        name: mapping.executiveName,
        email: mapping.executiveEmail,
        isExecutiveAssistant: true,
        submittedForYourself: false,
        executiveDetails: {
          name: mapping.executiveName,
          email: mapping.executiveEmail,
        },
      });
    }
  };

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
    if (!session?.name) {
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
        entry.projectType &&
        entry.projectName &&
        entry.projectRole &&
        entry.workHours &&
        Number(entry.workHours) !== 0
    );

    if (!areAllLogsComplete) {
      setIsValidated(false);
      return;
    }

    try {
      setIsSubmitted(true);
      setIsValidated(true);
      setIsSuccessful(null);
      const response = await fetch("/api/weekly-project-log/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: submissionUser.name,
          date: selectedDate,
          projectLogEntries: projectWorkEntries,
          comment: values.comment,
        }),
      });

      if (!response.ok) {
        console.log("Form submission went wrong");
        setIsSuccessful(false);
        setIsSubmitted(false);
        setIsValidated(null);
        return;
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
    }
  };

  return (
    <div className="w-full h-full grid grid-cols-12 grid-rows-[auto_auto] gap-8 py-8">
      <div className="row-start-1 col-start-2 col-span-10">
        <Reminders />
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
          {submissionUser.isExecutiveAssistant && (
            <ExecutiveAssistantSelector
              executiveAssistantMappings={executiveAssistantMappings}
              userEmail={session?.email || ""}
              onSelectExecutive={handleExecutiveSelection}
              isValidated={isValidated}
              submittedForYourself={submissionUser.submittedForYourself}
            />
          )}
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
              setTotalWorkHours={setTotalWorkHours}
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
          {(isSubmitted === false || isSuccessful !== null) && (
            <Button type="submit">Submit</Button>
          )}
          {isSubmitted && isValidated && isSuccessful === null && (
            <Loader size={30} color="rgba(255, 255, 255, 1)" />
          )}
          {isSuccessful === true && (
            <Notification
              icon={checkIcon}
              color="teal"
              title="Form is submitted successfully!"
              mt="md"
            ></Notification>
          )}
          {isSuccessful === false && (
            <Notification
              icon={xIcon}
              color="red"
              title="Something went wrong"
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
