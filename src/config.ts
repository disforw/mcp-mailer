#!/usr/bin/env node
/**
 * Configuration module for the MCP email server.
 * Reads SMTP credentials from ~/.openclaw/secrets.json (smtp key),
 * with environment variable fallback for each field.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  tls: {
    rejectUnauthorized: boolean;
  };
  connectionTimeout: number;
  from: string;
}

interface SecretsSmtp {
  host?: string;
  port?: number | string;
  user?: string;
  pass?: string;
  from?: string;
}

interface Secrets {
  smtp?: SecretsSmtp;
}

/**
 * Attempts to load ~/.openclaw/secrets.json and return the smtp block.
 * Returns an empty object if the file is absent or unparseable.
 */
function loadSecretsSmtp(): SecretsSmtp {
  try {
    const secretsPath = path.join(os.homedir(), '.openclaw', 'secrets.json');
    const raw = fs.readFileSync(secretsPath, 'utf-8');
    const secrets: Secrets = JSON.parse(raw);
    return secrets.smtp ?? {};
  } catch {
    // File absent or unreadable — fall through to env vars
    return {};
  }
}

/**
 * Resolves a config value: environment variable takes precedence, then
 * secrets.json, then optional default.  Throws if the result is empty.
 */
function resolve(envKey: string, secretValue: string | number | undefined, defaultValue?: string): string {
  const fromEnv = process.env[envKey];
  if (fromEnv) return fromEnv;
  if (secretValue !== undefined && secretValue !== '') return String(secretValue);
  if (defaultValue !== undefined) return defaultValue;
  throw new Error(
    `Missing required config: set env var ${envKey} or provide "smtp.${envKey.toLowerCase()}" in ~/.openclaw/secrets.json`
  );
}

/**
 * Builds and returns the EmailConfig.  Priority for each field:
 *   1. Environment variable
 *   2. secrets.json smtp block
 *   3. Hard-coded safe default (where applicable)
 */
export function getEmailConfig(): EmailConfig {
  const smtp = loadSecretsSmtp();

  const host = resolve('SMTP_HOST', smtp.host);
  const portStr = resolve('SMTP_PORT', smtp.port, '587');
  const user = resolve('SMTP_USER', smtp.user);
  const pass = resolve('SMTP_PASSWORD', smtp.pass);
  const from = resolve('EMAIL_FROM', smtp.from);

  return {
    host,
    port: parseInt(portStr, 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
    tls: {
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
    },
    connectionTimeout: parseInt(process.env.SMTP_TIMEOUT ?? '10000', 10),
    from,
  };
}
