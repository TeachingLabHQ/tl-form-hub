import {
  Button,
  Loader,
  MultiSelect,
  Notification,
  Select,
  Text,
  TextInput,
} from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import type { DistrictWithSchools } from "~/domains/coach-log/model";
import { useSession } from "../../auth/hooks/useSession";
import { useCoachOverride } from "../hooks/use-coach-override";
import { CoachNameQuestion } from "../questions/coach-name-question";
import { buildParticipantRosterSubmission } from "./build-submission";
import {
  CONTENT_AREA_OPTIONS,
  GRADE_OPTIONS,
  GROUP_NUMBER_OPTIONS,
  OTHER_OPTION,
  PARTICIPANT_ROLE_OPTIONS,
  SUPPORT_OPTIONS,
} from "./constants";
import {
  useParticipantRosterForm,
  type ParticipantRosterValues,
} from "./hooks/use-participant-roster-form";

type Props = {
  districts: DistrictWithSchools[];
};

/**
 * Participant Roster form — adds one participant to the roster board per submit
 * (replaces the embedded Google Form). District/school come from the same loader
 * reference data as the coach log; the coach is the logged-in user (an
 * allow-listed admin can override it for testing).
 */
export const ParticipantRosterForm = ({ districts }: Props) => {
  const { mondayProfile } = useSession();
  const form = useParticipantRosterForm();
  const {
    canOverride,
    coachOverrideId,
    setCoachOverrideId,
    coachOptions,
    loadingCoachOptions,
    coachMondayId,
  } = useCoachOverride();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState<boolean | null>(null);
  const [showErrorBanner, setShowErrorBanner] = useState(false);
  // Bumped after a successful submit to remount the form. form.reset() clears
  // the values, but a controlled searchable Select keeps its displayed text
  // until the field is remounted — so we key the form on this counter.
  const [resetKey, setResetKey] = useState(0);

  const { district, role, contentAreas } = form.values;

  const districtOptions = useMemo(
    () => districts.map((d) => d.district),
    [districts]
  );
  // A participant belongs to one specific school, so drop the coach-log's
  // "All Schools" aggregate / "N/A" fallback.
  const schoolOptions = useMemo(() => {
    const schools = districts.find((d) => d.district === district)?.schools ?? [];
    return schools.filter((s) => s !== "All Schools" && s !== "N/A");
  }, [districts, district]);

  const handleDistrictChange = (value: string | null) => {
    form.setFieldValue("district", value || "");
    form.setFieldValue("school", "");
  };

  const handleSubmit = async (values: ParticipantRosterValues) => {
    setShowErrorBanner(false);
    try {
      setIsSubmitting(true);
      setIsSuccessful(null);

      const response = await fetch("/api/participant-roster/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildParticipantRosterSubmission(values, {
            coachMondayId,
            responderEmail: mondayProfile?.email ?? "",
          })
        ),
      });

      setIsSuccessful(response.ok);
      if (response.ok) {
        // One participant per submit — reset so the next can be added. Bump the
        // key too, to remount the searchable selects (form.reset() alone leaves
        // their displayed text).
        form.reset();
        setCoachOverrideId("");
        setResetKey((k) => k + 1);
      }
    } catch (e) {
      console.error(e);
      setIsSuccessful(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      key={resetKey}
      onSubmit={form.onSubmit(handleSubmit, () => setShowErrorBanner(true))}
      className="flex flex-col gap-4"
    >
      {canOverride && (
        <CoachNameQuestion
          value={coachOverrideId}
          options={coachOptions.map((c) => ({
            value: c.mondayId,
            label: c.name,
          }))}
          loading={loadingCoachOptions}
          onChange={setCoachOverrideId}
        />
      )}

      <div className="flex flex-col gap-1">
        <h1 className="font-medium text-lg">Participant first name*</h1>
        <TextInput placeholder="First name" {...form.getInputProps("firstName")} />
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="font-medium text-lg">Participant last name*</h1>
        <TextInput placeholder="Last name" {...form.getInputProps("lastName")} />
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="font-medium text-lg">Participant email address*</h1>
        <TextInput
          placeholder="name@example.org"
          {...form.getInputProps("email")}
        />
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="font-medium text-lg">Role of participant*</h1>
        <Select
          placeholder="Select a role"
          data={PARTICIPANT_ROLE_OPTIONS}
          searchable
          {...form.getInputProps("role")}
        />
        {role === OTHER_OPTION && (
          <TextInput
            mt="xs"
            placeholder="Please specify the role"
            {...form.getInputProps("roleOther")}
          />
        )}
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="font-medium text-lg">
          What will supports include for this participant?
        </h1>
        <MultiSelect
          placeholder="Select all that apply"
          data={SUPPORT_OPTIONS}
          {...form.getInputProps("supports")}
        />
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="font-medium text-lg">
          What is the content area of support for this participant?
        </h1>
        <MultiSelect
          placeholder="Select all that apply"
          data={CONTENT_AREA_OPTIONS}
          searchable
          {...form.getInputProps("contentAreas")}
        />
        {contentAreas.includes(OTHER_OPTION) && (
          <TextInput
            mt="xs"
            placeholder="Please specify the content area"
            {...form.getInputProps("contentAreaOther")}
          />
        )}
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="font-medium text-lg">
          What grade(s) does this participant teach or lead?
        </h1>
        <MultiSelect
          placeholder="Select all that apply"
          data={GRADE_OPTIONS}
          {...form.getInputProps("grades")}
        />
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="font-medium text-lg">
          If this participant receives group coaching, select their Group Number.
        </h1>
        <MultiSelect
          placeholder="Select all that apply"
          data={GROUP_NUMBER_OPTIONS}
          {...form.getInputProps("groupNumbers")}
        />
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="font-medium text-lg">Please select your district*</h1>
        <Select
          value={district || null}
          onChange={handleDistrictChange}
          placeholder="Select a district"
          data={districtOptions}
          searchable
          error={form.errors.district}
        />
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="font-medium text-lg">Please select your school*</h1>
        <Select
          // Remount when the district changes so the cleared school value
          // doesn't keep showing the previous district's selection.
          key={`school-${district}`}
          placeholder={district ? "Select a school" : "Select a district first"}
          data={schoolOptions}
          searchable
          disabled={!district}
          {...form.getInputProps("school")}
        />
      </div>

      {!isSubmitting && <Button type="submit">Submit</Button>}
      {isSubmitting && <Loader size={30} color="rgba(255, 255, 255, 1)" />}

      {showErrorBanner && (
        <Notification
          icon={<IconX size={20} />}
          color="red"
          title="Please complete all required fields before submitting."
          withCloseButton={false}
        />
      )}
      {isSuccessful === true && (
        <Notification
          icon={<IconCheck size={20} />}
          color="teal"
          title="Participant added to the roster!"
          withCloseButton={false}
        >
          <Text size="sm">You can add another participant below.</Text>
        </Notification>
      )}
      {isSuccessful === false && (
        <Notification
          icon={<IconX size={20} />}
          color="red"
          title="Something went wrong. Please try again or contact the technology team."
          withCloseButton={false}
        />
      )}
    </form>
  );
};
