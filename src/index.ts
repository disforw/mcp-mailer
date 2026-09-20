import { createMcpHandler } from "agents/mcp/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const DEFAULT_FROM = "gladiator@abremail.com";

export interface Env {
  EMAIL: SendEmail;
  MCP_AUTH_TOKEN: ***
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Promise.resolve(
        new Response(JSON.stringify({ status: "ok", service: "mcp-mailer" }), {
          headers: { "Content-Type": "application/json" },
        })
      );
    }

    const auth = request.headers.get("Authorization");
    if (!env.MCP_AUTH_TOKEN || auth !== `Bearer ${env.MCP_AUTH_TOKEN}`) {
      return Promise.resolve(new Response("Unauthorized", { status: 401 }));
    }

    const server = new McpServer({ name: "mcp-mailer", version: "1.0.0" });

    server.registerTool(
      "send_email",
      {
        description: "Send an email. Supports plain text or HTML body, multiple recipients, CC, BCC, and a custom reply-to address.",
        inputSchema: {
          to: z.array(z.string().email()).min(1).describe("One or more recipient addresses."),
          subject: z.string().min(1).describe("Email subject line."),
          body: z.string().min(1).describe("Email body. Plain text by default; set html=true for HTML."),
          html: z.boolean().optional().default(false).describe("Send body as HTML. Defaults to false (plain text)."),
          from: z.string().email().optional().describe(`Sender address. Defaults to ${DEFAULT_FROM}.`),
          reply_to: z.string().email().optional().describe("Reply-To address. Defaults to the sender."),
          cc: z.array(z.string().email()).optional().describe("CC recipients."),
          bcc: z.array(z.string().email()).optional().describe("BCC recipients."),
        },
      },
      async ({ to, subject, body, html, from, reply_to, cc, bcc }) => {
        try {
          const sender = from ?? DEFAULT_FROM;
          const result = await env.EMAIL.send({
            from: sender,
            to: to.join(", "),
            subject,
            replyTo: reply_to ?? sender,
            ...(html ? { html: body } : { text: body }),
            ...(cc && cc.length > 0 ? { cc: cc.join(", ") } : {}),
            ...(bcc && bcc.length > 0 ? { bcc: bcc.join(", ") } : {}),
          });
          return {
            content: [{ type: "text" as const, text: `Sent! Message ID: ${result.messageId}` }],
          };
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: "text" as const, text: `Error: ${msg}` }],
            isError: true,
          };
        }
      }
    );

    return createMcpHandler((_req: Request, e: unknown) =>
      server
    )(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
