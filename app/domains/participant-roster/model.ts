/**
 * What the participant-roster form sends to the submit endpoint. Flat and
 * serializable (no Date objects / functions). "Other" write-ins and the
 * first/last name are resolved server-side (see the service).
 */
export type ParticipantRosterSubmission = {
  // Coach: auto from the logged-in profile; a testing override may replace it.
  coachMondayId: string;
  responderEmail: string;

  // Participant
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  roleOther: string;
  supports: string[];
  contentAreas: string[];
  contentAreaOther: string;
  grades: string[];
  groupNumbers: string[];
  district: string;
  school: string;
};

/**
 * A resolved roster entry ready to write to Monday: "Other" choices replaced by
 * their write-ins, and the participant name composed + title-cased.
 */
export type ParticipantRosterEntry = {
  coachMondayId: string;
  responderEmail: string;
  participantName: string;
  email: string;
  role: string;
  supports: string[];
  contentAreas: string[];
  grades: string[];
  groupNumbers: string[];
  district: string;
  school: string;
};
