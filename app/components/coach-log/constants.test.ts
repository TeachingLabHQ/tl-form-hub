import { describe, expect, it } from "vitest";
import {
  D75_SCHOOL_LEVEL_OPTIONS,
  SCHOOL_LEVEL_OPTIONS,
  schoolLevelOptions,
  shouldShowSchoolLevel,
  shouldShowSubSchool,
} from "./constants";

describe("shouldShowSubSchool", () => {
  it("shows for D75 Solves coaches", () => {
    expect(shouldShowSubSchool("NY_D75", "Solves Coach/D75 Math Coach")).toBe(
      true
    );
  });

  it("hides for other D75 coach types", () => {
    expect(shouldShowSubSchool("NY_D75", "Reads Coach")).toBe(false);
    expect(shouldShowSubSchool("NY_D75", "ELA Coach (non-Reads)")).toBe(false);
    expect(shouldShowSubSchool("NY_D75", "ELA Early Childhood Coach")).toBe(
      false
    );
    expect(
      shouldShowSubSchool("NY_D75", "Math Coach (non-Solves/non-D75)")
    ).toBe(false);
  });

  it("hides for Solves coaches outside D75", () => {
    expect(shouldShowSubSchool("NY_D11", "Solves Coach/D75 Math Coach")).toBe(
      false
    );
  });
});

describe("shouldShowSchoolLevel", () => {
  it("shows for D75 Reads and ELA (non-Reads) coaches at any school", () => {
    expect(shouldShowSchoolLevel("NY_D75", "P123", "Reads Coach")).toBe(true);
    expect(
      shouldShowSchoolLevel("NY_D75", "P123", "ELA Coach (non-Reads)")
    ).toBe(true);
  });

  it("hides for other D75 coach types", () => {
    expect(
      shouldShowSchoolLevel("NY_D75", "P123", "Solves Coach/D75 Math Coach")
    ).toBe(false);
    expect(
      shouldShowSchoolLevel("NY_D75", "P123", "ELA Early Childhood Coach")
    ).toBe(false);
  });

  it("hides for Reads and ELA coaches outside D75", () => {
    expect(shouldShowSchoolLevel("NY_D9", "019", "Reads Coach")).toBe(false);
    expect(
      shouldShowSchoolLevel("NY_D11", "019", "ELA Coach (non-Reads)")
    ).toBe(false);
  });

  it("still shows for D11 Solves coaches at the K-8 schools only", () => {
    expect(
      shouldShowSchoolLevel("NY_D11", "019", "Solves Coach/D75 Math Coach")
    ).toBe(true);
    expect(
      shouldShowSchoolLevel("NY_D11", "999", "Solves Coach/D75 Math Coach")
    ).toBe(false);
  });
});

describe("schoolLevelOptions", () => {
  it("uses the D75 Logistics status labels for D75", () => {
    expect(schoolLevelOptions("NY_D75")).toEqual(D75_SCHOOL_LEVEL_OPTIONS);
    expect(D75_SCHOOL_LEVEL_OPTIONS).toEqual([
      "Elementary School",
      "Middle School",
    ]);
  });

  it("keeps the D11 options unchanged", () => {
    expect(schoolLevelOptions("NY_D11")).toEqual(SCHOOL_LEVEL_OPTIONS);
  });
});
