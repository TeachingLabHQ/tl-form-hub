import { describe, expect, it } from "vitest";
import {
  DURATION_OPTIONS,
  GROUP_DURATION_OPTIONS,
  shouldShowSubSchool,
} from "./constants";

describe("shouldShowSubSchool", () => {
  it("shows for D75 Reads and Solves coaches", () => {
    expect(shouldShowSubSchool("NY_D75", "Reads Coach")).toBe(true);
    expect(shouldShowSubSchool("NY_D75", "Solves Coach/D75 Math Coach")).toBe(
      true
    );
  });

  it("hides for other D75 coach types", () => {
    expect(shouldShowSubSchool("NY_D75", "ELA Coach (non-Reads)")).toBe(false);
    expect(shouldShowSubSchool("NY_D75", "ELA Early Childhood Coach")).toBe(
      false
    );
    expect(
      shouldShowSubSchool("NY_D75", "Math Coach (non-Solves/non-D75)")
    ).toBe(false);
  });

  it("hides for Reads and Solves coaches outside D75", () => {
    expect(shouldShowSubSchool("NY_D9", "Reads Coach")).toBe(false);
    expect(shouldShowSubSchool("NY_D11", "Solves Coach/D75 Math Coach")).toBe(
      false
    );
  });
});

describe("GROUP_DURATION_OPTIONS", () => {
  it("extends the shared durations up to 480 in 30-min steps", () => {
    expect(GROUP_DURATION_OPTIONS.slice(0, DURATION_OPTIONS.length)).toEqual(
      DURATION_OPTIONS
    );
    expect(GROUP_DURATION_OPTIONS.slice(DURATION_OPTIONS.length)).toEqual([
      "210", "240", "270", "300", "330", "360", "390", "420", "450", "480",
    ]);
  });

  it("leaves the 1:1 durations capped at 180", () => {
    expect(DURATION_OPTIONS.at(-1)).toBe("180");
  });
});
