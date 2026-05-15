// src/lib/email.js
// AWS SES Email Service - All emails sent via Supabase Edge Function using AWS SES
import { supabase } from "./supabase";
import { getAdminEmails as fetchAdminEmails } from "./adminApi";
import { generateCompanyCaseId } from "./caseUtils";

// Template names - templates are loaded from email-templates folder
const TEMPLATE_NAMES = {
  NEW_USER_WELCOME: "welcome",
  ADMIN_NOTIFICATION: "admin-notification",
  CASE_SUBMITTED_APPLICANT: "case-submitted-applicant",
  CASE_SUBMITTED_ADMIN: "case-submitted-admin",
  CASE_APPROVED: "case-approved",
  CASE_RETURNED: "case-returned",
  WRIT_RECEIVED: "writ-received",
  CASE_COMPLETED_ADMIN: "case-completed-admin",
  CASE_COMPLETED_HCEO: "case-completed-hceo",
  PAYMENT_ADDED: "payment-added",
  HCEO_ASSIGNED: "hceo-assigned",
  CASE_UPDATED_ADMIN: "case-updated-admin",
};

// Helper function to get user company name
const getUserCompanyName = async (userId) => {
  try {
    if (!userId) return null;

    const { data, error } = await supabase
      .from("profiles_public")
      .select("company_name")
      .eq("id", userId)
      .single();

    if (error || !data) return null;
    return data.company_name;
  } catch (error) {
    console.error("Error fetching user company name:", error);
    return null;
  }
};

