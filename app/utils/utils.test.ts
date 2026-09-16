import { describe, expect, it } from "vitest";
import { formatDate } from "./utils";

describe("formatDate", () => {
  // The form sends UTC noon so the day can't shift; taking the text as-is
  // keeps the Date column on the day the user picked
  it("takes the date part of a UTC-noon ISO string without parsing it", () => {
    expect(formatDate("2026-09-07T12:00:00.000Z")).toBe("2026-09-07");
  });

  it("leaves an already-plain date alone", () => {
    expect(formatDate("2026-09-07")).toBe("2026-09-07");
  });

  it("does not shift the day for a late-evening US timestamp", () => {
    expect(formatDate("2026-09-07T23:30:00.000Z")).toBe("2026-09-07");
  });
});
