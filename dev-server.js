import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Load environment variables FIRST
dotenv.config();

// ── Import handlers ───────────────────────────────────────────────────────────
import { handler as healthHandler } from "./netlify/functions/health.js";
import { handler as createPaymentIntentHandler } from "./netlify/functions/create-payment-intent.js";
import { handler as stripeWebhookHandler } from "./netlify/functions/stripe-webhook.js";
import { handler as createInvoiceHandler } from "./netlify/functions/create-invoice-for-case.js";
import { handler as getInvoicePdfHandler } from "./netlify/functions/get-invoice-pdf.js";
import { handler as adminOperationsHandler } from "./netlify/functions/admin-operations.js";
import { handler as updateProfileBankDetailsHandler } from "./netlify/functions/update-profile-bank-details.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);

// Raw body for Stripe webhook signature verification
app.use("/api/stripe-webhook", express.raw({ type: "application/json" }));

// JSON for everything else
app.use(express.json());

// ── Helpers ───────────────────────────────────────────────────────────────────
const toNetlifyEvent = (req) => ({
  httpMethod: req.method,
  headers: req.headers,
  body:
    req.method === "GET"
      ? null
      : typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body),
  queryStringParameters: req.query,
  path: req.path,
});

const sendNetlifyResponse = (netlifyResponse, res) => {
  res.status(netlifyResponse.statusCode);

  if (netlifyResponse.headers) {
    Object.entries(netlifyResponse.headers).forEach(([k, v]) =>
      res.setHeader(k, v),
    );
  }

  if (netlifyResponse.statusCode === 302 && netlifyResponse.headers?.Location) {
    return res.redirect(netlifyResponse.headers.Location);
  }

  res.send(netlifyResponse.body);
};

// ── Routes ────────────────────────────────────────────────────────────────────

// Health check
app.get("/api/health", async (req, res) => {
  try {
    const response = await healthHandler(toNetlifyEvent(req));
    sendNetlifyResponse(response, res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create payment intent
app.options("/api/create-payment-intent", (req, res) => res.status(200).end());
app.post("/api/create-payment-intent", async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({
        error: "Server configuration error",
        message:
          "Stripe is not configured. Please set STRIPE_SECRET_KEY in your .env file.",
      });
    }
    const response = await createPaymentIntentHandler(toNetlifyEvent(req));
    sendNetlifyResponse(response, res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stripe webhook
app.post("/api/stripe-webhook", async (req, res) => {
  try {
    const event = {
      httpMethod: req.method,
      headers: req.headers,
      body: req.body.toString(), // raw body for sig verification
      queryStringParameters: req.query,
      path: req.path,
    };
    const response = await stripeWebhookHandler(event);
    sendNetlifyResponse(response, res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Custom invoice routes (replaces all Xero routes) ─────────────────────────

// Create invoice for a case (called after payment succeeds)
app.options("/api/create-invoice-for-case", (req, res) =>
  res.status(200).end(),
);
app.post("/api/create-invoice-for-case", async (req, res) => {
  try {
    const response = await createInvoiceHandler(toNetlifyEvent(req));
    sendNetlifyResponse(response, res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Also expose as Netlify-style path for frontend compatibility
app.options("/.netlify/functions/create-invoice-for-case", (req, res) =>
  res.status(200).end(),
);
app.post("/.netlify/functions/create-invoice-for-case", async (req, res) => {
  try {
    const response = await createInvoiceHandler(toNetlifyEvent(req));
    sendNetlifyResponse(response, res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get invoice PDF
app.options("/api/get-invoice-pdf", (req, res) => res.status(200).end());
app.post("/api/get-invoice-pdf", async (req, res) => {
  try {
    const response = await getInvoicePdfHandler(toNetlifyEvent(req));
    sendNetlifyResponse(response, res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.options("/.netlify/functions/get-invoice-pdf", (req, res) =>
  res.status(200).end(),
);
app.post("/.netlify/functions/get-invoice-pdf", async (req, res) => {
  try {
    const response = await getInvoicePdfHandler(toNetlifyEvent(req));
    sendNetlifyResponse(response, res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Other function routes ─────────────────────────────────────────────────────

// Admin operations
app.options("/.netlify/functions/admin-operations", (req, res) =>
  res.status(200).end(),
);
app.all("/.netlify/functions/admin-operations", async (req, res) => {
  try {
    const response = await adminOperationsHandler(toNetlifyEvent(req));
    sendNetlifyResponse(response, res);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update profile bank details
app.options("/.netlify/functions/update-profile-bank-details", (req, res) =>
  res.status(200).end(),
);
app.all("/.netlify/functions/update-profile-bank-details", async (req, res) => {
  try {
    const response = await updateProfileBankDetailsHandler(toNetlifyEvent(req));
    sendNetlifyResponse(response, res);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Root — API info
app.get("/", (req, res) => {
  res.json({
    message: "CourtLink Services Global API Server",
    version: "2.0.0",
    endpoints: [
      "GET  /api/health",
      "POST /api/create-payment-intent",
      "POST /api/stripe-webhook",
      "POST /api/create-invoice-for-case",
      "POST /api/get-invoice-pdf",
      "ALL  /.netlify/functions/admin-operations",
      "ALL  /.netlify/functions/update-profile-bank-details",
    ],
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Development server running`);
  console.log(`📍 URL: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  process.exit(0);
});
process.on("SIGINT", () => {
  process.exit(0);
});
