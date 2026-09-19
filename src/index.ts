/**
 * mcp-mailer — Cloudflare Worker
 *
 * Exposes an MCP server over Streamable HTTP at /mcp.
 * Uses Cloudflare Email Service binding (env.EMAIL) to send mail.
 *
 * Auth: Bearer token via MCP_AUTH_TOKEN secret (set in CF dashboard).
 *
 * Tools:
 *   send_email  — full-featured email send (HTML/plain, multi-recipient, CC, reply-to)
 *   test_email  — sends a test message to verify the binding works
 */

import { createMcpHandler } from "agents/mcp/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export interface Env {
  EMAIL: SendEmail;
  DEFAULT_FROM: string;
  MCP_AUTH_TOKEN: string;
}

function createServer(env: Env) {
  const server = new McpServer({
    name: "mcp-mailer",
    version: "2.0.0",
  });

  // ── send_email ────────────────────────────────────────────────────────────
  server.registerTool(
    "send_email",
    {
      description: "Send an email via Cloudflare Email Service.",
      inputSchema: {
        to: z
          .array(z.string().email())
          .min(1)
          .describe("One or more recipient email addresses."),
        subject: z.string().min(1).describe("Email subject line."),
        body: z
          .string()
          .min(1)
          .describe("Email body — HTML or plain text depending on the html flag."),
        html: z
          .boolean()
          .optional()
          .default(true)
          .describe("Send body as HTML (default: true). Set false for plain text."),
        from: z
          .string()
          .email()
          .optional()
          .describe(
            "Sender address. Defaults to the configured DEFAULT_FROM. Override when sending on behalf of a specific address."
          ),
        cc: z
          .array(z.string().email())
          .optional()
          .describe("Optional CC recipients."),
        reply_to: z
          .string()
          .email()
          .optional()
          .describe(
            "Reply-To address. Defaults to the sender (from) address if not specified."
          ),
      },
    },
    async ({ to, subject, body, html, from, cc, reply_to }) => {
      try {
        const sender = from ?? env.DEFAULT_FROM;
        const useHtml = html !== false;
        const replyTo = reply_to ?? sender;

        const message: Parameters<SendEmail["send"]>[0] = {
          from: sender,
          to: to.join(", "),
          subject,
          replyTo,
          ...(useHtml ? { html: body } : { text: body }),
          ...(cc && cc.length > 0 ? { cc: cc.join(", ") } : {}),
        };

        const response = await env.EMAIL.send(message);

        return {
          content: [
            {
              type: "text" as const,
              text: `Email sent successfully to ${to.join(", ")} (message ID: ${response.messageId})`,
            },
          ],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Failed to send email: ${msg}` }],
          isError: true,
        };
      }
    }
  );

  // ── test_email ────────────────────────────────────────────────────────────
  server.registerTool(
    "test_email",
    {
      description:
        "Send a test email to verify the Cloudflare Email Service binding is working. Sends to the DEFAULT_FROM address.",
      inputSchema: {},
    },
    async () => {
      try {
        const response = await env.EMAIL.send({
          from: env.DEFAULT_FROM,
          to: env.DEFAULT_FROM,
          replyTo: env.DEFAULT_FROM,
          subject: "[mcp-mailer] Email Service connectivity test",
          html: "<p>This is an automated test message from <strong>mcp-mailer</strong>.</p><p>If you received this, Cloudflare Email Service is working correctly.</p>",
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Test email sent successfully (message ID: ${response.messageId})`,
            },
          ],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Test failed: ${msg}` }],
          isError: true,
        };
      }
    }
  );

  return server;
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Bearer token auth — checked before any routing
    const auth = request.headers.get("Authorization");
    if (!env.MCP_AUTH_TOKEN || auth !== `Bearer ${env.MCP_AUTH_TOKEN}`) {
      return Promise.resolve(new Response("Unauthorized", { status: 401 }));
    }

    const url = new URL(request.url);

    if (url.pathname === "/mcp" || url.pathname.startsWith("/mcp/")) {
      return createMcpHandler((_req: Request, e: unknown) =>
        createServer(e as Env)
      )(request, env, ctx);
    }

    if (url.pathname === "/health") {
      return Promise.resolve(
        new Response(JSON.stringify({ status: "ok", service: "mcp-mailer" }), {
          headers: { "Content-Type": "application/json" },
        })
      );
    }

    return Promise.resolve(
      new Response("mcp-mailer: use /mcp for MCP connections", { status: 200 })
    );
  },
} satisfies ExportedHandler<Env>;
