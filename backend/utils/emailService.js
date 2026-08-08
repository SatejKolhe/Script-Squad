const nodemailer = require('nodemailer');

// ── Transporter ──────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function priorityBadge(priority) {
  const map = {
    high:   { color: '#ef4444', bg: '#fee2e2', label: 'High' },
    medium: { color: '#f59e0b', bg: '#fef3c7', label: 'Medium' },
    low:    { color: '#22c55e', bg: '#dcfce7', label: 'Low' },
  };
  const p = map[priority] || map['medium'];
  return `<span style="background:${p.bg};color:${p.color};padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;">${p.label}</span>`;
}

function taskRow(task) {
  const hoursLeft = Math.max(
    0,
    Math.round((new Date(task.dueDate) - Date.now()) / 36e5)
  );
  const urgency = hoursLeft <= 6 ? '#ef4444' : hoursLeft <= 12 ? '#f59e0b' : '#6366f1';

  return `
    <tr>
      <td style="padding:14px 16px;border-bottom:1px solid #f1f5f9;">
        <div style="font-weight:600;color:#1e293b;font-size:15px;margin-bottom:4px;">${task.title}</div>
        ${task.description ? `<div style="color:#64748b;font-size:13px;margin-bottom:6px;">${task.description.substring(0, 100)}${task.description.length > 100 ? '…' : ''}</div>` : ''}
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          ${priorityBadge(task.priority)}
          ${task.project?.title ? `<span style="background:#e0e7ff;color:#4338ca;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;">Folder: ${task.project.title}</span>` : ''}
        </div>
      </td>
      <td style="padding:14px 16px;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap;">
        <div style="color:${urgency};font-weight:700;font-size:14px;">${hoursLeft}h left</div>
        <div style="color:#94a3b8;font-size:12px;margin-top:2px;">${formatDate(task.dueDate)}</div>
      </td>
    </tr>`;
}

// ── HTML Email Template (deadline reminder) ───────────────────────────────────
function buildDeadlineEmailHtml(userName, tasks) {
  const reminderHours = process.env.DEADLINE_REMINDER_HOURS || 24;
  const taskRows = tasks.map(taskRow).join('');
  const taskWord = tasks.length === 1 ? 'task' : 'tasks';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Deadline Reminder – Script Squad</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Deadline Reminder</h1>
            <p style="margin:6px 0 0;color:#c7d2fe;font-size:14px;">Script Squad Task Manager</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:36px 40px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <p style="margin:0 0 8px;color:#1e293b;font-size:16px;">Hi <strong>${userName}</strong>,</p>
            <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
              You have <strong style="color:#4f46e5;">${tasks.length} ${taskWord}</strong> with deadlines approaching in the next
              <strong style="color:#4f46e5;">${reminderHours} hours</strong>.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0"
              style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;border-collapse:collapse;">
              <thead>
                <tr style="background:#f8fafc;">
                  <th style="padding:12px 16px;text-align:left;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Task</th>
                  <th style="padding:12px 16px;text-align:right;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Due</th>
                </tr>
              </thead>
              <tbody>
                ${taskRows}
              </tbody>
            </table>

            <div style="text-align:center;margin-top:32px;">
              <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}"
                style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:50px;font-weight:700;font-size:15px;">
                Open Script Squad Workspace →
              </a>
            </div>

            <p style="margin:32px 0 0;color:#94a3b8;font-size:13px;text-align:center;line-height:1.6;">
              This is an automated operational notification from Script Squad.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f1f5f9;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;border:1px solid #e2e8f0;border-top:none;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">
              © ${new Date().getFullYear()} Script Squad. All rights reserved.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`;
}

// ── Clean Light OTP Email Template (Primary Inbox Optimized) ──────────────────
function buildCleanOtpEmailHtml(userName, otp, actionTitle = 'Verification Code') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${actionTitle} – Script Squad</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">

        <!-- Header -->
        <tr>
          <td style="background:#4f46e5;padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.3px;">Script Squad</h1>
            <p style="margin:4px 0 0;color:#e0e7ff;font-size:14px;font-weight:500;">${actionTitle}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 32px;background:#ffffff;">
            <p style="margin:0 0 12px;color:#1e293b;font-size:16px;font-weight:600;">Hello ${userName || 'User'},</p>
            <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
              Here is your 6-digit security code for your Script Squad account. Enter this code to complete authentication:
            </p>

            <!-- OTP Box -->
            <div style="background:#f8fafc;border:2px dashed #6366f1;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
              <span style="color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;display:block;margin-bottom:8px;">Your 6-Digit Code</span>
              <span style="font-family:'Courier New',Courier,monospace;font-size:36px;font-weight:800;letter-spacing:10px;color:#4f46e5;display:inline-block;padding:8px 16px;background:#ffffff;border-radius:8px;border:1px solid #cbd5e1;">
                ${otp}
              </span>
              <p style="margin:12px 0 0;color:#d97706;font-size:12px;font-weight:600;">
                Expires in 10 minutes. Do not share this code with anyone.
              </p>
            </div>

            <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">
              If you did not request this code, please ignore this email. Your account remains secure.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">
              © ${new Date().getFullYear()} Script Squad · Automated Account Security
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`;
}

