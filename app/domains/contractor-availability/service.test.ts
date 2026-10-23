import { describe, expect, it, vi } from "vitest";
import type { ContractorIntake, SavedProfile } from "./model";
import type { ContractorAvailabilityRepository } from "./repository";
import {
  contractorAvailabilityService,
  gapChanges,
  gapHistoryText,
  mergeRoster,
  sanitizeProfile,
  validateBookout,
} from "./service";
import { profileFromIntake } from "./availability";

const intake = (email: string, name: string): ContractorIntake => ({
  detailsItemId: `d-${email}`,
  name,
  email,
  city: "",
  state: "NY",
  timeZone: "",
  contentAreas: [],
  intakeProfile: profileFromIntake({ travel: "Virtual", weekdays: "", support: "", scheduleNotes: "", state: "NY" }),
});

const saved = (email: string, bookoutIds: string[] = []): SavedProfile => ({
  itemId: `item-${email}`,
  staffNotes: "",
  staffViewedOn: null,
  email,
  profile: { ...intake(email, "").intakeProfile, confirmedOn: "2026-10-01", daysPerWeek: 3 },
  bookouts: bookoutIds.map((id) => ({
    id,
    type: "nontl",
    start: "2026-11-10",
    end: "2026-11-10",
    portion: "Full day",
    note: "",
  })),
});

const repo = (overrides: Partial<ContractorAvailabilityRepository> = {}) =>
  ({
    fetchContractors: vi.fn().mockResolvedValue({ data: [intake("a@tl.org", "Ann")], error: null }),
    fetchContractorByEmail: vi.fn().mockResolvedValue({ data: intake("a@tl.org", "Ann"), error: null }),
    fetchSavedProfiles: vi.fn().mockResolvedValue({ data: [], error: null }),
    fetchSavedProfileByEmail: vi.fn().mockResolvedValue({ data: null, error: null }),
    createProfile: vi.fn().mockResolvedValue({ data: "new-item", error: null }),
    updateProfile: vi.fn().mockResolvedValue({ data: "item-a@tl.org", error: null }),
    createBookout: vi.fn().mockResolvedValue({ data: "sub-1", error: null }),
    deleteBookout: vi.fn().mockResolvedValue({ data: "sub-1", error: null }),
    updateStaffNotes: vi.fn().mockResolvedValue({ data: "item-a@tl.org", error: null }),
    fetchSessionCalendar: vi.fn().mockResolvedValue({ data: [], error: null }),
    fetchMondayUsers: vi.fn().mockResolvedValue({ data: [], error: null }),
    updateStaffViewed: vi.fn().mockResolvedValue({ data: "item-a@tl.org", error: null }),
    createItemUpdate: vi.fn().mockResolvedValue({ data: "update-1", error: null }),
    fetchItemUpdates: vi.fn().mockResolvedValue({ data: [], error: null }),
    ...overrides,
  }) as unknown as ContractorAvailabilityRepository;

describe("mergeRoster", () => {
  it("uses the saved profile when there is one, else the intake profile", () => {
    const roster = mergeRoster([intake("b@tl.org", "Bo"), intake("a@tl.org", "Ann")], [saved("b@tl.org")]);
    expect(roster.map((c) => [c.name, c.profileSource, c.profileItemId])).toEqual([
      ["Ann", "intake", null],
      ["Bo", "saved", "item-b@tl.org"],
    ]);
  });
});

describe("synced sessions", () => {
  const session = { date: "2099-01-05", endDate: "2099-01-05", person: "Ann", kind: "facilitation", project: "PL" };
  const synced = () =>
    repo({
      fetchSessionCalendar: vi.fn().mockResolvedValue({ data: [session], error: null }),
      fetchMondayUsers: vi.fn().mockResolvedValue({ data: [{ name: "Ann", email: "a@tl.org" }], error: null }),
    });

  it("adds a contractor's sessions to their bookouts on the roster and their page", async () => {
    const service = contractorAvailabilityService(synced());
    const roster = await service.fetchRoster();
    expect(roster.data![0]!.bookouts).toEqual([expect.objectContaining({ start: "2099-01-05", source: "logistics" })]);
    const page = await service.fetchContractorWithSessions("a@tl.org");
    expect(page.data!.bookouts).toHaveLength(1);
  });

  it("still loads the roster when the calendar can't be read", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = repo({ fetchSessionCalendar: vi.fn().mockResolvedValue({ data: null, error: new Error("down") }) });
    const roster = await contractorAvailabilityService(r).fetchRoster();
    expect(roster.error).toBeNull();
    expect(roster.data![0]!.bookouts).toEqual([]);
    spy.mockRestore();
  });

  it("never deletes a synced session", async () => {
    const r = synced();
    const result = await contractorAvailabilityService(r).removeBookout("a@tl.org", "logistics-a@tl.org-2099-01-05");
    expect(result.error?.message).toBe("Bookout not found");
    expect(r.deleteBookout).not.toHaveBeenCalled();
  });
});

