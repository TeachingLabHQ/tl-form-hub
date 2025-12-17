import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import { PersonProjectSummary } from "./index.ts";


// Helper function to draw a line
function drawLine(page: any, startX: number, startY: number, endX: number, endY: number) {
  page.drawLine({
    start: { x: startX, y: startY },
    end: { x: endX, y: endY },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });
}

// Helper function to position text based on alignment
function positionText(x: number, width: number, text: string, font: any, fontSize: number, alignment = 'left'): number {
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  if (alignment === 'right') {
    return x + width - textWidth - 10; // 10px padding from right
  } else {
    return x + 10; // 10px padding from left
  }
}

// Helper function to wrap text
function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  const words = text.split(' ');
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
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

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
      font: helveticaBold,
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
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    y -= baseLineHeight * 1.5;

    // Invoice Number
    page.drawText(`Invoice #: ${invoiceNumber}`, {
      x: margin,
      y,
      size: 12,
      font: helveticaFont,
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
        font: helveticaFont,
    });
    y -= baseLineHeight * 1.2;

    // Invoice Date (last day of report month)
    page.drawText(`Invoice Date: ${invoiceDate}`, {
        x: margin,
        y,
        size: 12,
        font: helveticaFont,
    });
    y -= baseLineHeight * 1.2;

    // Add Bill to information
    page.drawText("Bill to: Teaching Lab", {
        x: margin,
        y,
        size: 12,
        font: helveticaFont,
    });
    y -= baseLineHeight * 1.2;

    // Person Details
    page.drawText(`Coach/Facilitator: ${personSummary.cf_name} (${personSummary.cf_email})`, {
        x: margin,
        y,
        size: 12,
        font: helveticaFont,
    });
    y -= baseLineHeight * 1.0;

    // Tier (with text wrapping)
    const tierText = `Tier: ${personSummary.cf_tier}`;
    const tierLines = wrapText(tierText, pageWidth - 20, helveticaFont, 12); // 20px margin buffer
    tierLines.forEach((line, index) => {
        page.drawText(line, {
            x: margin,
            y: y - (index * baseLineHeight),
            size: 12,
            font: helveticaFont,
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
    const drawTableHeader = (currentPage: any, startY: number): number => {
        const headerHeight = baseLineHeight * 1.5;
        currentPage.drawRectangle({
          x: margin,
          y: startY - headerHeight + 5,
          width: pageWidth,
          height: headerHeight,
          color: rgb(0.95, 0.95, 0.95),
        });

        columns.forEach((column, i) => {
          const textX = positionText(columnPositions[i], column.width, column.header, helveticaBold, 11, column.align);
          currentPage.drawText(column.header, {
            x: textX,
            y: startY - (headerHeight / 2) + 1,
            size: 11,
            font: helveticaBold,
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
      const taskLines = wrapText(entry.task_name, columns[1].width - wrapWidthMargin, helveticaFont, 10);
      const noteText = typeof entry.note === "string" ? entry.note : "";
      const noteLines = noteText
        ? wrapText(noteText, columns[2].width - wrapWidthMargin, helveticaFont, 10)
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
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });

      // Draw Task column (wrapped)
      taskLines.forEach((line, i) => {
        page.drawText(line, {
          x: columnPositions[1] + 10, // Left align with padding
          y: rowStartY - textOffsetY - (i * 12),
          size: 10,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });
      });

      // Draw Note column (wrapped)
      noteLines.forEach((line, i) => {
        page.drawText(line, {
          x: columnPositions[2] + 10, // Left align with padding
          y: rowStartY - textOffsetY - (i * 12),
          size: 10,
          font: helveticaFont,
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
        const textX = positionText(columnPositions[columnIndex], columns[columnIndex].width, value, helveticaFont, 10, 'right');
        page.drawText(value, {
          x: textX,
          y: rowStartY - textOffsetY,
          size: 10,
          font: helveticaFont,
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
    const totalLineHeight = baseLineHeight * 1.5;
    if (y - totalLineHeight < contentBottomMargin) {
        page = pdfDoc.addPage([595, 842]);
        y = page.getHeight() - margin;
    }
    y -= totalLineHeight;

    // Use personSummary.totalPayForProject for the displayed total as it's pre-calculated
    const totalText = `Total Payment: $${personSummary.totalPayForProject.toFixed(2)}`;
    const totalX = positionText(margin, pageWidth, totalText, helveticaBold, 14, 'right');
    page.drawText(totalText, {
      x: totalX,
      y,
      size: 14,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });

    // Add footer (remains the same)
    const footerY = margin / 2;
    const footerText1 = "This is an automated payment summary from Teaching Lab.";
    const supportEmail = "accountspayable@teachinglab.org";
    const footerText2 = `Please contact ${supportEmail} for any questions.`;
    // Need to ensure footer is drawn on the *last* page used
    const lastPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
    lastPage.drawText(footerText1, { x: margin, y: footerY + 12, size: 9, font: helveticaFont, color: rgb(0.5, 0.5, 0.5) });
    lastPage.drawText(footerText2, { x: margin, y: footerY, size: 9, font: helveticaFont, color: rgb(0.5, 0.5, 0.5) });

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



