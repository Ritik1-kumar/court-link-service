// netlify/functions/logger.js
/**
 * Server Logger Utility
 * Captures server-side logs and makes them available to send to the client
 */

export class ServerLogger {
  constructor() {
    this.logs = [];
    this.startTime = Date.now();
  }

  /**
   * Format a log message with timestamp and emoji
   */
  _formatMessage(level, emoji, ...args) {
    const timestamp = Date.now() - this.startTime;
    const message = args
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg),
      )
      .join(" ");

    return {
      level,
      emoji,
      message,
      timestamp,
      time: new Date().toISOString(),
    };
  }

  /**
   * Log methods that mirror console but also capture for client
   */
  log(...args) {
    const logEntry = this._formatMessage("log", "ℹ️", ...args);
    this.logs.push(logEntry);
    // console.log(`${logEntry.emoji} [${logEntry.timestamp}ms]`, ...args);
  }

  info(...args) {
    const logEntry = this._formatMessage("info", "ℹ️", ...args);
    this.logs.push(logEntry);
    console.info(`${logEntry.emoji} [${logEntry.timestamp}ms]`, ...args);
  }

  success(...args) {
    const logEntry = this._formatMessage("success", "✅", ...args);
    this.logs.push(logEntry);
    // console.log(`${logEntry.emoji} [${logEntry.timestamp}ms]`, ...args);
  }

  warn(...args) {
    const logEntry = this._formatMessage("warn", "⚠️", ...args);
    this.logs.push(logEntry);
    console.warn(`${logEntry.emoji} [${logEntry.timestamp}ms]`, ...args);
  }

  error(...args) {
    const logEntry = this._formatMessage("error", "❌", ...args);
    this.logs.push(logEntry);
    console.error(`${logEntry.emoji} [${logEntry.timestamp}ms]`, ...args);
  }

  debug(...args) {
    const logEntry = this._formatMessage("debug", "🔍", ...args);
    this.logs.push(logEntry);
    console.debug(`${logEntry.emoji} [${logEntry.timestamp}ms]`, ...args);
  }

  /**
   * Get all captured logs
   */
  getLogs() {
    return this.logs;
  }

  /**
   * Get logs formatted for client console display
   */
  getClientLogs() {
    return this.logs.map((log) => ({
      level: log.level,
      message: `${log.emoji} [Server ${log.timestamp}ms] ${log.message}`,
      timestamp: log.time,
    }));
  }

  /**
   * Clear all logs
   */
  clear() {
    this.logs = [];
    this.startTime = Date.now();
  }
}

/**
 * Inject logs into the response body for client consumption
 */
export function injectLogsIntoResponse(response, logger) {
  const body =
    typeof response.body === "string"
      ? JSON.parse(response.body)
      : response.body;

  const enhancedBody = {
    ...body,
    _serverLogs: logger.getClientLogs(),
  };

  return {
    ...response,
    body: JSON.stringify(enhancedBody),
  };
}

/**
 * Inject logs into HTML response as a script
 */
export function injectLogsIntoHTML(htmlBody, logger) {
  const logs = logger.getClientLogs();
  // const scriptTag = `
  //   <script>
  //     (function() {
  //       const serverLogs = ${JSON.stringify(logs)};
  //       console.groupCollapsed('%c🖥️ Server Logs', 'color: #13B5EA; font-weight: bold; font-size: 14px;');
  //       serverLogs.forEach(log => {
  //         const style = 'color: ' + {
  //           'error': '#f5576c',
  //           'warn': '#ff9800',
  //           'success': '#4caf50',
  //           'info': '#2196f3',
  //           'debug': '#9c27b0',
  //           'log': '#666'
  //         }[log.level] || '#666';
  //         // console.log('%c' + log.message, style + '; font-size: 12px;');
  //       });
  //       console.groupEnd();
  //     })();
  //   </script>
  // `;

  // Inject before closing body tag, or before closing html tag if no body
  if (htmlBody.includes("</body>")) {
    return htmlBody.replace("</body>", `${scriptTag}</body>`);
  } else if (htmlBody.includes("</html>")) {
    return htmlBody.replace("</html>", `${scriptTag}</html>`);
  } else {
    return htmlBody + scriptTag;
  }
}
