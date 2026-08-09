const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const OrgTeam = require('../models/OrgTeam');
const OrgTeamMember = require('../models/OrgTeamMember');
const OrgTeamJoinRequest = require('../models/OrgTeamJoinRequest');
const Project = require('../models/Project');
const User = require('../models/User');
const ChatGroup = require('../models/ChatGroup');
const orgTeamService = require('../services/orgTeamService');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Helper to generate a 6-character random alphanumeric code
const generateJoinCode = () => crypto.randomBytes(3).toString('hex').toUpperCase();

// @route   GET /api/orgTeams
// @desc    Get all teams the user is a member of (including search/filter if needed)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { search } = req.query;
    
    // Find memberships
    const memberships = await OrgTeamMember.find({ userId: req.user._id });
    const teamIds = memberships.map(m => m.teamId);
    
    // Find teams
    const filter = { _id: { $in: teamIds } };
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }
    
    const teams = await OrgTeam.find(filter).lean();
    
    // Attach member count, project count, and current user role
    for (let team of teams) {
      team.memberCount = await OrgTeamMember.countDocuments({ teamId: team._id });
      team.projectCount = await Project.countDocuments({ orgTeamId: team._id });
      const myMembership = memberships.find(m => m.teamId.toString() === team._id.toString());
      team.myRole = myMembership ? myMembership.role : 'member';
    }
    
    res.json({ success: true, data: teams });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/orgTeams
