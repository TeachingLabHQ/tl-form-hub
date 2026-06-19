// Google Form for participant roster updates (embedded, same form the legacy
// coach log linked to). Display-only — submissions post directly to Google.
const PARTICIPANT_ROSTER_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSdc5wL1or9LxLQFWA8iGMriclCmv0_2HAIb7G7xxY8mjVeHzQ/viewform?embedded=true";

export const ParticipantRosterForm = () => (
  <iframe
    src={PARTICIPANT_ROSTER_FORM_URL}
    title="Participant Roster Form"
    className="w-full rounded-[10px] border-none bg-white"
    style={{ height: "800px" }}
  />
);
