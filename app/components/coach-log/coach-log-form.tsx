import { Button, Loader, Notification, Tabs, Text } from "@mantine/core";
import { IconAlertTriangle, IconCheck, IconX } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import {
  subSchoolKey,
  type CoachOption,
  type DistrictWithSchools,
  type SessionDateOption,
  type SubSchoolMap,
} from "~/domains/coach-log/model";
import { cn } from "~/utils/utils";
import { useSession } from "../auth/hooks/useSession";
import { buildCoachLogSubmission } from "./build-submission";
import { ParticipantRosterForm } from "./participant-roster-form";
import {
  canOverrideCoach,
  isNycCoachTypeDistrict,
  shouldShowEarlyChildhood,
  shouldShowReads,
  shouldShowSolves,
  shouldShowSubSchool,
} from "./constants";
import { CancellationQuestion } from "./questions/cancellation-question";
import { CoachNameQuestion } from "./questions/coach-name-question";
import { DistrictSchoolQuestion } from "./questions/district-school-question";
import { EarlyChildhoodQuestion } from "./questions/early-childhood-question";
import { ReadsQuestion } from "./questions/nyc/reads-question";
import { SolvesQuestion } from "./questions/nyc/solves-question";
import { GroupCoachingQuestion } from "./questions/group-coaching-question";
import { NycCoachTypeQuestion } from "./questions/nyc-coach-type-question";
import { OneOnOneCoachingQuestion } from "./questions/one-on-one-coaching-question";
import { SessionDateQuestion } from "./questions/session-date-question";
import { SubSchoolQuestion } from "./questions/sub-school-question";
import { useDuplicateCheck } from "./hooks/use-duplicate-check";
import {
  EMPTY_COACHEE_ROW,
  useCoachLogForm,
  type CoachLogValues,
} from "./hooks/use-coach-log-form";

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

  // Testing-only coach override: allow-listed admins get a dropdown of Monday
  // coaches. When one is selected (by Monday id), that coach becomes the
  // *effective* identity used everywhere — session-date lookup, the duplicate
  // guard, and submission (item name = selected coach, people column = their
  // Monday id). Everyone else (and the tester before picking) uses their own
  // logged-in profile.
  const canOverride = canOverrideCoach(mondayProfile?.email);
  const [coachOverrideId, setCoachOverrideId] = useState("");
  const [coachOptions, setCoachOptions] = useState<CoachOption[]>([]);
  const [loadingCoachOptions, setLoadingCoachOptions] = useState(false);

  const overriddenCoach =
    canOverride && coachOverrideId
      ? coachOptions.find((c) => c.mondayId === coachOverrideId)
      : undefined;
  const coachName = overriddenCoach?.name ?? mondayProfile?.name ?? "";
  const coachMondayId =
    overriddenCoach?.mondayId ?? mondayProfile?.mondayProfileId ?? "";

  // Submission status.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState<boolean | null>(null);
  const [failedCoachees, setFailedCoachees] = useState<string[]>([]);
  const [showErrorBanner, setShowErrorBanner] = useState(false);

  const { district, school, nycCoachType, canceled, sessionDate } =
    form.values;

  // One log per coach + district + school + date — checked as soon as those are
  // chosen so the coach is warned before filling out the form.
  const {
    duplicateExists,
    checking: checkingDuplicate,
    checkError: duplicateCheckError,
    setDuplicateExists,
  } = useDuplicateCheck({
    coachMondayId,
    coachName,
    district,
    school,
    sessionDate,
  });

  // While the check is running or a duplicate exists, the activity questions are
  // locked so the coach can't fill out a log that won't submit (they can still
  // change district/school/date above to resolve it).
  const lockActivities = checkingDuplicate || duplicateExists;

  // Sub-school options are filtered from the loader map by district + school.
  const subSchoolOptions = useMemo(
    () => subSchools[subSchoolKey(district, school)] ?? [],
    [subSchools, district, school]
  );

  const showNycCoachType = isNycCoachTypeDistrict(district);
  // Sub-school shows for D75 + Solves, but only when the sheet actually has
  // sub-schools for this district + school combo (otherwise there's nothing to
  // pick, so we hide the question rather than show an empty dropdown).
  const showSubSchool =
    shouldShowSubSchool(district, nycCoachType) && subSchoolOptions.length > 0;
  const showEarlyChildhood = shouldShowEarlyChildhood(district, nycCoachType);
  const showReads = shouldShowReads(district, nycCoachType);
  const showSolves = shouldShowSolves(district, nycCoachType);
  const showActivities = canceled !== "Yes";

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

  // Testing-only: load the coach dropdown options once, for allow-listed admins.
  useEffect(() => {
    if (!canOverride) return;

    let cancelledFetch = false;
    setLoadingCoachOptions(true);
    fetch("/api/coach-log/coach-names")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelledFetch) setCoachOptions(data.coaches || []);
      })
      .catch(() => {
        if (!cancelledFetch) setCoachOptions([]);
      })
      .finally(() => {
        if (!cancelledFetch) setLoadingCoachOptions(false);
      });

    return () => {
      cancelledFetch = true;
    };
  }, [canOverride]);

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

  const handleSubmit = async (values: CoachLogValues) => {
    if (!mondayProfile?.name) {
      console.error("Please log in first");
      return;
    }

    setShowErrorBanner(false);

    try {
      setIsSubmitting(true);
      setIsSuccessful(null);
      setFailedCoachees([]);

      const response = await fetch("/api/coach-log/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          // Effective coach: the override when an allow-listed tester has picked
          // one, otherwise the logged-in profile.
          buildCoachLogSubmission(values, {
            name: coachName,
            mondayProfileId: coachMondayId,
          })
        ),
      });

      if (response.status === 207) {
        // Partial success: the log saved but some 1:1 rows didn't.
        const body = (await response.json().catch(() => ({}))) as {
          failedCoachees?: string[];
        };
        setFailedCoachees(body.failedCoachees ?? []);
        setIsSuccessful(true);
      } else if (response.status === 409) {
        // A log for this coach + district + school + date already exists.
        setDuplicateExists(true);
        setIsSuccessful(null);
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
        <Tabs defaultValue="coach-log">
          <Tabs.List>
            <Tabs.Tab value="coach-log" className="hover:bg-white/10">
              Coach Log
            </Tabs.Tab>
            <Tabs.Tab value="roster" className="hover:bg-white/10">
              Participant Roster Form
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="coach-log" pt="lg">
            <form
              onSubmit={form.onSubmit(handleSubmit, () =>
                setShowErrorBanner(true)
              )}
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
                  onChange={(value) => {
                    setCoachOverrideId(value);
                    // The new coach has a different date list; drop any stale pick.
                    form.setFieldValue("sessionDate", "");
                  }}
                />
              )}

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

              {checkingDuplicate && (
                <div className="flex items-center gap-2">
                  <Loader size="sm" />
                  <Text size="sm" c="white">
                    Checking whether a log already exists for this school and
                    date...
                  </Text>
                </div>
              )}

              {duplicateCheckError && (
                <Notification
                  icon={<IconX size={20} />}
                  color="red"
                  title="We couldn't verify whether a log already exists for this date."
                  withCloseButton={false}
                >
                  To avoid creating a duplicate submission, we strongly recommend
                  reaching out to the technology team before submitting this log.
                </Notification>
              )}

              <fieldset
                disabled={lockActivities}
                className={cn("flex flex-col gap-4 m-0 p-0 border-0 min-w-0", {
                  "opacity-60 pointer-events-none": lockActivities,
                })}
              >
                <CancellationQuestion form={form} />

                {showActivities && (
                  <>
                    <OneOnOneCoachingQuestion
                      form={form}
                      coacheeOptions={coacheeOptions}
                      loadingCoachees={loadingCoachees}
                    />
                    <GroupCoachingQuestion
                      form={form}
                      coacheeOptions={coacheeOptions}
                    />
                    {showEarlyChildhood && (
                      <EarlyChildhoodQuestion form={form} />
                    )}
                    {showReads && (
                      <ReadsQuestion
                        form={form}
                        district={district}
                        school={school}
                      />
                    )}
                    {showSolves && <SolvesQuestion form={form} />}
                  </>
                )}
              </fieldset>

              {duplicateExists && (
                <Notification
                  icon={<IconAlertTriangle size={20} />}
                  color="yellow"
                  title="A coach log already exists for this school on this date."
                  withCloseButton={false}
                >
                  Only one log can be submitted per school per day. To make
                  changes, contact the team.
                </Notification>
              )}

              {!isSubmitting && (
                <Button
                  type="submit"
                  disabled={duplicateExists || checkingDuplicate}
                >
                  Submit
                </Button>
              )}
              {isSubmitting && (
                <Loader size={30} color="rgba(255, 255, 255, 1)" />
              )}

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
          </Tabs.Panel>

          <Tabs.Panel value="roster" pt="lg">
            <ParticipantRosterForm />
          </Tabs.Panel>
        </Tabs>
      </div>
    </div>
  );
};