// Send email via Supabase Edge Function using AWS SES
// Templates are loaded from email-templates folder
const sendEmail = async (
  templateName,
  email,
  dataVariables,
  attachments = null,
) => {
  try {
    if (!templateName) {
      throw new Error("Template name is missing");
    }

    if (!email) {
      throw new Error("Email address is missing");
    }

    // Check if attachments are too large (base64 PDF can be large)
    let useAttachments = attachments;
    if (attachments && attachments.length > 0) {
      const totalSize = attachments.reduce(
        (sum, att) => sum + (att.data?.length || 0),
        0,
      );
      // Limit to ~5MB base64 (roughly 3.75MB actual file)
      if (totalSize > 5 * 1024 * 1024) {
        console.warn(
          "⚠️ Attachments too large, sending email without attachments",
        );
        useAttachments = null;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased to 15s

    try {
      const requestBody = {
        templateName, // Use templateName instead of templateId
        email,
        dataVariables,
      };

      // Add attachments if provided and not too large
      if (useAttachments && useAttachments.length > 0) {
        requestBody.attachments = useAttachments;
      }

      const { data, error } = await supabase.functions.invoke("send-email", {
        body: requestBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (error) {
        console.error("❌ Edge Function error:", error);
        console.error("Error details:", {
          message: error.message,
          context: error.context,
          status: error.status,
        });
        throw error;
      }

      if (!data) {
        console.error("❌ No data returned from Edge Function");
        throw new Error("No response data from Edge Function");
      }

      if (!data.success) {
        console.error("❌ Email sending failed:", data.error);
        throw new Error(data.error || "Failed to send email");
      }

      return { success: true, data: data.data };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        throw new Error("Email request timed out after 15 seconds");
      }
      throw err;
    }
  } catch (error) {
    console.error("❌ Error sending email:", error);
    return { success: false, error: error.message };
  }
};

// Send welcome email to new user
export const sendWelcomeEmail = async (userData) => {
  const { email, fullName, role } = userData;

  if (!TEMPLATE_NAMES.NEW_USER_WELCOME) {
    console.error("❌ Welcome email template ID not configured");
    return { success: false, error: "Template ID not configured" };
  }

  return sendEmail(TEMPLATE_NAMES.NEW_USER_WELCOME, email, {
    fullName: fullName || "User",
    email: email,
    role: role || "applicant",
  });
};

// Send notification to all admins about new user registration
export const sendAdminNotification = async (userData, adminEmails) => {
  const { email, fullName, phone, role, bankDetails, vatReclaim } = userData;

  if (!TEMPLATE_NAMES.ADMIN_NOTIFICATION) {
    console.error("❌ Admin notification template ID not configured");
    return {
      success: false,
      error: "Template ID not configured",
      successCount: 0,
      totalCount: 0,
    };
  }

  const registrationDate = new Date().toLocaleString("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
  });

  const dataVariables = {
    fullName: fullName || "Unknown",
    email: email,
    phone: phone || "Not provided",
    role: role || "applicant",
    bankName: bankDetails?.bankName || "Not provided",
    accountNumber: bankDetails?.accountNumber || "Not provided",
    sortCode: bankDetails?.sortCode || "Not provided",
    accountHolderName: bankDetails?.accountHolderName || "Not provided",
    vatReclaim: vatReclaim ? "Yes" : "No",
    registrationDate: registrationDate,
  };

  const promises = adminEmails.map((adminEmail) =>
    sendEmail(TEMPLATE_NAMES.ADMIN_NOTIFICATION, adminEmail, dataVariables),
  );

  const results = await Promise.allSettled(promises);

  const successCount = results.filter(
    (r) => r.status === "fulfilled" && r.value.success,
  ).length;

  return {
    success: successCount > 0,
    successCount,
    totalCount: adminEmails.length,
  };
};

// Send case submission notification to applicant and admins
export const sendCaseSubmissionEmails = async (
  caseData,
  applicantEmail,
  invoicePdfBase64 = null,
) => {
  try {
    // FIXED: Check for correct template IDs
    if (!TEMPLATE_NAMES.CASE_SUBMITTED_APPLICANT) {
      console.error("❌ Case submission applicant template not configured");
      return { success: false, error: "Applicant template not configured" };
    }

    if (!TEMPLATE_NAMES.CASE_SUBMITTED_ADMIN) {
      console.error("❌ Case submission admin template not configured");
      return { success: false, error: "Admin template not configured" };
    }

    // Get user's company name for proper case ID generation
    const companyName = await getUserCompanyName(caseData.user_id);
    const caseId = generateCompanyCaseId(caseData.id, companyName);

    const submissionDate = new Date().toLocaleString("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
    });

    // Prepare attachments if PDF is available
    let attachments = null;
    if (invoicePdfBase64) {
      // Clean and validate base64
      const cleanedBase64 = invoicePdfBase64.replace(/\s/g, "");

      // Check PDF size - if too large, skip attachments
      if (cleanedBase64.length > 5 * 1024 * 1024) {
        // 5MB base64 limit
        console.warn(
          "⚠️ Invoice PDF too large for email attachment, sending without PDF",
        );
        attachments = null;
      } else if (cleanedBase64.length === 0) {
        console.warn("⚠️ Invoice PDF is empty, sending without PDF");
        attachments = null;
      } else if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanedBase64)) {
        console.warn("⚠️ Invalid base64 PDF data, sending without PDF");
        attachments = null;
      } else {
        attachments = [
          {
            filename: `invoice-${caseId}.pdf`,
            contentType: "application/pdf",
            data: cleanedBase64, // Use cleaned base64
          },
        ];
      }
    }

    // Email data for applicant
    const applicantData = {
      caseId: caseId,
      claimantName: caseData.claimant_name || "N/A",
      defendantName: caseData.defendant_name || "N/A",
      judgmentAmount: `£${parseFloat(caseData.judgment_amount || 0).toFixed(
        2,
      )}`,
      submissionDate: submissionDate,
      status: "Submitted",
    };

    // Send email (no retries - send once only)
    const applicantResult = await sendEmail(
      TEMPLATE_NAMES.CASE_SUBMITTED_APPLICANT,
      applicantEmail,
      applicantData,
      attachments,
    );

    // Email to admins
    const adminEmails = await getAdminEmails();

    if (adminEmails.length === 0) {
      console.warn("⚠️ No admin emails found");
    }

    const adminData = {
      ...applicantData,
      applicantEmail: applicantEmail,
    };

    // Send emails (no retries - send once only)
    const adminResults = await Promise.allSettled(
      adminEmails.map((email) =>
        sendEmail(
          TEMPLATE_NAMES.CASE_SUBMITTED_ADMIN,
          email,
          adminData,
          attachments,
        ),
      ),
    );

    const adminSuccessCount = adminResults.filter(
      (r) => r.status === "fulfilled" && r.value.success,
    ).length;

    return {
      success: true,
      applicantSent: applicantResult.success,
      adminsSent: adminSuccessCount,
      totalAdmins: adminEmails.length,
    };
  } catch (error) {
    console.error("❌ Error sending case submission emails:", error);
    return { success: false, error: error.message };
  }
};

