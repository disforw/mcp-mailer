# mcp-mailer

MCP server for sending email, built as a Cloudflare Worker using [Cloudflare Email Service](https://developers.cloudflare.com/email-service/).

Exposes a Streamable HTTP MCP endpoint at `/mcp`.

## Tools

### `send_email`

Send an email via Cloudflare Email Service.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `to` | `string[]` | ✅ | One or more recipient addresses |
| `subject` | `string` | ✅ | Email subject line |
| `body` | `string` | ✅ | Email body (HTML or plain text) |
| `html` | `boolean` | — | Send as HTML (default: `true`) |
| `from` | `string` | — | Sender address (defaults to `DEFAULT_FROM`) |
| `cc` | `string[]` | — | CC recipients |
| `reply_to` | `string` | — | Reply-To address (defaults to sender) |

### `test_email`

Sends a test message to `DEFAULT_FROM` to verify the Email Service binding is working.

## Setup

### Prerequisites

- Cloudflare account with [Email Service](https://developers.cloudflare.com/email-service/) enabled and a domain onboarded for sending
- Node.js 20+
- Wrangler CLI

### Configuration

Set the following in your Cloudflare Workers dashboard (not in `wrangler.jsonc`):

- `DEFAULT_FROM` — env variable, e.g. `gladiator@yourdomain.com`
- `MCP_AUTH_TOKEN` — secret, used for Bearer token auth on all `/mcp` requests

Your domain must be onboarded in Cloudflare Email Service → Email Sending before deploying.

### Local development

```sh
npm install
npm run dev
```

### Deploy

```sh
npm run deploy
```

## GitHub Actions auto-deploy

Push to `main` triggers an automatic deploy. Add these secrets to your repository:

- `CLOUDFLARE_API_TOKEN` — API token with Workers:Edit permission
- `CLOUDFLARE_ACCOUNT_ID` — Your Cloudflare account ID

## Auth

All requests to `/mcp` require:

```
Authorization: Bearer <MCP_AUTH_TOKEN>
```

`/health` is public and returns `{"status":"ok","service":"mcp-mailer"}`.

## MCP endpoint

Once deployed, connect to:

```
https://mcp-mailer.<your-subdomain>.workers.dev/mcp
```
