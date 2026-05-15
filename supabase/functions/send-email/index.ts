// supabase/functions/send-email/index.ts
// AWS SES Email Service - No Loops.so dependencies

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { loadTemplate, replaceTemplateVariables } from "./template-loader.ts";
import { sendEmailViaSES } from "./ses-service.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Map template names to subject lines
const TEMPLATE_SUBJECTS: Record<string, string> = {
  "case-submitted-applicant": "Case Submitted Successfully - {{caseId}}",
  "case-submitted-admin": "New Case Submitted - {{caseId}}",
  welcome: "Welcome to CourtLink Services",
  "admin-notification": "New User Registration",
  "case-approved": "Case Approved - {{caseId}}",
  "case-returned": "Case Returned - {{caseId}}",
  "writ-received": "Writ Received - {{caseId}}",
  "case-completed-admin": "Case Completed - {{caseId}}",
  "case-completed-hceo": "Case Completed - {{caseId}}",
  "payment-added": "Payment Added - {{caseId}}",
  "hceo-assigned": "HCEO Assigned - {{caseId}}",
  "case-updated-admin": "Case Updated - {{caseId}}",
  "user-created-by-admin": "Your Account Has Been Created - CourtLink Services",
};

async function sendEmail(
  templateName: string,
  email: string,
  dataVariables: Record<string, any>,
  attachments?: Array<{ filename: string; contentType: string; data: string }>,
) {
  // Load template from email-templates folder
  const template = await loadTemplate(templateName);

  // Replace variables in template
  const html = replaceTemplateVariables(
    template,
    dataVariables as Record<string, string>,
  );

  // Get subject line
  let subject = TEMPLATE_SUBJECTS[templateName] || "Notification";
  subject = replaceTemplateVariables(
    subject,
    dataVariables as Record<string, string>,
  );

  // Prepare attachments with validation
  const emailAttachments = attachments
    ?.filter((att) => {
      if (!att.filename || !att.contentType || !att.data) {
        console.warn(`⚠️ Invalid attachment format, skipping:`, {
          filename: att.filename,
          hasContentType: !!att.contentType,
          hasData: !!att.data,
        });
        return false;
      }

      // Validate base64 data
      const cleanedData = att.data.replace(/\s/g, "");
      if (cleanedData.length === 0) {
        console.warn(`⚠️ Empty attachment data for ${att.filename}, skipping`);
        return false;
      }

      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanedData)) {
        console.warn(`⚠️ Invalid base64 format for ${att.filename}, skipping`);
        return false;
      }

      // Check size (10MB base64 limit)
      if (cleanedData.length > 10 * 1024 * 1024) {
        console.warn(
          `⚠️ Attachment ${att.filename} too large (${Math.round(cleanedData.length / 1024 / 1024)}MB), skipping`,
        );
        return false;
      }

      return true;
    })
    .map((att) => ({
      filename: att.filename,
      contentType: att.contentType,
      data: att.data.replace(/\s/g, ""), // Clean whitespace
    }));

  if (
    attachments &&
    attachments.length > 0 &&
    (!emailAttachments || emailAttachments.length === 0)
  ) {
    console.warn(
      `⚠️ All attachments were invalid, sending email without attachments`,
    );
  }

  // Send email via AWS SES
  await sendEmailViaSES({
    to: email,
    subject: subject,
    html: html,
    attachments: emailAttachments,
  });

  return { success: true, messageId: `sent-${Date.now()}` };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error("❌ JSON parse error:", parseError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid JSON in request body",
          details: parseError.message,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Accept either templateId (for backward compatibility) or templateName (preferred)
    const { templateId, templateName, email, dataVariables, attachments } =
      requestBody;

    // Use templateName if provided, otherwise fall back to templateId for backward compatibility
    const finalTemplateName = templateName || templateId;

    if (!email || !finalTemplateName || !dataVariables) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields",
          missing: {
            email: !email,
            templateName: !finalTemplateName,
            dataVariables: !dataVariables,
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Validate attachments if provided
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        if (
          !attachment.filename ||
          !attachment.contentType ||
          !attachment.data
        ) {
          console.warn("⚠️ Invalid attachment format, skipping attachments");
          break;
        }
        // Check if attachment data is too large (10MB base64 limit)
        if (attachment.data.length > 10 * 1024 * 1024) {
          console.warn("⚠️ Attachment too large, skipping attachments");
          break;
        }
      }
    }

    const result = await sendEmail(
      finalTemplateName,
      email,
      dataVariables,
      attachments,
    );

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("❌ Edge Function error:", error);
    console.error("Error stack:", error.stack);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error",
        type: error.name || "Error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
