// src/lib/formGenerate.js
import jsPDF from "jspdf";
import { generateCompanyCaseId, formatAmount, formatDate } from "./caseUtils";

const TEXT_COLOR = "#282828";
const LOGO_PATH = "/courtlink_logo.svg";

// Load and add logo to PDF
const addLogoToPDF = async (pdf, x, y, width = 50, height = 15) => {
  try {
    const response = await fetch(LOGO_PATH);
    const blob = await response.blob();
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onload = () => {
        try {
          pdf.addImage(reader.result, "PNG", x, y, width, height);
          resolve();
        } catch (error) {
          resolve(); // Continue without logo
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error loading logo:", error);
    // Continue without logo
  }
};

// Add signature image to PDF
const addSignatureToPDF = (
  pdf,
  signatureData,
  x,
  y,
  width = 60,
  height = 20,
) => {
  if (signatureData) {
    try {
      pdf.addImage(signatureData, "PNG", x, y, width, height);
    } catch (error) {
      console.error("Error adding signature to PDF:", error);
    }
  }
};

// Add Header
const addHeader = async (pdf, caseData, margin, pageWidth) => {
  let yPos = margin;

  // Add logo on left and prepare for date/ref on right (same row)
  await addLogoToPDF(pdf, margin, yPos, 50, 15);

  // Date aligned right (same row as logo)
  pdf.setTextColor(TEXT_COLOR);
  pdf.setFontSize(11);
  pdf.setFont(undefined, "normal");
  const dateStr = `Date: ${formatDate(new Date())}`;
  const dateWidth = pdf.getTextWidth(dateStr);
  pdf.text(dateStr, pageWidth - margin - dateWidth, yPos + 5);

  // Reference below date, also right aligned
  const refStr = `Our Ref: ${generateCompanyCaseId(caseData.id, caseData.user_profile?.company_name)}`;
  const refWidth = pdf.getTextWidth(refStr);
  pdf.text(refStr, pageWidth - margin - refWidth, yPos + 12);

  yPos += 25;

  pdf.text("Dear Sir/Madam", margin, yPos);
  yPos += 7;

  // Case reference
  pdf.setFont(undefined, "bold");
  pdf.text(
    `Re: Claim number ${caseData.claim_number}: ${caseData.claimant_name} vs ${caseData.defendant_name}`,
    margin,
    yPos,
  );
  yPos += 8;

  pdf.setFont(undefined, "normal");

  // Main content
  const mainText = [
    "We enclose Form N293a, together with a Form 53 request, and are instructed to transfer the",
    "proceedings to the High Court on behalf of the claimant/their legal representative.",
  ];

  mainText.forEach((line) => {
    pdf.text(line, margin, yPos);
    yPos += 5;
  });
  yPos += 4;

  pdf.text(
    "Please use our PBA account number PBA0096259 for this application.",
    margin,
    yPos,
  );
  yPos += 6;

  const returnText = [
    "Please return the sealed Writ of Control to CourtLink Services Ltd, and not the claimant or",
    "their legal representative:-",
  ];

  returnText.forEach((line) => {
    pdf.text(line, margin, yPos);
    yPos += 5;
  });
  yPos += 4;

  // Address
  const address = [
    "Amir Ali OBE",
    "CourtLink Services Ltd",
    "19 Regina Drive",
    "Walsall",
    "West Midlands",
    "WS4 2HB",
  ];

  address.forEach((line) => {
    pdf.text(line, margin, yPos);
    yPos += 5;
  });
  yPos += 5;

  pdf.text("Yours faithfully", margin, yPos);
  yPos += 8;

  // Add signature logo
  try {
    const response = await fetch("/courtlink_logo.svg");
    const blob = await response.blob();
    const reader = new FileReader();

    await new Promise((resolve) => {
      reader.onload = () => {
        try {
          pdf.addImage(reader.result, "PNG", margin, yPos, 50, 15);
        } catch (error) {
          console.error("Error adding signature logo:", error);
        }
        resolve();
      };
      reader.onerror = () => resolve();
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error loading signature logo:", error);
  }

  yPos += 16;
  return yPos;
};

// Add Footer
const addFooter = (pdf, yStart) => {
  const margin = 15;
  let yPos = yStart;
  yPos += 10;
  pdf.setTextColor(TEXT_COLOR);
  pdf.setFontSize(10);
  pdf.setFont(undefined, "bold");
  pdf.text("CourtLink Services Ltd", margin, yPos);
  yPos += 6;

  pdf.setFont(undefined, "normal");
  pdf.setFontSize(9);
  const footerLines = [
    "CourtLink Services Limited. Registered address, 81 High Street, Cosham, Portsmouth, PO6 3BL.",
    "Registered in England and Wales. Registered Company Nr: 13149643.",
    "VAT Registration Nr: 377 2475 64.",
    "ICO Reference Nr: ZB046690.",
  ];

  footerLines.forEach((line) => {
    pdf.text(line, margin, yPos);
    yPos += 4;
  });
  yPos += 3;

  pdf.setFontSize(8);
  pdf.text(
    "We will always treat your data with respect. If you require more information on how your data is used,",
    margin,
    yPos,
  );
  yPos += 3;
  pdf.text("please request a copy of our Privacy Policy.", margin, yPos);

  return yPos;
};

// Generate N293A PDF Form
export const generateN293APDF = async (
  caseData,
  signatureData = null, // This parameter is deprecated, signature comes from caseData now
  setError,
  setPdfGenerating,
) => {
  try {
    setPdfGenerating(true);

    // Use applicant's signature from case data (new approach)
    const applicantSignature = caseData.applicant_signature || signatureData;

    if (!applicantSignature) {
      setError(
        "No signature found. Please ensure the applicant has signed the forms.",
      );
      setPdfGenerating(false);
      return;
    }

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = await addHeader(pdf, caseData, margin, pageWidth);

    // Add footer
    addFooter(pdf, yPos + 2);

    // NEW PAGE - N293A Form
    pdf.addPage();
    yPos = margin;

    // FORM TITLE - Left aligned
    pdf.setTextColor(TEXT_COLOR);
    pdf.setFontSize(16);
    pdf.setFont(undefined, "bold");
    pdf.text("Combined certificate of judgment", margin, yPos);
    yPos += 7;
    pdf.text("and request for writ of control or", margin, yPos);
    yPos += 7;
    pdf.text("writ of possession", margin, yPos);

    // Court info box - RIGHT SIDE WITH BORDER
    const boxX = pageWidth - margin - 80;
    const boxY = margin;
    const boxWidth = 85;
    const boxHeight = 65;

    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.2);
    pdf.rect(boxX, boxY - 5, boxWidth, boxHeight);

    pdf.setFontSize(10);
    pdf.setFont(undefined, "normal");
    let boxYPos = boxY + 2;

    pdf.text("In the", boxX + 3, boxYPos);
    pdf.text(caseData.court_making_judgment, boxX + 3, boxYPos + 5);

    boxYPos += 10;
    pdf.setLineWidth(0.2);
    pdf.line(boxX, boxYPos, boxX + boxWidth, boxYPos);
    boxYPos += 6;
    pdf.text("Claim No.", boxX + 3, boxYPos);
    pdf.text(caseData.claim_number, boxX + 45, boxYPos);

    boxYPos += 4;
    pdf.line(boxX, boxYPos, boxX + boxWidth, boxYPos);
    boxYPos += 5;
    pdf.text("Creditor/", boxX + 3, boxYPos);
    pdf.text("Claimant's Ref.", boxX + 3, boxYPos + 4);
    pdf.setFontSize(9);
    pdf.text(
      `${caseData.claimant_name} ( ${caseData.claimant_ref} )`,
      boxX + 45,
      boxYPos,
    );

    boxYPos += 8;
    pdf.setFontSize(10);
    pdf.line(boxX, boxYPos, boxX + boxWidth, boxYPos);
    boxYPos += 6;
    pdf.text("Debtor's/", boxX + 3, boxYPos);
    pdf.text("Defendant's Ref.", boxX + 3, boxYPos + 4);
    pdf.setFontSize(9);
    pdf.text(
      `${caseData.defendant_name} ( ${caseData.defendant_ref} )`,
      boxX + 45,
      boxYPos,
    );

    boxYPos += 9;
    pdf.setFontSize(10);
    pdf.line(boxX, boxYPos, boxX + boxWidth, boxYPos);
    boxYPos += 6;
    pdf.text("Date", boxX + 3, boxYPos);
    pdf.text(formatDate(new Date()), boxX + 45, boxYPos);

    // LEFT SIDE - Creditor/Claimant and Debtor/Defendant boxes
    yPos = margin + 22;

    // Draw left side boxes for claimant and defendant
    pdf.setLineWidth(0.2);
    const leftBoxWidth = boxX - margin - 5;

    // Claimant box - simple border
    const claimantBoxHeight = 18;
    pdf.rect(margin, yPos, leftBoxWidth, claimantBoxHeight);
    let claimantY = yPos + 5;
    pdf.setFontSize(9);
    pdf.setFont(undefined, "normal");
    pdf.text("Creditor/Claimant", margin + 2, claimantY);
    claimantY += 7;
    pdf.setFont(undefined, "bold");
    pdf.text(caseData.claimant_name, margin + 2, claimantY);

    yPos += claimantBoxHeight + 3;

    // Defendant box - simple border
    const defBoxHeight = 32;
    pdf.rect(margin, yPos, leftBoxWidth, defBoxHeight);
    let defY = yPos + 5;
    pdf.setFont(undefined, "normal");
    pdf.setFontSize(9);
    pdf.text("Debtor/Defendant", margin + 2, defY);
    defY += 7;
    pdf.setFont(undefined, "bold");
    pdf.text(caseData.defendant_name, margin + 2, defY);
    defY += 6;
    pdf.setFont(undefined, "normal");
    pdf.setFontSize(8);
    const defAddress =
      caseData.defendant_address_on_judgment || "(Address not provided)";
    pdf.text(defAddress, margin + 2, defY);

    yPos += defBoxHeight + 8.5;

    // Part 1 - FORM FIELDS with proper layout
    pdf.setFontSize(11);
    pdf.setFont(undefined, "bold");
    pdf.text("Part 1", margin - 5, yPos);
    yPos += 10;

    pdf.setFontSize(10);
    pdf.setFont(undefined, "normal");

    // Date of judgment field
    const fieldBoxWidth = 53;
    const labelX = margin;
    const fieldX = margin + 42;

    pdf.text("Date of judgment or order", labelX, yPos);
    pdf.rect(fieldX, yPos - 5, fieldBoxWidth, 7);
    pdf.text(formatDate(caseData.judgment_date), fieldX + 2, yPos);
    yPos += 9;

    // Total amount field
    pdf.text("Total amount of judgment", labelX, yPos);
    pdf.setFontSize(9);
    pdf.setFont(undefined, "italic");
    pdf.text("including any costs", labelX, yPos + 4);
    pdf.setFontSize(10);
    pdf.setFont(undefined, "normal");
    pdf.rect(fieldX, yPos - 5, fieldBoxWidth, 8);
    pdf.setFont(undefined, "bold");
    pdf.text(
      formatAmount(
        parseFloat(caseData.amount_of_debt) +
          parseFloat(caseData.amount_of_costs),
      ),
      fieldX + 2,
      yPos,
    );
    pdf.setFont(undefined, "normal");
    yPos += 9;

    // "or" text
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(10);
    pdf.text("or", labelX, yPos);
    yPos += 6;

    // Details of order for possession field
    pdf.text("Details of order for", labelX, yPos);
    pdf.text("possession", labelX, yPos + 5);
    pdf.setFontSize(8);
    pdf.setFont(undefined, "italic");
    pdf.text("including any costs", labelX, yPos + 10);
    pdf.setFontSize(10);
    pdf.setFont(undefined, "normal");
    pdf.rect(fieldX, yPos - 5, fieldBoxWidth, 15);
    yPos += 20;

    // Interest field
    pdf.text("Total amount of", labelX, yPos);
    pdf.text("interest accrued at", labelX, yPos + 5);
    pdf.text("the rate of", labelX, yPos + 10);

    // Position of the "8%"
    const percentText = "8%";
    const percentX = labelX + 18; // adjust for correct alignment
    const percentY = yPos + 10;

    // Draw the "8%"
    pdf.text(percentText, percentX, percentY);

    // Dashed underline under "8%"
    const textWidth = pdf.getTextWidth(percentText); // width of "8%"
    pdf.setLineDash([1, 1]);
    pdf.line(percentX, percentY + 1, percentX + textWidth, percentY + 1);
    pdf.setLineDash([]);

    // Continue text
    pdf.text("per day to date (if any)", percentX + textWidth + 2, percentY);

    pdf.rect(fieldX, yPos - 5, fieldBoxWidth, 10);
    yPos += 25;

    // RIGHT SIDE - Certification box (below the court info box)
    const certBoxX = boxX;
    const certBoxY = boxY + boxHeight;
    const certBoxWidth = boxWidth;
    const certBoxHeight = 85;

    // Draw certification box border
    pdf.setLineWidth(0.2);
    pdf.rect(certBoxX, certBoxY, certBoxWidth, certBoxHeight);

    let certY = certBoxY + 5;

    pdf.setFontSize(9);
    const certText = [
      "I certify that the details I have given are correct and",
      "that to my knowledge there is no application or other",
      "procedure pending.",
    ];
    certText.forEach((line) => {
      pdf.text(line, certBoxX + 2, certY);
      certY += 3.5;
    });
    certY += 2;

    pdf.text(
      "I request an order for enforcement in the High Court by",
      certBoxX + 2,
      certY,
    );
    certY += 5;

    // Checkbox X
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(11);
    pdf.rect(certBoxX + 7.2, certY - 3, 4, 4);
    pdf.text("X", certBoxX + 8, certY + 0.5);
    pdf.setFont(undefined, "normal");
    pdf.setFontSize(7);
    pdf.text("Writ of Control", certBoxX + 14, certY);
    certY += 5;

    pdf.setLineWidth(0.2);
    pdf.rect(certBoxX + 7.2, certY - 3, 4, 4);
    pdf.text("Writ of Possession", certBoxX + 14, certY);
    certY += 6;

    pdf.setFontSize(8.7);
    pdf.text(
      "I intend to enforce the judgment or order by execution",
      certBoxX + 2,
      certY,
    );
    certY += 4;
    pdf.text(
      "against goods, and/or against trespassers in the High Court",
      certBoxX + 2,
      certY,
    );
    certY += 4;
    pdf.text(
      "and require this Certificate for this purpose.",
      certBoxX + 2,
      certY,
    );
    certY += 7;

    // Dotted line for signature
    pdf.setLineDash([1, 1]);
    pdf.line(certBoxX + 2, certY, certBoxX + certBoxWidth - 2, certY);
    pdf.setLineDash([]);
    certY += 3.5;

    pdf.setFontSize(9);
    pdf.text("signed -", certBoxX + 2, certY + 1);
    certY += 1;

    pdf.setFontSize(9);
    pdf.text(
      "(Creditor/Creditor's legal representative)",
      certBoxX + 15,
      certY,
    );
    certY += 4;

    pdf.setFontSize(9);
    pdf.text(
      "(Claimant/Claimant's legal representative)",
      certBoxX + 15,
      certY,
    );
    certY += 7;

    pdf.setFont(undefined, "bold");
    pdf.setFontSize(10);
    pdf.text(formatDate(new Date()), certBoxX + 25, certY);
    certY += 1;

    // Dotted line after date
    const dateWidth2 = pdf.getTextWidth(formatDate(new Date()));
    pdf.setLineDash([1, 1]);
    pdf.line(certBoxX + 2, certY, certBoxX + 3 + certBoxWidth - 16, certY);
    pdf.setLineDash([]);

    pdf.setFont(undefined, "normal");
    pdf.setFontSize(9);
    pdf.text("date", certBoxX + certBoxWidth - 12, certY);

    // Divider line above Part 2
    yPos = Math.max(yPos - 10, certY);
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    // Part 2
    pdf.setFontSize(11);
    pdf.setFont(undefined, "bold");
    pdf.text("Part 2 ", margin - 5, yPos);
    pdf.setFont(undefined, "italic");
    pdf.text("(for court use only)", margin + 8, yPos);
    yPos += 8;

    pdf.setFontSize(10);
    pdf.setFont(undefined, "normal");
    pdf.text(
      "I certify that this is a true extract of the court record in this case.",
      margin,
      yPos,
    );

    // Seal on the right side
    const sealY = yPos;
    pdf.setLineWidth(0.3);
    pdf.circle(pageWidth - margin - 25, sealY, 8);
    pdf.setFontSize(10);
    pdf.text("Seal", pageWidth - margin - 28.5, sealY + 1);

    yPos += 8;

    pdf.text("Order for enforcement in the High Court by", margin, yPos);
    yPos += 7;

    // Checked box for Writ of Control
    pdf.rect(margin + 1, yPos - 4, 4, 4);
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(11);
    pdf.text("X", margin + 1.6, yPos - 0.5);
    pdf.setFont(undefined, "normal");
    pdf.setFontSize(10);
    pdf.text("Writ of Control", margin + 8, yPos - 1);
    yPos += 6;

    // Unchecked box for Writ of Possession
    pdf.rect(margin + 1, yPos - 4, 4, 4);
    pdf.text("Writ of Possession", margin + 8, yPos - 1);
    yPos += 8;

    pdf.text("made on (date)", margin, yPos);

    // Dotted line with date
    pdf.setLineDash([1, 1]);
    pdf.line(margin + 25, yPos, pageWidth - margin - 80, yPos);
    pdf.setLineDash([]);
    yPos += 7;

    // Dotted line for signature
    pdf.setLineDash([1, 1]);
    pdf.line(margin, yPos, pageWidth - margin - 80, yPos);
    pdf.setLineDash([]);

    pdf.text("An Officer of the Court", pageWidth - margin - 79, yPos);
    yPos += 5;

    // Divider line at end of Part 2
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 9;

    // Please Note section
    pdf.setFontSize(11);
    pdf.setFont(undefined, "bold");
    pdf.text("Please Note:", margin, yPos);
    yPos += 8;

    pdf.setFontSize(9);
    pdf.setFont(undefined, "normal");

    const noteText1 =
      "This judgment or order has been sent to the High Court for enforcement by (Writ of Control) (Writ of Possession against trespassers) ";
    const noteLines1 = pdf.splitTextToSize(
      noteText1,
      pageWidth - 2 * margin - 10,
    );
    noteLines1.forEach((line, index) => {
      pdf.text(line, margin, yPos);
      yPos += 4;
    });
    pdf.setFont(undefined, "bold");
    pdf.text("only", margin + 19, yPos - 4);
    pdf.setFont(undefined, "normal");
    yPos += 2;

    const noteText2 =
      "The county court claim has not been transferred to the High Court. Applications for other methods of enforcement or ancillary applications must be made to the County Court hearing centre in which the judgment or order was made, unless the case has since been transferred to a different court, in which case it must be made to that court.";
    const noteLines2 = pdf.splitTextToSize(noteText2, pageWidth - 2 * margin);
    noteLines2.forEach((line) => {
      pdf.text(line, margin, yPos);
      yPos += 4;
    });
    yPos += 3;

    const noteText3 =
      "For further details of the courts www.gov.uk/find-court-tribunal. When corresponding with the Court, please address forms or the letters to the Manager and always quote the claim number.";
    const noteLines3 = pdf.splitTextToSize(noteText3, pageWidth - 2 * margin);
    noteLines3.forEach((line) => {
      pdf.text(line, margin, yPos);
      yPos += 4;
    });
    yPos += 3;

    const noteText4 =
      "THE ACTION DEPARTMENT of the High Court is open between 10am and 4.30pm. All correspondence should be sent to the Court Manager, Action Department, Royal Courts of Justice, Strand, London WC2A 2LL.";
    const noteLines4 = pdf.splitTextToSize(noteText4, pageWidth - 2 * margin);
    noteLines4.forEach((line) => {
      pdf.text(line, margin, yPos);
      yPos += 4;
    });
    yPos += 5;

    pdf.setFontSize(8);
    pdf.setFont(undefined, "bold");
    pdf.text("N293A", margin, yPos);

    pdf.setFont(undefined, "normal");
    pdf.text(
      " Combined certificate of judgment and request for writ of fieri facias or writ of possession (09.22)",
      margin + 9,
      yPos,
    );
    pdf.text("/ continued overleaf", pageWidth - margin - 30, yPos);

    // NEW PAGE - Part 3
    pdf.addPage();
    yPos = margin;

    // Part 3 Title - Left side
    pdf.setFontSize(11);
    pdf.setFont(undefined, "bold");
    pdf.text("Part 3", margin - 5, yPos);
    yPos += 10;

    // Left Column
    pdf.setFontSize(10);
    pdf.setFont(undefined, "bold");
    pdf.text("In the High Court of Justice", margin, yPos);
    yPos += 6;
    pdf.text("King's Bench Division at", margin, yPos);
    yPos += 6;

    pdf.setFont(undefined, "normal");
    pdf.text("(Sent from the", margin, yPos);
    const courtByX = margin + pdf.getTextWidth("(Sent from the") + 30;
    pdf.text("County Court by", courtByX, yPos);
    yPos += 6;
    pdf.text("Certificate dated the", margin, yPos);
    pdf.text("day of", margin + 40, yPos);
    pdf.text(")", courtByX + 24, yPos);
    yPos += 15;

    // High Court Enforcement Number Box
    pdf.setLineWidth(0.3);
    const leftBoxWidth2 = 85;
    pdf.rect(margin, yPos, leftBoxWidth2, 20);
    pdf.setFontSize(9);
    pdf.text("High Court Enforcement Number", margin + 2, yPos + 5);
    yPos += 20;

    // County Court Claim Number Box
    pdf.rect(margin, yPos, leftBoxWidth2, 17);
    pdf.text("County Court Claim Number", margin + 2, yPos + 5);
    pdf.setFontSize(10);
    pdf.text(caseData.claim_number, margin + 10, yPos + 13);
    yPos += 25;

    // Address Box
    pdf.rect(margin, yPos, leftBoxWidth2, 32);
    pdf.setFontSize(9);
    pdf.text("Address of (Debtor)", margin + 28, yPos + 5);
    pdf.text(
      "(property of which possession is to be given )",
      margin + 9,
      yPos + 9,
    );
    pdf.setFontSize(10);
    const defAddress2 =
      caseData.defendant_current_address ||
      caseData.defendant_address_on_judgment;
    pdf.text(defAddress2, margin + 2, yPos + 16);
    yPos = margin + 10; // Reset for right column

    // Right Column - Seal section
    pdf.setFont(undefined, "normal");
    const rightColX = pageWidth - margin - 90;
    pdf.setFontSize(10);
    pdf.text(
      "Seal a Writ of (Control)(Possession) directed to the:",
      rightColX,
      yPos,
    );
    yPos += 8;

    pdf.text(`To: " `, rightColX, yPos);
    const w1 = pdf.getTextWidth(`To: " `);
    const w2 = pdf.getTextWidth(`, an`);
    pdf.text(caseData.hceo_choice, rightColX + w1 + 2, yPos);
    pdf.setLineWidth(0.3);
    pdf.line(
      rightColX + w1,
      yPos + 1.2,
      pageWidth - margin - w2 - 2,
      yPos + 1.2,
    );
    pdf.text(`, an`, pageWidth - margin - w2 - 2, yPos);
    yPos += 6;

    pdf.text(
      "enforcement officer authorised to enforce writs of execution",
      rightColX,
      yPos,
    );
    yPos += 5;
    pdf.text('from the High Court".', rightColX, yPos);
    yPos += 5;
    pdf.text("Or,", rightColX, yPos);
    yPos += 5;

    // Strikethrough text
    pdf.setFontSize(10);
    const strikeText1 =
      '"The enforcement officers authorised to enforce writs of';
    pdf.text(strikeText1, rightColX, yPos);
    const strikeWidth1 = pdf.getTextWidth(strikeText1);
    pdf.line(rightColX, yPos - 1, rightColX + strikeWidth1, yPos - 1);
    yPos += 4;

    const strikeText2 = "execution from the High Court who are assigned to the";
    pdf.text(strikeText2, rightColX, yPos);
    const strikeWidth2 = pdf.getTextWidth(strikeText2);
    pdf.line(rightColX, yPos - 1, rightColX + strikeWidth2, yPos - 1);
    yPos += 4;

    const strikeText3 = 'district of"';
    pdf.text(strikeText3, rightColX, yPos);
    const strikeWidth3 = pdf.getTextWidth(strikeText3);
    pdf.line(rightColX, yPos - 1, rightColX + strikeWidth3 + 70, yPos - 1);
    pdf.text('in England and Wales".', rightColX + strikeWidth3 + 35, yPos);
    pdf.line(rightColX + strikeWidth3, yPos, pageWidth - margin - 45, yPos);
    yPos += 8;

    pdf.setFont(undefined, "bold");
    pdf.text("Note:", rightColX, yPos);
    pdf.setFont(undefined, "normal");
    pdf.setFontSize(9);
    pdf.text(
      "if you have chosen this option you must send this writ to the",
      rightColX + 9,
      yPos,
    );
    yPos += 3.5;
    pdf.text(
      "National Information Centre for Enforcement for allocation.",
      rightColX,
      yPos,
    );
    yPos += 10;

    pdf.setFontSize(10);
    pdf.text("against", rightColX, yPos);
    pdf.text(`${caseData.defendant_name}`, rightColX + 16, yPos - 1.3);
    pdf.line(rightColX + 13, yPos, pageWidth - margin, yPos);
    yPos += 10;

    pdf.setFontSize(9);
    pdf.setFont(undefined, "italic");
    pdf.text("for: (Complete A, B, C as appropriate)", rightColX, yPos);
    yPos += 6;

    pdf.setFont(undefined, "bold");
    pdf.text("A.", rightColX, yPos);
    pdf.setFont(undefined, "normal");
    pdf.text("the sum of:", rightColX + 4, yPos);
    yPos += 5;

    const debtFormatted = formatAmount(caseData.amount_of_debt).replace(
      "£",
      "",
    );
    pdf.text(`(a) debt`, rightColX + 10, yPos);
    pdf.text(`£  ${debtFormatted}`, rightColX + 65, yPos);
    yPos += 5;

    const costsFormatted = formatAmount(caseData.amount_of_costs).replace(
      "£",
      "",
    );
    pdf.text(`(b) costs and interest`, rightColX + 10, yPos);
    pdf.text(`£  ${costsFormatted}`, rightColX + 65, yPos);
    yPos += 5;

    pdf.text("(c) Subsequent costs", rightColX + 10, yPos);
    pdf.text("£", rightColX + 65, yPos);
    yPos += 4;

    pdf.setFontSize(9);
    pdf.setFont(undefined, "italic");
    pdf.text("(if any)", rightColX + 15, yPos);
    yPos += 8;

    pdf.setFontSize(9);
    pdf.setFont(undefined, "bold");
    pdf.text("B.", rightColX, yPos);
    pdf.setFont(undefined, "normal");
    pdf.text("and interest thereon at", rightColX + 4, yPos);
    pdf.text("8%", rightColX + 43, yPos - 1.2);
    pdf.line(rightColX + 37, yPos, rightColX + 51, yPos);
    pdf.text("% per annum from", rightColX + 52, yPos);
    yPos += 5;
    pdf.text("the date of transfer and costs of execution", rightColX, yPos);
    yPos += 3;

    pdf.line(rightColX, yPos, pageWidth - margin - 2, yPos);
    yPos += 5;

    pdf.setFont(undefined, "bold");
    pdf.text("C.", rightColX, yPos);
    pdf.setFont(undefined, "normal");
    pdf.text("possession of", rightColX + 4, yPos);
    yPos += 5;
    pdf.text("and £", rightColX + 6, yPos);
    pdf.text("for costs.", rightColX + 30, yPos);

    // Calculate position for bottom table
    const tableY = pageHeight - margin - 134;
    const tableX = rightColX;
    const tableWidth = 85;

    // Draw the table border
    pdf.setLineWidth(0.3);
    pdf.rect(tableX, tableY, tableWidth, 48);

    // Horizontal lines
    pdf.line(tableX, tableY + 15, tableX + tableWidth, tableY + 15);
    pdf.line(tableX, tableY + 40, tableX + tableWidth, tableY + 40);

    let tableYPos = tableY + 6;

    // Signed row
    pdf.setFontSize(9);
    pdf.text("Signed:", tableX + 2, tableYPos);

    // Add applicant's signature
    if (applicantSignature) {
      addSignatureToPDF(
        pdf,
        applicantSignature,
        tableX + 8,
        tableYPos - 3,
        40,
        10,
      );
    }

    tableYPos = tableY + 20;

    // Address for service row
    pdf.text("Address for service", tableX + 2, tableYPos);

    const serviceAddress = [
      "CourtLink Services Ltd",
      "19 Regina Drive",
      "Walsall",
      "West Midlands",
      "WS4 2HB",
    ];

    let addrY = tableYPos;
    serviceAddress.forEach((line) => {
      pdf.text(line, tableX + 34, addrY);
      addrY += 4;
    });

    // Date row
    tableYPos = tableY + 45;
    pdf.text("Date", tableX + 2, tableYPos);
    pdf.text(formatDate(new Date()), tableX + 30, tableYPos);

    // Thick line at bottom (like in image 4)
    pdf.setLineWidth(0.5);
    pdf.line(
      margin,
      pageHeight - margin - 78,
      pageWidth - margin,
      pageHeight - margin - 78,
    );

    pdf.save(
      `N293A_${generateCompanyCaseId(caseData.id, caseData.user_profile?.company_name)}.pdf`,
    );
  } catch (err) {
    console.error("Error generating N293A PDF:", err);
    setError(`Failed to generate N293A form: ${err.message}`);
  } finally {
    setPdfGenerating(false);
  }
};

// Generate Form 53 PDF
export const generateForm53PDF = async (
  caseData,
  signatureData = null, // This parameter is deprecated, signature comes from caseData now
  setError,
  setPdfGenerating,
) => {
  try {
    setPdfGenerating(true);

    // Use applicant's signature from case data (new approach)
    const applicantSignature = caseData.applicant_signature || signatureData;

    if (!applicantSignature) {
      setError(
        "No signature found. Please ensure the applicant has signed the forms.",
      );
      setPdfGenerating(false);
      return;
    }

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = await addHeader(pdf, caseData, margin, pageWidth);

    // Add footer
    addFooter(pdf, yPos + 2);

    // NEW PAGE - Form 53
    pdf.addPage();
    yPos = margin;

    pdf.setTextColor(TEXT_COLOR);
    pdf.setFontSize(14);
    pdf.setFont(undefined, "bold");
    const titleX =
      (pageWidth - pdf.getTextWidth("No. 53 - Writ of Control")) / 2;
    pdf.text("No. 53 - Writ of Control", titleX, yPos);
    yPos += 15;

    // Court header box - without border, normal text
    pdf.setFontSize(10);
    pdf.setFont(undefined, "normal");
    const boxX = pageWidth - margin - 60;
    pdf.text("In the High Court of Justice", boxX + 2, yPos);
    yPos += 5;
    pdf.text("King's Bench Division", boxX + 2, yPos);
    yPos += 5;
    pdf.text("District Registry", boxX + 2, yPos);
    yPos += 5;
    pdf.text("High Court Claim No.", boxX + 2, yPos);
    yPos += 5;
    pdf.text("County Court Claim No.", boxX + 2, yPos);
    yPos += 5;
    pdf.text(caseData.claim_number, boxX + 2, yPos);
    yPos += 10;

    // Claimant/Defendant
    pdf.setFont(undefined, "bold");
    pdf.text(`Claimant: ${caseData.claimant_name}`, boxX, yPos);
    yPos += 6;
    pdf.text(`Defendant: ${caseData.defendant_name}`, boxX, yPos);
    yPos += 15;

    // Royal proclamation
    pdf.setFont(undefined, "normal");
    pdf.setFontSize(9);
    const proclamation = [
      "KING CHARLES THE THIRD, by the Grace of God, of the United Kingdom of Great Britain and Northern",
      "Ireland and of Our other realms and territories King, Head of the Commonwealth, Defender of the Faith.",
    ];

    proclamation.forEach((line) => {
      pdf.text(line, margin, yPos);
      yPos += 4.5;
    });
    yPos += 4;

    pdf.setFont(undefined, "bold");
    pdf.text(`TO: ${caseData.hceo_choice}`, margin, yPos);
    pdf.setFont(undefined, "italic");
    const toTextWidth = pdf.getTextWidth(`TO: ${caseData.hceo_choice}`);
    pdf.text(
      ", an enforcement officer authorised to enforce writs of control issued from the High Court.",
      margin + toTextWidth + 2,
      yPos,
    );
    yPos += 8;

    pdf.setFont(undefined, "normal");
    pdf.setFontSize(9);
    const wrapText = (text, maxWidth) => {
      const words = text.split(" ");
      const lines = [];
      let currentLine = "";

      words.forEach((word) => {
        const testLine = currentLine + (currentLine ? " " : "") + word;
        if (pdf.getTextWidth(testLine) > maxWidth) {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });
      if (currentLine) lines.push(currentLine);
      return lines;
    };

    pdf.text(
      "IN THIS CLAIM a Judgment or Order was made as set out in the Schedule.",
      margin,
      yPos,
    );
    yPos += 7;

    const commands = [
      `YOU ARE NOW COMMANDED to take control of the goods of the defendant authorised by law and raise therefrom the sums detailed in the Schedule, [together with fees and charges to which you are entitled]. And immediately after execution pay the claimant ${caseData.claimant_name} the said sums and interest.`,
    ];

    commands.forEach((cmd) => {
      const lines = wrapText(cmd, pageWidth - 2 * margin);
      lines.forEach((line) => {
        pdf.text(line, margin, yPos);
        yPos += 4.5;
      });
      yPos += 2;
    });

    const commands2 = [
      `YOU ARE ALSO COMMANDED to indorse on this writ immediately after taking control of goods a statement of the manner in which you have done so and send a copy of the statement to the defendant ${caseData.defendant_name}.`,
    ];

    commands2.forEach((cmd) => {
      const lines = wrapText(cmd, pageWidth - 2 * margin);
      lines.forEach((line) => {
        pdf.text(line, margin, yPos);
        yPos += 4.5;
      });
      yPos += 2;
    });

    const issueText = `THIS WRIT WAS ISSUED by the Central Office [the District Registry] of the High Court on ${formatDate(
      new Date(),
    )} on the application of [the claimant ${
      caseData.claimant_name
    } in person] who resides at ${caseData.claimant_address}.`;
    const issueLines = wrapText(issueText, pageWidth - 2 * margin);
    issueLines.forEach((line) => {
      pdf.text(line, margin, yPos);
      yPos += 4.5;
    });
    yPos += 4;

    pdf.text(
      "WITNESS Shabana Mahmood Lord High Chancellor of Great Britain, the [ ]",
      margin,
      yPos,
    );
    yPos += 7;

    pdf.text(
      `The address for enforcement are ${
        caseData.defendant_current_address ||
        caseData.defendant_address_on_judgment
      }.`,
      margin,
      yPos,
    );
    yPos += 10;

    // SCHEDULE
    pdf.setFontSize(11);
    pdf.setFont(undefined, "bold");
    pdf.text("SCHEDULE", margin, yPos);
    yPos += 7;

    pdf.setFontSize(9);
    pdf.setFont(undefined, "normal");

    // Calculate totals with payments
    const debtAmount = parseFloat(caseData.amount_of_debt) || 0;
    const costsAmount = parseFloat(caseData.amount_of_costs) || 0;

    let totalPayments = 0;
    if (caseData.payments_received) {
      try {
        // If it's a JSON string, parse it first
        let paymentsArray = caseData.payments_received;
        if (typeof paymentsArray === "string") {
          paymentsArray = JSON.parse(paymentsArray);
        }

        // Now calculate the total if it's an array
        if (Array.isArray(paymentsArray)) {
          totalPayments = paymentsArray.reduce((sum, payment) => {
            return sum + parseFloat(payment.amount || 0);
          }, 0);
        }
      } catch (error) {
        console.error("Error parsing payments_received:", error);
        totalPayments = 0;
      }
    }

    const subTotal = debtAmount + costsAmount - totalPayments;
    const fixedCosts = 131.75;
    const grandTotal = subTotal + fixedCosts;

    const scheduleItems = [
      [
        `1. Date of Judgment or Order: ${formatDate(caseData.judgment_date)}`,
        "",
      ],
      [
        "2. Amount of Judgment or Order (including interest awarded by Judgment or Order)",
        formatAmount(debtAmount),
      ],
      ["3. Fixed costs on Judgment or Order", formatAmount(costsAmount)],
      ["4. Assessed costs (if any) [by costs certificate dated (date)]", "£ 0"],
      [
        "5. (If sent from County Court by certificate) Interest post-Judgment or Order on County",
        "",
      ],
      ["   Court judgment or order over £5,000) until date of certificate", ""],
      [
        "6. LESS credits or payments received since Judgment or Order",
        formatAmount(totalPayments),
      ],
    ];

    scheduleItems.forEach(([label, value]) => {
      pdf.text(label, margin, yPos);
      if (value) {
        pdf.text(value, pageWidth - margin - 30, yPos);
      }
      yPos += 4.5;
    });

    // Sub Total with underline
    yPos += 1.5;
    pdf.setFont(undefined, "bold");
    pdf.text("Sub Total", margin + 90, yPos);
    pdf.text(formatAmount(subTotal), pageWidth - margin - 30, yPos);
    pdf.line(
      pageWidth - margin - 35,
      yPos + 1,
      pageWidth - margin - 5,
      yPos + 1,
    );
    yPos += 6;

    pdf.setFont(undefined, "normal");
    pdf.text("7. Fixed costs on issue", margin, yPos);
    pdf.text(`£ ${fixedCosts.toFixed(2)}`, pageWidth - margin - 30, yPos);
    yPos += 6;

    // Total with underline
    pdf.setFont(undefined, "bold");
    pdf.text("Total", margin + 90, yPos);
    pdf.text(formatAmount(grandTotal), pageWidth - margin - 30, yPos);
    pdf.line(
      pageWidth - margin - 35,
      yPos + 1,
      pageWidth - margin - 5,
      yPos + 1,
    );
    yPos += 9;

    pdf.setFont(undefined, "normal");
    pdf.text("Together with: -", margin, yPos);
    yPos += 5;

    pdf.text("A. Judgment interest at 8% from;", margin, yPos);
    yPos += 4.5;
    pdf.setFontSize(8);
    pdf.text(
      "   date of Judgment on sub-total above, or (if sent from County Court by certificate) date of",
      margin,
      yPos,
    );
    yPos += 4;
    pdf.text(
      "   County Court certificate on paragraphs 1,2 and 3 above until payment,",
      margin,
      yPos,
    );
    pdf.setFontSize(9);
    pdf.text(
      "B. Fees and Charges to which you are entitled (where appropriate).",
      margin,
      yPos + 5,
    );
    yPos += 11;

    // Footer notes
    pdf.setFontSize(7);
    pdf.text(
      "¹Interest under s.74 of the County Courts Act 1984.",
      margin,
      yPos,
    );
    yPos += 3.5;
    pdf.text("²S.17 Judgments Act 1838", margin, yPos);
    yPos += 3.5;
    pdf.text("No.53 Writ of Control (03.23)", margin, yPos);

    pdf.save(
      `Form53_${generateCompanyCaseId(caseData.id, caseData.user_profile?.company_name)}.pdf`,
    );
  } catch (err) {
    console.error("Error generating Form 53 PDF:", err);
    setError(`Failed to generate Form 53: ${err.message}`);
  } finally {
    setPdfGenerating(false);
  }
};