// Send writ received notification to applicant and HCEO (formerly "completed by admin")
export const sendCaseCompletedAdminEmails = async (
  caseData,
  applicantEmail,
  hceoEmail,
) => {
  try {
    if (!TEMPLATE_NAMES.CASE_COMPLETED_ADMIN) {
      console.error("❌ Writ received template not configured");
      return { success: false, error: "Template not configured" };
    }

    // Get user's company name for proper case ID generation
    const companyName = await getUserCompanyName(caseData.user_id);
    const caseId = generateCompanyCaseId(caseData.id, companyName);

    const receivedDate = new Date().toLocaleString("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
    });

    const emailData = {
      caseId: caseId,
      claimantName: caseData.claimant_name || "N/A",
      defendantName: caseData.defendant_name || "N/A",
      judgmentAmount: `£${parseFloat(caseData.judgment_amount || 0).toFixed(
        2,
      )}`,
      receivedDate: receivedDate,
      hceoName: caseData.assigned_user_name || "HCEO Officer",
      status: "Writ Received",
    };

    // Send to applicant
    const applicantResult = await sendEmail(
      TEMPLATE_NAMES.CASE_COMPLETED_ADMIN,
      applicantEmail,
      emailData,
    );

    // Send to HCEO if assigned
    let hceoResult = { success: false };
    if (hceoEmail) {
      hceoResult = await sendEmail(
        TEMPLATE_NAMES.CASE_COMPLETED_ADMIN,
        hceoEmail,
        emailData,
      );
    }

    return {
      success: true,
      applicantSent: applicantResult.success,
      hceoSent: hceoResult.success,
    };
  } catch (error) {
    console.error("❌ Error sending writ received emails:", error);
    return { success: false, error: error.message };
  }
};

// Send HCEO completed notification to applicant
export const sendCaseCompletedHCEOEmail = async (caseData, applicantEmail) => {
  try {
    if (!TEMPLATE_NAMES.CASE_COMPLETED_HCEO) {
      console.error("❌ HCEO completed template not configured");
      return { success: false, error: "Template not configured" };
    }

    // Get user's company name for proper case ID generation
    const companyName = await getUserCompanyName(caseData.user_id);
    const caseId = generateCompanyCaseId(caseData.id, companyName);

    const completionDate = new Date().toLocaleString("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
    });

    const emailData = {
      caseId: caseId,
      claimantName: caseData.claimant_name || "N/A",
      defendantName: caseData.defendant_name || "N/A",
      judgmentAmount: `£${parseFloat(caseData.judgment_amount || 0).toFixed(
        2,
      )}`,
      completionDate: completionDate,
      hceoName: caseData.assigned_user_name || "HCEO Officer",
      status: "HCEO Completed",
    };

    const result = await sendEmail(
      TEMPLATE_NAMES.CASE_COMPLETED_HCEO,
      applicantEmail,
      emailData,
    );

    return result;
  } catch (error) {
    console.error("❌ Error sending HCEO completed email:", error);
    return { success: false, error: error.message };
  }
};

// Send payment added notification to applicant and HCEO
export const sendPaymentAddedEmails = async (
  caseData,
  applicantEmail,
  hceoEmail,
  paymentDetails,
) => {
  try {
    if (!TEMPLATE_NAMES.PAYMENT_ADDED) {
      console.error("❌ Payment added template not configured");
      return { success: false, error: "Template not configured" };
    }

    // Get user's company name for proper case ID generation
    const companyName = await getUserCompanyName(caseData.user_id);
    const caseId = generateCompanyCaseId(caseData.id, companyName);

    const paymentDate = new Date().toLocaleString("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
    });

    const emailData = {
      caseId: caseId,
      claimantName: caseData.claimant_name || "N/A",
      defendantName: caseData.defendant_name || "N/A",
      judgmentAmount: `£${parseFloat(caseData.judgment_amount || 0).toFixed(
        2,
      )}`,
      paymentAmount: `£${parseFloat(paymentDetails.totalPayments || 0).toFixed(
        2,
      )}`,
      paymentDate: paymentDate,
      hceoName: caseData.assigned_user_name || "HCEO Officer",
    };

    // Send to applicant
    const applicantResult = await sendEmail(
      TEMPLATE_NAMES.PAYMENT_ADDED,
      applicantEmail,
      emailData,
    );

    // Send to HCEO if assigned
    let hceoResult = { success: false };
    if (hceoEmail) {
      hceoResult = await sendEmail(
        TEMPLATE_NAMES.PAYMENT_ADDED,
        hceoEmail,
        emailData,
      );
    }

    return {
      success: true,
      applicantSent: applicantResult.success,
      hceoSent: hceoResult.success,
    };
  } catch (error) {
    console.error("❌ Error sending payment added emails:", error);
    return { success: false, error: error.message };
  }
};

