import { Badge, Button, Chip, Group, MultiSelect, Select, Textarea } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import {
  type Season,
  type TravelReach,
  applyTravelReach,
  monthsFor,
  profileAgeDays,
  SEASON_LABELS,
  seasonOf,
  STALE_PROFILE_DAYS,
  TRAVEL_REACH_LABELS,
  travelReach,
} from "~/domains/contractor-availability/availability";
import {
  type AvailabilityProfile,
  type Contractor,
  type Weekday,
  LONGEST_TRIP_OPTIONS,
  MONTH_LABELS,
  OUTSIDE_WORK_OPTIONS,
  REGIONS,
  STATES,
  SUPPORT_OPTIONS,
  WEEKDAYS,
} from "~/domains/contractor-availability/model";
import { FIELD_CLASSES } from "./constants";
import { Panel } from "./panel";

const DAYS_PER_WEEK = [
  { value: "1", label: "1 day/week" },
  { value: "2", label: "2 days/week" },
  { value: "3", label: "3 days/week" },
  { value: "4", label: "4+ days/week" },
];

const options = (record: Record<string, string>) =>
  Object.entries(record).map(([value, label]) => ({ value, label }));

const ago = (days: number) =>
  days === 0 ? "today" : days < 14 ? `${days} days ago` : `${Math.round(days / 7)} wks ago`;

export const ProfileAgeBadge = ({ profile }: { profile: AvailabilityProfile }) => {
  const age = profileAgeDays(profile);
  if (age === null) return <Badge tt="none" color="yellow.4" autoContrast>Not confirmed yet</Badge>;
  return (
    <Badge tt="none" color={age > STALE_PROFILE_DAYS ? "red.8" : "teal.9"}>
      Updated {ago(age)}
    </Badge>
  );
};

type Props = {
  contractor: Contractor;
  onSave: (profile: AvailabilityProfile) => Promise<string | null>;
};

