const OrgTeamMember = require('../models/OrgTeamMember');

/**
 * Promotes a user to a leader in an organizational team.
 * @param {String} orgTeamId - The ID of the team.
 * @param {String} targetUserId - The ID of the user to promote.
 * @param {String} requestingUserId - The ID of the user requesting the promotion (must be a leader).
 * @returns {Promise<Object>} The updated member document.
 */
exports.promoteToLeader = async (orgTeamId, targetUserId, requestingUserId) => {
  // 1. Verify the requesting user is a leader
  const requestingMember = await OrgTeamMember.findOne({
    teamId: orgTeamId,
    userId: requestingUserId,
    role: 'leader',
  });

  if (!requestingMember) {
    throw new Error('Unauthorized: You must be a team leader to promote members.');
  }

  // 2. Find the target member
  const targetMember = await OrgTeamMember.findOne({
    teamId: orgTeamId,
    userId: targetUserId,
  });

  if (!targetMember) {
    throw new Error('User is not a member of this team.');
  }

  // 3. Promote to leader
  targetMember.role = 'leader';
  await targetMember.save();

  // If a ChatGroup model is introduced later, we would sync the role here.

  return targetMember;
};

exports.demoteToMember = async (orgTeamId, targetUserId, requestingUserId) => {
  // 1. Verify the requesting user is a leader
  const requestingMember = await OrgTeamMember.findOne({
    teamId: orgTeamId,
    userId: requestingUserId,
    role: 'leader',
  });

  if (!requestingMember) {
    throw new Error('Unauthorized: You must be a team leader to demote members.');
  }

  // 2. Count current leaders
  const leaderCount = await OrgTeamMember.countDocuments({
    teamId: orgTeamId,
    role: 'leader',
  });

  // 3. Find the target member
  const targetMember = await OrgTeamMember.findOne({
    teamId: orgTeamId,
    userId: targetUserId,
    role: 'leader',
  });

  if (!targetMember) {
    throw new Error('User is not a leader of this team.');
  }

  // 4. Enforce at least one leader rule
  if (leaderCount <= 1) {
    throw new Error('A team must have at least one leader. Promote another member to leader first.');
  }

  // 5. Demote to member
  targetMember.role = 'member';
  await targetMember.save();

  return targetMember;
};
