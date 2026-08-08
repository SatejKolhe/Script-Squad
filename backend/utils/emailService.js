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
    high:   { color: '#ef4444', bg: '#fee2e2', label: '🔴 High' },
    medium: { color: '#f59e0b', bg: '#fef3c7', label: '🟡 Medium' },
    low:    { color: '#22c55e', bg: '#dcfce7', label: '🟢 Low' },
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
          ${task.project?.title ? `<span style="background:#e0e7ff;color:#4338ca;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;">📁 ${task.project.title}</span>` : ''}
        </div>
      </td>
      <td style="padding:14px 16px;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap;">
        <div style="color:${urgency};font-weight:700;font-size:14px;">⏰ ${hoursLeft}h left</div>
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
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
            <div style="font-size:32px;margin-bottom:8px;">⚡</div>
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Deadline Reminder</h1>
            <p style="margin:8px 0 0;color:#c7d2fe;font-size:14px;">Script Squad · Task Manager</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:36px 40px;">
            <p style="margin:0 0 8px;color:#1e293b;font-size:16px;">Hi <strong>${userName}</strong> 👋</p>
            <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
              You have <strong style="color:#6366f1;">${tasks.length} ${taskWord}</strong> with deadlines approaching in the next
              <strong style="color:#6366f1;">${reminderHours} hours</strong>. Don't let them slip through the cracks!
            </p>

            <!-- Tasks Table -->
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

            <!-- CTA -->
            <div style="text-align:center;margin-top:32px;">
              <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}"
                style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:50px;font-weight:700;font-size:15px;letter-spacing:0.3px;">
                Open Script Squad →
              </a>
            </div>

            <p style="margin:32px 0 0;color:#94a3b8;font-size:13px;text-align:center;line-height:1.6;">
              This is an automated reminder from Script Squad.<br/>
              Complete or reschedule your tasks to stop receiving these reminders.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f1f5f9;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">
              © ${new Date().getFullYear()} Script Squad · Built with ❤️ by the Script Squad team
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`;
}

// ── OTP Email Template ────────────────────────────────────────────────────────
function buildOtpEmailHtml(userName, otp) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Password Reset Code – Script Squad</title>
</head>
<body style="margin:0;padding:0;background:#0b0f19;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;color:#f1f5f9;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0f19;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#111827;border-radius:20px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:36px 40px;text-align:center;">
            <div style="display:inline-block;width:48px;height:48px;line-height:48px;background:rgba(255,255,255,0.15);border-radius:14px;font-size:24px;margin-bottom:12px;">⚡</div>
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Script Squad</h1>
            <p style="margin:6px 0 0;color:#c7d2fe;font-size:14px;font-weight:500;">Password Reset Verification</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;background:#111827;">
            <p style="margin:0 0 12px;color:#f3f4f6;font-size:16px;font-weight:600;">Hello ${userName || 'there'},</p>
            <p style="margin:0 0 24px;color:#9ca3af;font-size:14px;line-height:1.6;">
              We received a request to reset your password for your Script Squad account. Use the 6-digit verification code below to complete the verification:
            </p>

            <!-- OTP Display Card -->
            <div style="background:#1f2937;border:1px solid #374151;border-radius:16px;padding:24px;text-align:center;margin:0 0 24px;">
              <div style="color:#9ca3af;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;">Verification Code</div>
              <div style="font-family:'Courier New',Courier,monospace;font-size:36px;font-weight:800;letter-spacing:10px;color:#818cf8;background:#111827;padding:14px 20px;border-radius:10px;display:inline-block;border:1px dashed #6366f1;">
                ${otp}
              </div>
              <p style="margin:14px 0 0;color:#f59e0b;font-size:12px;font-weight:500;">
                ⏱️ Code expires in <strong>10 minutes</strong>.
              </p>
            </div>

            <p style="margin:0 0 16px;color:#9ca3af;font-size:13px;line-height:1.6;">
              If you did not request a password reset, please ignore this email or reach out if you have concerns. Your password will remain unchanged.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0b0f19;border-top:1px solid rgba(255,255,255,0.06);padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#6b7280;font-size:12px;">
              © ${new Date().getFullYear()} Script Squad · Secure Authentication Service
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
    console.warn('⚠️  Email credentials not configured. Skipping notification.');
    return;
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"Script Squad" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `⏰ ${tasks.length} task${tasks.length > 1 ? 's' : ''} due soon — Script Squad`,
    html: buildDeadlineEmailHtml(user.name, tasks),
  };

  await transporter.sendMail(mailOptions);
  console.log(`📧 Deadline reminder sent to ${user.email} (${tasks.length} task${tasks.length > 1 ? 's' : ''})`);
}

// ── Email Verification ────────────────────────────────────────────────────────
/**
 * @param {{ name: string, email: string }} user
 * @param {string} verifyUrl – Full URL with raw token
 * @param {string} [otp] – 6-digit verification code
 */
async function sendVerificationEmail(user, verifyUrl, otp) {
  if (otp) {
    console.log(`✉️  [EMAIL VERIFICATION OTP] Sent to ${user.email}: ${otp}`);
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  Email credentials not configured. Skipping email dispatch (OTP logged above for dev).');
    return;
  }

  const otpSection = otp
    ? `
            <!-- OTP Display Card -->
            <div style="background:#1f2937;border:1px solid #374151;border-radius:16px;padding:24px;text-align:center;margin:24px 0;">
              <div style="color:#9ca3af;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;">Verification Code</div>
              <div style="font-family:'Courier New',Courier,monospace;font-size:36px;font-weight:800;letter-spacing:10px;color:#818cf8;background:#111827;padding:14px 20px;border-radius:10px;display:inline-block;border:1px dashed #6366f1;">
                ${otp}
              </div>
              <p style="margin:14px 0 0;color:#f59e0b;font-size:12px;font-weight:500;">
                ⏱️ Code expires in <strong>10 minutes</strong>.
              </p>
            </div>
            `
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Verify your email – Script Squad</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <tr>
          <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
            <div style="font-size:32px;margin-bottom:8px;">✉️</div>
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Verify your email</h1>
            <p style="margin:8px 0 0;color:#c7d2fe;font-size:14px;">Script Squad · Task Manager</p>
          </td>
        </tr>

        <tr>
          <td style="background:#ffffff;padding:36px 40px;">
            <p style="margin:0 0 8px;color:#1e293b;font-size:16px;">Hi <strong>${user.name}</strong> 👋</p>
            <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
              Thanks for joining <strong style="color:#6366f1;">Script Squad</strong>! Enter the 6-digit verification code below or click the button to verify your email address and activate your account.
            </p>

            ${otpSection}

            <div style="text-align:center;margin:28px 0;">
              <a href="${verifyUrl}"
                style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;padding:16px 44px;border-radius:50px;font-weight:700;font-size:16px;letter-spacing:0.3px;">
                ✅ Verify Email Address via Link
              </a>
            </div>

            <p style="margin:24px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">
              If the button doesn't work, paste this URL into your browser:<br/>
              <a href="${verifyUrl}" style="color:#6366f1;word-break:break-all;">${verifyUrl}</a>
            </p>
            <p style="margin:16px 0 0;color:#94a3b8;font-size:13px;">
              If you didn't create a Script Squad account, you can safely ignore this email.
            </p>
          </td>
        </tr>

        <tr>
          <td style="background:#f1f5f9;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">
              © ${new Date().getFullYear()} Script Squad · Built with ❤️ by the Script Squad team
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
    subject: '✅ Verify your Script Squad email address',
    html,
  });
  console.log(`📧 Verification email sent to ${user.email}`);
}

// ── Password Reset (Link fallback) ────────────────────────────────────────────
/**
 * @param {{ name: string, email: string }} user
 * @param {string} resetUrl – Full URL with raw reset token
 */
async function sendPasswordResetEmail(user, resetUrl) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  Email credentials not configured. Skipping reset email.');
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Reset your password – Script Squad</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <tr>
          <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
            <div style="font-size:32px;margin-bottom:8px;">🔑</div>
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Reset your password</h1>
            <p style="margin:8px 0 0;color:#c7d2fe;font-size:14px;">Script Squad · Task Manager</p>
          </td>
        </tr>

        <tr>
          <td style="background:#ffffff;padding:36px 40px;">
            <p style="margin:0 0 8px;color:#1e293b;font-size:16px;">Hi <strong>${user.name}</strong> 👋</p>
            <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
              We received a request to reset your <strong style="color:#6366f1;">Script Squad</strong> password.
              Click the button below — this link expires in <strong style="color:#6366f1;">15 minutes</strong>.
            </p>

            <div style="text-align:center;margin:28px 0;">
              <a href="${resetUrl}"
                style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;padding:16px 44px;border-radius:50px;font-weight:700;font-size:16px;letter-spacing:0.3px;">
                🔑 Reset Password
              </a>
            </div>

            <p style="margin:24px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">
              If the button doesn't work, paste this URL:<br/>
              <a href="${resetUrl}" style="color:#6366f1;word-break:break-all;">${resetUrl}</a>
            </p>
            <p style="margin:16px 0 0;color:#94a3b8;font-size:13px;">
              If you didn't request a password reset, you can safely ignore this email.
            </p>
          </td>
        </tr>

        <tr>
          <td style="background:#f1f5f9;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">
              © ${new Date().getFullYear()} Script Squad · Built with ❤️ by the Script Squad team
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
    subject: '🔑 Reset your Script Squad password',
    html,
  });
  console.log(`📧 Password reset email sent to ${user.email}`);
}

// ── Password Reset OTP ────────────────────────────────────────────────────────
/**
 * Send a password reset OTP verification email to a user.
 * @param {{ name: string, email: string }} user
 * @param {string} otp - 6 digit OTP
 */
async function sendPasswordResetOtpEmail(user, otp) {
  console.log(`🔑 [PASSWORD RESET OTP] Sent to ${user.email}: ${otp}`);

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  Email credentials not configured in .env. OTP was logged above for development.');
    return;
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"Script Squad" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `🔐 Your Script Squad Password Reset Code: ${otp}`,
    html: buildOtpEmailHtml(user.name, otp),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Password reset OTP sent to ${user.email}`);
  } catch (err) {
    console.error(`⚠️ Failed to dispatch email to ${user.email}:`, err.message);
  }
}

