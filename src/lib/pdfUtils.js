// src/lib/pdfUtils.js
import jsPDF from "jspdf";
import { supabase } from "./supabase";
import {
  generateCompanyCaseId,
  formatDateTime,
  formatAmount,
  formatDate,
  getStatusLabel,
} from "./caseUtils";

/**
 * Get signed URL for judgment document (works with private buckets)
 * @param {string} filePath - The file path in Supabase storage
 * @returns {Promise<string|null>} Signed URL for the document
 */
const getDocumentSignedUrl = async (filePath) => {
  if (!filePath) {
    return null;
  }

  try {
    // Create signed URL directly without checking existence first
    const { data, error } = await supabase.storage
      .from("judgment-documents")
      .createSignedUrl(filePath, 3600); // Valid for 1 hour

    if (error) {
      console.error("Error creating signed URL:", error);
      console.error("File path attempted:", filePath);
      return null;
    }

    if (!data || !data.signedUrl) {
      console.error("No signed URL returned for:", filePath);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error("Exception getting signed URL:", err);
    return null;
  }
};

/**
 * Generate a detailed case PDF report with CourtLink Services styling
 * @param {Object} caseData - The case data object
 * @param {string} viewType - Type of view: 'applicant', 'admin', or 'hceo'
 * @param {Object} additionalData - Optional additional data (e.g., userProfile for admin view)
 * @returns {Promise<{success: boolean, filename: string}>}
 */
export const generateCaseDetailsPDF = async (
  caseData,
  viewType = "applicant",
  additionalData = {},
) => {
  try {
    // Get company name from either caseData.user_profile or additionalData.userProfile
    const companyName =
      caseData.user_profile?.company_name ||
      additionalData.userProfile?.company_name;

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = margin;
    let pageNumber = 1;

    // Color constants - CourtLink Services Brand Colors
    const clsBlue = [0, 145, 206]; // #0091ce
    const textColor = [66, 40, 40]; // #422828
    const whiteColor = [255, 255, 255]; // #fff
    const lightGray = [100, 100, 100];

    // Helper function to load logo from public folder
    const loadLogoAsBase64 = async () => {
      try {
        const response = await fetch("/courtlink_logo.svg");
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error("Error loading logo:", error);
        return null;
      }
    };

    // Load logo
    const logoBase64 = await loadLogoAsBase64();

    // Helper function to add text with word wrap
    const addText = (text, x, y, maxWidth, fontSize = 10) => {
      pdf.setFontSize(fontSize);
      const lines = pdf.splitTextToSize(text || "N/A", maxWidth);
      pdf.text(lines, x, y);
      return y + lines.length * fontSize * 0.4;
    };

    // Helper function to check if we need a new page
    const checkNewPage = (requiredSpace) => {
      if (yPos + requiredSpace > pageHeight - margin - 20) {
        addFooter();
        pdf.addPage();
        pageNumber++;
        yPos = margin;
      }
    };

    // Helper function to add footer
    const addFooter = () => {
      const footerY = pageHeight - 15;
      pdf.setFontSize(8);
      pdf.setTextColor(...textColor);
      pdf.text(
        `Generated on ${new Date().toLocaleString("en-GB")}`,
        margin,
        footerY,
      );
      pdf.text(`Page ${pageNumber}`, pageWidth - margin - 15, footerY);
    };

    // Helper function to add section headers with CourtLink Services blue background
    const addSectionHeader = (title, yPosition) => {
      pdf.setFontSize(12);
      pdf.setFont(undefined, "bold");

      // Blue background
      pdf.setFillColor(...clsBlue);
      const headerHeight = 8;
      pdf.rect(
        margin - 2,
        yPosition - 5.5,
        pageWidth - margin * 2 + 4,
        headerHeight,
        "F",
      );

      // White text on blue background
      pdf.setTextColor(...whiteColor);
      pdf.text(title, margin + 2, yPosition);

      // Reset text color to CourtLink Services text color
      pdf.setTextColor(...textColor);

      return yPosition + headerHeight + 5;
    };

    // ========== HEADER SECTION ==========

    // Add CourtLink Services Logo at top left
    if (logoBase64) {
      try {
        pdf.addImage(logoBase64, "PNG", margin, 15, 50, 14);
      } catch (error) {}
    }

    // Add company details at top right
    pdf.setFontSize(9);
    pdf.setTextColor(...textColor);
    pdf.setFont(undefined, "normal");
    const rightX = pageWidth - margin;
    pdf.text("Recovery Case Universe", rightX, 18, { align: "right" });
    pdf.text("High Court Enforcement", rightX, 23, { align: "right" });
    pdf.text("https://app.courtlinkservice.com/", rightX, 28, {
      align: "right",
    });

    // Title - styled like "VAT INVOICE" in sample
    pdf.setTextColor(...clsBlue);
    pdf.setFontSize(20);
    pdf.setFont(undefined, "bold");
    const viewLabels = {
      applicant: "Case Details Report",
      admin: "Admin Case Report",
      hceo: "HCEO Case Report",
    };
    pdf.text(viewLabels[viewType] || "Case Details Report", margin, 42);

    pdf.setFontSize(12);
    pdf.setFont(undefined, "normal");
    pdf.setTextColor(...textColor);
    pdf.text(
      `Case ID: ${generateCompanyCaseId(caseData.id, companyName)}`,
      margin,
      49,
    );

    yPos = 65;

    // ========== USER INFORMATION SECTION (Admin View) ==========

    if (viewType === "admin" && additionalData.hceoEmail) {
      checkNewPage(60);
      yPos = addSectionHeader("HCEO Information", yPos);

      pdf.setFontSize(10);
      pdf.setFont(undefined, "normal");

      const labelWidth = 50;

      pdf.setFont(undefined, "bold");
      pdf.text("Email:", margin, yPos);
      pdf.setFont(undefined, "normal");
      pdf.text(additionalData.hceoEmail || "N/A", margin + labelWidth, yPos);
      yPos += 10;

      pdf.setFont(undefined, "bold");
      pdf.text("Full Name:", margin, yPos);
      pdf.setFont(undefined, "normal");
      pdf.text(
        caseData.assigned_user_name || caseData.hceo_choice || "Not provided",
        margin + labelWidth,
        yPos,
      );
      yPos += 10;

      pdf.setFont(undefined, "bold");
      pdf.text("User Since:", margin, yPos);
      pdf.setFont(undefined, "normal");
      pdf.text(
        additionalData.hceoCreatedAt
          ? formatDate(additionalData.hceoCreatedAt)
          : "N/A",
        margin + labelWidth,
        yPos,
      );
      yPos += 15;
    }

    // ========== CLAIMANT INFORMATION SECTION ==========

    checkNewPage(40);
    yPos = addSectionHeader("Claimant Information", yPos);

    pdf.setFontSize(10);
    pdf.setFont(undefined, "normal");

    const labelWidth = 50;
    const valueWidth = pageWidth - margin * 2 - labelWidth - 10;

    // Claimant Name
    checkNewPage(12);
    pdf.setFont(undefined, "bold");
    pdf.text("Name:", margin, yPos);
    pdf.setFont(undefined, "normal");
    yPos = addText(
      caseData.claimant_name,
      margin + labelWidth,
      yPos,
      valueWidth,
    );
    yPos += 3;

    // Claimant Ref
    if (caseData.claimant_ref) {
      checkNewPage(12);
      pdf.setFont(undefined, "bold");
      pdf.text("Reference:", margin, yPos);
      pdf.setFont(undefined, "normal");
      yPos = addText(
        caseData.claimant_ref,
        margin + labelWidth,
        yPos,
        valueWidth,
      );
      yPos += 3;
    }

    // Claimant Address
    if (caseData.claimant_address) {
      checkNewPage(12);
      pdf.setFont(undefined, "bold");
      pdf.text("Address:", margin, yPos);
      pdf.setFont(undefined, "normal");
      yPos = addText(
        caseData.claimant_address,
        margin + labelWidth,
        yPos,
        valueWidth,
      );
      yPos += 3;
    }

    yPos += 10;

    // ========== DEFENDANT INFORMATION SECTION ==========

    checkNewPage(40);
    yPos = addSectionHeader("Defendant Information", yPos);

    pdf.setFontSize(10);
    pdf.setFont(undefined, "normal");

    // Defendant Name
    checkNewPage(12);
    pdf.setFont(undefined, "bold");
    pdf.text("Name:", margin, yPos);
    pdf.setFont(undefined, "normal");
    yPos = addText(
      caseData.defendant_name,
      margin + labelWidth,
      yPos,
      valueWidth,
    );
    yPos += 3;

    // Defendant Ref
    if (caseData.defendant_ref) {
      checkNewPage(12);
      pdf.setFont(undefined, "bold");
      pdf.text("Reference:", margin, yPos);
      pdf.setFont(undefined, "normal");
      yPos = addText(
        caseData.defendant_ref,
        margin + labelWidth,
        yPos,
        valueWidth,
      );
      yPos += 3;
    }

    // Defendant Address on Judgment
    if (caseData.defendant_address_on_judgment) {
      checkNewPage(12);
      pdf.setFont(undefined, "bold");
      pdf.text("Address on Judgment:", margin, yPos);
      pdf.setFont(undefined, "normal");
      yPos = addText(
        caseData.defendant_address_on_judgment,
        margin + labelWidth,
        yPos,
        valueWidth,
      );
      yPos += 3;
    }

    // Defendant Moved Status
    checkNewPage(12);
    pdf.setFont(undefined, "bold");
    pdf.text("Defendant Moved:", margin, yPos);
    pdf.setFont(undefined, "normal");
    pdf.text(
      caseData.defendant_moved ? "Yes" : "No",
      margin + labelWidth,
      yPos,
    );
    yPos += 8;

    // Current Address (if moved)
    if (caseData.defendant_moved && caseData.defendant_current_address) {
      checkNewPage(12);
      pdf.setFont(undefined, "bold");
      pdf.text("Current Address:", margin, yPos);
      pdf.setFont(undefined, "normal");
      yPos = addText(
        caseData.defendant_current_address,
        margin + labelWidth,
        yPos,
        valueWidth,
      );
      yPos += 3;
    }

    yPos += 10;

    // ========== JUDGMENT INFORMATION SECTION ==========

    checkNewPage(40);
    yPos = addSectionHeader("Judgment Information", yPos);

    pdf.setFontSize(10);
    pdf.setFont(undefined, "normal");

    // Judgment Date
    checkNewPage(12);
    pdf.setFont(undefined, "bold");
    pdf.text("Judgment Date:", margin, yPos);
    pdf.setFont(undefined, "normal");
    pdf.text(formatDate(caseData.judgment_date), margin + labelWidth, yPos);
    yPos += 8;

    // Claim Number
    if (caseData.claim_number) {
      checkNewPage(12);
      pdf.setFont(undefined, "bold");
      pdf.text("Claim Number:", margin, yPos);
      pdf.setFont(undefined, "normal");
      yPos = addText(
        caseData.claim_number,
        margin + labelWidth,
        yPos,
        valueWidth,
      );
      yPos += 3;
    }

    // Court Making Judgment
    if (caseData.court_making_judgment) {
      checkNewPage(12);
      pdf.setFont(undefined, "bold");
      pdf.text("Court Making Judgment:", margin, yPos);
      pdf.setFont(undefined, "normal");
      yPos = addText(
        caseData.court_making_judgment,
        margin + labelWidth,
        yPos,
        valueWidth,
      );
      yPos += 3;
    }

    // Fixed Costs
    if (caseData.claiming_fixed_costs) {
      checkNewPage(12);
      pdf.setFont(undefined, "bold");
      pdf.text("Claiming Fixed Costs:", margin, yPos);
      pdf.setFont(undefined, "normal");
      pdf.text(
        caseData.claiming_fixed_costs === "yes" ? "Yes" : "No",
        margin + labelWidth,
        yPos,
      );
      yPos += 8;
    }

    // Amount of Debt
    if (caseData.amount_of_debt) {
      checkNewPage(12);
      pdf.setFont(undefined, "bold");
      pdf.text("Amount of Debt:", margin, yPos);
      pdf.setFont(undefined, "normal");
      pdf.text(
        formatAmount(caseData.amount_of_debt),
        margin + labelWidth,
        yPos,
      );
      yPos += 8;
    }

    // Amount of Costs
    if (caseData.amount_of_costs) {
      checkNewPage(12);
      pdf.setFont(undefined, "bold");
      pdf.text("Amount of Costs:", margin, yPos);
      pdf.setFont(undefined, "normal");
      pdf.text(
        formatAmount(caseData.amount_of_costs),
        margin + labelWidth,
        yPos,
      );
      yPos += 8;
    }

    // Total Judgment Amount
    checkNewPage(12);
    pdf.setFont(undefined, "bold");
    pdf.text("Total Judgment Amount:", margin, yPos);
    pdf.setFont(undefined, "normal");
    pdf.text(formatAmount(caseData.judgment_amount), margin + labelWidth, yPos);
    yPos += 8;

    // // Interest Recovery
    // checkNewPage(12);
    // pdf.setFont(undefined, "bold");
    // pdf.text("Interest Recovery:", margin, yPos);
    // pdf.setFont(undefined, "normal");
    // pdf.text(
    //   caseData.interest_recovery ? "Yes" : "No",
    //   margin + labelWidth,
    //   yPos
    // );
    // yPos += 15;

    // ========== PAYMENTS RECEIVED SECTION ==========

    if (
      caseData.payments_received &&
      Array.isArray(caseData.payments_received) &&
      caseData.payments_received.length > 0
    ) {
      checkNewPage(25 + caseData.payments_received.length * 10 + 20);
      yPos = addSectionHeader(
        `Payments Received Since Judgment (${caseData.payments_received.length})`,
        yPos,
      );

      pdf.setFontSize(10);
      pdf.setFont(undefined, "bold");

      // Table header
      pdf.text("Date", margin, yPos);
      pdf.text("Amount", margin + 80, yPos);
      yPos += 5;

      // Line under header
      pdf.setDrawColor(...lightGray);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      pdf.setFont(undefined, "normal");

      // Payment rows
      let totalPayments = 0;
      caseData.payments_received.forEach((payment) => {
        checkNewPage(10);
        pdf.text(formatDate(payment.date), margin, yPos);
        pdf.text(formatAmount(payment.amount), margin + 80, yPos);
        totalPayments += parseFloat(payment.amount) || 0;
        yPos += 8;
      });

      // Total line
      yPos += 2;
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      pdf.setFont(undefined, "bold");
      pdf.text("Total Payments:", margin, yPos);
      pdf.text(formatAmount(totalPayments), margin + 80, yPos);
      yPos += 15;
    }

    // ========== HCEO ASSIGNMENT SECTION ==========

    checkNewPage(40);
    yPos = addSectionHeader("HCEO Assignment", yPos);

    pdf.setFontSize(10);
    pdf.setFont(undefined, "normal");

    // HCEO Choice
    checkNewPage(12);
    pdf.setFont(undefined, "bold");
    pdf.text("HCEO Officer:", margin, yPos);
    pdf.setFont(undefined, "normal");
    yPos = addText(
      caseData.assigned_user_name || caseData.hceo_choice || "Not assigned",
      margin + labelWidth,
      yPos,
      valueWidth,
    );
    yPos += 3;

    // Organization
    if (caseData.organization) {
      checkNewPage(12);
      pdf.setFont(undefined, "bold");
      pdf.text("Organization:", margin, yPos);
      pdf.setFont(undefined, "normal");
      yPos = addText(
        caseData.organization,
        margin + labelWidth,
        yPos,
        valueWidth,
      );
      yPos += 3;
    }

    // Assigned Email
    if (caseData.assigned_user_email) {
      checkNewPage(12);
      pdf.setFont(undefined, "bold");
      pdf.text("Email:", margin, yPos);
      pdf.setFont(undefined, "normal");
      yPos = addText(
        caseData.assigned_user_email,
        margin + labelWidth,
        yPos,
        valueWidth,
      );
      yPos += 3;
    }

    // Extra Details
    if (caseData.hceo_extra_details) {
      checkNewPage(12);
      pdf.setFont(undefined, "bold");
      pdf.text("Additional Details:", margin, yPos);
      pdf.setFont(undefined, "normal");
      yPos = addText(
        caseData.hceo_extra_details,
        margin + labelWidth,
        yPos,
        valueWidth,
      );
      yPos += 3;
    }

    yPos += 10;

    // ========== STATUS SECTION ==========

    checkNewPage(60);
    yPos = addSectionHeader("Case Status", yPos);

    pdf.setFontSize(10);
    pdf.setFont(undefined, "normal");

    // Current Status
    pdf.setFont(undefined, "bold");
    pdf.text("Current Status:", margin, yPos);
    pdf.setFont(undefined, "normal");
    pdf.text(getStatusLabel(caseData.status), margin + labelWidth, yPos);
    yPos += 7;

    // Submitted On
    pdf.setFont(undefined, "bold");
    pdf.text("Submitted On:", margin, yPos);
    pdf.setFont(undefined, "normal");
    pdf.text(formatDateTime(caseData.created_at), margin + labelWidth, yPos);
    yPos += 7;

    // Last Updated
    pdf.setFont(undefined, "bold");
    pdf.text("Last Updated:", margin, yPos);
    pdf.setFont(undefined, "normal");
    pdf.text(formatDateTime(caseData.updated_at), margin + labelWidth, yPos);
    yPos += 15;

    // ========== PAYMENT SECTION ==========

    if (caseData.payment_amount || caseData.service_fee) {
      checkNewPage(80);
      yPos = addSectionHeader("Payment Summary", yPos);

      pdf.setFontSize(10);
      pdf.setFont(undefined, "normal");

      if (caseData.payment_status) {
        pdf.setFont(undefined, "bold");
        pdf.text("Payment Status:", margin, yPos);
        pdf.setFont(undefined, "normal");
        pdf.text(
          caseData.payment_status.replace("_", " ").toUpperCase(),
          margin + labelWidth,
          yPos,
        );
        yPos += 7;
      }

      if (caseData.payment_amount) {
        pdf.setFont(undefined, "bold");
        pdf.text("Total Paid:", margin, yPos);
        pdf.setFont(undefined, "normal");
        pdf.text(
          formatAmount(caseData.payment_amount),
          margin + labelWidth,
          yPos,
        );
        yPos += 7;
      }

      if (caseData.service_fee) {
        pdf.setFont(undefined, "bold");
        pdf.text("Service Fee:", margin, yPos);
        pdf.setFont(undefined, "normal");
        pdf.text(formatAmount(caseData.service_fee), margin + labelWidth, yPos);
        yPos += 7;
      }

      if (caseData.payment_intent_id) {
        pdf.setFont(undefined, "bold");
        pdf.text("Payment ID:", margin, yPos);
        pdf.setFont(undefined, "normal");
        pdf.setFontSize(8);
        yPos = addText(
          caseData.payment_intent_id,
          margin + labelWidth,
          yPos,
          valueWidth,
          8,
        );
        pdf.setFontSize(10);
        yPos += 5;
      }

      yPos += 5;
    }

    // ========== JUDGMENT DOCUMENTS SECTION ==========

    if (
      caseData.judgment_file_paths &&
      Array.isArray(caseData.judgment_file_paths) &&
      caseData.judgment_file_paths.length > 0
    ) {
      checkNewPage(25 + caseData.judgment_file_paths.length * 15);
      yPos = addSectionHeader(
        `Judgment Documents (${caseData.judgment_file_paths.length})`,
        yPos,
      );

      pdf.setFontSize(10);
      pdf.setFont(undefined, "normal");

      for (let i = 0; i < caseData.judgment_file_paths.length; i++) {
        const filePath = caseData.judgment_file_paths[i];
        const fileName = filePath.split("/").pop();

        checkNewPage(15);

        pdf.setFont(undefined, "bold");
        pdf.text(`Document ${i + 1}:`, margin, yPos);
        pdf.setFont(undefined, "normal");

        // Get signed URL for the document
        const documentUrl = await getDocumentSignedUrl(filePath);

        if (documentUrl) {
          // Add clickable link in CourtLink Services blue
          const linkX = margin + labelWidth;
          pdf.setTextColor(...clsBlue);
          pdf.textWithLink("Click to View Document", linkX, yPos, {
            url: documentUrl,
          });
          pdf.setTextColor(...textColor);

          // Add filename below
          yPos += 6;
          pdf.setFontSize(8);
          pdf.setTextColor(...lightGray);
          yPos = addText(fileName, margin + labelWidth, yPos, valueWidth, 8);
          pdf.setFontSize(10);
          pdf.setTextColor(...textColor);
        } else {
          yPos = addText(fileName, margin + labelWidth, yPos, valueWidth);
        }

        yPos += 8;
      }

      yPos += 5;
    }

    // ========== HCEO DOCUMENTS SECTION ==========

    if (
      caseData.hceo_file_paths &&
      Array.isArray(caseData.hceo_file_paths) &&
      caseData.hceo_file_paths.length > 0
    ) {
      checkNewPage(25 + caseData.hceo_file_paths.length * 15);
      yPos = addSectionHeader(
        `HCEO Documents (${caseData.hceo_file_paths.length})`,
        yPos,
      );

      pdf.setFontSize(10);
      pdf.setFont(undefined, "normal");

      for (let i = 0; i < caseData.hceo_file_paths.length; i++) {
        const filePath = caseData.hceo_file_paths[i];
        const fileName = filePath.split("/").pop();

        checkNewPage(15);

        pdf.setFont(undefined, "bold");
        pdf.text(`HCEO Document ${i + 1}:`, margin, yPos);
        pdf.setFont(undefined, "normal");

        // Get signed URL for the document
        const documentUrl = await getDocumentSignedUrl(filePath);

        if (documentUrl) {
          // Add clickable link in CourtLink Services blue
          const linkX = margin + labelWidth;
          pdf.setTextColor(...clsBlue);
          pdf.textWithLink("Click to View Document", linkX, yPos, {
            url: documentUrl,
          });
          pdf.setTextColor(...textColor);

          // Add filename below
          yPos += 6;
          pdf.setFontSize(8);
          pdf.setTextColor(...lightGray);
          yPos = addText(fileName, margin + labelWidth, yPos, valueWidth, 8);
          pdf.setFontSize(10);
          pdf.setTextColor(...textColor);
        } else {
          yPos = addText(fileName, margin + labelWidth, yPos, valueWidth);
        }

        yPos += 8;
      }

      yPos += 5;
    }

    // ========== SEALED WRIT DOCUMENTS SECTION (Admin & HCEO only) ==========

    if (
      (viewType === "admin" || viewType === "hceo") &&
      caseData.sealed_writ_file_paths &&
      Array.isArray(caseData.sealed_writ_file_paths) &&
      caseData.sealed_writ_file_paths.length > 0
    ) {
      checkNewPage(25 + caseData.sealed_writ_file_paths.length * 15);
      yPos = addSectionHeader(
        `Sealed Writ from Court (${caseData.sealed_writ_file_paths.length})`,
        yPos,
      );

      pdf.setFontSize(10);
      pdf.setFont(undefined, "normal");

      for (let i = 0; i < caseData.sealed_writ_file_paths.length; i++) {
        const filePath = caseData.sealed_writ_file_paths[i];
        const fileName = filePath.split("/").pop();

        checkNewPage(15);

        pdf.setFont(undefined, "bold");
        pdf.text(`Sealed Writ Document ${i + 1}:`, margin, yPos);
        pdf.setFont(undefined, "normal");

        // Get signed URL for the document
        const documentUrl = await getDocumentSignedUrl(filePath);

        if (documentUrl) {
          // Add clickable link in CourtLink Services blue
          const linkX = margin + labelWidth;
          pdf.setTextColor(...clsBlue);
          pdf.textWithLink("Click to View Document", linkX, yPos, {
            url: documentUrl,
          });
          pdf.setTextColor(...textColor);

          // Add filename below
          yPos += 6;
          pdf.setFontSize(8);
          pdf.setTextColor(...lightGray);
          yPos = addText(fileName, margin + labelWidth, yPos, valueWidth, 8);
          pdf.setFontSize(10);
          pdf.setTextColor(...textColor);
        } else {
          yPos = addText(fileName, margin + labelWidth, yPos, valueWidth);
        }

        yPos += 8;
      }

      yPos += 5;
    }

    // ========== FOOTER ==========

    addFooter();

    // ========== SAVE PDF ==========

    const filename = `case-${generateCompanyCaseId(
      caseData.id,
      companyName,
    )}-${viewType}-details.pdf`;

    // Open in new tab instead of downloading
    const pdfBlob = pdf.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, "_blank");

    // pdf.save(filename); // Commented out - now opens in new tab instead of downloading

    return { success: true, filename };
  } catch (err) {
    console.error("Error generating PDF:", err);
    throw new Error(`Failed to generate PDF: ${err.message}`);
  }
};

