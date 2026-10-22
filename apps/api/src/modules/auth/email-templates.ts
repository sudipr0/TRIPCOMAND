import { Resend } from "resend";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  firstName: string,
): Promise<void> {
  const resetLink = `${env.WEB_URL}/reset-password?token=${resetToken}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0f172a; margin-top: 0;">Reset Your Password</h2>
      <p style="color: #334155; font-size: 15px;">Hello ${firstName},</p>
      <p style="color: #334155; font-size: 15px;">We received a request to reset your password for your TripChange account. Click the button below to choose a new password:</p>
      <div style="margin: 24px 0;">
        <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">Reset Password</a>
      </div>
      <p style="color: #64748b; font-size: 13px;">This link will expire in 1 hour. If you didn't ask for a reset, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">TripChange Intelligence Inc.</p>
    </div>
  `;

  if (resend) {
    try {
      await resend.emails.send({
        from: env.EMAIL_FROM,
        to: email,
        subject: "Reset your TripChange password",
        html,
      });
      logger.info({ email }, "Password reset email sent via Resend");
    } catch (err) {
      logger.error(
        { err, email },
        "Failed to send password reset email via Resend",
      );
    }
  } else {
    logger.info(
      { email, resetLink },
      "RESEND_API_KEY not configured. Password reset link generated in logs",
    );
  }
}

export async function sendMemberInvitationEmail(
  email: string,
  workspaceName: string,
  inviterName: string,
): Promise<void> {
  const loginLink = `${env.WEB_URL}/login`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0f172a; margin-top: 0;">You've been invited!</h2>
      <p style="color: #334155; font-size: 15px;">Hello,</p>
      <p style="color: #334155; font-size: 15px;">${inviterName} has invited you to join the workspace <strong>${workspaceName}</strong> on TripChange.</p>
      <div style="margin: 24px 0;">
        <a href="${loginLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">Log in to TripChange</a>
      </div>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">TripChange Intelligence Inc.</p>
    </div>
  `;

  if (resend) {
    try {
      await resend.emails.send({
        from: env.EMAIL_FROM,
        to: email,
        subject: `You've been invited to join ${workspaceName} on TripChange`,
        html,
      });
      logger.info(
        { email, workspaceName },
        "Workspace invite email sent via Resend",
      );
    } catch (err) {
      logger.error(
        { err, email, workspaceName },
        "Failed to send invite email via Resend",
      );
    }
  } else {
    logger.info(
      { email, workspaceName, loginLink },
      "RESEND_API_KEY not configured. Member invitation logged",
    );
  }
}
