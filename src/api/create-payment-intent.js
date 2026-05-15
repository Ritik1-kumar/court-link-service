// src/api/create-payment-intent.js
// This can be deployed as a serverless function or Express endpoint

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // Add CORS headers for development
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
      message: "Only POST requests are accepted",
    });
  }

  try {
    const { amount, currency = "gbp", metadata } = req.body;

    // Enhanced validation
    if (!amount) {
      return res.status(400).json({
        error: "Missing amount",
        message: "Amount is required",
      });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 0.5) {
      return res.status(400).json({
        error: "Invalid amount",
        message: "Amount must be at least £0.50",
      });
    }

    // Validate Stripe key
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY is not set");
      return res.status(500).json({
        error: "Server configuration error",
        message: "Payment service not configured",
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(numericAmount * 100), // Convert to pence
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        ...metadata,
        userId: metadata.userId || metadata.user_id, // Ensure userId is in metadata
        user_id: metadata?.userId || metadata?.user_id || "unknown",
        created_at: new Date().toISOString(),
      },
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error("Detailed error creating payment intent:", error);

    // Handle specific Stripe errors
    if (error.type === "StripeCardError") {
      return res.status(400).json({
        error: "Card error",
        message: error.message,
      });
    }

    if (error.type === "StripeInvalidRequestError") {
      return res.status(400).json({
        error: "Invalid request",
        message: error.message,
      });
    }

    if (error.type === "StripeAPIError") {
      return res.status(500).json({
        error: "Stripe API error",
        message: "Payment service temporarily unavailable",
      });
    }

    if (error.type === "StripeAuthenticationError") {
      return res.status(500).json({
        error: "Authentication error",
        message: "Payment service configuration error",
      });
    }

    // Generic error
    res.status(500).json({
      error: "Payment intent creation failed",
      message: error.message || "Unknown error occurred",
    });
  }
}
