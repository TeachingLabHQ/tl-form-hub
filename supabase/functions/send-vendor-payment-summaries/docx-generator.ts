import {
  AlignmentType,
  Document,
  HeadingLevel,
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

    const headerRow = new TableRow({
      tableHeader: true,
      children: [
        { label: "Date", align: AlignmentType.LEFT },
        { label: "Task", align: AlignmentType.LEFT },
        { label: "Note", align: AlignmentType.LEFT },
        { label: "Hours", align: AlignmentType.RIGHT },
        { label: "Rate", align: AlignmentType.RIGHT },
        { label: "Subtotal", align: AlignmentType.RIGHT },
      ].map(({ label, align }) =>
        new TableCell({
          shading: { fill: "F2F2F2", type: ShadingType.CLEAR, color: "auto" },
          children: [
            new Paragraph({
              alignment: align,
              children: [new TextRun({ text: label, bold: true, size: 20 })],
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

      return new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: dateDisplay, size: 18 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: entry.task_name, size: 18 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: entry.note ?? "", size: 18 })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: entry.work_hours.toString(), size: 18 })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `$${entry.rate.toFixed(2)}`, size: 18 })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `$${entry.entry_pay.toFixed(2)}`, size: 18 })] })] }),
        ],
      });
    });

    const totalsParagraphs: Paragraph[] = [];
    if (showContentDevelopmentBreakdown) {
      totalsParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: `Total Content Development: $ ${formatMoney(totals.contentDevelopment)}`, size: 22 })],
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: `Total Other Services: $ ${formatMoney(totals.otherServices)}`, size: 22 })],
        }),
      );
    }
    totalsParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: `Total Payment: $ ${formatMoney(personSummary.totalPayForProject)}`, bold: true, size: 26 })],
      }),
    );

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: `${personSummary.cf_name} - Payment Summary`, bold: true })],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: `Project: ${projectName}`, bold: true })],
          }),
          new Paragraph({ children: [new TextRun({ text: `Invoice #: ${invoiceNumber}` })] }),
          new Paragraph({ children: [new TextRun({ text: `Report Month: ${reportMonth}` })] }),
          new Paragraph({ children: [new TextRun({ text: `Invoice Date: ${invoiceDate}` })] }),
          new Paragraph({ children: [new TextRun({ text: "Bill to: Teaching Lab" })] }),
          new Paragraph({ children: [new TextRun({ text: `Coach/Facilitator: ${personSummary.cf_name} (${personSummary.cf_email})` })] }),
          new Paragraph({ children: [new TextRun({ text: `Tier: ${personSummary.cf_tier}` })] }),
          new Paragraph({ text: "" }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...entryRows],
          }),
          new Paragraph({ text: "" }),
          ...totalsParagraphs,
          new Paragraph({ text: "" }),
          new Paragraph({ children: [new TextRun({ text: "This is an automated payment summary from Teaching Lab.", color: "808080", size: 16 })] }),
          new Paragraph({ children: [new TextRun({ text: "Please contact accountspayable@teachinglab.org for any questions.", color: "808080", size: 16 })] }),
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
