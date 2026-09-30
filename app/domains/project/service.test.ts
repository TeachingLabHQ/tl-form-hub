import { describe, expect, it, vi } from "vitest";
import type { ProjectRepository } from "./repository";
import { projectService } from "./service";

const row = (id: string, employeeId: string, email: string, project: string) => ({
  id,
  name: `row ${id}`,
  column_values: [
    { id: "lookup_mkpvs1wj", display_value: employeeId },
    { id: "lookup_mm5b2k23", display_value: email },
    { id: "dropdown_mm5h458x", text: project },
    { id: "color_mknhq0s3", label: "Contributor" },
    { id: "numeric_mknhqm6d", text: "4" },
  ],
});

const repo = (overrides: Partial<ProjectRepository>): ProjectRepository => ({
  fetchAllProjects: vi.fn(),
  fetchProgramProjects: vi.fn(),
  fetchAllBudgetedHours: vi.fn(async () => ({ data: [], error: null })),
  fetchBudgetedHoursByEmail: vi.fn(async () => ({ data: [], error: null })),
  fetchProjectSourceNames: vi.fn(),
  ...overrides,
});

describe("fetchBudgetedHoursByEmployee", () => {
  it("uses the email-scoped query and skips the full scan when it finds rows", async () => {
    const r = repo({
      fetchBudgetedHoursByEmail: vi.fn(async () => ({
        data: [row("1", "E1", "Me@TeachingLab.org", "Proj A")],
        error: null,
      })),
    });

    const { data } = await projectService(r).fetchBudgetedHoursByEmployee("E1", " Me@TeachingLab.org ");

    expect(r.fetchBudgetedHoursByEmail).toHaveBeenCalledWith("me@teachinglab.org");
    expect(r.fetchAllBudgetedHours).not.toHaveBeenCalled();
    expect(data?.map((d) => d.projectName)).toEqual(["Proj A"]);
  });

  it("falls back to the full scan when the scoped query finds nothing", async () => {
    const r = repo({
      fetchAllBudgetedHours: vi.fn(async () => ({
        data: [row("1", "E1", "other@teachinglab.org", "Proj A"), row("2", "E2", "x@teachinglab.org", "Proj B")],
        error: null,
      })),
    });

    const { data } = await projectService(r).fetchBudgetedHoursByEmployee("E1", "me@teachinglab.org");

    expect(r.fetchAllBudgetedHours).toHaveBeenCalledOnce();
    expect(data?.map((d) => d.projectName)).toEqual(["Proj A"]);
  });

  it("falls back to the full scan when the scoped query errors", async () => {
    const r = repo({
      fetchBudgetedHoursByEmail: vi.fn(async () => ({ data: null, error: new Error("boom") })),
      fetchAllBudgetedHours: vi.fn(async () => ({
        data: [row("1", "E1", "me@teachinglab.org", "Proj A")],
        error: null,
      })),
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { data, error } = await projectService(r).fetchBudgetedHoursByEmployee("E1", "me@teachinglab.org");

    expect(error).toBeNull();
    expect(data?.map((d) => d.projectName)).toEqual(["Proj A"]);
  });

  it("goes straight to the full scan when there is no email", async () => {
    const r = repo({
      fetchAllBudgetedHours: vi.fn(async () => ({ data: [row("1", "E1", "", "Proj A")], error: null })),
    });

    const { data } = await projectService(r).fetchBudgetedHoursByEmployee("E1", null);

    expect(r.fetchBudgetedHoursByEmail).not.toHaveBeenCalled();
    expect(data?.map((d) => d.projectName)).toEqual(["Proj A"]);
  });
});
