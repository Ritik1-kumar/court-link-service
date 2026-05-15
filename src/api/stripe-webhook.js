// src/api/stripe-webhook.js
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { createClient } = require("@supabase/supabase-js");
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV || "production",
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

module.exports = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    Sentry.captureException(err, {
      extra: { area: "stripe_webhook_signature" },
    });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  // Log webhook event
  const { data: webhookLog, error: webhookError } = await supabase
    .from("stripe_webhooks")
    .insert([
      {
        stripe_event_id: event.id,
        event_type: event.type,
        payment_intent_id: event.data.object.id,
        data: event.data.object,
        processed: false,
      },
    ])
    .select()
    .single();

  if (webhookError) {
    console.error("Error logging webhook:", webhookError);
  }

  // Handle the event
  switch (event.type) {
    case "payment_intent.succeeded":
      const paymentIntent = event.data.object;

      try {
        // Get case data by payment_intent_id
        const { data: caseData, error: caseError } = await supabase
          .from("case_submissions")
          .select("*")
          .eq("payment_intent_id", paymentIntent.id)
          .single();

        if (caseError) {
          console.error("Error finding case:", caseError);

          // If case not found by payment_intent_id, try to find by user_id and is_draft
          // This handles the case where client hasn't set payment_intent_id yet
          const userId = paymentIntent.metadata?.userId;
          if (userId) {
            const { data: draftCase, error: draftError } = await supabase
              .from("case_submissions")
              .select("*")
              .eq("user_id", userId)
              .eq("is_draft", true)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            if (!draftError && draftCase) {
              // Update the draft case
              const { data: updatedCase, error: updateError } = await supabase
                .from("case_submissions")
                .update({
                  payment_intent_id: paymentIntent.id,
                  payment_status: "succeeded",
                  status: "submitted",
                  is_draft: false,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", draftCase.id)
                .select()
                .single();

              if (updateError) {
                Sentry.captureException(new Error(updateError.message), {
                  extra: {
                    area: "update_draft_case",
                    caseId: draftCase.id,
                    paymentIntentId: paymentIntent.id,
                  },
                });
                console.error("Error updating draft case:", updateError);
              }
            }
          }
          break;
        }

        // if (!caseData) {
        //   console.log("No case found for payment intent:", paymentIntent.id);
        //   break;
        // }

        // Update case submission status - ALWAYS set to submitted when payment succeeds
        const { data: updatedCase, error: updateError } = await supabase
          .from("case_submissions")
          .update({
            payment_status: "succeeded",
            status: "submitted",
            is_draft: false,
            updated_at: new Date().toISOString(),
          })
          .eq("payment_intent_id", paymentIntent.id)
          .select()
          .single();

        // if (updateError) {
        //   console.error("Error updating case status:", updateError);
        // } else {
        //   console.log(
        //     "Case updated successfully:",
        //     updatedCase.id,
        //     "New status:",
        //     updatedCase.status,
        //   );
        // }

        // Mark webhook as processed
        if (webhookLog) {
          await supabase
            .from("stripe_webhooks")
            .update({ processed: true })
            .eq("id", webhookLog.id);
        }
      } catch (error) {
        Sentry.captureException(error, {
          extra: {
            area: "payment_intent_succeeded",
            paymentIntentId: paymentIntent.id,
          },
        });
        console.error("Error processing payment success:", error);
      }
      break;

    case "payment_intent.payment_failed":
      const failedPayment = event.data.object;

      await supabase
        .from("case_submissions")
        .update({
          payment_status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("payment_intent_id", failedPayment.id);

      if (webhookLog) {
        await supabase
          .from("stripe_webhooks")
          .update({ processed: true })
          .eq("id", webhookLog.id);
      }

      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.status(200).json({ received: true });
};
