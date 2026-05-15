// netlify/functions/create-payment-intent.js
import Stripe from "stripe";
import { ServerLogger, injectLogsIntoResponse } from "./logger.js";
import { checkRateLimit, getClientIp } from "./rate-limit-payment.js";

const RATE_LIMIT_REQUESTS = 5;   // max requests per IP
const RATE_LIMIT_WINDOW   = 60_000; // per 60 seconds

// Initialize Stripe lazily to avoid crashes when env vars are not loaded yet
let stripe = null;
const getStripe = () => {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
};

export const handler = async (event) => {
  const logger = new ServerLogger();

  const stripeClient = getStripe();
  const headers = {
    "Access-Control-Allow-Origin":  process.env.CLIENT_URL,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // ── Rate limiting ──────────────────────────────────────────────────────────
  const ip = getClientIp(event);
  const { allowed, retryAfterSec, headers: rlHeaders } = checkRateLimit(
    ip,
    RATE_LIMIT_REQUESTS,
    RATE_LIMIT_WINDOW
  );

  if (!allowed) {
    logger.warn(`[rate-limit] IP ${ip} exceeded ${RATE_LIMIT_REQUESTS} req/${RATE_LIMIT_WINDOW / 1000}s`);
    return {
      statusCode: 429,
      headers: { ...headers, ...rlHeaders },
      body: JSON.stringify({
        error: "Too many requests",
        message: `Rate limit exceeded. Please wait ${retryAfterSec} seconds before trying again.`,
      }),
    };
  }
  // ──────────────────────────────────────────────────────────────────────────

  try {
    logger.info("📝 Create Payment Intent Request:", {
      body: event.body,
      timestamp: new Date().toISOString(),
    });

    const { amount, currency = "gbp", metadata } = JSON.parse(event.body);

    if (!amount) {
      logger.error("❌ Missing amount in request");
      return injectLogsIntoResponse({
        statusCode: 400,
        headers: { ...headers, ...rlHeaders },
        body: JSON.stringify({
          error: "Missing amount",
          message: "Amount is required",
        }),
      }, logger);
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 50) {
      logger.error("❌ Invalid amount:", numericAmount);
      return injectLogsIntoResponse({
        statusCode: 400,
        headers: { ...headers, ...rlHeaders },
        body: JSON.stringify({
          error: "Invalid amount",
          message: "Amount must be at least £0.50 (50 pence)",
        }),
      }, logger);
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      logger.error("❌ STRIPE_SECRET_KEY is not set");
      return injectLogsIntoResponse({
        statusCode: 500,
        headers: { ...headers, ...rlHeaders },
        body: JSON.stringify({
          error: "Server configuration error",
          message: "Payment service not configured",
        }),
      }, logger);
    }

    logger.log("💳 Creating Stripe payment intent:", {
      amount: numericAmount,
      currency: currency.toLowerCase(),
      metadata,
    });

    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: Math.round(numericAmount),
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        ...metadata,
        created_at: new Date().toISOString(),
      },
    });

    logger.success("✅ Payment intent created successfully:", {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    });

    return injectLogsIntoResponse({
      statusCode: 200,
      headers: { ...headers, ...rlHeaders },
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
    }, logger);

  } catch (error) {
    logger.error("❌ Error creating payment intent:", {
      message: error.message,
      type: error.type,
      stack: error.stack,
    });

    if (error.type === "StripeCardError") {
      return injectLogsIntoResponse({
        statusCode: 400,
        headers: { ...headers, ...rlHeaders },
        body: JSON.stringify({ error: "Card error", message: error.message }),
      }, logger);
    }

    if (error.type === "StripeInvalidRequestError") {
      return injectLogsIntoResponse({
        statusCode: 400,
        headers: { ...headers, ...rlHeaders },
        body: JSON.stringify({ error: "Invalid request", message: error.message }),
      }, logger);
    }

    if (error.type === "StripeAPIError") {
      return injectLogsIntoResponse({
        statusCode: 500,
        headers: { ...headers, ...rlHeaders },
        body: JSON.stringify({
          error: "Stripe API error",
          message: "Payment service temporarily unavailable",
        }),
      }, logger);
    }

    if (error.type === "StripeAuthenticationError") {
      return injectLogsIntoResponse({
        statusCode: 500,
        headers: { ...headers, ...rlHeaders },
        body: JSON.stringify({
          error: "Authentication error",
          message: "Payment service configuration error",
        }),
      }, logger);
    }

    return injectLogsIntoResponse({
      statusCode: 500,
      headers: { ...headers, ...rlHeaders },
      body: JSON.stringify({
        error: "Payment intent creation failed",
        message: error.message || "Unknown error occurred",
      }),
    }, logger);
  }
};