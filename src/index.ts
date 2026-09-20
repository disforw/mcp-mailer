import { createMcpHandler } from "agents/mcp/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const DEFAULT_FROM = "gladiator@abremail.com";

export interface Env {
  EMAIL: SendEmail;
  MCP_AUTH_TOKEN: string;
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
        description: "Send an email via Cloudflare Email Service.",
        inputSchema: {
          to: z.string().email().describe("Recipient email address."),
          subject: z.string().min(1).describe("Email subject."),
          body: z.string().min(1).describe("Email body (plain text)."),
          from: z.string().email().optional().describe(`Sender address. Defaults to ${DEFAULT_FROM}.`),
        },
      },
      async ({ to, subject, body, from }) => {
        try {
          const sender = from ?? DEFAULT_FROM;
          const result = await env.EMAIL.send({
            from: sender,
            to,
            subject,
            text: body,
            replyTo: sender,
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
