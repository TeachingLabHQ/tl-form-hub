import type { ParticipantRosterSubmission } from "~/domains/participant-roster/model";
import type { ParticipantRosterValues } from "./hooks/use-participant-roster-form";

type Coach = { coachMondayId: string; responderEmail: string };

/**
 * Maps validated form values + the effective coach identity to the flat
 * {@link ParticipantRosterSubmission} payload. "Other" write-ins and the
 * participant name are resolved server-side (the service), so this stays a thin
 * value → payload mapper kept out of the component.
 */
export function buildParticipantRosterSubmission(
  values: ParticipantRosterValues,
  coach: Coach
): ParticipantRosterSubmission {
  return {
    coachMondayId: coach.coachMondayId,
    responderEmail: coach.responderEmail,
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email: values.email.trim(),
    role: values.role,
    roleOther: values.roleOther,
    supports: values.supports,
    contentAreas: values.contentAreas,
    contentAreaOther: values.contentAreaOther,
    grades: values.grades,
    groupNumbers: values.groupNumbers,
    district: values.district,
    school: values.school,
  };
}
