import { Button, Loader, Select, Text } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { cn } from "~/utils/utils";
import { DURATION_OPTIONS, ROLE_OPTIONS, YES_NO_OPTIONS } from "../constants";
import { EMPTY_COACHEE_ROW, type CoachLogForm } from "../hooks/use-coach-log-form";

function gridClass(canDelete: boolean) {
  return cn("grid gap-4 grid-cols-[2fr_1.5fr_1fr]", {
    "grid-cols-[2fr_1.5fr_1fr_0.5fr]": canDelete,
  });
}

type Props = {
  form: CoachLogForm;
  coacheeOptions: string[];
  loadingCoachees: boolean;
};

export const OneOnOneCoachingQuestion = ({
  form,
  coacheeOptions,
  loadingCoachees,
}: Props) => {
  const rows = form.values.coacheeRows;
  const canDelete = rows.length > 1;

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="font-medium text-lg">
          Did you complete 1:1 coaching today?*
        </h1>
        <Select
          placeholder="Select Yes or No"
          data={YES_NO_OPTIONS}
          {...form.getInputProps("did1on1")}
          // Coerce "" -> null so a programmatic reset (e.g. PL session) clears
          // the displayed selection (Mantine only clears on null).
          value={form.values.did1on1 || null}
        />
      </div>

      {form.values.did1on1 === "Yes" && (
        <div className="flex flex-col gap-2">
          {loadingCoachees && (
            <div className="flex items-center gap-2">
              <Loader size="sm" />
              <Text size="sm">Loading coachee names...</Text>
            </div>
          )}

          <div className={gridClass(canDelete)}>
            <Text fw={500} size="md">
              Coachee
            </Text>
            <Text fw={500} size="md">
              Role
            </Text>
            <Text fw={500} size="md">
              Duration (mins)
            </Text>
          </div>

          {rows.map((_row, index) => (
            <div className={gridClass(canDelete)} key={form.key(`coacheeRows.${index}`)}>
              <Select
                placeholder="Select a coachee"
                data={coacheeOptions}
                searchable
                {...form.getInputProps(`coacheeRows.${index}.coacheeName`)}
              />
              <Select
                placeholder="Select a role"
                data={ROLE_OPTIONS}
                {...form.getInputProps(`coacheeRows.${index}.role`)}
              />
              <Select
                placeholder="Select duration"
                data={DURATION_OPTIONS}
                searchable
                {...form.getInputProps(`coacheeRows.${index}.durationMins`)}
              />
              {canDelete && (
                <Button
                  color="red"
                  size="xs"
                  onClick={() => form.removeListItem("coacheeRows", index)}
                >
                  <IconX size={20} />
                </Button>
              )}
            </div>
          ))}

          <Button
            onClick={() =>
              form.insertListItem("coacheeRows", { ...EMPTY_COACHEE_ROW })
            }
          >
            Add another coachee
          </Button>
        </div>
      )}
    </>
  );
};
