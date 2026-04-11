import nodemailer from 'nodemailer';

// Support both naming conventions: EMAIL_USER/EMAIL_PASS and SMTP_USER/SMTP_PASS
const SMTP_USER = process.env.EMAIL_USER || process.env.SMTP_USER || '';
const SMTP_PASS = process.env.EMAIL_PASS || process.env.SMTP_PASS || '';

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || SMTP_USER;
const APP_NAME = 'Admin Panel';

// ── Shared layout ──────────────────────────────────────────────────────────

function baseLayout(headerColor: string, headerIcon: string, headerTitle: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:${headerColor};padding:28px 32px;text-align:center;">
            ${headerIcon}
            <span style="color:#ffffff;font-size:20px;font-weight:700;vertical-align:middle;margin-left:10px;">${headerTitle}</span>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:32px;">${body}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;text-align:center;color:#6b7280;font-size:12px;">
            This email was generated automatically. If you didn&apos;t request this, please ignore it.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const shieldIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="white" style="vertical-align:middle;"><path d="M12 2L4 5v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V5l-8-3z"/></svg>`;

// ── Alert: Wrong Password ──────────────────────────────────────────────────

export async function sendWrongPasswordAlert(ip: string, userAgent: string, time: string) {
  const body = `
    <h2 style="color:#dc2626;margin-top:0;">⚠️ Failed Login Attempt</h2>
    <p style="color:#374151;">A wrong password was entered for your admin account.</p>
    <table cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:16px 20px;width:100%;margin:16px 0;">
      <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;"><strong>IP Address:</strong> ${ip}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;"><strong>Time:</strong> ${time}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;"><strong>Browser:</strong> ${userAgent.substring(0, 100)}</td></tr>
    </table>
    <p style="color:#374151;font-size:14px;">If this was you, you can ignore this message. If not, consider changing your password immediately.</p>
  `;
  await getTransporter().sendMail({
    from: `"${APP_NAME} Security" <${SMTP_USER}>`,
    to: ADMIN_EMAIL,
    subject: `⚠️ Failed Login Attempt — ${APP_NAME}`,
    html: baseLayout('#dc2626', shieldIcon, `${APP_NAME} Security Alert`, body),
  });
}

// ── Alert: Successful Login ────────────────────────────────────────────────

export async function sendLoginSuccessAlert(ip: string, userAgent: string, time: string) {
  const body = `
    <h2 style="color:#16a34a;margin-top:0;">✅ Successful Login</h2>
    <p style="color:#374151;">Your admin account was accessed successfully.</p>
    <table cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:16px 20px;width:100%;margin:16px 0;">
      <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;"><strong>IP Address:</strong> ${ip}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;"><strong>Time:</strong> ${time}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;"><strong>Browser:</strong> ${userAgent.substring(0, 100)}</td></tr>
    </table>
    <p style="color:#374151;font-size:14px;">If this wasn&apos;t you, secure your account immediately.</p>
  `;
  await getTransporter().sendMail({
    from: `"${APP_NAME} Security" <${SMTP_USER}>`,
    to: ADMIN_EMAIL,
    subject: `✅ New Login — ${APP_NAME}`,
    html: baseLayout('#16a34a', shieldIcon, `${APP_NAME} Login Notification`, body),
  });
}

// ── Email Change Verification ──────────────────────────────────────────────

export async function sendEmailChangeVerification(
  toEmail: string,
  verifyLink: string,
  otp: string
) {
  const body = `
    <h2 style="color:#1a1a2e;margin-top:0;">Verify Your New Email</h2>
    <p style="color:#374151;">You requested to change your admin email address. Use the button below or the OTP code to confirm.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${verifyLink}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:600;font-size:15px;">Verify Email Address</a>
    </div>
    <p style="color:#6b7280;font-size:13px;text-align:center;">Or use this backup OTP code:</p>
    <div style="text-align:center;margin:12px 0;">
      <span style="display:inline-block;background:#f4f4f4;border-radius:6px;padding:16px 32px;font-size:32px;font-weight:700;font-family:monospace;letter-spacing:8px;color:#1a1a2e;">${otp}</span>
    </div>
    <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:20px;">This link and code expire in 24 hours. If you didn&apos;t request this, ignore this email.</p>
  `;
  await getTransporter().sendMail({
    from: `"${APP_NAME}" <${SMTP_USER}>`,
    to: toEmail,
    subject: `Verify your new email — ${APP_NAME}`,
    html: baseLayout('#1a1a2e', shieldIcon, `${APP_NAME}`, body),
  });
}
