import { createMcpHandler } from "agents/mcp/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const DEFAULT_FROM = "gladiator@abremail.com";

export interface Env {
  EMAIL: SendEmail;
  AUTH_TOKEN: ***
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
    if (!env.AUTH_TOKEN || auth !== `Bearer ${env.AUTH_TOKEN}`) {
      return Promise.resolve(new Response("Unauthorized", { status: 401 }));
    }

    const server = new McpServer({ name: "mcp-mailer", version: "1.0.0" });

    server.registerTool(
      "send_email",
      {
        description: [
          "Send an email to one or more recipients.",
          `Default sender: ${DEFAULT_FROM}.`,
          "Supports: multiple To recipients, Reply-To, HTML body, and a custom sender address and display name.",
        ].join(" "),
        inputSchema: {
          to: z.array(z.string().email()).min(1).describe("One or more recipient addresses."),
          subject: z.string().min(1).describe("Email subject line."),
          body: z.string().min(1).describe("Email body. Plain text by default; set html=true to send HTML."),
          html: z.boolean().optional().default(false).describe("Send body as HTML. Defaults to false."),
          from: z.string().email().optional().describe(`Sender email address. Defaults to ${DEFAULT_FROM}.`),
          from_name: z.string().optional().describe("Sender display name shown in email clients."),
          reply_to: z.string().email().optional().describe("Reply-To address. Defaults to the sender."),
        },
      },
      async ({ to, subject, body, html, from, from_name, reply_to }) => {
        try {
          const senderEmail = from ?? DEFAULT_FROM;
          const result = await env.EMAIL.send({
            from: from_name ? { email: senderEmail, name: from_name } : senderEmail,
            to: to.join(", "),
            subject,
            replyTo: reply_to ?? senderEmail,
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