// ── Send Functions ────────────────────────────────────────────────────────────

/**
 * @param {{ name: string, email: string }} user
 * @param {Array} tasks – Array of populated Task documents
 */
async function sendDeadlineReminderEmail(user, tasks) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ Email credentials not configured. Skipping notification.');
    return;
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"Script Squad" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `Script Squad: ${tasks.length} task${tasks.length > 1 ? 's' : ''} due soon`,
    text: `Hi ${user.name},\n\nYou have ${tasks.length} task(s) approaching deadlines within the next 24 hours. Please check your workspace:\n${process.env.CLIENT_URL || 'http://localhost:5173'}`,
    html: buildDeadlineEmailHtml(user.name, tasks),
    headers: {
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      'Importance': 'High',
      'Auto-Submitted': 'auto-generated',
      'X-Auto-Response-Suppress': 'OOF, AutoReply',
    },
  };

  await transporter.sendMail(mailOptions);
  console.log(`📧 Deadline reminder sent to ${user.email} (${tasks.length} task${tasks.length > 1 ? 's' : ''})`);
}

// ── Email Verification (Primary Inbox Optimized) ──────────────────────────────
/**
 * @param {{ name: string, email: string }} user
 * @param {string} verifyUrl – Full URL with raw token
 * @param {string} [otp] – 6-digit verification code
 */
async function sendVerificationEmail(user, verifyUrl, otp) {
  if (otp) {
    console.log(`✉️ [EMAIL VERIFICATION OTP] Sent to ${user.email}: ${otp}`);
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ Email credentials not configured. Skipping email dispatch (OTP logged above for dev).');
    return;
  }

  // Primary inbox clean subject line pattern recognized by Gmail 2FA parsers
  const subject = otp
    ? `Script Squad: ${otp} is your verification code`
    : 'Verify your Script Squad email address';

  // Plain-text alternative (Essential for Primary Inbox deliverability)
  const plainText = otp
    ? `Hi ${user.name},\n\nYour Script Squad verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nYou can also verify your email using this link:\n${verifyUrl}\n\nIf you did not request this verification, please ignore this email.`
    : `Hi ${user.name},\n\nPlease verify your email address by opening this link:\n${verifyUrl}\n\nThis link expires in 30 minutes.`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Verify your email – Script Squad</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">

        <tr>
          <td style="background:#4f46e5;padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.3px;">Script Squad</h1>
            <p style="margin:4px 0 0;color:#e0e7ff;font-size:14px;font-weight:500;">Account Email Verification</p>
          </td>
        </tr>

        <tr>
          <td style="padding:36px 40px 32px;background:#ffffff;">
            <p style="margin:0 0 12px;color:#1e293b;font-size:16px;font-weight:600;">Hi <strong>${user.name}</strong>,</p>
            <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">
              Thanks for joining Script Squad! Enter the 6-digit verification code below or click the button to activate your account.
            </p>

            ${
              otp
                ? `
            <!-- OTP Display Card -->
            <div style="background:#f8fafc;border:2px dashed #6366f1;border-radius:12px;padding:24px;text-align:center;margin:20px 0;">
              <span style="color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;display:block;margin-bottom:8px;">Verification Code</span>
              <span style="font-family:'Courier New',Courier,monospace;font-size:36px;font-weight:800;letter-spacing:10px;color:#4f46e5;display:inline-block;padding:8px 16px;background:#ffffff;border-radius:8px;border:1px solid #cbd5e1;">
                ${otp}
              </span>
              <p style="margin:12px 0 0;color:#d97706;font-size:12px;font-weight:600;">
                Expires in 10 minutes.
              </p>
            </div>
            `
                : ''
            }

            <div style="text-align:center;margin:28px 0;">
              <a href="${verifyUrl}"
                style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:50px;font-weight:700;font-size:15px;">
                Verify Email Address
              </a>
            </div>

            <p style="margin:24px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">
              If the button doesn't work, open this link in your browser:<br/>
              <a href="${verifyUrl}" style="color:#4f46e5;word-break:break-all;">${verifyUrl}</a>
            </p>
            <p style="margin:16px 0 0;color:#94a3b8;font-size:13px;">
              If you didn't create a Script Squad account, you can safely ignore this email.
            </p>
          </td>
        </tr>

        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">
              © ${new Date().getFullYear()} Script Squad · Account Security
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"Script Squad" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject,
    text: plainText,
    html,
    headers: {
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      'Importance': 'High',
      'Auto-Submitted': 'auto-generated',
      'X-Auto-Response-Suppress': 'OOF, AutoReply',
    },
  };

  await transporter.sendMail(mailOptions);
  console.log(`📧 Verification email sent to ${user.email}`);
}

