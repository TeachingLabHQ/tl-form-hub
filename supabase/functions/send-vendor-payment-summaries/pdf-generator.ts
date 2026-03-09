import { PDFDocument, PDFPage, PDFFont, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import fontkit from "https://esm.sh/@pdf-lib/fontkit@1.1.1";
import { PersonProjectSummary } from "./types.ts";


// Helper function to draw a line
function drawLine(page: PDFPage, startX: number, startY: number, endX: number, endY: number) {
  page.drawLine({
    start: { x: startX, y: startY },
    end: { x: endX, y: endY },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });
}

// Notes can include pasted control chars (tabs, etc.) that WinAnsi can't encode.
// Sanitize notes before measuring/drawing to prevent PDF generation crashes.
function sanitizeNoteForWinAnsi(text: string): string {
  return (
    text
      // collapse line breaks and tabs to spaces
      .replace(/[\t\r\n]+/g, " ")
      // strip remaining ASCII control chars (except space)
      // deno-lint-ignore no-control-regex
      .replace(new RegExp("[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]", "g"), "")
  );
}

const NOTO_SANS_REGULAR_URL =
  "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf";
const NOTO_SANS_BOLD_URL =
  "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf";

let cachedNotoSansRegularBytes: Uint8Array | null = null;
let cachedNotoSansBoldBytes: Uint8Array | null = null;

async function getNotoSansRegularBytes(): Promise<Uint8Array> {
  if (cachedNotoSansRegularBytes) return cachedNotoSansRegularBytes;
  const res = await fetch(NOTO_SANS_REGULAR_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch Noto Sans Regular font: ${res.status} ${res.statusText}`);
  }
  cachedNotoSansRegularBytes = new Uint8Array(await res.arrayBuffer());
  return cachedNotoSansRegularBytes;
}

async function getNotoSansBoldBytes(): Promise<Uint8Array> {
  if (cachedNotoSansBoldBytes) return cachedNotoSansBoldBytes;
  const res = await fetch(NOTO_SANS_BOLD_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch Noto Sans Bold font: ${res.status} ${res.statusText}`);
  }
  cachedNotoSansBoldBytes = new Uint8Array(await res.arrayBuffer());
  return cachedNotoSansBoldBytes;
}