// ── Account Deletion Emails ───────────────────────────────────────────────────

/**
 * Send email notifying user that account is scheduled for deletion in 15 days.
 */
async function sendAccountDeletionPendingEmail(user, scheduledDate, daysRemaining = 15) {
  const formattedDate = formatDate(scheduledDate);
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  console.log(`⚠️  [ACCOUNT DELETION PENDING] ${user.email} scheduled for ${formattedDate} (${daysRemaining} days remaining)`);

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  Email credentials not configured. Skipping account deletion pending email dispatch.');
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Account Deletion Scheduled</title></head>
<body style="margin:0;padding:0;background:#0b0f19;font-family:'Segoe UI',system-ui,sans-serif;color:#f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0f19;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#111827;border-radius:20px;border:1px solid rgba(239,68,68,0.3);overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
        <tr>
          <td style="background:linear-gradient(135deg,#dc2626 0%,#991b1b 100%);padding:36px 40px;text-align:center;">
            <div style="font-size:36px;margin-bottom:8px;">⚠️</div>
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;">Account Scheduled for Deletion</h1>
            <p style="margin:6px 0 0;color:#fca5a5;font-size:14px;">Script Squad · 15-Day Grace Period</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;background:#111827;">
            <p style="margin:0 0 12px;color:#f3f4f6;font-size:16px;font-weight:600;">Hi ${user.name},</p>
            <p style="margin:0 0 20px;color:#9ca3af;font-size:14px;line-height:1.6;">
              We received a request to delete your Script Squad account. Your account is now deactivated and scheduled for permanent deletion on <strong style="color:#ef4444;">${formattedDate}</strong> (${daysRemaining} days remaining).
            </p>
            <div style="background:#1f2937;border-left:4px solid #ef4444;border-radius:8px;padding:16px 20px;margin:24px 0;">
              <div style="color:#f87171;font-weight:700;font-size:14px;margin-bottom:4px;">Changed your mind?</div>
              <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">
                You can restore your account at any time before <strong>${formattedDate}</strong> by logging back in to Script Squad.
              </p>
            </div>
            <p style="margin:24px 0;color:#f3f4f6;font-size:15px;text-align:center;line-height:1.6;">
              🔑 <strong>Log in again to restore your account.</strong>
            </p>
            <p style="margin:24px 0 0;color:#6b7280;font-size:12px;text-align:center;">
              After ${formattedDate}, all your tasks, projects, and personal data will be permanently and irreversibly deleted.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Script Squad Security" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `⚠️ Important: Your Script Squad account is scheduled for deletion on ${formattedDate}`,
      html,
    });
    console.log(`📧 Account deletion pending email sent to ${user.email}`);
  } catch (err) {
    console.error(`⚠️ Failed to send deletion pending email to ${user.email}:`, err.message);
  }
}

