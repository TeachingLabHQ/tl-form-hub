import { describe, expect, it, vi } from "vitest";
import type { ParticipantRosterSubmission } from "./model";
import type { ParticipantRosterRepository } from "./repository";
import { participantRosterService } from "./service";

const base: ParticipantRosterSubmission = {
  coachMondayId: "1",
  responderEmail: "coach@teachinglab.org",
  firstName: "ann",
  lastName: "lee",
  email: "ann.lee@schools.nyc.gov",
  role: "Coach",
  roleOther: "",
  supports: [],
  contentAreas: ["Math"],
  contentAreaOther: "",
  grades: [],
  groupCoachingName: "",
  district: "NY_D9",
  school: "055",
};

const submit = async (overrides: Partial<ParticipantRosterSubmission>) => {
  const repository = {
    createParticipant: vi.fn().mockResolvedValue({ data: "123", error: null }),
    findGroupId: vi.fn().mockResolvedValue({ data: null, error: null }),
  } as unknown as ParticipantRosterRepository;
  await participantRosterService(repository).submitParticipant({
    ...base,
    ...overrides,
  });
  return vi.mocked(repository.createParticipant).mock.calls[0]![0];
};

describe("participant roster service", () => {
  // The board rejects unknown dropdown labels, so the write-ins must never
  // reach the dropdowns.
  it("keeps 'Other' as the dropdown labels and passes the write-ins separately", async () => {
    const entry = await submit({
      role: "Other",
      roleOther: "  Instructional aide ",
      contentAreas: ["Math", "Other"],
      contentAreaOther: " Art ",
    });

    expect(entry).toMatchObject({
      role: "Other",
      roleOther: "Instructional aide",
      contentAreas: ["Math", "Other"],
      contentAreaOther: "Art",
    });
  });

  it("drops stale write-ins when 'Other' isn't chosen", async () => {
    const entry = await submit({
      roleOther: "Instructional aide",
      contentAreaOther: "Art",
    });

    expect(entry).toMatchObject({
      role: "Coach",
      roleOther: "",
      contentAreas: ["Math"],
      contentAreaOther: "",
    });
  });

  it("title-cases the participant name", async () => {
    expect((await submit({})).participantName).toBe("Ann Lee");
  });
});
