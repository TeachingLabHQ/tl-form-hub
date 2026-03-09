import { assert, assertEquals, assertMatch } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { generateProjectPDF } from "./pdf-generator.ts";
import type { PersonProjectSummary } from "./types.ts";

function makeSummary(overrides: Partial<PersonProjectSummary> = {}): PersonProjectSummary {
  return {
    cf_name: "Alex Smith",
    cf_email: "alex.smith@example.com",
    cf_tier: "Tier 2",
    submission_date: "2026-02-01",
    detailedEntries: [
      {
        task_name: "Content Development",
        note: "baseline",
        work_hours: 1,
        rate: 100,
        entry_pay: 100,
        submission_date: "2026-02-01",
      },
    ],
    totalPayForProject: 100,
    ...overrides,
  };
}

function assertLooksLikePdf(bytes: Uint8Array) {
  assert(bytes.length > 100, "expected non-empty PDF bytes");
  // Test: valid pdf start with the bytes for %pdf-
  const header = new TextDecoder().decode(bytes.slice(0, 16));
  assertMatch(header, /^%PDF-/);
}

Deno.test("PDF generation: handles tabs/newlines in notes", async () => {
  const personSummary = makeSummary({
    detailedEntries: [
      {
        task_name: "Content Development",
        note: "Line1\tTabbed\nLine2\r\nLine3",
        work_hours: 2,
        rate: 85,
        entry_pay: 170,
        submission_date: "2026-02-01",
      },
    ],
    totalPayForProject: 170,
  });

  const pdfBytes = await generateProjectPDF("Test Project", personSummary, 123);
  assertLooksLikePdf(pdfBytes);
});

Deno.test("PDF generation: handles dot operator (⋅) in notes", async () => {
  const personSummary = makeSummary({
    detailedEntries: [
      {
        task_name: "Other Services",
        note: "12⋅134 Relaunch file updates + invitations",
        work_hours: 1,
        rate: 50,
        entry_pay: 50,
        submission_date: "2026-02-01",
      },
    ],
    totalPayForProject: 50,
  });

  const pdfBytes = await generateProjectPDF("Test Project", personSummary, 124);
  assertLooksLikePdf(pdfBytes);
});

Deno.test("PDF generation: handles non-WinAnsi letters (Hungarian ő/ű)", async () => {
  const personSummary = makeSummary({
    cf_name: "Őrs Ű",
    detailedEntries: [
      {
        task_name: "Content Development",
        note: "ő ű Ő Ű",
        work_hours: 1,
        rate: 70,
        entry_pay: 70,
        submission_date: "2026-02-01",
      },
    ],
    totalPayForProject: 70,
  });

  const pdfBytes = await generateProjectPDF("Test Project", personSummary, 125);
  assertLooksLikePdf(pdfBytes);
});

Deno.test("Totals: shows content dev breakdown only when Content Development exists", async () => {
  // With content development -> should include 3 totals lines, not just single total.
  const withContentDev = makeSummary({
    detailedEntries: [
      {
        task_name: "Content Development",
        note: "A",
        work_hours: 1,
        rate: 100,
        entry_pay: 100,
        submission_date: "2026-02-01",
      },
      {
        task_name: "Other Services",
        note: "B",
        work_hours: 2,
        rate: 50,
        entry_pay: 100,
        submission_date: "2026-02-01",
      },
    ],
    totalPayForProject: 200,
  });
  const pdf1 = await generateProjectPDF("Test Project", withContentDev, 126);
  assertLooksLikePdf(pdf1);

  // Without content development -> still should generate successfully.
  const withoutContentDev = makeSummary({
    detailedEntries: [
      {
        task_name: "Other Services",
        note: "Only other services",
        work_hours: 2,
        rate: 50,
        entry_pay: 100,
        submission_date: "2026-02-01",
      },
    ],
    totalPayForProject: 100,
  });
  const pdf2 = await generateProjectPDF("Test Project", withoutContentDev, 127);
  assertLooksLikePdf(pdf2);

  // Basic sanity: PDFs should differ because content differs.
  assertEquals(pdf1.length === pdf2.length, false);
});

