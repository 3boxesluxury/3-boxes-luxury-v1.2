import * as nodemailer from 'nodemailer';

// Gmail SMTP configuration
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || '3boxesluxury@gmail.com';

// Cache for Ethereal test account
let etherealAccount: { user: string; pass: string; web: string } | null = null;

// Gmail transporter
let gmailTransporter: nodemailer.Transporter | null = null;

function getGmailTransporter(): nodemailer.Transporter {
  if (!gmailTransporter) {
    gmailTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
  return gmailTransporter;
}

/**
 * Get or create an Ethereal Email test account.
 * Ethereal provides a real SMTP server for testing — emails are delivered
 * to a temporary inbox you can view in a browser.
 * Includes a 10-second timeout to prevent hanging.
 */
async function getEtherealAccount(): Promise<{ user: string; pass: string; web: string } | null> {
  if (etherealAccount) return etherealAccount;

  try {
    const testAccount = await Promise.race([
      nodemailer.createTestAccount(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Ethereal account creation timed out')), 10000)
      ),
    ]);
    etherealAccount = {
      user: testAccount.user,
      pass: testAccount.pass,
      web: 'https://ethereal.email',
    };
    console.log('[Email] Created Ethereal test account:', testAccount.user);
    return etherealAccount;
  } catch (error) {
    console.error('[Email] Failed to create Ethereal test account:', error instanceof Error ? error.message : error);
    return null;
  }
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SendResult {
  success: boolean;
  previewUrl?: string;
  ethereal?: boolean;
  error?: string;
}

/**
 * Send an email using the configured SMTP transporter.
 * Falls back to Ethereal Email test inbox if SMTP credentials are not configured.
 */
export async function sendEmail({ to, subject, html, text }: EmailOptions): Promise<boolean> {
  const result = await sendEmailWithDetails({ to, subject, html, text });
  return result.success;
}

/**
 * Send an email with detailed result information.
 * Returns success status, preview URL (for Ethereal), and whether it was sent via Ethereal.
 */
export async function sendEmailWithDetails({ to, subject, html, text }: EmailOptions): Promise<SendResult> {
  const plainText = text || html.replace(/<[^>]*>/g, '');

  // If SMTP credentials are configured, try Gmail SMTP first
  if (SMTP_USER && SMTP_PASS) {
    try {
      const transport = getGmailTransporter();
      const info = await Promise.race([
        transport.sendMail({
          from: `"3 Boxes Luxury" <${SMTP_FROM}>`,
          to,
          subject,
          html,
          text: plainText,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gmail SMTP send timed out')), 15000)
        ),
      ]);

      console.log(`[Email] ✅ Sent via Gmail SMTP to ${to}. Message ID: ${info.messageId}`);
      return { success: true, ethereal: false };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[Email] Gmail SMTP failed:', errorMessage);
      // Fall through to Ethereal fallback
    }
  }

  // Fallback: Use Ethereal Email for testing
  console.log('[Email] SMTP not configured or failed. Using Ethereal Email test inbox...');
  const account = await getEtherealAccount();

  if (account) {
    try {
      const etherealTransport = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: account.user,
          pass: account.pass,
        },
      });

      const info = await Promise.race([
        etherealTransport.sendMail({
          from: '"3 Boxes Luxury" <no-reply@3boxesluxury.com>',
          to,
          subject,
          html,
          text: plainText,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Ethereal email send timed out')), 15000)
        ),
      ]);

      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`[Email] ✅ Sent via Ethereal to ${to}. Message ID: ${info.messageId}`);
      console.log(`[Email] 📬 Preview URL: ${previewUrl}`);

      return { success: true, previewUrl: previewUrl || undefined, ethereal: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[Email] Ethereal send failed:', errorMessage);
    }
  }

  // Last resort: just log the email
  console.warn('[Email] ❌ All email methods failed. Logging email content:');
  console.log(`[Email] To: ${to}, Subject: ${subject}`);
  console.log(`[Email] Body: ${plainText}`);

  return { success: false, error: 'All email methods failed' };
}

/**
 * Send a 2FA verification code email.
 * Returns the send result with preview URL if using Ethereal.
 */
export async function send2FAEmail(email: string, otp: string): Promise<boolean> {
  const result = await send2FAEmailWithDetails(email, otp);
  return result.success;
}

/**
 * Send a 2FA verification code email with detailed result.
 */
export async function send2FAEmailWithDetails(email: string, otp: string): Promise<SendResult & { otp: string }> {
  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, '$1***$3');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #1c1917; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #1c1917; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color: #292524; border-radius: 12px; border: 1px solid #44403c; overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #92400e, #b45309); padding: 30px 40px; text-align: center;">
                  <h1 style="margin: 0; color: #fef3c7; font-size: 24px; font-weight: 700; letter-spacing: 2px;">3 BOXES LUXURY</h1>
                  <p style="margin: 8px 0 0; color: #fcd34d; font-size: 12px; text-transform: uppercase; letter-spacing: 3px;">Authentication Required</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding: 35px 40px;">
                  <p style="margin: 0 0 20px; color: #d6d3d1; font-size: 15px; line-height: 1.6;">
                    You're signing in to your account. Please use the following verification code to complete your login:
                  </p>
                  <!-- OTP Code -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 25px 0;">
                        <div style="background-color: #1c1917; border: 2px dashed #b45309; border-radius: 10px; padding: 20px 40px; display: inline-block;">
                          <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #f59e0b; font-family: 'Courier New', monospace;">${otp}</span>
                        </div>
                      </td>
                    </tr>
                  </table>
                  <p style="margin: 20px 0 0; color: #a8a29e; font-size: 13px; line-height: 1.6;">
                    This code expires in <strong style="color: #f59e0b;">5 minutes</strong>. If you didn't request this code, please ignore this email — your account is safe.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background-color: #1c1917; padding: 20px 40px; border-top: 1px solid #44403c;">
                  <p style="margin: 0; color: #78716c; font-size: 11px; text-align: center; line-height: 1.5;">
                    This is an automated message from 3 Boxes Luxury. Please do not reply to this email.<br>
                    Sent to ${maskedEmail}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const text = `3 BOXES LUXURY - Verification Code\n\nYour verification code is: ${otp}\n\nThis code expires in 5 minutes.\nIf you didn't request this code, please ignore this email.`;

  const result = await sendEmailWithDetails({
    to: email,
    subject: '3 Boxes Luxury - Your Verification Code',
    html,
    text,
  });

  return { ...result, otp };
}

