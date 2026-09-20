# mcp-mailer

MCP server for sending email. Runs as a Cloudflare Worker, exposes a Streamable HTTP MCP endpoint at `/mcp`.

## Tools

### `send_email`

| Parameter | Type | Required | Description |
|---|---|---|---|
| `to` | `string[]` | ✅ | Recipient addresses |
| `subject` | `string` | ✅ | Subject line |
| `body` | `string` | ✅ | Email body |
| `html` | `boolean` | — | Send as HTML (default: `false`) |
| `from` | `string` | — | Sender address (defaults to configured sender) |
| `from_name` | `string` | — | Sender display name |
| `attachments` | `Attachment[]` | — | File attachments (5 MB total limit) |

**Attachment shape:** `{ filename, content_base64, mime_type }`

## Endpoints

- `POST /mcp` — MCP endpoint (requires Bearer token auth)
- `GET /health` — Public health check

## Setup

### Prerequisites

- Cloudflare account with Email Service enabled and a verified sending domain
- Node.js 20+
- Wrangler CLI

### Deploy

```sh
npm install
npm run deploy
```

Push to `main` triggers automatic deployment via GitHub Actions.
