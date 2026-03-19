import nodemailer from "nodemailer";
import { log } from "./index";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.zeptomail.in",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true,
  auth: {
    user: process.env.SMTP_USER || "emailapikey",
    pass: process.env.SMTP_PASS || "",
  },
});

const FROM = process.env.EMAIL_FROM || "support@recoonlytics.com";

function resolveAppUrl(baseUrl?: string): string {
  if (baseUrl) return baseUrl;
  if (process.env.APP_URL) return process.env.APP_URL;
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  if (domain) return `https://${domain}`;
  return "https://recoonlytics.replit.app";
}

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recoonlytics</title>
  <style>
    body { margin: 0; padding: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: #1e3a8a; padding: 32px 40px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 4px 0 0; color: #93c5fd; font-size: 13px; }
    .body { padding: 40px; }
    .body p { color: #374151; font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
    .btn { display: inline-block; background: #1e3a8a; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; margin: 8px 0 24px; }
    .info-box { background: #f0f4ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px 20px; margin: 24px 0; }
    .info-box p { margin: 0; color: #1e40af; font-size: 14px; }
    .footer { background: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0; }
    .footer p { margin: 0; color: #94a3b8; font-size: 13px; }
    .footer a { color: #6366f1; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Recoonlytics</h1>
      <p>Professional Analytics Platform</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Recoonlytics · <a href="mailto:support.reconlytics@gmail.com">support.reconlytics@gmail.com</a></p>
      <p style="margin-top:8px;">You received this because you signed up for Recoonlytics.</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendVerificationEmail(email: string, token: string, baseUrl?: string): Promise<void> {
  const appUrl = resolveAppUrl(baseUrl);
  const verifyUrl = `${appUrl}/verify-email?token=${token}`;
  const html = baseTemplate(`
    <p>Hi there,</p>
    <p>Welcome to <strong>Recoonlytics</strong>! Please verify your email address to activate your account and start analyzing your data.</p>
    <p style="text-align:center;">
      <a href="${verifyUrl}" class="btn">Verify My Email</a>
    </p>
    <div class="info-box">
      <p>This link expires in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this email.</p>
    </div>
    <p>If the button doesn't work, copy and paste this URL into your browser:</p>
    <p style="word-break:break-all;color:#6366f1;font-size:13px;">${verifyUrl}</p>
  `);

  await transporter.sendMail({
    from: `"Recoonlytics" <${FROM}>`,
    to: email,
    subject: "Verify your Recoonlytics account",
    html,
  });
  log(`Verification email sent to ${email}`);
}

export async function sendWelcomeEmail(email: string, baseUrl?: string): Promise<void> {
  const appUrl = resolveAppUrl(baseUrl);
  const html = baseTemplate(`
    <p>Hi there,</p>
    <p>🎉 Your email has been verified and your <strong>Recoonlytics</strong> account is now active!</p>
    <p>Here's what you can do with your free account:</p>
    <ul style="color:#374151;font-size:15px;line-height:1.8;padding-left:20px;">
      <li>Upload CSV & XLSX files (up to 20MB)</li>
      <li>Preview and explore your data</li>
      <li>Professional data cleaning tools</li>
      <li>Statistics: min, max, average, median, sum</li>
      <li>Interactive charts</li>
      <li>3 analyses every day — free forever</li>
    </ul>
    <p style="text-align:center;">
      <a href="${appUrl}" class="btn">Start Analyzing</a>
    </p>
    <div class="info-box">
      <p>Want unlimited access? Upgrade to our <strong>Founder Plan</strong> for ₹2,999/year — limited spots available.</p>
    </div>
  `);

  await transporter.sendMail({
    from: `"Recoonlytics" <${FROM}>`,
    to: email,
    subject: "Welcome to Recoonlytics — You're all set! 🎉",
    html,
  });
  log(`Welcome email sent to ${email}`);
}

export async function sendResetEmail(email: string, token: string, baseUrl?: string): Promise<void> {
  const appUrl = resolveAppUrl(baseUrl);
  const resetUrl = `${appUrl}/reset-password?token=${token}`;
  const html = baseTemplate(`
    <p>Hi there,</p>
    <p>We received a request to reset your <strong>Recoonlytics</strong> password. Click the button below to set a new one.</p>
    <p style="text-align:center;">
      <a href="${resetUrl}" class="btn">Reset My Password</a>
    </p>
    <div class="info-box">
      <p>This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email — your account is secure.</p>
    </div>
    <p>If the button doesn't work, copy and paste this URL into your browser:</p>
    <p style="word-break:break-all;color:#6366f1;font-size:13px;">${resetUrl}</p>
  `);

  await transporter.sendMail({
    from: `"Recoonlytics" <${FROM}>`,
    to: email,
    subject: "Reset your Recoonlytics password",
    html,
  });
  log(`Password reset email sent to ${email}`);
}