/**
 * Send reminder email when 3 days remain before permanent deletion.
 */
async function sendAccountDeletionReminderEmail(user, daysRemaining = 3) {
  console.log(`⏰ [ACCOUNT DELETION REMINDER] ${user.email} (${daysRemaining} days left)`);

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  Email credentials not configured. Skipping deletion reminder email.');
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Account Deletion Reminder</title></head>
<body style="margin:0;padding:0;background:#0b0f19;font-family:'Segoe UI',system-ui,sans-serif;color:#f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0f19;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#111827;border-radius:20px;border:1px solid rgba(245,158,11,0.3);overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);padding:36px 40px;text-align:center;">
            <div style="font-size:36px;margin-bottom:8px;">⏳</div>
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;">${daysRemaining} Days Left to Restore Account</h1>
            <p style="margin:6px 0 0;color:#fef3c7;font-size:14px;">Script Squad · Deletion Reminder</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;background:#111827;">
            <p style="margin:0 0 12px;color:#f3f4f6;font-size:16px;">Hi ${user.name},</p>
            <p style="margin:0 0 20px;color:#9ca3af;font-size:14px;line-height:1.6;">
              This is a reminder that your Script Squad account will be <strong>permanently deleted in ${daysRemaining} days</strong>.
            </p>
            <p style="margin:24px 0;color:#f3f4f6;font-size:15px;text-align:center;line-height:1.6;">
              🔑 <strong>Log in again to restore your account.</strong>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Script Squad Security" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `⏳ Final Reminder: ${daysRemaining} days left to restore your Script Squad account`,
      html,
    });
    console.log(`📧 Account deletion reminder sent to ${user.email}`);
  } catch (err) {
    console.error(`⚠️ Failed to send deletion reminder email to ${user.email}:`, err.message);
  }
}

