// netlify/functions/rateLimiter.js
//
// Simple sliding-window rate limiter using a module-level Map.
// Because Netlify Functions are long-lived Node processes (warm instances),
// the Map persists across requests on the same instance.
//
// Limitations:
//   - Per-instance only — each warm Lambda has its own Map, so the true
//     global limit is MAX_REQUESTS * number_of_warm_instances.
//   - Good enough to deter casual abuse and accidental loops. For a hard
//     global cap, swap the Map for an Upstash Redis atomic increment.

const store = new Map(); // key → { count, windowStart }

/**
 * Check whether a key (typically an IP) has exceeded the rate limit.
 *
 * @param {string} key          - e.g. client IP address
 * @param {number} maxRequests  - allowed requests per window
 * @param {number} windowMs     - window size in milliseconds
 * @returns {{ allowed: boolean, retryAfterSec: number, headers: object }}
 */
export function checkRateLimit(key, maxRequests, windowMs) {
  const now   = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      retryAfterSec: 0,
      headers: {
        "X-RateLimit-Limit":     String(maxRequests),
        "X-RateLimit-Remaining": String(maxRequests - 1),
        "X-RateLimit-Reset":     String(Math.ceil((now + windowMs) / 1000)),
      },
    };
  }

  if (entry.count < maxRequests) {
    entry.count++;
    return {
      allowed: true,
      retryAfterSec: 0,
      headers: {
        "X-RateLimit-Limit":     String(maxRequests),
        "X-RateLimit-Remaining": String(maxRequests - entry.count),
        "X-RateLimit-Reset":     String(Math.ceil((entry.windowStart + windowMs) / 1000)),
      },
    };
  }

  // Limit exceeded
  const retryAfterSec = Math.ceil((windowMs - (now - entry.windowStart)) / 1000);
  return {
    allowed: false,
    retryAfterSec,
    headers: {
      "X-RateLimit-Limit":     String(maxRequests),
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset":     String(Math.ceil((entry.windowStart + windowMs) / 1000)),
      "Retry-After":           String(retryAfterSec),
    },
  };
}

/**
 * Extract the real client IP from a Netlify Function event.
 */
export function getClientIp(event) {
  return (
    event.headers["x-nf-client-connection-ip"] ||
    event.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    event.headers["client-ip"] ||
    "unknown"
  );
}