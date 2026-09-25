import { describe, expect, it } from "vitest";
import { shouldShowSubSchool } from "./constants";

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
