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
  groupCoachingName: string;
  district: string;
  school: string;
};

/**
 * A resolved roster entry ready to write to Monday: the participant name
 * composed + title-cased, and "Other" write-ins trimmed (empty when "Other"
 * wasn't chosen).
 */
export type ParticipantRosterEntry = {
  coachMondayId: string;
  responderEmail: string;
  participantName: string;
  email: string;
  role: string;
  /** The role write-in, kept in its own text column: the board won't create
   * new dropdown labels, so `role` stays "Other". */
  roleOther: string;
  supports: string[];
  contentAreas: string[];
  /** The content-area write-in, kept in its own text column (see roleOther). */
  contentAreaOther: string;
  grades: string[];
  groupCoachingName: string;
  /** UUID for the participant's group, shared by every roster entry with the
   * same groupCoachingName so Nisa can treat them as one group. */
  nisaGroupId: string;
  district: string;
  school: string;
};
