// AWS SES Email Service using nodemailer-compatible approach
// Constructs proper MIME email with binary attachments

interface EmailAttachment {
  filename: string;
  contentType: string;
  data: string; // base64 encoded
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

export async function sendEmailViaSES(options: EmailOptions): Promise<void> {
  const SMTP_HOST =
    Deno.env.get("SMTP_HOST") || "email-smtp.eu-west-1.amazonaws.com";
  const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") || "587");
  const SMTP_USER = Deno.env.get("SMTP_USER");
  const SMTP_PASS = Deno.env.get("SMTP_PASS");
  const SMTP_FROM =
    Deno.env.get("SMTP_FROM") || "noreply@mail.mydentaledge.com";

  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error(
      "SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS environment variables in Supabase dashboard.",
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const buffer = new Uint8Array(8192); // Larger buffer for better performance

  // Build MIME email with proper structure
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  let emailParts: string[] = [];

  // Email headers
  emailParts.push(`From: ${SMTP_FROM}`);
  emailParts.push(`To: ${options.to}`);
  emailParts.push(`Subject: ${options.subject}`);
  emailParts.push(`MIME-Version: 1.0`);

  if (options.attachments && options.attachments.length > 0) {
    emailParts.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    emailParts.push(``); // Blank line after headers

    // HTML body part
    emailParts.push(`--${boundary}`);
    emailParts.push(`Content-Type: text/html; charset=utf-8`);
    emailParts.push(`Content-Transfer-Encoding: 8bit`);
    emailParts.push(``);
    emailParts.push(options.html);
    emailParts.push(``);

    // Process attachments
    for (const attachment of options.attachments) {
      // Clean base64 data
      const base64Data = attachment.data.replace(/\s/g, "");

      // Validate base64
      if (!base64Data || base64Data.length === 0) {
        console.warn(
          `⚠️ Empty base64 data for attachment ${attachment.filename}, skipping`,
        );
        continue;
      }

      // Validate base64 format
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
        console.warn(
          `⚠️ Invalid base64 format for attachment ${attachment.filename}, skipping`,
        );
        continue;
      }

      emailParts.push(`--${boundary}`);
      emailParts.push(
        `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
      );
      emailParts.push(
        `Content-Disposition: attachment; filename="${attachment.filename}"`,
      );
      emailParts.push(`Content-Transfer-Encoding: base64`);
      emailParts.push(``);

      // Split base64 into 76-character lines (RFC 2045)
      const lines: string[] = [];
      for (let i = 0; i < base64Data.length; i += 76) {
        lines.push(base64Data.substring(i, i + 76));
      }
      emailParts.push(lines.join("\r\n"));
    }

    emailParts.push(`--${boundary}--`);
  } else {
    emailParts.push(`Content-Type: text/html; charset=utf-8`);
    emailParts.push(`Content-Transfer-Encoding: 8bit`);
    emailParts.push(``);
    emailParts.push(options.html);
  }

  const emailBody = emailParts.join("\r\n") + "\r\n";

  // Perform "dot-stuffing" - escape any line that starts with a dot
  // This is required by RFC 5321 to prevent premature DATA termination
  const stuffedBody = emailBody
    .split("\r\n")
    .map((line) => (line.startsWith(".") ? "." + line : line))
    .join("\r\n");

  // Helper functions for SMTP communication
  const readResponse = async (
    connection: Deno.Conn | Deno.TlsConn,
    timeoutMs: number = 30000,
  ): Promise<string> => {
    let response = "";
    let n: number | null;
    const startTime = Date.now();

    // Read until we get a complete SMTP response (ends with \r\n)
    // Some responses may come in multiple reads
    while (true) {
      // Check for timeout
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(
          `SMTP read timeout after ${timeoutMs}ms. Response so far: ${response.substring(0, 200)}`,
        );
      }

      n = await connection.read(buffer);
      if (n === null) {
        if (response.length > 0) {
          return response; // Return what we have
        }
        throw new Error("Connection closed unexpectedly");
      }
      response += decoder.decode(buffer.subarray(0, n));

      // SMTP responses end with \r\n, check if we have a complete response
      if (response.includes("\r\n")) {
        break;
      }

      // Safety check - don't loop forever
      if (response.length > 10000) {
        break;
      }
    }

    return response;
  };

  const writeAndRead = async (
    connection: Deno.Conn | Deno.TlsConn,
    command: string,
  ): Promise<string> => {
    await connection.write(encoder.encode(command));
    return await readResponse(connection);
  };

  // Connect to SMTP server
  const conn = await Deno.connect({
    hostname: SMTP_HOST,
    port: SMTP_PORT,
  });

  let tlsConn: Deno.TlsConn | null = null;

  try {
    // Read initial greeting
    await readResponse(conn);

    // Send EHLO
    await writeAndRead(conn, `EHLO ${SMTP_HOST}\r\n`);

    // Start TLS
    const startTlsResponse = await writeAndRead(conn, `STARTTLS\r\n`);
    if (!startTlsResponse.includes("220")) {
      throw new Error(`STARTTLS failed: ${startTlsResponse}`);
    }

    // Upgrade to TLS
    tlsConn = await Deno.startTls(conn, {
      hostname: SMTP_HOST,
    });

    // Re-EHLO after TLS
    await writeAndRead(tlsConn, `EHLO ${SMTP_HOST}\r\n`);

    // Authenticate using AUTH LOGIN (more compatible than PLAIN)
    await writeAndRead(tlsConn, `AUTH LOGIN\r\n`);
    await writeAndRead(tlsConn, btoa(SMTP_USER) + "\r\n");
    const authResponse = await writeAndRead(tlsConn, btoa(SMTP_PASS) + "\r\n");

    if (!authResponse.includes("235")) {
      throw new Error(`SMTP authentication failed: ${authResponse}`);
    }

    // Send MAIL FROM
    await writeAndRead(tlsConn, `MAIL FROM:<${SMTP_FROM}>\r\n`);

    // Send RCPT TO
    await writeAndRead(tlsConn, `RCPT TO:<${options.to}>\r\n`);

    // Send DATA
    const dataCommandResponse = await writeAndRead(tlsConn, `DATA\r\n`);

    if (!dataCommandResponse.includes("354")) {
      throw new Error(`DATA command failed: ${dataCommandResponse}`);
    }

    // Send email body in chunks to avoid SMTP timeout (451 4.4.2)
    // CRITICAL: SMTP servers expect continuous data flow after DATA command
    // Delays between chunks cause timeouts - send chunks as fast as possible
    const chunkSize = 16384; // 16KB chunks - larger chunks for better throughput
    const bodyBytes = encoder.encode(stuffedBody);
    const terminator = encoder.encode(".\r\n");

    // Send body in chunks WITHOUT delays - SMTP requires continuous data flow
    // The server has a timeout (typically 30-60s) for receiving all data after DATA command
    let totalSent = 0;
    const totalSize = bodyBytes.length;
    let lastProgressLog = 0;

    for (let i = 0; i < bodyBytes.length; i += chunkSize) {
      const chunk = bodyBytes.slice(
        i,
        Math.min(i + chunkSize, bodyBytes.length),
      );
      const written = await tlsConn.write(chunk);
      totalSent += written;

      // Log progress for large emails every 10% or every 50KB
      if (totalSize > 50 * 1024) {
        const progress = Math.round((totalSent / totalSize) * 100);
        const progressKB = Math.round(totalSent / 1024);
        if (
          progress - lastProgressLog >= 10 ||
          progressKB - lastProgressLog >= 50
        ) {
          lastProgressLog = Math.max(progress, progressKB);
        }
      }
    }

    // Send terminator after body - CRITICAL: must be sent immediately after data
    await tlsConn.write(terminator);

    // Read the response - allow up to 60 seconds for large emails
    // Server processes the email and responds with 250 OK
    const dataResponse = await readResponse(tlsConn, 60000); // 60 second timeout for large emails

    if (!dataResponse.includes("250")) {
      throw new Error(`Failed to send email: ${dataResponse}`);
    }

    // Quit
    await writeAndRead(tlsConn, `QUIT\r\n`);

    tlsConn.close();
  } catch (error) {
    // Clean up connections
    if (tlsConn) {
      try {
        tlsConn.close();
      } catch {
        // Already closed, ignore
      }
    } else {
      try {
        conn.close();
      } catch {
        // Already closed, ignore
      }
    }
    throw new Error(`Failed to send email via SMTP: ${error.message}`);
  }
}
