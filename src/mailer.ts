/**
 * Mailer module for the MCP email server.
 * Wraps nodemailer with a typed interface that supports arrays of recipients,
 * CC, reply-to, and HTML vs plain-text bodies.
 */

import nodemailer from 'nodemailer';
import { EmailConfig } from './config.js';

/** Full set of options accepted by sendEmail(). */
export interface EmailOptions {
  /** One or more primary recipients. */
  to: string[];
  subject: string;
  /** Email body content. */
  body: string;
  /** When true, body is sent as HTML.  Defaults to true. */
  html?: boolean;
  /** Optional CC recipients. */
  cc?: string[];
  /** Optional Reply-To address. */
  replyTo?: string;
  /** Sender address — overrides config default when provided. */
  from?: string;
}

/**
 * Creates a nodemailer transporter from the provided config.
 */
export function createTransporter(config: EmailConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.auth.user,
      pass: config.auth.pass,
    },
    tls: {
      rejectUnauthorized: config.tls.rejectUnauthorized,
    },
    connectionTimeout: config.connectionTimeout,
  });
}

/**
 * Verifies the SMTP connection.  Logs to stderr (never stdout) so MCP
 * stdio transport is not polluted.
 */
export async function verifyTransporter(transporter: nodemailer.Transporter): Promise<void> {
  await transporter.verify();
}

/**
 * Sends an email.
 *
 * @param transporter - Nodemailer transporter instance
 * @param options     - Email options
 * @param defaultFrom - Fallback sender address from config
 * @returns nodemailer send info
 */
export async function sendEmail(
  transporter: nodemailer.Transporter,
  options: EmailOptions,
  defaultFrom: string
) {
  const useHtml = options.html !== false; // default true

  const mailOptions: nodemailer.SendMailOptions = {
    from: options.from ?? defaultFrom,
    to: options.to.join(', '),
    subject: options.subject,
    text: useHtml ? options.body.replace(/<[^>]+>/g, '') : options.body,
    html: useHtml ? options.body : undefined,
  };

  if (options.cc && options.cc.length > 0) {
    mailOptions.cc = options.cc.join(', ');
  }

  if (options.replyTo) {
    mailOptions.replyTo = options.replyTo;
  }

  const info = await transporter.sendMail(mailOptions);
  return info;
}
