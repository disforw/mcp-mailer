import { createMcpHandler } from "agents/mcp/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const DEFAULT_FROM = "gladiator@abremail.com";

export interface Env {
  EMAIL: SendEmail;
  TOKVAR: string;
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
    if (!env.TOKVAR || auth !== `Bearer ${env.TOKVAR}`) {
      return Promise.resolve(new Response("Unauthorized", { status: 401 }));
    }

    const server = new McpServer({ name: "mcp-mailer", version: "1.0.0" });

    server.registerTool(
      "send_email",
      {
        description: `Send an email. Required: to (array), subject, body. Optional: from (default: ${DEFAULT_FROM}), from_name, html (bool, default false).`,
        inputSchema: {
          to: z.array(z.string().email()).min(1).describe("Recipient addresses."),
          subject: z.string().min(1).describe("Subject line."),
          body: z.string().min(1).describe("Email body."),
          html: z.boolean().optional().default(false).describe("Send as HTML. Default: false."),
          from: z.string().email().optional().describe(`Sender address. Default: ${DEFAULT_FROM}.`),
          from_name: z.string().optional().describe("Sender display name."),
        },
      },
      async ({ to, subject, body, html, from, from_name }) => {
        try {
          const senderEmail = from ?? DEFAULT_FROM;
          const result = await env.EMAIL.send({
            from: from_name ? { email: senderEmail, name: from_name } : senderEmail,
            to: to.join(", "),
            subject,
            replyTo: senderEmail,
            ...(html ? { html: body } : { text: body }),
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
