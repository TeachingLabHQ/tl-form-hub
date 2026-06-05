import { Button, Loader, Notification } from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import type { DistrictWithSchools } from "~/domains/coach-log/model";
import { useSession } from "../auth/hooks/useSession";
import { isNycCoachTypeDistrict, shouldShowSubSchool } from "./constants";
import { CancellationQuestion } from "./questions/cancellation-question";
import { DistrictSchoolQuestion } from "./questions/district-school-question";
import { GroupCoachingQuestion } from "./questions/group-coaching-question";
import { NycCoachTypeQuestion } from "./questions/nyc-coach-type-question";
import { OneOnOneCoachingQuestion } from "./questions/one-on-one-coaching-question";
import { SessionDateQuestion } from "./questions/session-date-question";
import { SubSchoolQuestion } from "./questions/sub-school-question";
import {
  EMPTY_COACHEE_ROW,
  useCoachLogForm,
  type CoachLogValues,
} from "./use-coach-log-form";

type Props = {
  districts: DistrictWithSchools[];
};

export const CoachLogForm = ({ districts }: Props) => {
  const { mondayProfile } = useSession();
  const form = useCoachLogForm();

  // Reference data (not form state) — coachees depend on district + school.
  const [coacheeOptions, setCoacheeOptions] = useState<string[]>([]);
  const [loadingCoachees, setLoadingCoachees] = useState(false);

  // Submission status.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState<boolean | null>(null);
  const [showErrorBanner, setShowErrorBanner] = useState(false);

  const { district, school, nycCoachType, canceled } = form.values;
  const showNycCoachType = isNycCoachTypeDistrict(district);
  const showSubSchool = shouldShowSubSchool(district, nycCoachType);
  const showActivities = canceled !== "Yes";

  const resetCoacheeSelections = () => {
    form.setFieldValue("coacheeRows", [{ ...EMPTY_COACHEE_ROW }]);
    form.setFieldValue("groupParticipants", []);
  };

  const handleDistrictChange = (value: string) => {
    form.setFieldValue("district", value);
    form.setFieldValue("school", "");
    form.setFieldValue("nycCoachType", "");
    form.setFieldValue("subSchool", "");
    resetCoacheeSelections();
  };

  const handleSchoolChange = (value: string) => {
    form.setFieldValue("school", value);
    resetCoacheeSelections();
  };

  const handleNycCoachTypeChange = (value: string) => {
    form.setFieldValue("nycCoachType", value);
    if (!shouldShowSubSchool(district, value)) {
      form.setFieldValue("subSchool", "");
    }
  };

  // Fetch coachees whenever a district + school are both selected.
  useEffect(() => {
    if (!district || !school) {
      setCoacheeOptions([]);
      return;
    }

    let cancelledFetch = false;
    setLoadingCoachees(true);
    fetch("/api/coach-log/coachees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ district, school }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelledFetch) setCoacheeOptions(data.coachees || []);
      })
      .catch(() => {
        if (!cancelledFetch) setCoacheeOptions([]);
      })
      .finally(() => {
        if (!cancelledFetch) setLoadingCoachees(false);
      });

    return () => {
      cancelledFetch = true;
    };
  }, [district, school]);

  const handleSubmit = async (values: CoachLogValues) => {
    if (!mondayProfile?.name) {
      console.error("Please log in first");
      return;
    }

    setShowErrorBanner(false);
    const cancelledSession = values.canceled === "Yes";
    const didGroup = !cancelledSession && values.didGroupCoaching === "Yes";

    try {
      setIsSubmitting(true);
      setIsSuccessful(null);

      const response = await fetch("/api/coach-log/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coachName: mondayProfile.name,
          coachMondayId: mondayProfile.mondayProfileId || "",
          district: values.district,
          school: values.school,
          subSchool: showSubSchool ? values.subSchool : "",
          nycCoachType: showNycCoachType ? values.nycCoachType : "",
          sessionDate: values.sessionDate,
          canceled: values.canceled,
          cancelReason: cancelledSession ? values.cancelReason : "",
          cancelReasonOther: cancelledSession ? values.cancelReasonOther : "",
          rescheduled: cancelledSession ? values.rescheduled : "",
          did1on1: cancelledSession ? "" : values.did1on1,
          coacheeRows:
            !cancelledSession && values.did1on1 === "Yes"
              ? values.coacheeRows
              : [],
          didGroupCoaching: cancelledSession ? "" : values.didGroupCoaching,
          groupParticipants: didGroup ? values.groupParticipants : [],
          groupParticipantRole: didGroup ? values.groupParticipantRole : "",
          groupTopic: didGroup ? values.groupTopic : "",
          groupDurationMins: didGroup ? values.groupDurationMins : "",
        }),
      });

      setIsSuccessful(response.ok);
    } catch (e) {
      console.error(e);
      setIsSuccessful(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-full grid grid-cols-12 gap-8 py-8">
      <div className="col-start-2 col-span-10 h-fit p-8 rounded-[25px] bg-white/30 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)] text-white">
        <form
          onSubmit={form.onSubmit(handleSubmit, () => setShowErrorBanner(true))}
          className="flex flex-col gap-4"
        >
          <h1 className="font-bold text-3xl">Coach Log Form</h1>

          <DistrictSchoolQuestion
            form={form}
            districts={districts}
            onDistrictChange={handleDistrictChange}
            onSchoolChange={handleSchoolChange}
          />

          {showNycCoachType && (
            <NycCoachTypeQuestion
              form={form}
              onChange={handleNycCoachTypeChange}
            />
          )}

          {showSubSchool && <SubSchoolQuestion form={form} />}

          <SessionDateQuestion form={form} />

          <CancellationQuestion form={form} />

          {showActivities && (
            <>
              <OneOnOneCoachingQuestion
                form={form}
                coacheeOptions={coacheeOptions}
                loadingCoachees={loadingCoachees}
              />
              <GroupCoachingQuestion form={form} coacheeOptions={coacheeOptions} />
            </>
          )}

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
              title="Your coach log was submitted successfully!"
              withCloseButton={false}
            />
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
      </div>
    </div>
  );
};