function sanitizeTextForFont(text: string, font: PDFFont, fontSize: number): string {
  // If the font can't encode a glyph, replace it with a visible ASCII marker to avoid crashing PDF generation.
  let out = "";
  for (const ch of [...text]) {
    try {
      font.widthOfTextAtSize(ch, fontSize);
      out += ch;
    } catch {
      out += "[?]";
    }
  }
  return out;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function normalizeTaskName(taskName: string): string {
  return taskName
    .trim()
    // Strip common "Task - " / "Task – " prefixes if present
    .replace(/^task\s*[–-]\s*/i, "")
    .trim();
}

function isContentDevelopmentTask(taskName: string): boolean {
  const normalized = normalizeTaskName(taskName).toLowerCase();
  return normalized === "content development";
}

// Helper function to position text based on alignment
function positionText(x: number, width: number, text: string, font: PDFFont, fontSize: number, alignment = 'left'): number {
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  if (alignment === 'right') {
    return x + width - textWidth - 10; // 10px padding from right
  } else {
    return x + 10; // 10px padding from left
  }
}

// Helper function to wrap text
function wrapText(text: string, maxWidth: number, font: PDFFont, fontSize: number, sanitize = false): string[] {
  const normalized = sanitize ? sanitizeNoteForWinAnsi(text) : text;
  const safe = sanitizeTextForFont(normalized, font, fontSize);
  const words = safe.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      // If single word is too long, force wrap it
      if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
        let partialWord = '';
        for (let j = 0; j < word.length; j++) {
          const testChar = partialWord + word[j];
          if (font.widthOfTextAtSize(testChar, fontSize) <= maxWidth) {
            partialWord = testChar;
          } else {
            lines.push(partialWord);
            partialWord = word[j];
          }
        }
        if (partialWord) {
          currentLine = partialWord;
        }
      } else {
        currentLine = word;
      }
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

// Helper function to calculate row height based on content
function calculateRowHeight(linesPerColumn: string[][], baseHeight: number): number {
  const maxLines = linesPerColumn.reduce((max, lines) => Math.max(max, lines.length), 0);
  return Math.max(baseHeight, maxLines * 14 + 15); // Adjusted line height and padding
}
//safety net
// Expecting a Postgres DATE-like value "YYYY-MM-DD" (no timezone).
// If we ever get an ISO string, strip the time portion and format the date part only.
function formatDateOnlyNoTz(input: string): string {
  const datePart = input.split("T")[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return input;

  const [y, m, d] = datePart.split("-");
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const monthName = monthNames[Number(m) - 1] || m;
  return `${monthName} ${Number(d)}, ${y}`;
}

// Helper function to generate invoice number from log ID
function generateInvoiceNumber(logId: number): string {
  return logId.toString();
}

// --- PDF Generation Function for Per-Person Summary ---
export async function generateProjectPDF(projectName: string, personSummary: PersonProjectSummary, logId: number|null): Promise<Uint8Array> {
  console.log(`Starting PDF generation for ${personSummary.cf_email} on project: ${projectName}`);
  try {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595, 842]); // A4 size
    pdfDoc.registerFontkit(fontkit);
    const [notoRegularBytes, notoBoldBytes] = await Promise.all([
      getNotoSansRegularBytes(),
      getNotoSansBoldBytes(),
    ]);
    const notoSansRegular = await pdfDoc.embedFont(notoRegularBytes, { subset: true });
    const notoSansBold = await pdfDoc.embedFont(notoBoldBytes, { subset: true });

    const margin = 50;
    const contentBottomMargin = margin + 60; // Space for total/footer
    const pageWidth = page.getWidth() - 2 * margin;
    const baseLineHeight = 18;
    let y = page.getHeight() - margin;

    // Title
    page.drawText(`${personSummary.cf_name} - Payment Summary`, {
      x: margin,
      y,
      size: 20,
      font: notoSansBold,
      color: rgb(0, 0, 0),
    });
    y -= baseLineHeight * 1.5;

    // Generate unique invoice number
    const invoiceNumber = logId 
      ? generateInvoiceNumber(logId)
      : Date.now().toString(); // Fallback if no logId provided

    // Subtitle - Personal Summary for Project
    page.drawText(`Project: ${projectName}`, {
      x: margin,
      y,
      size: 16,
      font: notoSansBold,
      color: rgb(0, 0, 0),
    });
    y -= baseLineHeight * 1.5;

    // Invoice Number
    page.drawText(`Invoice #: ${invoiceNumber}`, {
      x: margin,
      y,
      size: 12,
      font: notoSansRegular,
      color: rgb(0, 0, 0),
    });
    y -= baseLineHeight * 1.2;

    // Report Month and Invoice Date (previous month)
    const currentDate = new Date();
    const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const reportMonth = previousMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const lastDayOfPreviousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    const invoiceDate = lastDayOfPreviousMonth.toLocaleDateString();
    
    page.drawText(`Report Month: ${reportMonth}`, {
        x: margin,
        y,
        size: 12,
        font: notoSansRegular,
    });
    y -= baseLineHeight * 1.2;

    // Invoice Date (last day of report month)
    page.drawText(`Invoice Date: ${invoiceDate}`, {
        x: margin,
        y,
        size: 12,
        font: notoSansRegular,
    });
    y -= baseLineHeight * 1.2;

    // Add Bill to information
    page.drawText("Bill to: Teaching Lab", {
        x: margin,
        y,
        size: 12,
        font: notoSansRegular,
    });
    y -= baseLineHeight * 1.2;

    // Person Details
    page.drawText(`Coach/Facilitator: ${personSummary.cf_name} (${personSummary.cf_email})`, {
        x: margin,
        y,
        size: 12,
        font: notoSansRegular,
    });
    y -= baseLineHeight * 1.0;

    // Tier (with text wrapping)
    const tierText = `Tier: ${personSummary.cf_tier}`;
    const tierLines = wrapText(tierText, pageWidth - 20, notoSansRegular, 12); // 20px margin buffer
    tierLines.forEach((line, index) => {
        page.drawText(line, {
            x: margin,
            y: y - (index * baseLineHeight),
            size: 12,
            font: notoSansRegular,
        });
    });
    y -= (tierLines.length * baseLineHeight) + baseLineHeight; // Adjust y position and add space before table

    // Sort entries by date (oldest first)
    const sortedEntries = [...personSummary.detailedEntries].sort((a, b) => {
      const dateA = (a.submission_date ?? "").split("T")[0];
      const dateB = (b.submission_date ?? "").split("T")[0];
      return dateA.localeCompare(dateB); // From oldest to newest
    });

    // Define table columns (Date, Task, Note, Hours, Rate, Subtotal)
    const columns = [
      { header: "Date", width: pageWidth * 0.15, align: 'left' },
      { header: "Task", width: pageWidth * 0.25, align: 'left' },
      { header: "Note", width: pageWidth * 0.25, align: 'left' },
      { header: "Hours", width: pageWidth * 0.12, align: 'right' },
      { header: "Rate", width: pageWidth * 0.11, align: 'right' },
      { header: "Subtotal", width: pageWidth * 0.12, align: 'right' }
    ];

    // Calculate starting positions for each column
    const columnPositions: number[] = [];
    let currentX = margin;
    columns.forEach(column => {
      columnPositions.push(currentX);
      currentX += column.width;
    });

    // Function to draw table header (remains largely the same)
    const drawTableHeader = (currentPage: PDFPage, startY: number): number => {
        const headerHeight = baseLineHeight * 1.5;
        currentPage.drawRectangle({
          x: margin,
          y: startY - headerHeight + 5,
          width: pageWidth,
          height: headerHeight,
          color: rgb(0.95, 0.95, 0.95),
        });

        columns.forEach((column, i) => {
          const textX = positionText(columnPositions[i], column.width, column.header, notoSansBold, 11, column.align);
          currentPage.drawText(column.header, {
            x: textX,
            y: startY - (headerHeight / 2) + 1,
            size: 11,
            font: notoSansBold,
            color: rgb(0, 0, 0),
          });
        });
        const newY = startY - headerHeight + 5;
        drawLine(currentPage, margin, newY, margin + pageWidth, newY); // Line below header
        return newY;
    };

    // Draw initial table header
    y = drawTableHeader(page, y);

    // Draw table rows for each entry of the person
    sortedEntries.forEach((entry) => {
      // Calculate dynamic row height based on Task + Note column wrapping
      const wrapWidthMargin = 15;
      const taskLines = wrapText(entry.task_name, columns[1].width - wrapWidthMargin, notoSansRegular, 10);
      const noteText = typeof entry.note === "string" ? entry.note : "";
      const noteLines = noteText
        ? wrapText(noteText, columns[2].width - wrapWidthMargin, notoSansRegular, 10, true)
        : [];
      const rowHeight = calculateRowHeight([taskLines, noteLines], baseLineHeight * 1.2);

      // Check for page break before drawing the row
      if (y - rowHeight < contentBottomMargin) {
        page = pdfDoc.addPage([595, 842]);
        y = page.getHeight() - margin;
        y = drawTableHeader(page, y);
      }

      const rowStartY = y;
      const textOffsetY = 14;

      // Format the date (if available)
      let dateDisplay = '';
      if (entry.submission_date) {
        dateDisplay = formatDateOnlyNoTz(entry.submission_date);
      } else if (personSummary.submission_date) {
        // Fall back to the person's submission date if entry doesn't have one
        dateDisplay = formatDateOnlyNoTz(personSummary.submission_date);
      }

      // Draw Date column
      page.drawText(dateDisplay, {
        x: columnPositions[0] + 10, // Left align with padding
        y: rowStartY - textOffsetY,
        size: 10,
        font: notoSansRegular,
        color: rgb(0, 0, 0),
      });

      // Draw Task column (wrapped)
      taskLines.forEach((line, i) => {
        page.drawText(line, {
          x: columnPositions[1] + 10, // Left align with padding
          y: rowStartY - textOffsetY - (i * 12),
          size: 10,
          font: notoSansRegular,
          color: rgb(0, 0, 0),
        });
      });

      // Draw Note column (wrapped)
      noteLines.forEach((line, i) => {
        page.drawText(sanitizeNoteForWinAnsi(line), {
          x: columnPositions[2] + 10, // Left align with padding
          y: rowStartY - textOffsetY - (i * 12),
          size: 10,
          font: notoSansRegular,
          color: rgb(0, 0, 0),
        });
      });

      // Draw Hours, Rate, Subtotal columns (numeric, right-aligned)
      const numericValues = [
        { value: entry.work_hours.toString(), columnIndex: 3 },
        { value: `$${entry.rate.toFixed(2)}`, columnIndex: 4 },
        { value: `$${entry.entry_pay.toFixed(2)}`, columnIndex: 5 }
      ];

      numericValues.forEach(({ value, columnIndex }) => {
        const textX = positionText(columnPositions[columnIndex], columns[columnIndex].width, value, notoSansRegular, 10, 'right');
        page.drawText(value, {
          x: textX,
          y: rowStartY - textOffsetY,
          size: 10,
          font: notoSansRegular,
          color: rgb(0, 0, 0),
        });
      });

      // Draw cell borders (vertical lines)
      drawLine(page, margin, rowStartY, margin, rowStartY - rowHeight); // Leftmost
      columns.forEach((_, index) => {
          if (index > 0) {
            drawLine(page, columnPositions[index], rowStartY, columnPositions[index], rowStartY - rowHeight);
          }
      });
      drawLine(page, margin + pageWidth, rowStartY, margin + pageWidth, rowStartY - rowHeight); // Rightmost
      // Draw bottom border for the row
      drawLine(page, margin, rowStartY - rowHeight, margin + pageWidth, rowStartY - rowHeight);

      y -= rowHeight;
    });

    // Add total for this person on this project
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

    // Only show the content-dev breakdown for tiered content development tasks (detected by presence of that task).
    const showContentDevelopmentBreakdown = totals.contentDevelopment > 0;

    const regularTotalLineHeight = baseLineHeight * 1.35;
    const boldTotalLineHeight = baseLineHeight * 1.5;
    const neededHeight = showContentDevelopmentBreakdown
      ? (regularTotalLineHeight * 2 + boldTotalLineHeight)
      : boldTotalLineHeight;

    if (y - neededHeight < contentBottomMargin) {
      page = pdfDoc.addPage([595, 842]);
      y = page.getHeight() - margin;
    }

    const totalsLabelX = margin + pageWidth * 0.55;
    const drawTotalsRow = (
      label: string,
      amount: number,
      font: PDFFont,
      size: number,
      lineHeight: number,
    ) => {
      y -= lineHeight;
      page.drawText(label, {
        x: totalsLabelX,
        y,
        size,
        font,
        color: rgb(0, 0, 0),
      });

      const amountText = `$ ${formatMoney(amount)}`;
      const amountX = positionText(margin, pageWidth, amountText, font, size, "right");
      page.drawText(amountText, {
        x: amountX,
        y,
        size,
        font,
        color: rgb(0, 0, 0),
      });
    };

    if (showContentDevelopmentBreakdown) {
      drawTotalsRow("Total Content Development:", totals.contentDevelopment, notoSansRegular, 12, regularTotalLineHeight);
      drawTotalsRow("Total Other Services:", totals.otherServices, notoSansRegular, 12, regularTotalLineHeight);
      drawTotalsRow("Total Payment:", personSummary.totalPayForProject, notoSansBold, 14, boldTotalLineHeight);
    } else {
      // Backwards-compatible single-line total
      y -= boldTotalLineHeight;
      const totalText = `Total Payment: $ ${formatMoney(personSummary.totalPayForProject)}`;
      const totalX = positionText(margin, pageWidth, totalText, notoSansBold, 14, "right");
      page.drawText(totalText, {
        x: totalX,
        y,
        size: 14,
        font: notoSansBold,
        color: rgb(0, 0, 0),
      });
    }

    // Add footer (remains the same)
    const footerY = margin / 2;
    const footerText1 = "This is an automated payment summary from Teaching Lab.";
    const supportEmail = "accountspayable@teachinglab.org";
    const footerText2 = `Please contact ${supportEmail} for any questions.`;
    // Need to ensure footer is drawn on the *last* page used
    const lastPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
    lastPage.drawText(footerText1, { x: margin, y: footerY + 12, size: 9, font: notoSansRegular, color: rgb(0.5, 0.5, 0.5) });
    lastPage.drawText(footerText2, { x: margin, y: footerY, size: 9, font: notoSansRegular, color: rgb(0.5, 0.5, 0.5) });

    // Save the PDF
    console.log(`Saving PDF for ${personSummary.cf_email} / ${projectName}...`);
    const pdfBytes = await pdfDoc.save();
    console.log(`PDF generated successfully for ${personSummary.cf_email} / ${projectName}, size: ${pdfBytes.length} bytes`);
    return pdfBytes;

  } catch (error) {
    console.error(`Error generating PDF for ${personSummary.cf_email} on project ${projectName}:`, error);
    throw error;
  }
}