// Send HCEO assignment notification
export const sendHCEOAssignmentEmail = async (
  caseData,
  hceoEmail,
  hceoName,
) => {
  try {
    if (!TEMPLATE_NAMES.HCEO_ASSIGNED) {
      console.error("❌ HCEO assignment template not configured");
      return { success: false, error: "Template not configured" };
    }

    if (!hceoEmail) {
      console.warn("⚠️ No HCEO email provided");
      return { success: false, error: "HCEO email not provided" };
    }

    // Get user's company name for proper case ID generation
    const companyName = await getUserCompanyName(caseData.user_id);
    const caseId = generateCompanyCaseId(caseData.id, companyName);

    const assignmentDate = new Date().toLocaleString("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
    });

    const emailData = {
      caseId: caseId,
      hceoName: hceoName || "HCEO Officer",
      claimantName: caseData.claimant_name || "N/A",
      defendantName: caseData.defendant_name || "N/A",
      judgmentAmount: `£${parseFloat(caseData.judgment_amount || 0).toFixed(
        2,
      )}`,
      assignmentDate: assignmentDate,
      status: caseData.status || "N/A",
    };

    const result = await sendEmail(
      TEMPLATE_NAMES.HCEO_ASSIGNED,
      hceoEmail,
      emailData,
    );

    return result;
  } catch (error) {
    console.error("❌ Error sending HCEO assignment email:", error);
    return { success: false, error: error.message };
  }
};

// Send case update notification to admins
export const sendCaseUpdateEmails = async (
  caseData,
  applicantEmail,
  changedFields,
) => {
  try {
    if (!TEMPLATE_NAMES.CASE_UPDATED_ADMIN) {
      console.error("❌ Case update admin template not configured");
      return { success: false, error: "Template not configured" };
    }

    // Get user's company name for proper case ID generation
    const companyName = await getUserCompanyName(caseData.user_id);
    const caseId = generateCompanyCaseId(caseData.id, companyName);

    const updateDate = new Date().toLocaleString("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
    });

    // Format changed fields for email
    const changesText = changedFields
      .map(
        (change) =>
          `${change.field}: "${change.oldValue}" → "${change.newValue}"`,
      )
      .join(", ");

    const emailData = {
      caseId: caseId,
      claimantName: caseData.claimant_name || "N/A",
      defendantName: caseData.defendant_name || "N/A",
      judgmentAmount: `£${parseFloat(caseData.judgment_amount || 0).toFixed(
        2,
      )}`,
      updateDate: updateDate,
      applicantEmail: applicantEmail,
      changesCount: changedFields.length,
      changesSummary: changesText,
      status: caseData.status || "N/A",
    };

    // Email to all admins
    const adminEmails = await getAdminEmails();

    if (adminEmails.length === 0) {
      console.warn("⚠️ No admin emails found");
      return { success: false, error: "No admin emails found" };
    }

    const adminResults = await Promise.allSettled(
      adminEmails.map((email) =>
        sendEmail(TEMPLATE_NAMES.CASE_UPDATED_ADMIN, email, emailData),
      ),
    );

    const adminSuccessCount = adminResults.filter(
      (r) => r.status === "fulfilled" && r.value.success,
    ).length;

    return {
      success: adminSuccessCount > 0,
      adminsSent: adminSuccessCount,
      totalAdmins: adminEmails.length,
    };
  } catch (error) {
    console.error("❌ Error sending case update emails:", error);
    return { success: false, error: error.message };
  }
};

