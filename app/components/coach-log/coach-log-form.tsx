import { Button, Loader, Notification } from "@mantine/core";
import { IconAlertTriangle, IconCheck, IconX } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import {
  subSchoolKey,
  type DistrictWithSchools,
  type SessionDateOption,
  type SubSchoolMap,
} from "~/domains/coach-log/model";
import { useSession } from "../auth/hooks/useSession";
import {
  isNycCoachTypeDistrict,
  shouldShowEarlyChildhood,
  shouldShowSubSchool,
} from "./constants";
import { CancellationQuestion } from "./questions/cancellation-question";
import { DistrictSchoolQuestion } from "./questions/district-school-question";
import { EarlyChildhoodQuestion } from "./questions/early-childhood-question";
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
  subSchools: SubSchoolMap;
};

export const CoachLogForm = ({ districts, subSchools }: Props) => {
  const { mondayProfile } = useSession();
  const form = useCoachLogForm();

  // Reference data (not form state) — coachees depend on district + school.
  const [coacheeOptions, setCoacheeOptions] = useState<string[]>([]);
  const [loadingCoachees, setLoadingCoachees] = useState(false);

  // Session dates depend on the logged-in coach + the selected district.
  const [sessionDateOptions, setSessionDateOptions] = useState<
    SessionDateOption[]
  >([]);
  const [loadingSessionDates, setLoadingSessionDates] = useState(false);
  const coachName = mondayProfile?.name ?? "";

  // Submission status.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState<boolean | null>(null);
  const [failedCoachees, setFailedCoachees] = useState<string[]>([]);
  const [showErrorBanner, setShowErrorBanner] = useState(false);

  const { district, school, nycCoachType, canceled } = form.values;
  const showNycCoachType = isNycCoachTypeDistrict(district);
  const showSubSchool = shouldShowSubSchool(district, nycCoachType);
  const showEarlyChildhood = shouldShowEarlyChildhood(district, nycCoachType);
  const showActivities = canceled !== "Yes";

  // Sub-school options are filtered from the loader map by district + school.
  const subSchoolOptions = useMemo(
    () => subSchools[subSchoolKey(district, school)] ?? [],
    [subSchools, district, school]
  );

  const resetCoacheeSelections = () => {
    form.setFieldValue("coacheeRows", [{ ...EMPTY_COACHEE_ROW }]);
    form.setFieldValue("groupParticipants", []);
  };

  const resetEarlyChildhood = () => {
    form.setFieldValue("ecTouchpoint", "");
    form.setFieldValue("ecTeacherStrategies", []);
    form.setFieldValue("ecLeaderCapacityFocus", []);
  };

  const handleDistrictChange = (value: string) => {
    form.setFieldValue("district", value);
    form.setFieldValue("school", "");
    form.setFieldValue("nycCoachType", "");
    form.setFieldValue("subSchool", "");
    form.setFieldValue("sessionDate", "");
    resetCoacheeSelections();
    resetEarlyChildhood();
  };

  const handleSchoolChange = (value: string) => {
    form.setFieldValue("school", value);
    form.setFieldValue("subSchool", "");
    resetCoacheeSelections();
  };

  const handleNycCoachTypeChange = (value: string) => {
    form.setFieldValue("nycCoachType", value);
    if (!shouldShowSubSchool(district, value)) {
      form.setFieldValue("subSchool", "");
    }
    if (!shouldShowEarlyChildhood(district, value)) {
      resetEarlyChildhood();
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

  // Fetch session dates whenever a coach + district are both known.
  useEffect(() => {
    if (!district || !coachName) {
      setSessionDateOptions([]);
      return;
    }

    let cancelledFetch = false;
    setLoadingSessionDates(true);
    fetch("/api/coach-log/session-dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coachName, district }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelledFetch) setSessionDateOptions(data.dates || []);
      })
      .catch(() => {
        if (!cancelledFetch) setSessionDateOptions([]);
      })
      .finally(() => {
        if (!cancelledFetch) setLoadingSessionDates(false);
      });

    return () => {
      cancelledFetch = true;
    };
  }, [district, coachName]);

  // No scheduled dates for this coach + district -> auto-select the "N/A"
  // sentinel so the required date field can still be submitted.
  useEffect(() => {
    if (district && !loadingSessionDates && sessionDateOptions.length === 0) {
      form.setFieldValue("sessionDate", "N/A");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [district, loadingSessionDates, sessionDateOptions]);

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
      setFailedCoachees([]);

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
          ecTouchpoint:
            !cancelledSession && showEarlyChildhood ? values.ecTouchpoint : "",
          ecTeacherStrategies:
            !cancelledSession && showEarlyChildhood
              ? values.ecTeacherStrategies
              : [],
          ecLeaderCapacityFocus:
            !cancelledSession && showEarlyChildhood
              ? values.ecLeaderCapacityFocus
              : [],
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

      if (response.status === 207) {
        // Partial success: the log saved but some 1:1 rows didn't.
        const body = (await response.json().catch(() => ({}))) as {
          failedCoachees?: string[];
        };
        setFailedCoachees(body.failedCoachees ?? []);
        setIsSuccessful(true);
      } else {
        setIsSuccessful(response.ok);
      }
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

          {showSubSchool && (
            <SubSchoolQuestion form={form} options={subSchoolOptions} />
          )}

          <SessionDateQuestion
            form={form}
            options={sessionDateOptions}
            loading={loadingSessionDates}
          />

          <CancellationQuestion form={form} />

          {showActivities && (
            <>
              <OneOnOneCoachingQuestion
                form={form}
                coacheeOptions={coacheeOptions}
                loadingCoachees={loadingCoachees}
              />
              <GroupCoachingQuestion form={form} coacheeOptions={coacheeOptions} />
              {showEarlyChildhood && <EarlyChildhoodQuestion form={form} />}
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
          {isSuccessful === true && failedCoachees.length === 0 && (
            <Notification
              icon={<IconCheck size={20} />}
              color="teal"
              title="Your coach log was submitted successfully!"
              withCloseButton={false}
            />
          )}
          {isSuccessful === true && failedCoachees.length > 0 && (
            <Notification
              icon={<IconAlertTriangle size={20} />}
              color="yellow"
              title="Your coach log was saved, but some 1:1 rows didn't."
              withCloseButton={false}
            >
              These coachees could not be saved: {failedCoachees.join(", ")}.
              Please re-submit them or contact the technology team.
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
      </div>
    </div>
  );
};
