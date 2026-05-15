// netlify/functions/invoiceGenerator.js
// Custom PDF invoice generator — matches CourtLink Services VAT Invoice layout
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

/**
 * Generate a professional VAT invoice PDF as a base64 string
 * matching the CourtLink Services invoice style.
 *
 * Expected shape of invoiceData:
 * {
 *   invoice_number, invoice_date, due_date, reference,
 *   matter_number, claim_number, claimant_ref,
 *   claimant_name, defendant_name,
 *   subtotal, total_tax, total,
 *   amount_paid, amount_due, invoice_status,
 *   line_items: [{ description, unitAmount, vatRate, vat, amountExVat }]
 * }
 *
 * caseData:    any case_submissions row
 * userProfile: { full_name, email, address_line1, address_line2, city, postcode, company_name }
 */
export const generateInvoicePDF = async (
  invoiceData,
  caseData,
  userProfile,
) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // ── Colour palette ──────────────────────────────────────────────────────
  const TEAL = rgb(0.106, 0.608, 0.82); // #1B9BD1
  const LIGHT_BG = rgb(0.839, 0.933, 0.973); // #D6EEF8
  const XLIGHT_BG = rgb(0.922, 0.965, 0.988); // #EBF6FC
  const TEXT_DARK = rgb(0.1, 0.1, 0.1);
  const TEXT_GREY = rgb(0.4, 0.4, 0.4);
  const WHITE = rgb(1, 1, 1);
  const RED = rgb(0.8, 0.1, 0.1);
  const BORDER = rgb(0.659, 0.831, 0.925); // #A8D4EC

  // ── Helpers ─────────────────────────────────────────────────────────────
  const fmt = (n) =>
    `£${parseFloat(n || 0).toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const pct = (n) => `${parseFloat(n || 0).toFixed(2)}%`;

  const drawText = (text, x, y, opts = {}) => {
    page.drawText(String(text ?? ""), {
      x,
      y,
      size: opts.size ?? 9,
      font: opts.bold ? boldFont : regularFont,
      color: opts.color ?? TEXT_DARK,
      maxWidth: opts.maxWidth,
    });
  };

  // Center text helper
  const drawTextCentered = (text, centerX, y, opts = {}) => {
    const font = opts.bold ? boldFont : regularFont;
    const size = opts.size ?? 9;
    const tw = font.widthOfTextAtSize(String(text ?? ""), size);
    drawText(text, centerX - tw / 2, y, opts);
  };

  const drawRect = (x, y, w, h, color) => {
    page.drawRectangle({ x, y, width: w, height: h, color });
  };

  const drawLine = (x1, y1, x2, y2, color = BORDER, thickness = 0.5) => {
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness,
      color,
    });
  };

  // ── Layout constants ─────────────────────────────────────────────────────
  const ML = 30;
  const MR = width - 30;
  const CW = MR - ML;

  // ═══════════════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════════════
  const TOP = height - 28;

  // ── Teal icon square ─────────────────────────────────────────────────────
  const ICON_SIZE = 68;
  const ICON_X = ML;
  const ICON_Y = TOP - ICON_SIZE;
  drawRect(ICON_X, ICON_Y, ICON_SIZE, ICON_SIZE, TEAL);

  // White arc/spiral logo via SVG paths
  const cx = ICON_X + ICON_SIZE / 2;
  const cy = ICON_Y + ICON_SIZE / 2;
  const arcPath = (rx, startDeg, endDeg) => {
    const toRad = (d) => (d * Math.PI) / 180;
    const x1 = cx + rx * Math.cos(toRad(startDeg));
    const y1 = cy + rx * Math.sin(toRad(startDeg));
    const x2 = cx + rx * Math.cos(toRad(endDeg));
    const y2 = cy + rx * Math.sin(toRad(endDeg));
    const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${rx} ${rx} 0 ${large} 0 ${x2} ${y2}`;
  };
  page.drawSvgPath(arcPath(20, 40, 320), {
    strokeColor: WHITE,
    lineWidth: 3.5,
  });
  page.drawSvgPath(arcPath(13, 50, 310), { strokeColor: WHITE, lineWidth: 3 });
  page.drawSvgPath(arcPath(7, 220, 50), { strokeColor: WHITE, lineWidth: 2.5 });

  // ── Company name — right of icon ─────────────────────────────────────────
  const LOGO_TEXT_X = ICON_X + ICON_SIZE + 10;
  drawText("C O U R T L I N K", LOGO_TEXT_X, ICON_Y + ICON_SIZE - 20, {
    size: 22,
    bold: true,
    color: TEAL,
  });
  drawText("S E R V I C E S", LOGO_TEXT_X, ICON_Y + ICON_SIZE - 46, {
    size: 16,
    bold: true,
    color: TEAL,
  });
  // ── "VAT INVOICE" — top right, large bold teal ───────────────────────────
  drawText("VAT INVOICE", MR - 220, TOP - 22, {
    size: 28,
    bold: true,
    color: TEAL,
  });

  // ── Website teal bar ─────────────────────────────────────────────────────
  const BAR_W = 230;
  const BAR_X = MR - BAR_W;
  const BAR_Y = TOP - 46;
  const BAR_H = 17;
  drawRect(BAR_X, BAR_Y, BAR_W, BAR_H, TEAL);
  const website = process.env.COMPANY_WEBSITE || "www.courtlinkservice.com";
  drawTextCentered(website, BAR_X + BAR_W / 2, BAR_Y + 4, {
    size: 8.5,
    color: WHITE,
  });

  // ── Claimant Ref — centered under bar ────────────────────────────────────
  const claimantRef =
    invoiceData.claimant_ref ||
    caseData?.claimant_ref ||
    caseData?.claimant_reference ||
    invoiceData.reference ||
    "";
  drawTextCentered(
    `Claimant Ref : ${claimantRef}`,
    BAR_X + BAR_W / 2,
    BAR_Y - 14,
    { size: 8.5, color: TEXT_GREY },
  );

  // ── Invoice meta table ────────────────────────────────────────────────────
  const TBL_W = BAR_W;
  const TBL_X = BAR_X;
  const ROW_H = 19;
  const TBL_Y = BAR_Y - 40;

  // Row 1 headers
  drawRect(TBL_X, TBL_Y, TBL_W / 2, ROW_H, TEAL);
  drawRect(TBL_X + TBL_W / 2, TBL_Y, TBL_W / 2, ROW_H, TEAL);
  drawText("Invoice Number", TBL_X + 4, TBL_Y + 6, {
    size: 8,
    bold: true,
    color: WHITE,
  });
  drawText("Date", TBL_X + TBL_W / 2 + 4, TBL_Y + 6, {
    size: 8,
    bold: true,
    color: WHITE,
  });
  // Row 1 values
  drawRect(TBL_X, TBL_Y - ROW_H, TBL_W / 2, ROW_H, LIGHT_BG);
  drawRect(TBL_X + TBL_W / 2, TBL_Y - ROW_H, TBL_W / 2, ROW_H, LIGHT_BG);
  drawText(invoiceData.invoice_number || "", TBL_X + 4, TBL_Y - ROW_H + 6, {
    size: 9,
  });
  drawText(
    formatDate(invoiceData.invoice_date),
    TBL_X + TBL_W / 2 + 4,
    TBL_Y - ROW_H + 6,
    { size: 9 },
  );

  // Row 2 headers
  drawRect(TBL_X, TBL_Y - 2 * ROW_H, TBL_W / 2, ROW_H, TEAL);
  drawRect(TBL_X + TBL_W / 2, TBL_Y - 2 * ROW_H, TBL_W / 2, ROW_H, TEAL);
  drawText("Matter Number", TBL_X + 4, TBL_Y - 2 * ROW_H + 6, {
    size: 8,
    bold: true,
    color: WHITE,
  });
  drawText("Claim Number", TBL_X + TBL_W / 2 + 4, TBL_Y - 2 * ROW_H + 6, {
    size: 8,
    bold: true,
    color: WHITE,
  });
  // Row 2 values — dynamic, no N/A
  const matterNumber =
    invoiceData.matter_number ||
    invoiceData.matter_no ||
    caseData?.matter_number ||
    caseData?.matter_no ||
    caseData?.case_reference ||
    caseData?.reference ||
    invoiceData.reference ||
    "";
  const claimNumber =
    invoiceData.claim_number ||
    invoiceData.claim_no ||
    invoiceData.claim_ref ||
    caseData?.claim_number ||
    caseData?.claim_no ||
    caseData?.claim_ref ||
    caseData?.court_claim_number ||
    "";
  drawRect(TBL_X, TBL_Y - 3 * ROW_H, TBL_W / 2, ROW_H, LIGHT_BG);
  drawRect(TBL_X + TBL_W / 2, TBL_Y - 3 * ROW_H, TBL_W / 2, ROW_H, LIGHT_BG);
  drawText(matterNumber, TBL_X + 4, TBL_Y - 3 * ROW_H + 6, { size: 9 });
  drawText(claimNumber, TBL_X + TBL_W / 2 + 4, TBL_Y - 3 * ROW_H + 6, {
    size: 9,
  });

  // ── "Invoiced to" box ────────────────────────────────────────────────────
  const ADDR_X = ML;
  const ADDR_W = TBL_X - ML - 12;
  const ADDR_Y = TBL_Y;
  const ADDR_H = 4 * ROW_H;

  drawRect(ADDR_X, ADDR_Y, ADDR_W, ROW_H, TEAL);
  drawRect(ADDR_X, ADDR_Y - (ADDR_H - ROW_H), ADDR_W, ADDR_H - ROW_H, LIGHT_BG);
  drawText("Invoiced to", ADDR_X + 5, ADDR_Y + 6, {
    size: 9,
    bold: true,
    color: WHITE,
  });

  const addrLines = [
    userProfile.company_name || userProfile.full_name || "",
    userProfile.address_line1 || "",
    userProfile.address_line2 || "",
    [userProfile.city, userProfile.postcode].filter(Boolean).join(", "),
    userProfile.country || "",
  ].filter(Boolean);

  let addrY = ADDR_Y - ROW_H - 4;
  for (const line of addrLines) {
    drawText(line, ADDR_X + 5, addrY, { size: 8.5, maxWidth: ADDR_W - 10 });
    addrY -= 13;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CLAIMANT / DEFENDANT ROW
  // ═══════════════════════════════════════════════════════════════════════
  const SECT_TOP = ADDR_Y - ADDR_H - 12;
  const HALF_W = CW / 2;
  const VAL_H = 22;

  drawRect(ML, SECT_TOP, HALF_W, ROW_H, TEAL);
  drawRect(ML + HALF_W, SECT_TOP, HALF_W, ROW_H, TEAL);
  drawText("Claimant", ML + 5, SECT_TOP + 6, {
    size: 9,
    bold: true,
    color: WHITE,
  });
  drawText("Defendant", ML + HALF_W + 5, SECT_TOP + 6, {
    size: 9,
    bold: true,
    color: WHITE,
  });

  drawRect(ML, SECT_TOP - VAL_H, HALF_W, VAL_H, WHITE);
  drawRect(ML + HALF_W, SECT_TOP - VAL_H, HALF_W, VAL_H, WHITE);
  drawLine(ML, SECT_TOP - VAL_H, MR, SECT_TOP - VAL_H, BORDER, 0.5);
  drawLine(ML, SECT_TOP, ML, SECT_TOP - VAL_H, BORDER, 0.5);
  drawLine(ML + HALF_W, SECT_TOP, ML + HALF_W, SECT_TOP - VAL_H, BORDER, 0.5);
  drawLine(MR, SECT_TOP, MR, SECT_TOP - VAL_H, BORDER, 0.5);

  const claimant = invoiceData.claimant_name || caseData?.claimant_name || "";
  const defendant =
    invoiceData.defendant_name || caseData?.defendant_name || "";
  drawText(claimant, ML + 5, SECT_TOP - VAL_H + 7, {
    size: 8.5,
    maxWidth: HALF_W - 10,
  });
  drawText(defendant, ML + HALF_W + 5, SECT_TOP - VAL_H + 7, {
    size: 8.5,
    maxWidth: HALF_W - 10,
  });

  // ═══════════════════════════════════════════════════════════════════════
  // LINE ITEMS TABLE
  // ═══════════════════════════════════════════════════════════════════════
  const TH_Y = SECT_TOP - VAL_H - 10;
  const TH_H = 26;
  const IR_H = 20;

  const C0 = ML;
  const C1 = ML + CW * 0.52;
  const C2 = ML + CW * 0.635;
  const C3 = ML + CW * 0.75;
  const C4 = ML + CW * 0.875;
  const C5 = MR;

  drawRect(ML, TH_Y - TH_H, CW, TH_H, TEAL);
  for (const cx of [C1, C2, C3, C4]) {
    drawLine(cx, TH_Y, cx, TH_Y - TH_H, rgb(0.071, 0.447, 0.627), 0.5);
  }
  drawText("Descriptions of Services provided", C0 + 5, TH_Y - TH_H + 9, {
    size: 9,
    bold: true,
    color: WHITE,
  });
  const th2 = (l1, l2, x) => {
    drawText(l1, x + 3, TH_Y - TH_H + TH_H * 0.6, {
      size: 7.5,
      bold: true,
      color: WHITE,
    });
    drawText(l2, x + 3, TH_Y - TH_H + TH_H * 0.24, {
      size: 7.5,
      bold: true,
      color: WHITE,
    });
  };
  th2("Price Per", "Unit", C1);
  drawText("Vat Rate", C2 + 3, TH_Y - TH_H + 9, {
    size: 7.5,
    bold: true,
    color: WHITE,
  });
  drawText("Vat", C3 + 3, TH_Y - TH_H + 9, {
    size: 7.5,
    bold: true,
    color: WHITE,
  });
  th2("Amount Ex", "Vat", C4);

  const lineItems =
    invoiceData.line_items || buildLineItems(caseData, invoiceData);
  let ry = TH_Y - TH_H;

  for (let i = 0; i < 13; i++) {
    drawRect(ML, ry - IR_H, CW, IR_H, i % 2 === 0 ? WHITE : XLIGHT_BG);
    drawLine(ML, ry - IR_H, MR, ry - IR_H, BORDER, 0.4);
    for (const cx of [C0, C1, C2, C3, C4, C5])
      drawLine(cx, ry, cx, ry - IR_H, BORDER, 0.4);

    const item = lineItems[i];
    if (item) {
      const vatRate =
        item.vatRate ??
        (item.vat ? (item.vat / (item.unitAmount || 1)) * 100 : 0);
      const vatAmt = item.vat ?? (item.unitAmount * vatRate) / 100;
      const exVat = item.amountExVat ?? item.unitAmount ?? 0;
      drawText(item.description, C0 + 5, ry - IR_H + 6, {
        size: 9,
        maxWidth: C1 - C0 - 8,
      });
      drawText(fmt(item.unitAmount ?? exVat), C1 + 3, ry - IR_H + 6, {
        size: 9,
      });
      drawText(pct(vatRate), C2 + 3, ry - IR_H + 6, { size: 9 });
      drawText(fmt(vatAmt), C3 + 3, ry - IR_H + 6, { size: 9 });
      drawText(fmt(exVat), C4 + 3, ry - IR_H + 6, { size: 9 });
    }
    ry -= IR_H;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TOTALS
  // ═══════════════════════════════════════════════════════════════════════
  let ty = ry - 5;
  const TOT_X = ML + CW * 0.56;
  const TOT_W = MR - TOT_X;
  const COL_SP = TOT_W * 0.56;
  const T_RH = 19;

  const isPaid =
    (invoiceData.invoice_status ?? "").toLowerCase() === "paid" ||
    parseFloat(invoiceData.amount_paid || 0) > 0;

  if (isPaid) {
    drawText(
      `Payment received with thanks ${formatDate(invoiceData.invoice_date)}`,
      ML,
      ty - 8,
      { size: 9, bold: true, color: RED },
    );
  }
  drawText("Thank you for your business!", ML, ty - 26, {
    size: 9,
    color: TEAL,
  });

  const totRow = (
    label,
    value,
    bg = LIGHT_BG,
    textColor = TEXT_DARK,
    big = false,
  ) => {
    const h = big ? T_RH + 4 : T_RH;
    drawRect(TOT_X, ty - h, COL_SP, h, bg);
    drawRect(TOT_X + COL_SP, ty - h, TOT_W - COL_SP, h, bg);
    drawLine(TOT_X, ty - h, MR, ty - h, BORDER, 0.4);
    drawLine(TOT_X, ty, TOT_X, ty - h, BORDER, 0.4);
    drawLine(TOT_X + COL_SP, ty, TOT_X + COL_SP, ty - h, BORDER, 0.4);
    drawLine(MR, ty, MR, ty - h, BORDER, 0.4);
    const fs = big ? 10 : 9;
    const off = big ? 9 : 6;
    drawText(label, TOT_X + 5, ty - h + off, {
      size: fs,
      bold: big,
      color: textColor,
    });
    drawText(value, TOT_X + COL_SP + 5, ty - h + off, {
      size: fs,
      bold: big,
      color: textColor,
    });
    ty -= h;
  };

  totRow("SUBTOTAL", fmt(invoiceData.subtotal));
  totRow("VAT Total", fmt(invoiceData.total_tax));
  totRow("TOTAL", fmt(invoiceData.total), TEAL, WHITE, true);

  // ═══════════════════════════════════════════════════════════════════════
  // FOOTER — centered, matches screenshots exactly
  // ═══════════════════════════════════════════════════════════════════════
  const F_LINE_Y = 78;
  const centerX = width / 2;
  const contactEmail =
    process.env.COMPANY_EMAIL || "finance@courtlinkservices.com";
  const companyFull =
    process.env.COMPANY_FULL_NAME || "CourtLink Services Limited";
  const companyNo = process.env.COMPANY_NUMBER || "0123456789";
  const vatNo = process.env.COMPANY_VAT || "1234567890";

  drawLine(ML, F_LINE_Y, MR, F_LINE_Y, BORDER, 0.6);

  // Line 1: contact text — centered, black
  drawTextCentered(
    "if you have any questions about this invoice, please contact",
    centerX,
    F_LINE_Y - 14,
    { size: 9, color: TEXT_DARK },
  );
  // Line 2: email — centered, teal
  drawTextCentered(contactEmail, centerX, F_LINE_Y - 28, {
    size: 9,
    color: TEAL,
  });

  // Line 3: company name — centered, bold teal
  drawTextCentered(companyFull, centerX, F_LINE_Y - 48, {
    size: 9,
    bold: true,
    color: TEAL,
  });

  // Line 4: "Company No XXXX    VAT Reg No. XXXX" — same line, bold teal, spaced around center
  const compLabel = `Company No ${companyNo}`;
  const vatLabel = `VAT Reg No. ${vatNo}`;
  const GAP = 12;
  const compW = boldFont.widthOfTextAtSize(compLabel, 9);
  drawText(compLabel, centerX - GAP - compW, F_LINE_Y - 62, {
    size: 9,
    bold: true,
    color: TEAL,
  });
  drawText(vatLabel, centerX + GAP, F_LINE_Y - 62, {
    size: 9,
    bold: true,
    color: TEAL,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes).toString("base64");
};

// ── Utility helpers ──────────────────────────────────────────────────────────

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const buildLineItems = (caseData, invoiceData) => {
  const items = [];
  const reference =
    invoiceData.reference || caseData?.id?.substring(0, 8).toUpperCase() || "";

  const disbursement = parseFloat(
    caseData?.disbursement_fee || caseData?.court_fee || 0,
  );
  if (disbursement > 0) {
    items.push({
      description: `Court Disbursement for ${caseData?.disbursement_type || "transfer up application"}`,
      unitAmount: disbursement,
      vatRate: 0,
      vat: 0,
      amountExVat: disbursement,
    });
  }

  const adminFee = parseFloat(
    caseData?.admin_fee || caseData?.service_fee || 0,
  );
  if (adminFee > 0) {
    const vatAmt = adminFee * 0.2;
    items.push({
      description: "Administration Fee",
      unitAmount: adminFee,
      vatRate: 20,
      vat: vatAmt,
      amountExVat: adminFee,
    });
  }

  if (items.length === 0) {
    const subtotal = parseFloat(invoiceData.subtotal || invoiceData.total || 0);
    items.push({
      description: `Case Submission — ${reference}`,
      unitAmount: subtotal,
      vatRate: 0,
      vat: 0,
      amountExVat: subtotal,
    });
  }

  return items;
};