/**
 * Print case details (opens print dialog for the current page)
 */
export const printCaseDetails = () => {
  window.print();
};

/**
 * Generate a simple invoice PDF
 * @param {Object} caseData - The case data
 * @param {Object} invoiceData - Invoice-specific data
 * @returns {Promise<{success: boolean, filename: string}>}
 */
export const generateInvoicePDF = async (caseData, invoiceData = {}) => {
  try {
    // Get company name from caseData
    const companyName = caseData.user_profile?.company_name;

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = margin;

    // Header
    pdf.setFillColor(30, 58, 138);
    pdf.rect(0, 0, pageWidth, 40, "F");

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont(undefined, "bold");
    pdf.text("INVOICE", margin, 25);

    pdf.setFontSize(10);
    pdf.setFont(undefined, "normal");
    pdf.text(
      `Invoice Date: ${new Date().toLocaleDateString("en-GB")}`,
      margin,
      33,
    );

    // Reset text color
    pdf.setTextColor(...textColor);
    yPos = 55;

    // Case Details
    pdf.setFontSize(12);
    pdf.setFont(undefined, "bold");
    pdf.text(
      `Case ID: ${generateCompanyCaseId(caseData.id, companyName)}`,
      margin,
      yPos,
    );
    yPos += 10;

    pdf.setFontSize(10);
    pdf.setFont(undefined, "normal");
    pdf.text(`Claimant: ${caseData.claimant_name}`, margin, yPos);
    yPos += 8;
    pdf.text(`Defendant: ${caseData.defendant_name}`, margin, yPos);
    yPos += 15;

    // Invoice Items
    pdf.setFont(undefined, "bold");
    pdf.text("Description", margin, yPos);
    pdf.text("Amount", pageWidth - margin - 40, yPos);
    yPos += 5;

    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    pdf.setFont(undefined, "normal");
    pdf.text("Judgment Amount", margin, yPos);
    pdf.text(
      formatAmount(caseData.judgment_amount),
      pageWidth - margin - 40,
      yPos,
    );
    yPos += 8;

    pdf.text("Service Fee (5%)", margin, yPos);
    pdf.text(formatAmount(caseData.service_fee), pageWidth - margin - 40, yPos);
    yPos += 10;

    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    pdf.setFont(undefined, "bold");
    pdf.text("Total", margin, yPos);
    pdf.text(
      formatAmount(caseData.payment_amount),
      pageWidth - margin - 40,
      yPos,
    );

    // Save - Open in new tab instead of downloading
    const filename = `invoice-${generateCompanyCaseId(
      caseData.id,
      companyName,
    )}.pdf`;

    // Open in new tab
    const pdfBlob = pdf.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, "_blank");

    // pdf.save(filename); // Commented out - now opens in new tab instead of downloading

    return { success: true, filename };
  } catch (err) {
    console.error("Error generating invoice PDF:", err);
    throw new Error(`Failed to generate invoice: ${err.message}`);
  }
};