// Send case approved notification to HCEO (Note: "court" in notifications = assigned HCEO)
export const sendCaseApprovedEmails = async (caseData, adminNote = null) => {
  try {
    if (!TEMPLATE_NAMES.CASE_APPROVED) {
      console.error("❌ Case approved template not configured");
      return { success: false, error: "Template not configured" };
    }

    // Get user's company name for proper case ID generation
    const companyName = await getUserCompanyName(caseData.user_id);
    const caseId = generateCompanyCaseId(caseData.id, companyName);

    const approvalDate = new Date().toLocaleString("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
    });

    const emailData = {
      caseId: caseId,
      claimantName: caseData.claimant_name || "N/A",
      defendantName: caseData.defendant_name || "N/A",
      judgmentAmount: `£${parseFloat(caseData.judgment_amount || 0).toFixed(
        2,
      )}`,
      approvalDate: approvalDate,
      hceoName: caseData.assigned_user_name || "HCEO Officer",
      adminNote: adminNote || "No additional notes",
      status: "Approved - Sent to Court",
    };

    // Send to assigned HCEO
    let hceoResult = { success: false };
    if (caseData.assigned_user_email) {
      hceoResult = await sendEmail(
        TEMPLATE_NAMES.CASE_APPROVED,
        caseData.assigned_user_email,
        emailData,
      );
    } else {
      console.warn("⚠️ No HCEO email available for case approval notification");
    }

    return {
      success: hceoResult.success,
      hceoSent: hceoResult.success,
    };
  } catch (error) {
    console.error("❌ Error sending case approved emails:", error);
    return { success: false, error: error.message };
  }
};

// Send case returned notification to applicant
export const sendCaseReturnedEmail = async (
  caseData,
  applicantEmail,
  returnReason,
) => {
  try {
    if (!TEMPLATE_NAMES.CASE_RETURNED) {
      console.error("❌ Case returned template not configured");
      return { success: false, error: "Template not configured" };
    }

    // Get user's company name for proper case ID generation
    const companyName = await getUserCompanyName(caseData.user_id);
    const caseId = generateCompanyCaseId(caseData.id, companyName);

    const returnDate = new Date().toLocaleString("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
    });

    const emailData = {
      caseId: caseId,
      claimantName: caseData.claimant_name || "N/A",
      defendantName: caseData.defendant_name || "N/A",
      judgmentAmount: `£${parseFloat(caseData.judgment_amount || 0).toFixed(
        2,
      )}`,
      returnDate: returnDate,
      returnReason: returnReason || "Please review and resubmit",
      status: "Returned",
    };

    const result = await sendEmail(
      TEMPLATE_NAMES.CASE_RETURNED,
      applicantEmail,
      emailData,
    );

    return result;
  } catch (error) {
    console.error("❌ Error sending case returned email:", error);
    return { success: false, error: error.message };
  }
};

// Send writ received notification to HCEO (sealed writ uploaded, ready for enforcement)
export const sendWritReceivedEmail = async (caseData) => {
  try {
    if (!TEMPLATE_NAMES.WRIT_RECEIVED) {
      console.error("❌ Writ received template not configured");
      return { success: false, error: "Template not configured" };
    }

    // Get user's company name for proper case ID generation
    const companyName = await getUserCompanyName(caseData.user_id);
    const caseId = generateCompanyCaseId(caseData.id, companyName);

    const writReceivedDate = new Date().toLocaleString("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
    });

    const emailData = {
      caseId: caseId,
      claimantName: caseData.claimant_name || "N/A",
      defendantName: caseData.defendant_name || "N/A",
      judgmentAmount: `£${parseFloat(caseData.judgment_amount || 0).toFixed(
        2,
      )}`,
      writReceivedDate: writReceivedDate,
      hceoName: caseData.assigned_user_name || "HCEO Officer",
      status: "Writ Received - Ready for Enforcement",
    };

    // Send to assigned HCEO
    let result = { success: false };
    if (caseData.assigned_user_email) {
      result = await sendEmail(
        TEMPLATE_NAMES.WRIT_RECEIVED,
        caseData.assigned_user_email,
        emailData,
      );
    } else {
      console.warn("⚠️ No HCEO email available for writ received notification");
    }

    return result;
  } catch (error) {
    console.error("❌ Error sending writ received email:", error);
    return { success: false, error: error.message };
  }
};

// Fetch all admin emails from Supabase profiles table
export const getAdminEmails = async () => {
  try {
    // Use service role client to bypass RLS during signup
    const { data, error } = await supabase
      .from("profiles")
      .select("email")
      .eq("role", "admin");

    if (error) {
      console.error("Error fetching admin emails:", error);
      return [];
    }

    return data?.map((profile) => profile.email) || [];
  } catch (error) {
    console.error("❌ Error in getAdminEmails:", error);
    return [];
  }
};
