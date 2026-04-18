#!/usr/bin/env node
/**
 * MCP server — email tools.
 *
 * Tools:
 *   send_email  — full-featured email send (to[], subject, body, html, from, cc, reply_to)
 *   test_email  — sends a test message to verify SMTP connectivity
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getEmailConfig } from './config.js';
import { createTransporter, sendEmail, verifyTransporter } from './mailer.js';

const server = new McpServer({ name: 'mcp-mailer', version: '1.0.0' });

process.on('SIGINT', async () => {
  await server.close();
  process.exit(0);
});

async function main() {
  const config = getEmailConfig();
  const transporter = createTransporter(config);

  // Verify SMTP on startup — fast-fail with a clear error if creds are wrong.
  try {
    await verifyTransporter(transporter);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[mcp-mailer] SMTP verification failed: ${msg}\n`);
    process.exit(1);
  }

  // ── send_email ────────────────────────────────────────────────────────────
  server.tool(
    'send_email',
    'Send an email via the configured SMTP server.',
    {
      to: z
        .array(z.string().email())
        .min(1)
        .describe('One or more recipient email addresses.'),
      subject: z.string().min(1).describe('Email subject line.'),
      body: z.string().min(1).describe('Email body — HTML or plain text depending on the html flag.'),
      html: z
        .boolean()
        .optional()
        .default(true)
        .describe('Send body as HTML (default: true).  Set false for plain text.'),
      from: z
        .string()
        .email()
        .optional()
        .describe(`Sender address.  Defaults to the configured default (${config.from}).`),
      cc: z
        .array(z.string().email())
        .optional()
        .describe('Optional CC recipients.'),
      reply_to: z
        .string()
        .email()
        .optional()
        .describe('Optional Reply-To address.'),
    },
    async ({ to, subject, body, html, from, cc, reply_to }) => {
      try {
        const info = await sendEmail(
          transporter,
          { to, subject, body, html, from, cc, replyTo: reply_to },
          config.from
        );

        const recipientList = to.join(', ');
        return {
          content: [
            {
              type: 'text',
              text: `Email sent successfully to ${recipientList} (message ID: ${info.messageId})`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Failed to send email: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );

  // ── test_email ────────────────────────────────────────────────────────────
  server.tool(
    'test_email',
    'Send a test email to verify SMTP connectivity.  Sends to the configured default sender address.',
    {},
    async () => {
      try {
        const info = await sendEmail(
          transporter,
          {
            to: [config.from],
            subject: '[mcp-mailer] SMTP connectivity test',
            body: '<p>This is an automated test message from <strong>mcp-mailer</strong>.</p><p>If you received this, SMTP is working correctly.</p>',
            html: true,
          },
          config.from
        );

        return {
          content: [
            {
              type: 'text',
              text: `Test email sent successfully (message ID: ${info.messageId})`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Test failed: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );

  // ── start ─────────────────────────────────────────────────────────────────
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`[mcp-mailer] Fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
