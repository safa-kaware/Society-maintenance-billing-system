import { jsPDF } from "jspdf";
import { Flat, Payment } from "../types";

export function generateReceiptPDF(flat: Flat, payment: Payment, month: string): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Color Palette - Slate & Charcoal Theme
  const primaryColor = [30, 41, 59]; // slate-800
  const secondaryColor = [71, 85, 105]; // slate-600
  const accentColor = [16, 185, 129]; // emerald-500
  const lightBg = [248, 250, 252]; // slate-50
  const darkGray = [51, 51, 51];
  const lightGray = [226, 232, 240]; // slate-200

  // Margins
  const marginX = 20;
  let currentY = 20;

  // Header Banner Background
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 40, "F");

  // Logo Text
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("CO-OPERATIVE HOUSING SOCIETY", marginX, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  doc.text("Automated Maintenance Billing System", marginX, 28);
  doc.text("Regd No. CHS/MUM/10294/2026", marginX, 33);

  // Receipt Identifier (Top Right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("MAINTENANCE RECEIPT", 140, 25);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Receipt No: ${payment.id}`, 140, 31);
  doc.text(`Billing Cycle: ${month}`, 140, 36);

  currentY = 55;

  // Left Column - Resident Details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("ISSUED TO (RESIDENT):", marginX, currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text(`Owner: ${flat.ownerName}`, marginX, currentY + 6);
  doc.text(`Flat Unit: Wing ${flat.wing} - Flat ${flat.number}`, marginX, currentY + 12);
  doc.text(`Contact: +91 ${flat.contactNumber}`, marginX, currentY + 18);
  doc.text(`Email: ${flat.email}`, marginX, currentY + 24);

  // Right Column - Payment metadata
  const col2X = 120;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("PAYMENT INFORMATION:", col2X, currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  const payDate = new Date(payment.date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  doc.text(`Payment Date: ${payDate}`, col2X, currentY + 6);
  doc.text(`Payment Mode: ${payment.method}`, col2X, currentY + 12);
  doc.text(`Transaction ID: ${payment.transactionId}`, col2X, currentY + 18);
  doc.text(`Status: PAID (Verified)`, col2X, currentY + 24);

  // Separator line
  currentY += 35;
  doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.setLineWidth(0.5);
  doc.line(marginX, currentY, 210 - marginX, currentY);

  // Receipt Items Table
  currentY += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("MAINTENANCE BREAKDOWN", marginX, currentY);

  currentY += 6;
  // Table Header
  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.rect(marginX, currentY, 170, 8, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text("Sr No.", marginX + 3, currentY + 5.5);
  doc.text("Description", marginX + 20, currentY + 5.5);
  doc.text("Billing Period", marginX + 90, currentY + 5.5);
  doc.text("Amount (INR)", marginX + 140, currentY + 5.5);

  currentY += 8;
  // Table Row
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(marginX, currentY, 170, 10, "F");

  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFont("helvetica", "normal");
  doc.text("1", marginX + 3, currentY + 6);
  doc.text("Society Monthly Maintenance Charges", marginX + 20, currentY + 6);
  doc.text(month, marginX + 90, currentY + 6);
  doc.text(`Rs. ${payment.amount.toLocaleString("en-IN")}.00`, marginX + 140, currentY + 6);

  // Row lines
  doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.line(marginX, currentY + 10, 210 - marginX, currentY + 10);

  currentY += 10;
  // Total Row
  doc.setFont("helvetica", "bold");
  doc.text("Total Paid Amount:", marginX + 90, currentY + 7);
  doc.setFontSize(11);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text(`Rs. ${payment.amount.toLocaleString("en-IN")}.00`, marginX + 140, currentY + 7);

  currentY += 15;
  // Notes / Details
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(marginX, currentY, 170, 15, "F");
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.3);
  doc.rect(marginX, currentY, 170, 15, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("ADMIN NOTES & REMARKS:", marginX + 4, currentY + 5);
  doc.setFont("helvetica", "oblique");
  doc.setFontSize(8);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  const remark = payment.notes || "Society dues cleared. Thank you for your timely contribution towards the maintenance of our building amenities.";
  doc.text(remark, marginX + 4, currentY + 10);

  currentY += 28;
  // Terms & Conditions
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Terms and Conditions:", marginX, currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text("1. This is a computer-generated digital receipt and does not require a physical signature.", marginX, currentY + 4);
  doc.text("2. Please keep this receipt safe for auditing purposes. Any disputes must be reported within 10 days of payment.", marginX, currentY + 8);
  doc.text("3. High-speed maintenance collection is managed securely under Zero-Trust transaction verification protocols.", marginX, currentY + 12);

  // Signatures
  currentY += 25;
  doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.line(marginX, currentY, marginX + 40, currentY);
  doc.line(col2X, currentY, col2X + 45, currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Authorized Signatory", marginX + 5, currentY + 4);
  doc.text("Society Managing Committee", marginX + 3, currentY + 8);

  doc.text("Resident Acknowledgement", col2X + 6, currentY + 4);
  doc.text("(Digital Verification ID Attached)", col2X + 4, currentY + 8);

  // Watermark or Border
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(1);
  doc.rect(5, 5, 200, 287, "S");

  return doc;
}

export function downloadPDFReceipt(flat: Flat, payment: Payment, month: string) {
  const doc = generateReceiptPDF(flat, payment, month);
  doc.save(`Receipt_${flat.id}_${month.replace(/\s+/g, "_")}.pdf`);
}

export function getWhatsAppShareUrl(flat: Flat, payment: Payment, month: string): string {
  const payDate = new Date(payment.date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const text = `Hello *${flat.ownerName}* (Flat ${flat.id}),\n\nYour maintenance payment of *Rs. ${payment.amount.toLocaleString("en-IN")}* for *${month}* has been successfully received and verified!\n\n*Transaction Details*:\n- Date: ${payDate}\n- Method: ${payment.method}\n- Tx ID: ${payment.transactionId}\n- Receipt No: ${payment.id}\n\nThank you for paying digitally and supporting our housing society.\n\n_Regards,\nSociety Managing Committee_`;
  return `https://api.whatsapp.com/send?phone=91${flat.contactNumber}&text=${encodeURIComponent(text)}`;
}