// @desc    Create a new team
// @access  Private
router.post(
  '/',
  protect,
  [
    body('name').trim().notEmpty().withMessage('Team name is required').isLength({ max: 100 }),
    body('description').optional().trim().isLength({ max: 500 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // 1. Create the team
      const joinCode = generateJoinCode();
      const team = await OrgTeam.create([{
        name: req.body.name,
        description: req.body.description || '',
        joinCode,
        creatorId: req.user._id
      }], { session });

      const newTeam = team[0];

      // 2. Add creator as leader
      await OrgTeamMember.create([{
        teamId: newTeam._id,
        userId: req.user._id,
        role: 'leader'
      }], { session });

      // 3. Directly add other members if requested
      if (req.body.members && Array.isArray(req.body.members)) {
        for (const userId of req.body.members) {
          // ensure not adding self again
          if (userId !== req.user._id.toString()) {
            await OrgTeamMember.create([{
              teamId: newTeam._id,
              userId: userId,
              role: 'member'
            }], { session });
          }
        }
      }

      // 4. Auto-create chat group for team
      const initialMembers = req.body.members && Array.isArray(req.body.members) 
        ? [req.user._id, ...req.body.members.filter(id => id !== req.user._id.toString())] 
        : [req.user._id];
        
      await ChatGroup.create([{
        name: newTeam.name,
        orgTeamId: newTeam._id,
        members: initialMembers
      }], { session });

      // 5. Link projects if requested
      if (req.body.projects && Array.isArray(req.body.projects)) {
        for (const projectId of req.body.projects) {
          await Project.findOneAndUpdate(
            { _id: projectId, owner: req.user._id, orgTeamId: null },
            { orgTeamId: newTeam._id },
            { session }
          );
        }
      }

      await session.commitTransaction();
      session.endSession();

      res.status(201).json({ success: true, data: newTeam });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// @route   GET /api/orgTeams/:id
// @desc    Get team detail
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const team = await OrgTeam.findById(req.params.id).lean();
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    
    const membership = await OrgTeamMember.findOne({ teamId: team._id, userId: req.user._id });
    if (!membership) return res.status(403).json({ success: false, message: 'Not a member of this team' });

    team.myRole = membership.role;
    team.memberCount = await OrgTeamMember.countDocuments({ teamId: team._id });
    
    // Hide join code from non-leaders
    if (membership.role !== 'leader') {
      delete team.joinCode;
    }
    
    res.json({ success: true, data: team });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/orgTeams/join
// @desc    Join team via code
// @access  Private
router.post('/join', protect, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Join code is required' });

    const team = await OrgTeam.findOne({ joinCode: code.toUpperCase() });
    if (!team) return res.status(404).json({ success: false, message: 'Invalid code. Please check and try again.' });

    // Check if already a member
    const existingMember = await OrgTeamMember.findOne({ teamId: team._id, userId: req.user._id });
    if (existingMember) {
      return res.status(400).json({ success: false, message: "You're already a member of this team." });
    }

    // Check if pending request exists
    const existingReq = await OrgTeamJoinRequest.findOne({ teamId: team._id, senderId: req.user._id, status: 'pending' });
    if (existingReq) {
      return res.status(400).json({ success: false, message: 'You already have a pending request to join this team.' });
    }

    // Create join request (type = join_request)
    const request = await OrgTeamJoinRequest.create({
      teamId: team._id,
      senderId: req.user._id,
      type: 'join_request',
      status: 'pending'
    });

    res.json({ success: true, message: 'Request sent! The team leader will review your request.', data: request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/orgTeams/:id/invite
// @desc    Leader invites a user directly
// @access  Private
router.post('/:id/invite', protect, async (req, res) => {
  try {
    const { email, intendedRole } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    // Verify leader
    const membership = await OrgTeamMember.findOne({ teamId: req.params.id, userId: req.user._id, role: 'leader' });
    if (!membership) return res.status(403).json({ success: false, message: 'Only leaders can invite directly' });

    const userToInvite = await User.findOne({ email: email.toLowerCase().trim() });
    if (!userToInvite) return res.status(404).json({ success: false, message: 'No user found with that email' });

    if (userToInvite._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot invite yourself' });
    }

    // Check if already a member
    const existingMember = await OrgTeamMember.findOne({ teamId: req.params.id, userId: userToInvite._id });
    if (existingMember) return res.status(400).json({ success: false, message: 'User is already in this team' });

    // Check if pending request exists
    const existingReq = await OrgTeamJoinRequest.findOne({ teamId: req.params.id, receiverId: userToInvite._id, status: 'pending' });
    if (existingReq) return res.status(400).json({ success: false, message: 'Invite already sent to this user' });

    const request = await OrgTeamJoinRequest.create({
      teamId: req.params.id,
      senderId: req.user._id,
      receiverId: userToInvite._id,
      type: 'invite',
      status: 'pending',
      intendedRole: intendedRole === 'leader' ? 'leader' : 'member'
    });

    res.json({ success: true, message: 'Invite sent!', data: request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/orgTeams/:id/members
// @desc    Get team members
// @access  Private
router.get('/:id/members', protect, async (req, res) => {
  try {
    const membership = await OrgTeamMember.findOne({ teamId: req.params.id, userId: req.user._id });
    if (!membership) return res.status(403).json({ success: false, message: 'Not a member of this team' });

    const members = await OrgTeamMember.find({ teamId: req.params.id })
      .populate('userId', 'name email avatar')
      .sort({ role: 1, createdAt: 1 }); // leaders first

    res.json({ success: true, data: members });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/orgTeams/:id/search
// @desc    Search users by name/email to invite to team
// @access  Private
router.get('/:id/search', protect, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ success: true, data: [] });
    }

    // Verify membership (only leaders can invite, but anyone can search if we allow, let's check membership)
    const membership = await OrgTeamMember.findOne({ teamId: req.params.id, userId: req.user._id });
    if (!membership) return res.status(403).json({ success: false, message: 'Not a member of this team' });

    const excludeIds = [req.user._id]; // don't show self

    const users = await User.find({
      _id: { $nin: excludeIds },
      deletionStatus: { $ne: 'pending_deletion' },
      $or: [
        { name: { $regex: q.trim(), $options: 'i' } },
        { email: { $regex: q.trim(), $options: 'i' } },
      ],
    })
      .select('name email avatar')
      .limit(8)
      .lean();

    // Fetch team members
    const teamMembers = await OrgTeamMember.find({ teamId: req.params.id }).select('userId');
    const memberIds = teamMembers.map(m => m.userId.toString());

    // Fetch pending invites
    const pendingInvites = await OrgTeamJoinRequest.find({
      teamId: req.params.id,
      status: 'pending',
      type: 'invite'
    }).select('receiverId');
    const pendingUserIds = pendingInvites.map(inv => inv.receiverId?.toString()).filter(Boolean);

    // Attach inviteStatus
    const usersWithStatus = users.map(user => {
      const uid = user._id.toString();
      let status = 'none';
      if (memberIds.includes(uid)) status = 'member';
      else if (pendingUserIds.includes(uid)) status = 'pending';
      return { ...user, inviteStatus: status };
    });

    res.json({ success: true, data: usersWithStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/orgTeams/:id/members/:userId
// @desc    Remove member (or leave team)
// @access  Private
router.delete('/:id/members/:userId', protect, async (req, res) => {
  try {
    const teamId = req.params.id;
    const targetUserId = req.params.userId;
    const isSelf = targetUserId === req.user._id.toString();

    const targetMembership = await OrgTeamMember.findOne({ teamId, userId: targetUserId });
    if (!targetMembership) return res.status(404).json({ success: false, message: 'Member not found' });

    if (!isSelf) {
      const myMembership = await OrgTeamMember.findOne({ teamId, userId: req.user._id, role: 'leader' });
      if (!myMembership) return res.status(403).json({ success: false, message: 'Only leaders can remove members' });
    }

    await targetMembership.deleteOne();

    // Remove from group
    await ChatGroup.findOneAndUpdate(
      { orgTeamId: teamId },
      { $pull: { members: targetUserId } }
    );

    // Leader fallback logic
    if (targetMembership.role === 'leader') {
      const remainingLeaders = await OrgTeamMember.countDocuments({ teamId, role: 'leader' });
      if (remainingLeaders === 0) {
        const remainingMember = await OrgTeamMember.findOne({ teamId });
        if (remainingMember) {
          remainingMember.role = 'leader';
          await remainingMember.save();
        } else {
          // If no members remain, team could be deleted, but we'll leave it empty/abandoned for now.
        }
      }
    }

    res.json({ success: true, message: isSelf ? 'Left the team' : 'Member removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/orgTeams/:id/members/:userId/role
// @desc    Promote member to leader
// @access  Private
router.put('/:id/members/:userId/role', protect, async (req, res) => {
  try {
    const { role } = req.body;
    if (role !== 'leader') return res.status(400).json({ success: false, message: 'Invalid role' });

    const member = await orgTeamService.promoteToLeader(req.params.id, req.params.userId, req.user._id);
    res.json({ success: true, data: member, message: 'Member promoted to leader' });
  } catch (err) {
    console.error(err);
    if (err.message.startsWith('Unauthorized') || err.message.startsWith('User is not')) {
      return res.status(403).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/orgTeams/:id/members/:userId/demote
// @desc    Demote leader to member
// @access  Private
router.put('/:id/members/:userId/demote', protect, async (req, res) => {
  try {
    const member = await orgTeamService.demoteToMember(req.params.id, req.params.userId, req.user._id);
    res.json({ success: true, data: member, message: 'Leader demoted to member' });
  } catch (err) {
    console.error(err);
    if (err.message.startsWith('Unauthorized') || err.message.startsWith('User is not') || err.message.startsWith('A team must have')) {
      return res.status(403).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/orgTeams/:id/projects
// @desc    Get team projects
// @access  Private
router.get('/:id/projects', protect, async (req, res) => {
  try {
    const { search, status } = req.query;
    const membership = await OrgTeamMember.findOne({ teamId: req.params.id, userId: req.user._id });
    if (!membership) return res.status(403).json({ success: false, message: 'Not a member of this team' });

    const filter = { orgTeamId: req.params.id };
    if (search) filter.title = { $regex: search, $options: 'i' };
    if (status && status !== 'all') filter.status = status;

    const projects = await Project.find(filter).populate('owner', 'name avatar').sort({ createdAt: -1 });

    // Get task counts for projects
    const Task = require('../models/Task');
    const projectsWithCounts = await Promise.all(
      projects.map(async (p) => {
        const projectObj = p.toObject();
        const totalTasks = await Task.countDocuments({ project: p._id });
        const doneTasks = await Task.countDocuments({ project: p._id, status: 'done' });
        projectObj.progress = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
        projectObj.taskCount = totalTasks;
        return projectObj;
      })
    );

    res.json({ success: true, data: projectsWithCounts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/orgTeams/:id/projects
// @desc    Link existing project to team
// @access  Private
router.post('/:id/projects', protect, async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ success: false, message: 'Project ID is required' });

    const membership = await OrgTeamMember.findOne({ teamId: req.params.id, userId: req.user._id });
    if (!membership) return res.status(403).json({ success: false, message: 'Not a member' });

    const project = await Project.findOne({ _id: projectId, owner: req.user._id });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    if (project.orgTeamId) {
      if (project.orgTeamId.toString() === req.params.id) {
        return res.status(400).json({ success: false, message: 'Project already in this team' });
      }
      return res.status(400).json({ success: false, message: 'Project is already assigned to another team' });
    }

    project.orgTeamId = req.params.id;
    await project.save();

    res.json({ success: true, data: project });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/orgTeams/requests/:id/accept
// @desc    Accept a join request or direct invite
// @access  Private
router.patch('/requests/:id/accept', protect, async (req, res) => {
  try {
    const request = await OrgTeamJoinRequest.findById(req.params.id);
    if (!request || request.status !== 'pending') {
      return res.status(404).json({ success: false, message: 'Request not found or already processed' });
    }

    if (request.type === 'join_request') {
      // Must be a leader of the team
      const myMembership = await OrgTeamMember.findOne({ teamId: request.teamId, userId: req.user._id, role: 'leader' });
      if (!myMembership) return res.status(403).json({ success: false, message: 'Only leaders can accept join requests' });

      // Add sender to team
      await OrgTeamMember.create({ teamId: request.teamId, userId: request.senderId, role: 'member' });
    } else if (request.type === 'invite') {
      // Must be the receiver
      if (request.receiverId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'You are not the recipient of this invite' });
      }

      // Add receiver to team
      await OrgTeamMember.create({ teamId: request.teamId, userId: request.receiverId, role: request.intendedRole || 'member' });
      
      // Add receiver to group
      await ChatGroup.findOneAndUpdate(
        { orgTeamId: request.teamId },
        { $addToSet: { members: request.receiverId } }
      );
    }

    request.status = 'accepted';
    await request.save();

    res.json({ success: true, message: 'Request accepted!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/orgTeams/requests/:id/decline
// @desc    Decline a join request or direct invite
// @access  Private
router.patch('/requests/:id/decline', protect, async (req, res) => {
  try {
    const request = await OrgTeamJoinRequest.findById(req.params.id);
    if (!request || request.status !== 'pending') {
      return res.status(404).json({ success: false, message: 'Request not found or already processed' });
    }

    if (request.type === 'join_request') {
      const myMembership = await OrgTeamMember.findOne({ teamId: request.teamId, userId: req.user._id, role: 'leader' });
      if (!myMembership) return res.status(403).json({ success: false, message: 'Only leaders can decline join requests' });
    } else if (request.type === 'invite') {
      if (request.receiverId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'You are not the recipient of this invite' });
      }
    }

    request.status = 'rejected';
    await request.save();

    res.json({ success: true, message: 'Request declined!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