describe("sanitizeProfile", () => {
  it("drops unknown labels and clamps numbers", () => {
    const p = sanitizeProfile({
      formats: ["virtual", "teleport"] as never,
      regions: ["Mars", "West"],
      weekdays: ["Sat", "Mon"] as never,
      months: [11, 3, 3, 15] as never,
      daysPerWeek: 9,
      outsideWork: "Astronaut",
    });
    expect(p).toMatchObject({
      formats: ["virtual"],
      regions: ["West"],
      weekdays: ["Mon"],
      months: [3, 11],
      daysPerWeek: 5,
      outsideWork: "",
    });
  });
});

describe("validateBookout", () => {
  it("rejects an end date before the start", () => {
    const r = validateBookout({ type: "nontl", start: "2026-11-10", end: "2026-11-09" });
    expect(r.error?.message).toMatch(/before the start/);
  });

  it("defaults a missing end to the start and the portion to a full day", () => {
    const r = validateBookout({ type: "fac", start: "2026-11-10" });
    expect(r.data).toMatchObject({ end: "2026-11-10", portion: "Full day" });
  });
});

describe("contractor availability service", () => {
  it("saves staff notes on the contractor's CBS item, creating it if needed", async () => {
    const r = repo();
    await contractorAvailabilityService(r).saveStaffNotes("a@tl.org", "  Strong on K-2  ");
    expect(r.createProfile).toHaveBeenCalledOnce();
    expect(r.updateStaffNotes).toHaveBeenCalledWith("new-item", "Strong on K-2");
  });

  it("looks one contractor up by email without reading the whole roster", async () => {
    const r = repo({
      fetchSavedProfileByEmail: vi.fn().mockResolvedValue({ data: saved("a@tl.org", ["sub-1"]), error: null }),
    });
    const { data } = await contractorAvailabilityService(r).fetchContractor("a@tl.org");
    expect(data).toMatchObject({ email: "a@tl.org", profileSource: "saved", profileItemId: "item-a@tl.org" });
    expect(data?.bookouts.map((b) => b.id)).toEqual(["sub-1"]);
    expect(r.fetchContractors).not.toHaveBeenCalled();
    expect(r.fetchSavedProfiles).not.toHaveBeenCalled();
  });

  it("returns null for someone who isn't an active contractor", async () => {
    const r = repo({ fetchContractorByEmail: vi.fn().mockResolvedValue({ data: null, error: null }) });
    expect((await contractorAvailabilityService(r).fetchContractor("x@tl.org")).data).toBeNull();
  });

  it("creates the CBS item on first save, stamped with today's date", async () => {
    const r = repo();
    const result = await contractorAvailabilityService(r).saveProfile("A@TL.org", saved("a@tl.org").profile, "a@tl.org");
    expect(r.createProfile).toHaveBeenCalledOnce();
    expect(r.updateProfile).not.toHaveBeenCalled();
    expect(result.data?.profileSource).toBe("saved");
    expect(result.data?.profile.confirmedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("creates the CBS item before the first bookout", async () => {
    const r = repo();
    await contractorAvailabilityService(r).addBookout("a@tl.org", {
      type: "nontl",
      start: "2026-11-10",
      end: "2026-11-12",
      portion: "Full day",
      note: "",
    });
    expect(r.createBookout).toHaveBeenCalledWith("new-item", "Non-TL bookout · Nov 10–12", expect.anything());
  });

  // Keeps a staff member's (or a crafted) request from deleting arbitrary
  // Monday items by id
  it("only deletes a bookout that belongs to the contractor", async () => {
    const r = repo({
      fetchSavedProfileByEmail: vi.fn().mockResolvedValue({ data: saved("a@tl.org", ["sub-1"]), error: null }),
    });
    const service = contractorAvailabilityService(r);
    expect((await service.removeBookout("a@tl.org", "someone-elses-item")).error?.message).toBe(
      "Bookout not found"
    );
    expect(r.deleteBookout).not.toHaveBeenCalled();
    await service.removeBookout("a@tl.org", "sub-1");
    expect(r.deleteBookout).toHaveBeenCalledWith("sub-1");
  });

  it("says the contractor wasn't found rather than the bookout", async () => {
    const r = repo({ fetchContractorByEmail: vi.fn().mockResolvedValue({ data: null, error: null }) });
    expect((await contractorAvailabilityService(r).removeBookout("x@tl.org", "sub-1")).error?.message).toBe(
      "Contractor not found"
    );
    expect(r.deleteBookout).not.toHaveBeenCalled();
  });
});

describe("GAP history", () => {
  const before = saved("a@tl.org").profile;

  it("describes each changed field and only says free text was edited", () => {
    const after = { ...before, daysPerWeek: 2, weekdays: ["Mon" as const], notes: "Out in March" };
    expect(gapChanges(before, after)).toEqual([
      "Days per week: 3 → 2",
      "Usual days: any weekday → Mon",
      "Notes edited",
    ]);
    expect(gapHistoryText(before, before, false, "a@tl.org")).toBe("GAP confirmed with no changes by a@tl.org.");
    expect(gapHistoryText(before, before, true, "a@tl.org")).toBe("GAP saved for the first time by a@tl.org.");
  });

  it("adds an entry naming who saved, without failing the save if the post fails", async () => {
    const r = repo({
      fetchSavedProfileByEmail: vi.fn().mockResolvedValue({ data: saved("a@tl.org"), error: null }),
      createItemUpdate: vi.fn().mockResolvedValue({ data: null, error: new Error("down") }),
    });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await contractorAvailabilityService(r).saveProfile(
      "a@tl.org",
      { ...before, daysPerWeek: 2 },
      "staff@tl.org"
    );
    expect(result.error).toBeNull();
    expect(r.createItemUpdate).toHaveBeenCalledWith(
      "item-a@tl.org",
      "GAP updated by staff@tl.org. Days per week: 3 → 2."
    );
    spy.mockRestore();
  });

  it("reads back only GAP entries, newest first", async () => {
    const r = repo({
      fetchSavedProfileByEmail: vi.fn().mockResolvedValue({ data: saved("a@tl.org"), error: null }),
      fetchItemUpdates: vi.fn().mockResolvedValue({
        data: [
          { at: "2026-10-01T10:00:00Z", text: "GAP saved for the first time by a@tl.org." },
          { at: "2026-10-05T10:00:00Z", text: "Called her about March" },
          { at: "2026-10-20T10:00:00Z", text: "GAP confirmed with no changes by a@tl.org." },
        ],
        error: null,
      }),
    });
    const { data } = await contractorAvailabilityService(r).fetchGapHistory("a@tl.org");
    expect(data!.map((h) => h.at)).toEqual(["2026-10-20T10:00:00Z", "2026-10-01T10:00:00Z"]);
  });
});

describe("markStaffViewed", () => {
  it("stamps an existing item once a day and never creates one", async () => {
    const service = (staffViewedOn: string | null, exists = true) => {
      const r = repo({
        fetchSavedProfileByEmail: vi
          .fn()
          .mockResolvedValue({ data: exists ? { ...saved("a@tl.org"), staffViewedOn } : null, error: null }),
      });
      return { r, s: contractorAvailabilityService(r) };
    };
    const fresh = service("2026-01-01");
    expect((await fresh.s.markStaffViewed("a@tl.org")).data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(fresh.r.updateStaffViewed).toHaveBeenCalledWith("item-a@tl.org", expect.any(String));

    const today = (fresh.r.updateStaffViewed as any).mock.calls[0][1];
    const again = service(today);
    await again.s.markStaffViewed("a@tl.org");
    expect(again.r.updateStaffViewed).not.toHaveBeenCalled();

    const none = service(null, false);
    expect((await none.s.markStaffViewed("a@tl.org")).data).toBeNull();
    expect(none.r.updateStaffViewed).not.toHaveBeenCalled();
    expect(none.r.createProfile).not.toHaveBeenCalled();
  });
});
