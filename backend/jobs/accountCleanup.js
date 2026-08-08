const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const AuditLog = require('../models/AuditLog');
const {
  sendAccountDeletionReminderEmail,
  sendAccountPermanentlyDeletedEmail,
} = require('../utils/emailService');

/**
 * Core cleanup function:
 * 1. Sends reminder email to accounts with <= 3 days left.
 * 2. Permanently hard-deletes accounts where deletionScheduledFor <= now.
 */
async function runAccountCleanup() {
  try {
    const now = new Date();
    console.log(`🧹 Running daily account cleanup job (${now.toISOString()})…`);

    // ── 1. Send Reminder Emails (3 days before deletion) ───────────────────
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    const reminderThreshold = new Date(now.getTime() + threeDaysMs);

    const usersNeedingReminder = await User.find({
      deletionStatus: 'pending_deletion',
      deletionReminderSent: false,
      deletionScheduledFor: { $lte: reminderThreshold, $gt: now },
    });

    for (const user of usersNeedingReminder) {
      try {
        const msLeft = new Date(user.deletionScheduledFor).getTime() - now.getTime();
        const daysLeft = Math.max(1, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
        await sendAccountDeletionReminderEmail(user, daysLeft);

        user.deletionReminderSent = true;
        await user.save({ validateBeforeSave: false });
      } catch (err) {
        console.error(`❌ Failed sending deletion reminder to ${user.email}:`, err.message);
      }
    }

    // ── 2. Permanent Hard-Delete Expired Soft-Deleted Accounts ─────────────
    const expiredUsers = await User.find({
      deletionStatus: 'pending_deletion',
      deletionScheduledFor: { $lte: now },
    });

    if (expiredUsers.length === 0) {
      console.log('✅ No expired soft-deleted accounts to purge.');
      return { purged: 0, reminded: usersNeedingReminder.length };
    }

    console.log(`🗑️ Found ${expiredUsers.length} account(s) ready for permanent hard deletion.`);

    let purgedCount = 0;

    for (const user of expiredUsers) {
      const userId = user._id;

      try {
        // Delete user's avatar file if custom upload
        if (user.avatar && user.avatar.startsWith('/uploads/')) {
          const avatarPath = path.join(__dirname, '..', user.avatar);
          if (fs.existsSync(avatarPath)) {
            fs.unlinkSync(avatarPath);
          }
        }

        // Delete all projects owned by user
        await Project.deleteMany({ owner: userId });

        // Delete all tasks owned by user
        await Task.deleteMany({ owner: userId });

        // Audit Log entry before removing user document
        await AuditLog.create({
          userId: user._id,
          userEmail: user.email,
          action: 'permanently_deleted',
          metadata: {
            deletedAt: user.deletedAt,
            scheduledFor: user.deletionScheduledFor,
            purgedAt: now,
          },
        });

        // Send final goodbye/confirmation email
        await sendAccountPermanentlyDeletedEmail(user);

        // Delete User document
        await User.deleteOne({ _id: userId });

        purgedCount++;
        console.log(`✅ Permanently purged account & data for ${user.email}`);
      } catch (userPurgeErr) {
        console.error(`❌ Error purging account for ${user.email}:`, userPurgeErr);
      }
    }

    console.log(`🏁 Account cleanup completed: ${purgedCount} user(s) permanently deleted.`);
    return { purged: purgedCount, reminded: usersNeedingReminder.length };
  } catch (err) {
    console.error('❌ Account cleanup job error:', err);
    throw err;
  }
}

/**
 * Start the daily account cleanup cron job.
 * Default: Daily at 2:00 AM UTC — "0 2 * * *"
 */
function startAccountCleanupJob() {
  const schedule = process.env.ACCOUNT_CLEANUP_CRON_SCHEDULE || '0 2 * * *';

  if (!cron.validate(schedule)) {
    console.error(`❌ Invalid cron schedule: "${schedule}". Using default "0 2 * * *"`);
  }

  cron.schedule(schedule, async () => {
    await runAccountCleanup();
  });

  console.log(`⏰ Account cleanup cron job started (schedule: "${schedule}")`);
}

module.exports = { startAccountCleanupJob, runAccountCleanup };
