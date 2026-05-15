// src/lib/serverLogger.js
/**
 * Client-side utility to display server logs in the browser console
 */

/**
 * Display server logs from API response in the browser console
 * @param {Object} response - API response object
 * @param {string} context - Context description for the log group
 */
export function displayServerLogs(response, context = "API Call") {
  if (!response || typeof response !== "object") {
    return;
  }

  // Check if response has server logs
  const serverLogs = response._serverLogs;

  if (!serverLogs || !Array.isArray(serverLogs) || serverLogs.length === 0) {
    return;
  }

  // Create a collapsible group for server logs
  console.groupCollapsed(
    `%c🖥️ Server Logs: ${context}`,
    "color: #13B5EA; font-weight: bold; font-size: 14px; background: #f0f9ff; padding: 4px 8px; border-radius: 4px;",
  );

  // Display each log entry with appropriate styling
  serverLogs.forEach((log) => {
    const style = getLogStyle(log.level);
    const timestamp = new Date(log.timestamp).toLocaleTimeString();
    console.log(
      `%c[${timestamp}] ${log.level.toUpperCase()}: ${log.message}`,
      style,
    );
  });

  console.groupEnd();
}

/**
 * Get console style based on log level
 * @param {string} level - Log level (error, warn, success, info, debug, log)
 * @returns {string} CSS style string
 */
function getLogStyle(level) {
  const styles = {
    error: "color: #f5576c; font-weight: bold; font-size: 12px;",
    warn: "color: #ff9800; font-size: 12px;",
    success: "color: #4caf50; font-size: 12px;",
    info: "color: #2196f3; font-size: 12px;",
    debug: "color: #9c27b0; font-size: 12px;",
    log: "color: #666; font-size: 12px;",
  };

  return styles[level] || styles.log;
}

/**
 * Enhanced fetch wrapper that automatically displays server logs
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise} Fetch promise
 */
export async function fetchWithLogging(url, options = {}) {
  try {
    const response = await fetch(url, options);

    // Try to parse JSON response
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();

      // // Display server logs if present
      // displayServerLogs(data, `${options.method || "GET"} ${url}`);

      // Return the response with data
      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        data,
      };
    }

    // For non-JSON responses, return as-is
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      response,
    };
  } catch (error) {
    console.error(
      `%c❌ Fetch Error: ${url}`,
      "color: #f5576c; font-weight: bold;",
      error,
    );
    throw error;
  }
}

/**
 * Intercept and log all fetch requests globally (optional)
 * Call this once in your app's entry point to enable global logging
 */
export function enableGlobalServerLogging() {
  const originalFetch = window.fetch;

  // Only intercept your own API/function calls, not Supabase or other external requests
  const INTERCEPTED_PATTERNS = [
    "/.netlify/functions/",
    "/api/",
    "localhost:3001",
  ];

  window.fetch = async function (...args) {
    const [url, options] = args;
    const urlString = typeof url === "string" ? url : url?.url || "";

    // Skip interception for anything that isn't your own backend
    const shouldIntercept = INTERCEPTED_PATTERNS.some((pattern) =>
      urlString.includes(pattern),
    );

    if (!shouldIntercept) {
      return originalFetch.apply(this, args);
    }

    try {
      const response = await originalFetch.apply(this, args);

      // Clone the response so we can read it without consuming the original
      const clonedResponse = response.clone();

      try {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await clonedResponse.json();

          if (data._serverLogs) {
            displayServerLogs(data, `${options?.method || "GET"} ${urlString}`);
          }
        }
      } catch (e) {
        // Ignore parsing errors silently
      }

      return response; // Return the original, unread response
    } catch (error) {
      throw error;
    }
  };
}

/**
 * Display logs from HTML response (for pages like Xero callback)
 * This is automatically handled by the script injected in HTML responses
 */
export function displayLogsFromHTML() {
  // This function is called automatically by the injected script in HTML responses
  // No action needed here as the logs are already displayed by the script tag
}
