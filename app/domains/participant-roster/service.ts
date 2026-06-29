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
}

export function participantRosterService(
  repository: ParticipantRosterRepository
): ParticipantRosterService {
  return {
    submitParticipant: (submission) => {
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

      const entry: ParticipantRosterEntry = {
        coachMondayId: submission.coachMondayId,
        responderEmail: submission.responderEmail,
        participantName,
        email: submission.email.trim(),
        role,
        supports: submission.supports,
        contentAreas,
        grades: submission.grades,
        groupNumbers: submission.groupNumbers,
        district: submission.district,
        school: submission.school,
      };

      return repository.createParticipant(entry);
    },
  };
}
