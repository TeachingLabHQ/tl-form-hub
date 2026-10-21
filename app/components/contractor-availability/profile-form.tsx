import {
  Badge,
  Button,
  Chip,
  Group,
  NumberInput,
  Select,
  Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import {
  profileAgeDays,
  STALE_PROFILE_DAYS,
} from "~/domains/contractor-availability/availability";
import {
  type AvailabilityProfile,
  type Contractor,
  type TravelFormat,
  type Weekday,
  LONGEST_TRIP_OPTIONS,
  MONTH_LABELS,
  OUTSIDE_WORK_OPTIONS,
  REGIONS,
  STATES,
  SUPPORT_OPTIONS,
  TRAVEL_FORMATS,
  WEEKDAYS,
} from "~/domains/contractor-availability/model";
import { PANEL } from "./constants";

type FormValues = Omit<AvailabilityProfile, "months" | "confirmedOn"> & {
  // Chip values are strings
  months: string[];
};

const toFormValues = (p: AvailabilityProfile): FormValues => ({
  ...p,
  months: p.months.map(String),
});

const toProfile = (v: FormValues, confirmedOn: string | null): AvailabilityProfile => ({
  ...v,
  outsideHours: Number(v.outsideHours) || 0,
  daysPerWeek: Number(v.daysPerWeek) || 0,
  maxDaysPerMonth: Number(v.maxDaysPerMonth) || 0,
  months: v.months.map(Number).sort((a, b) => a - b),
  confirmedOn,
});

const Question = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-2">
    <h1 className="font-medium text-lg">{label}</h1>
    {children}
  </div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-sm font-semibold uppercase tracking-wider text-white/80 pt-2 border-t border-white/30 first:border-0 first:pt-0">
    {children}
  </h2>
);

export const ProfileAgeBadge = ({ profile }: { profile: AvailabilityProfile }) => {
  const age = profileAgeDays(profile);
  if (age === null) return <Badge color="yellow">Not confirmed yet</Badge>;
  if (age > STALE_PROFILE_DAYS) return <Badge color="red">Confirmed {age} days ago</Badge>;
  return <Badge color="teal">Confirmed {age === 0 ? "today" : `${age} days ago`}</Badge>;
};

type Props = {
  contractor: Contractor;
  onSave: (profile: AvailabilityProfile) => Promise<string | null>;
};

/** General Availability Profile: standing travel, workload and schedule preferences. */
export const ProfileForm = ({ contractor, onSave }: Props) => {
  const form = useForm<FormValues>({
    mode: "controlled",
    initialValues: toFormValues(contractor.profile),
  });
  const [saving, setSaving] = useState<"save" | "confirm" | null>(null);

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
    <form
      onSubmit={form.onSubmit((v) => save(toProfile(v, null), "save"))}
      className={`${PANEL} flex flex-col gap-5`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">General Availability Profile</h2>
          <p className="text-sm text-white/80">
            Your standing preferences. We ask you to confirm them every {STALE_PROFILE_DAYS} days.
          </p>
        </div>
        <ProfileAgeBadge profile={contractor.profile} />
      </div>
      {contractor.profileSource === "intake" && (
        <p className="text-sm rounded-lg bg-white/20 px-3 py-2">
          We filled this in from your onboarding answers. Check it, add what's missing, and save.
        </p>
      )}

      <SectionTitle>Travel</SectionTitle>
      <Question label="What formats will you take?">
        <Chip.Group
          multiple
          value={form.values.formats}
          onChange={(v) => form.setFieldValue("formats", v as TravelFormat[])}
        >
          <Group gap="xs">
            {TRAVEL_FORMATS.map((f) => (
              <Chip key={f.value} value={f.value}>
                {f.label}
              </Chip>
            ))}
          </Group>
        </Chip.Group>
      </Question>
      <Question label="Where will you travel for in-person work?">
        <Chip.Group
          multiple
          value={form.values.regions}
          onChange={(v) => form.setFieldValue("regions", v)}
        >
          <Group gap="xs">
            {REGIONS.map((r) => (
              <Chip key={r} value={r}>
                {r}
              </Chip>
            ))}
          </Group>
        </Chip.Group>
      </Question>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Question label="Longest trip you'll take">
          <Select
            data={LONGEST_TRIP_OPTIONS}
            placeholder="Select one"
            {...form.getInputProps("longestTrip")}
          />
        </Question>
        <Question label="Home base">
          <p className="text-sm text-white/90 py-2">
            {home || "Not on file"}{" "}
            <span className="text-white/70">(from your contractor record)</span>
          </p>
        </Question>
      </div>

      <SectionTitle>Outside workload</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Question label="Other work">
          <Select
            data={OUTSIDE_WORK_OPTIONS}
            placeholder="Select one"
            {...form.getInputProps("outsideWork")}
          />
        </Question>
        <Question label="Hours per week committed elsewhere">
          <NumberInput min={0} max={80} {...form.getInputProps("outsideHours")} />
        </Question>
      </div>
      <Question label="Conflicts of interest">
        <Textarea
          autosize
          minRows={2}
          placeholder="Districts, networks or organizations you work for outside Teaching Lab"
          {...form.getInputProps("conflicts")}
        />
      </Question>

      <SectionTitle>Work preferences</SectionTitle>
      <Question label="What can you support?">
        <Chip.Group
          multiple
          value={form.values.support}
          onChange={(v) => form.setFieldValue("support", v)}
        >
          <Group gap="xs">
            {SUPPORT_OPTIONS.map((s) => (
              <Chip key={s} value={s}>
                {s}
              </Chip>
            ))}
          </Group>
        </Chip.Group>
      </Question>
      <Question label="Days you usually work">
        <Chip.Group
          multiple
          value={form.values.weekdays}
          onChange={(v) => form.setFieldValue("weekdays", v as Weekday[])}
        >
          <Group gap="xs">
            {WEEKDAYS.map((d) => (
              <Chip key={d} value={d}>
                {d}
              </Chip>
            ))}
          </Group>
        </Chip.Group>
      </Question>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Question label="Target days per week">
          <NumberInput min={0} max={5} step={0.5} {...form.getInputProps("daysPerWeek")} />
        </Question>
        <Question label="Most days in a month">
          <NumberInput min={0} max={23} {...form.getInputProps("maxDaysPerMonth")} />
        </Question>
      </div>
      <Question label="Months you're available (leave blank for year-round)">
        <Chip.Group
          multiple
          value={form.values.months}
          onChange={(v) => form.setFieldValue("months", v)}
        >
          <Group gap="xs">
            {MONTH_LABELS.map((m, i) => (
              <Chip key={m} value={String(i)} size="sm">
                {m}
              </Chip>
            ))}
          </Group>
        </Chip.Group>
      </Question>
      <Question label="Anything else staffing should know?">
        <Textarea autosize minRows={2} {...form.getInputProps("notes")} />
      </Question>

      <Group>
        <Button type="submit" loading={saving === "save"} disabled={saving === "confirm"}>
          Save profile
        </Button>
        <Button
          variant="white"
          loading={saving === "confirm"}
          disabled={saving === "save" || form.isDirty()}
          onClick={() => save(contractor.profile, "confirm")}
          title={form.isDirty() ? "Save your changes instead" : undefined}
        >
          Still accurate, confirm
        </Button>
      </Group>
    </form>
  );
};