/**
 * Send email confirming account restoration.
 */
async function sendAccountRestoredEmail(user) {
  console.log(`✅ [ACCOUNT RESTORED] ${user.email}`);

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  Email credentials not configured. Skipping account restored email.');
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Account Restored</title></head>
<body style="margin:0;padding:0;background:#0b0f19;font-family:'Segoe UI',system-ui,sans-serif;color:#f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0f19;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#111827;border-radius:20px;border:1px solid rgba(16,185,129,0.3);overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:36px 40px;text-align:center;">
            <div style="font-size:36px;margin-bottom:8px;">🎉</div>
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;">Welcome Back! Account Restored</h1>
            <p style="margin:6px 0 0;color:#a7f3d0;font-size:14px;">Script Squad · Account Active</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;background:#111827;">
            <p style="margin:0 0 12px;color:#f3f4f6;font-size:16px;">Hi ${user.name},</p>
            <p style="margin:0 0 20px;color:#9ca3af;font-size:14px;line-height:1.6;">
              Your Script Squad account has been successfully restored. Your tasks, projects, and settings are fully active again.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;


  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Script Squad" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: '🎉 Your Script Squad account has been successfully restored!',
      html,
    });
    console.log(`📧 Account restored email sent to ${user.email}`);
  } catch (err) {
    console.error(`⚠️ Failed to send account restored email to ${user.email}:`, err.message);
  }
}

/**
 * Send final confirmation email after permanent account deletion.
 */
async function sendAccountPermanentlyDeletedEmail(user) {
  console.log(`🗑️  [ACCOUNT PERMANENTLY DELETED] ${user.email}`);

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  Email credentials not configured. Skipping permanent deletion confirmation email.');
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Account Permanently Deleted</title></head>
<body style="margin:0;padding:0;background:#0b0f19;font-family:'Segoe UI',system-ui,sans-serif;color:#f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0f19;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#111827;border-radius:20px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
        <tr>
          <td style="background:#1f2937;padding:36px 40px;text-align:center;">
            <div style="font-size:36px;margin-bottom:8px;">👋</div>
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;">Account Permanently Deleted</h1>
            <p style="margin:6px 0 0;color:#9ca3af;font-size:14px;">Script Squad</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;background:#111827;">
            <p style="margin:0 0 12px;color:#f3f4f6;font-size:16px;">Goodbye ${user.name},</p>
            <p style="margin:0 0 20px;color:#9ca3af;font-size:14px;line-height:1.6;">
              As requested, your 15-day grace period has ended and your Script Squad account and associated data have been permanently deleted from our servers.
            </p>
            <p style="margin:0;color:#6b7280;font-size:13px;">
              Thank you for having been part of Script Squad. If you ever wish to return, you are welcome to sign up for a new account anytime.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Script Squad" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: '👋 Your Script Squad account has been permanently deleted',
      html,
    });
    console.log(`📧 Account permanently deleted confirmation sent to ${user.email}`);
  } catch (err) {
    console.error(`⚠️ Failed to send permanent deletion confirmation to ${user.email}:`, err.message);
  }
}

module.exports = {
  sendDeadlineReminderEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordResetOtpEmail,
  sendAccountDeletionPendingEmail,
  sendAccountDeletionReminderEmail,
  sendAccountRestoredEmail,
  sendAccountPermanentlyDeletedEmail,
};

