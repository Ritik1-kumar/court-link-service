# Stripe Webhook Setup for Localhost with ngrok

## Step-by-Step Guide

### 1. Start Your Local Development Server

Make sure your dev server is running on port 3001:
```bash
node dev-server.js
```

Your webhook endpoint will be available at: `http://localhost:3001/api/stripe-webhook`

### 2. Start ngrok

In a **new terminal window**, start ngrok to expose your local server:

```bash
ngrok http 3001
```

**Important:** Keep this terminal open while developing. If you close it, you'll need to update the webhook URL in Stripe.

### 3. Copy Your ngrok URL

After starting ngrok, you'll see output like:
```
Forwarding  https://xxxx-xxxx-xxxx.ngrok-free.app -> http://localhost:3001
```

Copy the HTTPS URL (it will look like `https://xxxx-xxxx-xxxx.ngrok-free.app`)

### 4. Update Your .env File

Update the `NGROK_URL` in your `.env` file with the new ngrok URL:
```env
NGROK_URL=https://your-ngrok-url.ngrok-free.app
```

### 5. Add Webhook Endpoint in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks)
2. Click **"Add endpoint"**
3. Enter your webhook URL:
   ```
   https://your-ngrok-url.ngrok-free.app/api/stripe-webhook
   ```
4. Select the events you want to listen to:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - (Add any other events you need)
5. Click **"Add endpoint"**

### 6. Get the Webhook Signing Secret

1. After creating the endpoint, click on it in the Stripe Dashboard
2. In the **"Signing secret"** section, click **"Reveal"**
3. Copy the secret (it starts with `whsec_...`)

### 7. Update Your .env File with the Webhook Secret

Update the `STRIPE_WEBHOOK_SECRET` in your `.env` file:
```env
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
```

### 8. Restart Your Development Server

Restart your dev server to load the new environment variables:
```bash
# Stop the server (Ctrl+C) and restart
node dev-server.js
```

## Testing Your Webhook

### Option 1: Use Stripe CLI (Recommended for Testing)

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3001/api/stripe-webhook
   ```
4. This will give you a webhook signing secret (starts with `whsec_`)
5. Use this secret in your `.env` file instead of the one from the dashboard
6. Trigger test events:
   ```bash
   stripe trigger payment_intent.succeeded
   ```

### Option 2: Test with Real Events

1. Make a test payment through your application
2. Check your server logs for webhook events
3. Check the Stripe Dashboard → Webhooks → Your endpoint → Recent events

## Important Notes

⚠️ **ngrok URLs Change**: If you're using the free tier of ngrok, your URL changes every time you restart ngrok. You'll need to:
- Update the webhook URL in Stripe Dashboard
- Get a new webhook signing secret
- Update your `.env` file

💡 **ngrok Paid Tier**: If you upgrade to ngrok's paid tier, you can get a static domain that doesn't change.

💡 **Stripe CLI Alternative**: For development, using Stripe CLI (`stripe listen`) is often easier than ngrok because:
- No need to update webhook URLs
- Works offline
- Easier to test specific events

## Troubleshooting

### Webhook signature verification failed
- Make sure `STRIPE_WEBHOOK_SECRET` matches the secret from Stripe Dashboard
- Ensure your server is receiving the raw request body (your `dev-server.js` already handles this correctly)

### Webhook not receiving events
- Check that ngrok is still running
- Verify the webhook URL in Stripe Dashboard matches your current ngrok URL
- Check your server logs for incoming requests

### ngrok URL changed
- Update `NGROK_URL` in `.env`
- Update webhook URL in Stripe Dashboard
- Get new webhook signing secret and update `.env`

## Quick Reference

**Your webhook endpoint:** `http://localhost:3001/api/stripe-webhook`

**With ngrok:** `https://your-ngrok-url.ngrok-free.app/api/stripe-webhook`

**Environment variables needed:**
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret from Stripe
- `NGROK_URL` - Your current ngrok URL (optional, for reference)
