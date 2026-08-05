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

// ── HTML Email Template ───────────────────────────────────────────────────────
function buildEmailHtml(userName, tasks) {
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
 * Send a deadline reminder email to a user.
 * @param {{ name: string, email: string }} user
 * @param {Array} tasks  – Array of populated Task documents
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
    html: buildEmailHtml(user.name, tasks),
  };

  await transporter.sendMail(mailOptions);
  console.log(`📧 Deadline reminder sent to ${user.email} (${tasks.length} task${tasks.length > 1 ? 's' : ''})`);
}

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

module.exports = {
  sendDeadlineReminderEmail,
  sendPasswordResetOtpEmail,
};