// ── Password Reset (Link fallback) ────────────────────────────────────────────
/**
 * @param {{ name: string, email: string }} user
 * @param {string} resetUrl – Full URL with raw reset token
 */
async function sendPasswordResetEmail(user, resetUrl) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ Email credentials not configured. Skipping reset email.');
    return;
  }

  const subject = 'Script Squad: Reset your password';
  const plainText = `Hi ${user.name},\n\nWe received a request to reset your Script Squad password. Open this link to set a new password:\n${resetUrl}\n\nThis link will expire in 15 minutes.`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Reset your password – Script Squad</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">

        <tr>
          <td style="background:#4f46e5;padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.3px;">Script Squad</h1>
            <p style="margin:4px 0 0;color:#e0e7ff;font-size:14px;font-weight:500;">Password Reset</p>
          </td>
        </tr>

        <tr>
          <td style="padding:36px 40px 32px;background:#ffffff;">
            <p style="margin:0 0 12px;color:#1e293b;font-size:16px;font-weight:600;">Hi <strong>${user.name}</strong>,</p>
            <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
              We received a request to reset your password. Click the button below — this link expires in 15 minutes.
            </p>

            <div style="text-align:center;margin:28px 0;">
              <a href="${resetUrl}"
                style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:50px;font-weight:700;font-size:15px;">
                Reset Password
              </a>
            </div>

            <p style="margin:24px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">
              If the button doesn't work, open this link:<br/>
              <a href="${resetUrl}" style="color:#4f46e5;word-break:break-all;">${resetUrl}</a>
            </p>
            <p style="margin:16px 0 0;color:#94a3b8;font-size:13px;">
              If you didn't request a password reset, you can safely ignore this email.
            </p>
          </td>
        </tr>

        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">
              © ${new Date().getFullYear()} Script Squad · Account Security
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"Script Squad" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject,
    text: plainText,
    html,
    headers: {
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      'Importance': 'High',
      'Auto-Submitted': 'auto-generated',
      'X-Auto-Response-Suppress': 'OOF, AutoReply',
    },
  });
  console.log(`📧 Password reset email sent to ${user.email}`);
}

// ── Password Reset OTP (Primary Inbox Optimized) ──────────────────────────────
/**
 * Send a password reset OTP verification email to a user.
 * @param {{ name: string, email: string }} user
 * @param {string} otp - 6 digit OTP
 */
async function sendPasswordResetOtpEmail(user, otp) {
  console.log(`🔑 [PASSWORD RESET OTP] Sent to ${user.email}: ${otp}`);

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ Email credentials not configured in .env. OTP was logged above for development.');
    return;
  }

  const subject = `Script Squad: ${otp} is your password reset code`;
  const plainText = `Hello ${user.name || 'there'},\n\nYour Script Squad password reset code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you did not request a password reset, please ignore this email. Your password will remain unchanged.`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"Script Squad" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject,
    text: plainText,
    html: buildCleanOtpEmailHtml(user.name, otp, 'Password Reset Code'),
    headers: {
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      'Importance': 'High',
      'Auto-Submitted': 'auto-generated',
      'X-Auto-Response-Suppress': 'OOF, AutoReply',
    },
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Password reset OTP sent to ${user.email}`);
  } catch (err) {
    console.error(`⚠️ Failed to dispatch email to ${user.email}:`, err.message);
  }
}

module.exports = {
  sendDeadlineReminderEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordResetOtpEmail,
};
