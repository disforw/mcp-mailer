import { createMcpHandler } from "agents/mcp/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export interface Env {
  EMAIL: SendEmail;
  TOKVAR: string;
  DEFAULT_FROM: string;
}

const attachmentSchema = z.object({
  filename: z.string().describe("Filename including extension."),
  content_base64: z.string().describe("Base64-encoded file content."),
  mime_type: z.string().describe("MIME type, e.g. application/pdf, image/png."),
});

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
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

    const defaultFrom = env.DEFAULT_FROM;
    const server = new McpServer({ name: "mcp-mailer", version: "1.0.0" });

    server.registerTool(
      "send_email",
      {
        description: `Send an email. Required: to (array), subject, body. Optional: from (default: configured sender), from_name, html (bool, default false), attachments (array of {filename, content_base64, mime_type}, 5 MB total limit).`,
        inputSchema: {
          to: z.array(z.string().email()).min(1).describe("Recipient addresses."),
          subject: z.string().min(1).describe("Subject line."),
          body: z.string().min(1).describe("Email body."),
          html: z.boolean().optional().default(false).describe("Send as HTML. Default: false."),
          from: z.string().email().optional().describe("Sender address. Defaults to configured sender."),
          from_name: z.string().optional().describe("Sender display name."),
          attachments: z.array(attachmentSchema).optional().describe("File attachments."),
        },
      },
      async ({ to, subject, body, html, from, from_name, attachments }) => {
        try {
          const senderEmail = from ?? defaultFrom;
          const result = await env.EMAIL.send({
            from: from_name ? { email: senderEmail, name: from_name } : senderEmail,
            to,
            subject,
            replyTo: senderEmail,
            ...(html ? { html: body } : { text: body }),
            ...(attachments && attachments.length > 0
              ? {
                  attachments: attachments.map((a) => ({
                    filename: a.filename,
                    content: base64ToArrayBuffer(a.content_base64),
                    type: a.mime_type,
                    disposition: "attachment" as const,
                  })),
                }
              : {}),
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

    return createMcpHandler(() => server)(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
