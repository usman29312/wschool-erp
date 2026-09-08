const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter from env or fallback
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: {
        user,
        pass
      }
    });
  }
  return null;
}

/**
 * Send Password Reset OTP Email
 */
async function sendOtpEmail(toEmail, otpCode) {
  const fromName = process.env.SMTP_FROM || '"Waseem Academy ERP" <no-reply@waseem.edu.pk>';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333; }
        .email-card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 2px solid #D4AF37; box-shadow: 0 10px 25px rgba(0,0,0,0.08); overflow: hidden; }
        .email-header { background: linear-gradient(135deg, #1857A6 0%, #0F3A75 100%); color: #ffffff; padding: 25px; text-align: center; }
        .email-header h2 { margin: 0; font-size: 22px; font-weight: 700; }
        .email-header p { margin: 5px 0 0 0; font-size: 12px; color: #D4AF37; letter-spacing: 1px; text-transform: uppercase; }
        .email-body { padding: 30px 25px; text-align: center; }
        .otp-badge { display: inline-block; background: #f0f4fb; border: 2px dashed #1857A6; color: #1857A6; font-size: 32px; font-weight: 800; letter-spacing: 8px; padding: 15px 30px; border-radius: 10px; margin: 20px 0; }
        .expiry-text { color: #e11d48; font-weight: 600; font-size: 14px; margin-top: 10px; }
        .email-footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="email-card">
        <div class="email-header">
          <h2>Waseem Science & Commerce Academy</h2>
          <p>ERP Management System</p>
        </div>
        <div class="email-body">
          <h3 style="color: #1857A6; margin-top: 0;">Password Reset Request</h3>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            We received a request to reset the password for your School Management System account.
          </p>

          <div class="otp-badge">${otpCode}</div>

          <p class="expiry-text">This verification code will expire in 10 minutes.</p>

          <p style="font-size: 13px; color: #64748b; margin-top: 25px; line-height: 1.5;">
            If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </p>
        </div>
        <div class="email-footer">
          &copy; ${new Date().getFullYear()} Waseem Science & Commerce Academy. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  const transporter = getTransporter();

  if (transporter) {
    try {
      await transporter.sendMail({
        from: fromName,
        to: toEmail,
        subject: 'Password Reset Request - Waseem Academy ERP',
        html: htmlContent
      });
      console.log(`[EMAIL SENT] Password reset OTP sent to ${toEmail} via SMTP.`);
      return true;
    } catch (err) {
      console.error(`[EMAIL ERROR] Failed to send email via SMTP to ${toEmail}:`, err.message);
      console.log('\n======================================================');
      console.log(`[DEVELOPMENT PASSWORD RESET OTP] To: ${toEmail} | OTP Code: ${otpCode}`);
      console.log('======================================================\n');
      return true;
    }
  } else {
    console.log('\n======================================================');
    console.log(`[DEVELOPMENT PASSWORD RESET OTP] To: ${toEmail} | OTP Code: ${otpCode}`);
    console.log('======================================================\n');
    return true;
  }
}

/**
 * Send Recovery Email Verification OTP
 */
async function sendRecoveryVerificationOtpEmail(toEmail, otpCode) {
  const fromName = process.env.SMTP_FROM || '"Waseem Academy ERP" <no-reply@waseem.edu.pk>';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333; }
        .email-card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 2px solid #D4AF37; box-shadow: 0 10px 25px rgba(0,0,0,0.08); overflow: hidden; }
        .email-header { background: linear-gradient(135deg, #1857A6 0%, #0F3A75 100%); color: #ffffff; padding: 25px; text-align: center; }
        .email-header h2 { margin: 0; font-size: 22px; font-weight: 700; }
        .email-header p { margin: 5px 0 0 0; font-size: 12px; color: #D4AF37; letter-spacing: 1px; text-transform: uppercase; }
        .email-body { padding: 30px 25px; text-align: center; }
        .otp-badge { display: inline-block; background: #f0fdf4; border: 2px dashed #16a34a; color: #16a34a; font-size: 32px; font-weight: 800; letter-spacing: 8px; padding: 15px 30px; border-radius: 10px; margin: 20px 0; }
        .expiry-text { color: #e11d48; font-weight: 600; font-size: 14px; margin-top: 10px; }
        .email-footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="email-card">
        <div class="email-header">
          <h2>Waseem Science & Commerce Academy</h2>
          <p>Account Security Settings</p>
        </div>
        <div class="email-body">
          <h3 style="color: #1857A6; margin-top: 0;">Verify Recovery Email</h3>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            Enter the 6-digit code below to verify this email address as your account's official <strong>Recovery Email</strong>.
          </p>

          <div class="otp-badge">${otpCode}</div>

          <p class="expiry-text">This verification code will expire in 10 minutes.</p>

          <p style="font-size: 13px; color: #64748b; margin-top: 25px; line-height: 1.5;">
            If you did not initiate this request, please log in to your account and verify your security settings.
          </p>
        </div>
        <div class="email-footer">
          &copy; ${new Date().getFullYear()} Waseem Science & Commerce Academy. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  const transporter = getTransporter();

  if (transporter) {
    try {
      await transporter.sendMail({
        from: fromName,
        to: toEmail,
        subject: 'Verify Recovery Email - Waseem Academy ERP',
        html: htmlContent
      });
      console.log(`[EMAIL SENT] Recovery Email OTP sent to ${toEmail} via SMTP.`);
      return true;
    } catch (err) {
      console.error(`[EMAIL ERROR] Failed to send recovery email OTP to ${toEmail}:`, err.message);
      console.log('\n======================================================');
      console.log(`[DEVELOPMENT RECOVERY EMAIL OTP] To: ${toEmail} | OTP Code: ${otpCode}`);
      console.log('======================================================\n');
      return true;
    }
  } else {
    console.log('\n======================================================');
    console.log(`[DEVELOPMENT RECOVERY EMAIL OTP] To: ${toEmail} | OTP Code: ${otpCode}`);
    console.log('======================================================\n');
    return true;
  }
}

/**
 * Send Recovery Email Changed Security Alert Notice to old recovery email
 */
async function sendRecoveryEmailChangedNotification(oldEmail, newEmail) {
  const fromName = process.env.SMTP_FROM || '"Waseem Academy ERP" <no-reply@waseem.edu.pk>';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333; }
        .email-card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 2px solid #D4AF37; box-shadow: 0 10px 25px rgba(0,0,0,0.08); overflow: hidden; }
        .email-header { background: linear-gradient(135deg, #1857A6 0%, #0F3A75 100%); color: #ffffff; padding: 25px; text-align: center; }
        .email-header h2 { margin: 0; font-size: 22px; font-weight: 700; }
        .email-body { padding: 30px 25px; text-align: center; }
        .email-footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="email-card">
        <div class="email-header">
          <h2>Waseem Science & Commerce Academy</h2>
        </div>
        <div class="email-body">
          <h3 style="color: #e11d48; margin-top: 0;">Security Alert: Recovery Email Updated</h3>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            The recovery email address for your Waseem Academy ERP account was recently updated to <strong>${newEmail}</strong>.
          </p>
          <p style="font-size: 13px; color: #64748b; margin-top: 20px;">
            If you made this change, no further action is required. If you did not make this change, please contact the system administrator immediately.
          </p>
        </div>
        <div class="email-footer">
          &copy; ${new Date().getFullYear()} Waseem Science & Commerce Academy. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  const transporter = getTransporter();
  if (transporter && oldEmail) {
    try {
      await transporter.sendMail({
        from: fromName,
        to: oldEmail,
        subject: 'Security Alert: Recovery Email Updated - Waseem Academy ERP',
        html: htmlContent
      });
      console.log(`[SECURITY NOTIFICATION] Recovery email change alert sent to ${oldEmail}.`);
    } catch (err) {
      console.error(`[SECURITY NOTIFICATION ERROR] Failed to send notice to ${oldEmail}:`, err.message);
    }
  }
}

module.exports = {
  sendOtpEmail,
  sendRecoveryVerificationOtpEmail,
  sendRecoveryEmailChangedNotification
};
