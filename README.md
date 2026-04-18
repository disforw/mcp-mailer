# mcp-mailer

A TypeScript MCP (Model Context Protocol) server for sending emails via SMTP.

## Tools

### `send_email`

Send an email via the configured SMTP server.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `to` | `string[]` | ✅ | — | One or more recipient email addresses |
| `subject` | `string` | ✅ | — | Email subject line |
| `body` | `string` | ✅ | — | Email body (HTML or plain text) |
| `html` | `boolean` | | `true` | Send body as HTML. Set `false` for plain text |
| `from` | `string` | | config default | Sender address override |
| `cc` | `string[]` | | — | Optional CC recipients |
| `reply_to` | `string` | | — | Optional Reply-To address |

### `test_email`

Sends a test email to the configured default sender address to verify SMTP connectivity. No parameters required.

## Configuration

### Option 1 — secrets.json (recommended)

Add an `smtp` block to `~/.openclaw/secrets.json`:

```json
{
  "smtp": {
    "host": "mail.smtp2go.com",
    "port": 587,
    "user": "your-smtp-user",
    "pass": "your-smtp-password",
    "from": "sender@example.com"
  }
}
```

### Option 2 — Environment variables

Environment variables take precedence over `secrets.json`:

| Variable | Description | Default |
|----------|-------------|--------|
| `SMTP_HOST` | SMTP server hostname | — |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP authentication username | — |
| `SMTP_PASSWORD` | SMTP authentication password | — |
| `EMAIL_FROM` | Default sender address | `gladiator@abremail.com` |
| `SMTP_SECURE` | Use TLS on connect (`true`/`false`) | `false` |
| `SMTP_REJECT_UNAUTHORIZED` | Reject invalid TLS certs (`false` to disable) | `true` |
| `SMTP_TIMEOUT` | Connection timeout in ms | `10000` |

## Setup

```bash
npm install
npm run build
```

## MCP Client Configuration

Add to your MCP client config (e.g. `~/.cursor/mcp.json` or Claude Desktop config):

```json
{
  "mcpServers": {
    "mcp-mailer": {
      "command": "node",
      "args": ["/path/to/mcp-mailer/dist/index.js"]
    }
  }
}
```

## Security

- No telemetry or outbound connections beyond the configured SMTP server
- No credentials are hardcoded — always read from `secrets.json` or environment
- Secrets file is never logged or exposed via MCP tool responses
