import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "https://esm.sh/docx@8.5.0";
import { PersonProjectSummary } from "./types.ts";

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDateOnlyNoTz(input: string): string {
  const datePart = input.split("T")[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return input;
  const [y, m, d] = datePart.split("-");
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthName = monthNames[Number(m) - 1] || m;
  return `${monthName} ${Number(d)}, ${y}`;
}

function isContentDevelopmentTask(taskName: string): boolean {
  return taskName.trim().replace(/^task\s*[–-]\s*/i, "").trim().toLowerCase() === "content development";
}

// A4 content width with 1" margins: (8.27 - 2) * 1440 = 9029 DXA
// Column proportions match the PDF: 15% / 25% / 25% / 12% / 11% / 12%
const COL_WIDTHS_DXA = [1354, 2257, 2257, 1083, 993, 1083];

export async function generateProjectDocx(
  projectName: string,
  personSummary: PersonProjectSummary,
  logId: number | null,
): Promise<Uint8Array> {
  console.log(`Starting DOCX generation for ${personSummary.cf_email} on project: ${projectName}`);

  try {
    const currentDate = new Date();
    const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const reportMonth = previousMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    const lastDayOfPreviousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    const invoiceDate = lastDayOfPreviousMonth.toLocaleDateString();
    const invoiceNumber = logId ? logId.toString() : Date.now().toString();

    const sortedEntries = [...personSummary.detailedEntries].sort((a, b) => {
      const dateA = (a.submission_date ?? "").split("T")[0];
      const dateB = (b.submission_date ?? "").split("T")[0];
      return dateA.localeCompare(dateB);
    });

    const totals = personSummary.detailedEntries.reduce(
      (acc, entry) => {
        const pay = typeof entry.entry_pay === "number" && !Number.isNaN(entry.entry_pay) ? entry.entry_pay : 0;
        if (isContentDevelopmentTask(entry.task_name)) {
          acc.contentDevelopment += pay;
        } else {
          acc.otherServices += pay;
        }
        return acc;
      },
      { contentDevelopment: 0, otherServices: 0 },
    );
    const showContentDevelopmentBreakdown = totals.contentDevelopment > 0;

    const headerCols = [
      { label: "Date",     align: AlignmentType.LEFT },
      { label: "Task",     align: AlignmentType.LEFT },
      { label: "Note",     align: AlignmentType.LEFT },
      { label: "Hours",    align: AlignmentType.RIGHT },
      { label: "Rate",     align: AlignmentType.RIGHT },
      { label: "Subtotal", align: AlignmentType.RIGHT },
    ];

    const headerRow = new TableRow({
      tableHeader: true,
      children: headerCols.map(({ label, align }, i) =>
        new TableCell({
          width: { size: COL_WIDTHS_DXA[i], type: WidthType.DXA },
          shading: { fill: "F2F2F2", type: ShadingType.CLEAR, color: "auto" },
          children: [
            new Paragraph({
              alignment: align,
              children: [new TextRun({ text: label, bold: true, size: 22, color: "000000" })],
            }),
          ],
        })
      ),
    });

    const entryRows = sortedEntries.map((entry) => {
      let dateDisplay = "";
      if (entry.submission_date) {
        dateDisplay = formatDateOnlyNoTz(entry.submission_date);
      } else if (personSummary.submission_date) {
        dateDisplay = formatDateOnlyNoTz(personSummary.submission_date);
      }

      const cell = (text: string, align = AlignmentType.LEFT, colIndex: number) =>
        new TableCell({
          width: { size: COL_WIDTHS_DXA[colIndex], type: WidthType.DXA },
          children: [new Paragraph({ alignment: align, children: [new TextRun({ text, size: 20, color: "000000" })] })],
        });

      return new TableRow({
        children: [
          cell(dateDisplay,                       AlignmentType.LEFT,  0),
          cell(entry.task_name,                   AlignmentType.LEFT,  1),
          cell(entry.note ?? "",                  AlignmentType.LEFT,  2),
          cell(entry.work_hours.toString(),        AlignmentType.RIGHT, 3),
          cell(`$${entry.rate.toFixed(2)}`,        AlignmentType.RIGHT, 4),
          cell(`$${entry.entry_pay.toFixed(2)}`,   AlignmentType.RIGHT, 5),
        ],
      });
    });

    const totalsParagraphs: Paragraph[] = [];
    if (showContentDevelopmentBreakdown) {
      totalsParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: `Total Content Development: $ ${formatMoney(totals.contentDevelopment)}`, size: 24, color: "000000" })],
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: `Total Other Services: $ ${formatMoney(totals.otherServices)}`, size: 24, color: "000000" })],
        }),
      );
    }
    totalsParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: `Total Payment: $ ${formatMoney(personSummary.totalPayForProject)}`, bold: true, size: 28, color: "000000" })],
      }),
    );

    const doc = new Document({
      sections: [{
        children: [
          // Title — plain bold paragraph, no Word heading style
          new Paragraph({
            spacing: { after: 160 },
            children: [new TextRun({ text: `${personSummary.cf_name} - Payment Summary`, bold: true, size: 40, color: "000000" })],
          }),
          new Paragraph({
            spacing: { after: 160 },
            children: [new TextRun({ text: `Project: ${projectName}`, bold: true, size: 32, color: "000000" })],
          }),
          new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: `Invoice #: ${invoiceNumber}`, size: 24, color: "000000" })] }),
          new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: `Report Month: ${reportMonth}`, size: 24, color: "000000" })] }),
          new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: `Invoice Date: ${invoiceDate}`, size: 24, color: "000000" })] }),
          new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Bill to: Teaching Lab", size: 24, color: "000000" })] }),
          new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: `Coach/Facilitator: ${personSummary.cf_name} (${personSummary.cf_email})`, size: 24, color: "000000" })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Tier: ${personSummary.cf_tier}`, size: 24, color: "000000" })] }),
          new Paragraph({ text: "" }),
          new Table({
            width: { size: 9027, type: WidthType.DXA },
            columnWidths: COL_WIDTHS_DXA,
            rows: [headerRow, ...entryRows],
          }),
          new Paragraph({ text: "" }),
          ...totalsParagraphs,
          new Paragraph({ text: "" }),
          new Paragraph({ children: [new TextRun({ text: "This is an automated payment summary from Teaching Lab.", color: "808080", size: 18 })] }),
          new Paragraph({ children: [new TextRun({ text: "Please contact accountspayable@teachinglab.org for any questions.", color: "808080", size: 18 })] }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    console.log(`DOCX generated successfully for ${personSummary.cf_email} / ${projectName}, size: ${bytes.length} bytes`);
    return bytes;
  } catch (error) {
    console.error(`Error generating DOCX for ${personSummary.cf_email} on project ${projectName}:`, error);
    throw error;
  }
}
