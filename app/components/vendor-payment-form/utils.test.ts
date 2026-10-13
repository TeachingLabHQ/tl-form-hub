import { describe, expect, it } from "vitest";
import { isQuarterHourIncrement } from "./utils";

describe("isQuarterHourIncrement", () => {
  it("accepts whole 15-minute increments", () => {
    for (const h of ["0.25", "0.5", "0.75", "1", "1.5", "2.75", "16"]) {
      expect(isQuarterHourIncrement(h)).toBe(true);
    }
  });

  it("rejects values that aren't 15-minute increments", () => {
    for (const h of ["1.1", "0.1", "2.33", "0.2"]) {
      expect(isQuarterHourIncrement(h)).toBe(false);
    }
  });

  it("rejects empty, zero, negative and non-numeric input", () => {
    for (const h of ["", " ", "0", "-0.25", "abc"]) {
      expect(isQuarterHourIncrement(h)).toBe(false);
    }
  });
});