/** General Availability Profile (GAP): standing travel, workload and schedule preferences. */
export const ProfileForm = ({ contractor, onSave }: Props) => {
  const form = useForm<AvailabilityProfile>({
    mode: "controlled",
    initialValues: contractor.profile,
  });
  // Kept apart from months so "Specific months" stays picked while empty
  const [season, setSeason] = useState<Season>(() => seasonOf(contractor.profile.months));
  const [saving, setSaving] = useState<"save" | "confirm" | null>(null);
  const values = form.values;
  const reach = travelReach(values);
  const travels = reach === "any" || reach === "regional";

  const save = async (profile: AvailabilityProfile, kind: "save" | "confirm") => {
    setSaving(kind);
    const error = await onSave(profile);
    setSaving(null);
    if (error) {
      notifications.show({ color: "red", title: "Couldn't save your profile", message: error });
      return;
    }
    form.resetDirty();
    notifications.show({
      color: "teal",
      title: kind === "confirm" ? "Profile confirmed" : "Profile saved",
      message: "Staffing sees your availability now.",
    });
  };

  const home = [contractor.city, STATES[contractor.state]?.name].filter(Boolean).join(", ");

  return (
    <Panel title="General Availability Profile (GAP)" meta={<ProfileAgeBadge profile={contractor.profile} />}>
      <form
        onSubmit={form.onSubmit((v) =>
          save(travels ? v : { ...v, longestTrip: "Day trips only" }, "save")
        )}
        className="flex flex-col gap-4"
      >
        {contractor.profileSource === "intake" && (
          <p className="text-sm rounded-lg bg-white/20 px-3 py-2">
            We started this from your onboarding answers. Check it, fill in the gaps, and save.
          </p>
        )}

        {home && (
          <p className="text-xs text-white/90 -mt-1">Home base: {home} (from your contractor record)</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
          <Select
            label="Travel preference"
            classNames={FIELD_CLASSES}
            data={options(TRAVEL_REACH_LABELS)}
            value={reach}
            allowDeselect={false}
            onChange={(v) => v && form.setValues(applyTravelReach(values, v as TravelReach))}
          />
          <Select
            label="Max trip length"
            classNames={FIELD_CLASSES}
            data={LONGEST_TRIP_OPTIONS}
            placeholder="Select one"
            disabled={!travels}
            {...form.getInputProps("longestTrip")}
            value={travels ? values.longestTrip || null : "Day trips only"}
          />
          {reach === "regional" && (
            <MultiSelect
              className="sm:col-span-2"
              label="Regions you'll travel to"
              classNames={FIELD_CLASSES}
              data={REGIONS.filter((r) => r !== "Anywhere")}
              placeholder={values.regions.length ? undefined : "Pick regions"}
              value={values.regions}
              onChange={(v) => form.setFieldValue("regions", v)}
            />
          )}
          <Select
            label="Days per week available"
            classNames={FIELD_CLASSES}
            data={DAYS_PER_WEEK}
            placeholder="Select one"
            value={values.daysPerWeek ? String(Math.min(Math.round(values.daysPerWeek), 4)) : null}
            onChange={(v) => form.setFieldValue("daysPerWeek", Number(v) || 0)}
          />
          <Select
            label="Outside workload"
            classNames={FIELD_CLASSES}
            data={OUTSIDE_WORK_OPTIONS}
            placeholder="Select one"
            {...form.getInputProps("outsideWork")}
            value={values.outsideWork || null}
          />
          <Select
            label="Times of year available"
            classNames={FIELD_CLASSES}
            data={options(SEASON_LABELS)}
            value={season}
            allowDeselect={false}
            onChange={(v) => {
              if (!v) return;
              setSeason(v as Season);
              form.setFieldValue("months", monthsFor(v as Season, values.months));
            }}
          />
          <MultiSelect
            label="Preferred project types"
            classNames={FIELD_CLASSES}
            data={SUPPORT_OPTIONS}
            placeholder={values.support.length ? undefined : "Pick any"}
            value={values.support}
            onChange={(v) => form.setFieldValue("support", v)}
          />
          {season === "custom" && (
            <MultiSelect
              className="sm:col-span-2"
              label="Months you're available"
              classNames={FIELD_CLASSES}
              data={MONTH_LABELS.map((m, i) => ({ value: String(i), label: m }))}
              value={values.months.map(String)}
              onChange={(v) =>
                form.setFieldValue("months", v.map(Number).sort((a, b) => a - b))
              }
            />
          )}
          <div className="sm:col-span-2">
            <p className={FIELD_CLASSES.label}>
              Days you usually work <span className="font-normal text-white/90">(none picked = any weekday)</span>
            </p>
            <Chip.Group
              multiple
              value={values.weekdays}
              onChange={(v) => form.setFieldValue("weekdays", v as Weekday[])}
            >
              <Group gap={6}>
                {WEEKDAYS.map((d) => (
                  <Chip key={d} value={d} size="xs" color="blue" variant="filled">
                    {d}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
          </div>
        </div>

        <Textarea
          label="Conflicts of interest"
          classNames={FIELD_CLASSES}
          autosize
          minRows={1}
          placeholder="Districts, networks or organizations you work for outside Teaching Lab"
          {...form.getInputProps("conflicts")}
        />
        <Textarea
          label="Notes"
          classNames={FIELD_CLASSES}
          autosize
          minRows={2}
          placeholder="Anything else we should know?"
          {...form.getInputProps("notes")}
        />

        <div className="flex flex-col gap-2">
          <Button type="submit" fullWidth loading={saving === "save"} disabled={saving === "confirm"}>
            Save changes
          </Button>
          {!form.isDirty() && contractor.profileSource === "saved" && (
            <Button
              variant="subtle"
              color="white"
              size="compact-sm"
              loading={saving === "confirm"}
              onClick={() => save(contractor.profile, "confirm")}
            >
              Nothing changed? Confirm it's still accurate
            </Button>
          )}
        </div>
      </form>
    </Panel>
  );
};
