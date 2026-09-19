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
| `reply_to` | `string` | — | Reply-To address |

### `test_email`

Sends a test message to `DEFAULT_FROM` to verify the Email Service binding is working.

## Setup

### Prerequisites

- Cloudflare account with [Email Service](https://developers.cloudflare.com/email-service/) enabled and a domain onboarded for sending
- Node.js 20+
- Wrangler CLI

### Configuration

Edit `wrangler.jsonc` and set your default from address:

```jsonc
{
  "vars": {
    "DEFAULT_FROM": "your-address@yourdomain.com"
  }
}
```

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

## MCP endpoint

Once deployed, connect to:

```
https://mcp-mailer.<your-subdomain>.workers.dev/mcp
```
