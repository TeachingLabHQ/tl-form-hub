import { randomUUID } from "node:crypto";
import { Errorable } from "~/utils/errorable";
import {
  ParticipantRosterEntry,
  ParticipantRosterSubmission,
} from "./model";
import { ParticipantRosterRepository } from "./repository";

// "jane  DOE" -> "Jane Doe" (matches the legacy form's title-casing).
const titleCase = (s: string) =>
  s.trim().replace(/\s+/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const OTHER = "Other";

export interface ParticipantRosterService {
  submitParticipant(
    submission: ParticipantRosterSubmission
  ): Promise<Errorable<string>>;
  participantExists(
    email: string,
    district: string,
    school: string
  ): Promise<Errorable<boolean>>;
  fetchGroupCoachingNames(
    district: string,
    school: string
  ): Promise<Errorable<string[]>>;
}

export function participantRosterService(
  repository: ParticipantRosterRepository
): ParticipantRosterService {
  return {
    submitParticipant: async (submission) => {
      // Resolve "Other" write-ins: the single-select role becomes the typed
      // text; in the multi-select content areas, "Other" is swapped for it.
      const role =
        submission.role === OTHER ? submission.roleOther.trim() : submission.role;
      const contentAreas = submission.contentAreas.flatMap((c) =>
        c === OTHER
          ? submission.contentAreaOther.trim()
            ? [submission.contentAreaOther.trim()]
            : []
          : [c]
      );
      const participantName = `${titleCase(submission.firstName)} ${titleCase(
        submission.lastName
      )}`.trim();

      // New group name -> generate its Nisa Group ID; a name already on the
      // roster -> reuse the existing id so the whole group shares one.
      const groupCoachingName = submission.groupCoachingName.trim();
      let nisaGroupId = "";
      if (groupCoachingName) {
        const existing = await repository.findGroupId(groupCoachingName);
        nisaGroupId = existing.data ?? randomUUID();
      }

      const entry: ParticipantRosterEntry = {
        coachMondayId: submission.coachMondayId,
        responderEmail: submission.responderEmail,
        participantName,
        email: submission.email.trim(),
        role,
        supports: submission.supports,
        contentAreas,
        grades: submission.grades,
        groupCoachingName,
        nisaGroupId,
        district: submission.district,
        school: submission.school,
      };

      return repository.createParticipant(entry);
    },

    participantExists: (email, district, school) =>
      repository.participantExists(email, district, school),

    fetchGroupCoachingNames: (district, school) =>
      repository.fetchGroupCoachingNames(district, school),
  };
}
