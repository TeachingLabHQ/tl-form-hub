import { MultiSelect, Select, Textarea } from "@mantine/core";
import { DURATION_OPTIONS, ROLE_OPTIONS, YES_NO_OPTIONS } from "../constants";
import type { CoachLogForm } from "../hooks/use-coach-log-form";

type Props = {
  form: CoachLogForm;
  coacheeOptions: string[];
};

export const GroupCoachingQuestion = ({ form, coacheeOptions }: Props) => {
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="font-medium text-lg">
          Did you complete group coaching today?*
        </h1>
        <Select
          placeholder="Select Yes or No"
          data={YES_NO_OPTIONS}
          {...form.getInputProps("didGroupCoaching")}
          // Coerce "" -> null so a programmatic reset (e.g. PL session) clears
          // the displayed selection (Mantine only clears on null).
          value={form.values.didGroupCoaching || null}
        />
      </div>

      {form.values.didGroupCoaching === "Yes" && (
        <>
          <div className="flex flex-col gap-1">
            <h1 className="font-medium text-lg">Names of participants*</h1>
            <MultiSelect
              placeholder="Select participants"
              data={coacheeOptions}
              searchable
              {...form.getInputProps("groupParticipants")}
            />
          </div>

          <div className="flex flex-col gap-1">
            <h1 className="font-medium text-lg">Participants were:*</h1>
            <Select
              placeholder="Select a role"
              data={ROLE_OPTIONS}
              {...form.getInputProps("groupParticipantRole")}
            />
          </div>

          <div className="flex flex-col gap-1">
            <h1 className="font-medium text-lg">Topic of session:*</h1>
            <Textarea
              placeholder="Describe the topic of the session"
              {...form.getInputProps("groupTopic")}
            />
          </div>

          <div className="flex flex-col gap-1">
            <h1 className="font-medium text-lg">Duration (mins):*</h1>
            <Select
              placeholder="Select duration"
              data={DURATION_OPTIONS}
              searchable
              {...form.getInputProps("groupDurationMins")}
            />
          </div>
        </>
      )}
    </>
  );
};