/**
 * Send a password reset email.
 */
export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
  const resetUrl = `${process.env.NEXT_PUBLIC_URL || 'https://3boxes.in'}/reset-password?token=${resetToken}`;
  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, '$1***$3');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #1c1917; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #1c1917; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color: #292524; border-radius: 12px; border: 1px solid #44403c; overflow: hidden;">
              <tr>
                <td style="background: linear-gradient(135deg, #92400e, #b45309); padding: 30px 40px; text-align: center;">
                  <h1 style="margin: 0; color: #fef3c7; font-size: 24px; font-weight: 700; letter-spacing: 2px;">3 BOXES LUXURY</h1>
                  <p style="margin: 8px 0 0; color: #fcd34d; font-size: 12px; text-transform: uppercase; letter-spacing: 3px;">Password Reset</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 35px 40px;">
                  <p style="margin: 0 0 20px; color: #d6d3d1; font-size: 15px; line-height: 1.6;">
                    We received a request to reset your password. Click the button below to create a new password:
                  </p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 20px 0;">
                        <a href="${resetUrl}" style="background: linear-gradient(135deg, #b45309, #d97706); color: #fef3c7; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">Reset Password</a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin: 20px 0 0; color: #a8a29e; font-size: 13px; line-height: 1.6;">
                    This link expires in <strong style="color: #f59e0b;">1 hour</strong>. If you didn't request a password reset, please ignore this email.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color: #1c1917; padding: 20px 40px; border-top: 1px solid #44403c;">
                  <p style="margin: 0; color: #78716c; font-size: 11px; text-align: center; line-height: 1.5;">
                    This is an automated message from 3 Boxes Luxury. Please do not reply to this email.<br>
                    Sent to ${maskedEmail}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: '3 Boxes Luxury - Reset Your Password',
    html,
    text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
  });
}

/**
 * Send an email verification code.
 */
export async function sendEmailVerification(email: string, code: string): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #1c1917; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #1c1917; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color: #292524; border-radius: 12px; border: 1px solid #44403c; overflow: hidden;">
              <tr>
                <td style="background: linear-gradient(135deg, #92400e, #b45309); padding: 30px 40px; text-align: center;">
                  <h1 style="margin: 0; color: #fef3c7; font-size: 24px; font-weight: 700; letter-spacing: 2px;">3 BOXES LUXURY</h1>
                  <p style="margin: 8px 0 0; color: #fcd34d; font-size: 12px; text-transform: uppercase; letter-spacing: 3px;">Email Verification</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 35px 40px;">
                  <p style="margin: 0 0 20px; color: #d6d3d1; font-size: 15px; line-height: 1.6;">
                    Please verify your email address using the following code:
                  </p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 25px 0;">
                        <div style="background-color: #1c1917; border: 2px dashed #b45309; border-radius: 10px; padding: 20px 40px; display: inline-block;">
                          <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #f59e0b; font-family: 'Courier New', monospace;">${code}</span>
                        </div>
                      </td>
                    </tr>
                  </table>
                  <p style="margin: 20px 0 0; color: #a8a29e; font-size: 13px; line-height: 1.6;">
                    This code expires in <strong style="color: #f59e0b;">24 hours</strong>. If you didn't create an account, please ignore this email.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color: #1c1917; padding: 20px 40px; border-top: 1px solid #44403c;">
                  <p style="margin: 0; color: #78716c; font-size: 11px; text-align: center; line-height: 1.5;">
                    This is an automated message from 3 Boxes Luxury. Please do not reply to this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: '3 Boxes Luxury - Verify Your Email',
    html,
    text: `Your verification code is: ${code}\n\nThis code expires in 24 hours.`,
  });
}
