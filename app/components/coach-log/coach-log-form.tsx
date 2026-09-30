import { Button, Loader, Notification, Tabs, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useSearchParams } from "@remix-run/react";
import { IconAlertTriangle, IconCheck, IconX } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import {
  subSchoolKey,
  type DbnsByDistrict,
  type DistrictWithSchools,
  type SessionDateOption,
  type SubSchoolMap,
} from "~/domains/coach-log/model";
import {
  FormActions,
  FormCard,
  FormPage,
  FormSection,
  Reveal,
} from "~/components/form-kit";
import { cn } from "~/utils/utils";
import { useSession } from "../auth/hooks/useSession";
import { buildCoachLogSubmission } from "./build-submission";
import { ParticipantRosterForm } from "./participant-roster/participant-roster-form";
import {
  isNycCoachTypeDistrict,
  isD75District,
  schoolLevelOptions,
  shouldShowEarlyChildhood,
  shouldShowReads,
  requiresSubSchool,
  shouldShowSchoolLevel,
  shouldShowSolves,
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
import { PlSessionQuestion } from "./questions/pl-session-question";
import { SessionDateQuestion } from "./questions/session-date-question";
import { SessionDateCalendarQuestion } from "./questions/session-date-calendar-question";
import { SubSchoolQuestion } from "./questions/sub-school-question";
import { useCoachOverride } from "./hooks/use-coach-override";
import { useDuplicateCheck } from "./hooks/use-duplicate-check";
import {
  EMPTY_COACHEE_ROW,
  useCoachLogForm,
  type CoachLogValues,
} from "./hooks/use-coach-log-form";

type Props = {
  districts: DistrictWithSchools[];
  subSchools: SubSchoolMap;
  dbnsByDistrict: DbnsByDistrict;
};

// Tabs are mirrored into the URL (?tab=) so each tab has a shareable deep link
// — e.g. the participant roster can be handed out as /coach-log-form?tab=roster
// without asking people to open the coach log and click the tab first.
const TAB_VALUES = ["coach-log", "roster"] as const;
const DEFAULT_TAB = "coach-log";

export const CoachLogForm = ({
  districts,
  subSchools,
  dbnsByDistrict,
}: Props) => {
  const { mondayProfile } = useSession();
  const form = useCoachLogForm(subSchools);

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = TAB_VALUES.includes(tabParam as (typeof TAB_VALUES)[number])
    ? tabParam
    : DEFAULT_TAB;

  const handleTabChange = (value: string | null) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (!value || value === DEFAULT_TAB) {
          next.delete("tab");
        } else {
          next.set("tab", value);
        }
        return next;
      },
      { replace: true, preventScrollReset: true }
    );
  };

  // Reference data (not form state) — coachees depend on district + school.
  const [coacheeOptions, setCoacheeOptions] = useState<string[]>([]);
  const [loadingCoachees, setLoadingCoachees] = useState(false);

  // Session dates depend on the logged-in coach + the selected district.
  const [sessionDateOptions, setSessionDateOptions] = useState<
    SessionDateOption[]
  >([]);
  const [loadingSessionDates, setLoadingSessionDates] = useState(false);

  // Testing-only coach override: allow-listed admins get a dropdown of Monday
  // coaches. The selected coach becomes the *effective* identity used
  // everywhere — session-date lookup, the duplicate guard, and submission (item
  // name = selected coach, people column = their Monday id). Everyone else (and
  // the tester before picking) uses their own logged-in profile.
  const {
    canOverride,
    coachOverrideId,
    setCoachOverrideId,
    coachOptions,
    loadingCoachOptions,
    coachName,
    coachMondayId,
  } = useCoachOverride();

  // Submission status.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState<boolean | null>(null);
  const [failedCoachees, setFailedCoachees] = useState<string[]>([]);
  const [showErrorBanner, setShowErrorBanner] = useState(false);

  const { district, school, nycCoachType, canceled, sessionDate, subSchool } =
    form.values;
  const readsIsPLSession = form.values.readsIsPLSession;
  const solvesIsPLSession = form.values.solvesIsPLSession;

  // Sub-school options are filtered from the loader map by district + school.
  const sheetSubSchoolOptions = useMemo(
    () => subSchools[subSchoolKey(district, school)] ?? [],
    [subSchools, district, school]
  );

  // D11 Solves coaches at the 8 K-8 schools, and D75 Reads / ELA (non-Reads)
  // coaches, get a fixed Elementary/Middle choice instead — it reuses the same
  // form field/Monday column as sub-school so a coach can submit one log per
  // level for the same school/date.
  const showSchoolLevel = shouldShowSchoolLevel(district, school, nycCoachType);
  const subSchoolOptions = showSchoolLevel
    ? schoolLevelOptions(district)
    : sheetSubSchoolOptions;
  const isD75SchoolLevel = showSchoolLevel && isD75District(district);

  // Sub-school shows for D75 + Solves, but only when the sheet actually has
  // sub-schools for this district + school combo (otherwise there's nothing to
  // pick, so we hide the question rather than show an empty dropdown). It's
  // required whenever it shows.
  const showSubSchool = requiresSubSchool(
    district,
    school,
    nycCoachType,
    sheetSubSchoolOptions
  );

  // One log per coach + district + school + date — plus sub-school when the form
  // requires one, so different sub-schools on the same date aren't collapsed
  // into a single log. Checked as soon as those are chosen so the coach is
  // warned before filling out the form.
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
    nycCoachType,
    subSchool: showSubSchool ? subSchool : "",
  });

  // While the check is running or a duplicate exists, the activity questions are
  // locked so the coach can't fill out a log that won't submit (they can still
  // change district/school/date above to resolve it).
  const lockActivities = checkingDuplicate || duplicateExists;

  const showNycCoachType = isNycCoachTypeDistrict(district);
  const showEarlyChildhood = shouldShowEarlyChildhood(district, nycCoachType);
  const showReads = shouldShowReads(district, nycCoachType);
  const showSolves = shouldShowSolves(district, nycCoachType);
  const showActivities = canceled !== "Yes";

  // A Reads or Solves coach logging a Professional Learning session: hide the
  // coaching questions and pick the session date from a free calendar instead
  // of the scheduled coaching-calendar dropdown.
  const isPLSession =
    (showReads && readsIsPLSession === "Yes") ||
    (showSolves && solvesIsPLSession === "Yes");

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
    // DBN options are scoped to the district (see dbnsByDistrict), so a
    // previous district's selections are no longer valid options here.
    form.setFieldValue("solvesDistrictWideDBNs", []);
    resetCoacheeSelections();
    resetEarlyChildhood();
  };

  const handleSchoolChange = (value: string) => {
    form.setFieldValue("school", value);
    form.setFieldValue("subSchool", "");
    // Session dates are scoped by school, so the current date may no longer be
    // valid for the new school.
    form.setFieldValue("sessionDate", "");
    resetCoacheeSelections();
  };

  // Selecting "Yes" auto-answers the 1:1 and group coaching questions "No"
  // (they're hidden but still required), and clears the date since the input
  // switches between the calendar and the scheduled dropdown.
  const handlePLSessionChange =
    (fieldName: "readsIsPLSession" | "solvesIsPLSession") =>
    (value: string) => {
      form.setFieldValue(fieldName, value as CoachLogValues[typeof fieldName]);
      form.setFieldValue("sessionDate", "");
      if (value === "Yes") {
        form.setFieldValue("did1on1", "No");
        form.setFieldValue("didGroupCoaching", "No");
      }
    };

  const handleNycCoachTypeChange = (value: string) => {
    form.setFieldValue("nycCoachType", value);
    // The coach type decides whether the field holds a sheet-driven sub-school
    // or an Elementary/Middle level (e.g. D75 Solves vs Reads), so a previous
    // answer may not be a valid option anymore.
    form.setFieldValue("subSchool", "");
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

  // Fetch session dates whenever a coach + district are both known. The dates
  // are scoped by school too, so re-fetch when the school changes.
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
      body: JSON.stringify({ coachName, district, school }),
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
  }, [district, coachName, school]);

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
        if (response.ok) {
          notifications.show({
            color: "teal",
            icon: <IconCheck size={18} />,
            title: "Coach log submitted",
            message: "Your coach log was submitted successfully!",
          });
        }
      }
    } catch (e) {
      console.error(e);
      setIsSuccessful(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormPage width="md">
      <FormCard>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tabs.List>
            <Tabs.Tab value="coach-log">Coach Log</Tabs.Tab>
            <Tabs.Tab value="roster">Participant Roster Form</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="coach-log" pt="xl">
            <form
              onSubmit={form.onSubmit(handleSubmit, () =>
                setShowErrorBanner(true)
              )}
              className="flex flex-col gap-8"
            >
              <FormSection
                step={1}
                title="Session details"
                description="Where and when the coaching took place"
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
                  <Reveal>
                    <NycCoachTypeQuestion
                      form={form}
                      onChange={handleNycCoachTypeChange}
                    />
                  </Reveal>
                )}

                {showReads && (
                  <Reveal>
                    <PlSessionQuestion
                      form={form}
                      fieldName="readsIsPLSession"
                      onChange={handlePLSessionChange("readsIsPLSession")}
                    />
                  </Reveal>
                )}

                {showSolves && (
                  <Reveal>
                    <PlSessionQuestion
                      form={form}
                      fieldName="solvesIsPLSession"
                      onChange={handlePLSessionChange("solvesIsPLSession")}
                    />
                  </Reveal>
                )}

                {showSubSchool && (
                  <Reveal>
                    <SubSchoolQuestion
                      // Remount when the coach type changes so the searchable
                      // Select drops its stale text (see CLAUDE.md gotcha).
                      key={`sub-school-${nycCoachType}`}
                      form={form}
                      options={subSchoolOptions}
                      label={
                        isD75SchoolLevel
                          ? "Was this coaching session for Elementary School or Middle School?*"
                          : showSchoolLevel
                          ? "Elementary or Middle?*"
                          : undefined
                      }
                      placeholder={
                        isD75SchoolLevel
                          ? "Select Elementary School or Middle School"
                          : showSchoolLevel
                          ? "Select Elementary or Middle"
                          : undefined
                      }
                    />
                  </Reveal>
                )}

                {isPLSession ? (
                  <SessionDateCalendarQuestion form={form} />
                ) : (
                  <SessionDateQuestion
                    form={form}
                    options={sessionDateOptions}
                    loading={loadingSessionDates}
                  />
                )}

                {checkingDuplicate && (
                  <div className="flex items-center gap-2">
                    <Loader size="sm" />
                    <Text size="sm" c="dimmed">
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
                    To avoid creating a duplicate submission, we strongly
                    recommend reaching out to the technology team before
                    submitting this log.
                  </Notification>
                )}
              </FormSection>

              <FormSection step={2} title="Coaching activity">
                <fieldset
                  disabled={lockActivities}
                  className={cn(
                    "flex flex-col gap-4 m-0 p-0 border-0 min-w-0",
                    {
                      "opacity-60 pointer-events-none": lockActivities,
                    }
                  )}
                >
                  <CancellationQuestion form={form} />

                  {showActivities && (
                    <Reveal>
                      {!isPLSession && (
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
                        </>
                      )}
                      {showEarlyChildhood && (
                        <EarlyChildhoodQuestion form={form} />
                      )}
                      {showReads && (
                        <ReadsQuestion form={form} district={district} />
                      )}
                      {showSolves && (
                        <SolvesQuestion
                          form={form}
                          district={district}
                          dbnsByDistrict={dbnsByDistrict}
                        />
                      )}
                    </Reveal>
                  )}
                </fieldset>
              </FormSection>

              {duplicateExists && (
                <Notification
                  icon={<IconAlertTriangle size={20} />}
                  color="yellow"
                  title="A coaching log for this district, site, and coach has already been submitted for this date."
                  withCloseButton={false}
                >
                  Please reach out to your project CPM or PMST member if you
                  need to edit or view this log.
                </Notification>
              )}

              {showErrorBanner && (
                <Notification
                  icon={<IconX size={20} />}
                  color="red"
                  title="Please complete all required fields before submitting."
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
                  These coachees could not be saved: {failedCoachees.join(", ")}
                  . Please re-submit them or contact the technology team.
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

              <FormActions>
                <Button
                  type="submit"
                  size="md"
                  loading={isSubmitting}
                  disabled={duplicateExists || checkingDuplicate}
                >
                  Submit log
                </Button>
              </FormActions>
            </form>
          </Tabs.Panel>

          <Tabs.Panel value="roster" pt="xl">
            <ParticipantRosterForm districts={districts} />
          </Tabs.Panel>
        </Tabs>
      </FormCard>
    </FormPage>
  );
};
