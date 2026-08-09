const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const OrgTeam = require('../models/OrgTeam');
const OrgTeamMember = require('../models/OrgTeamMember');
const ChatGroup = require('../models/ChatGroup');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    const teams = await OrgTeam.find();
    console.log(`Found ${teams.length} teams.`);

    for (const team of teams) {
      // Check if ChatGroup already exists
      let group = await ChatGroup.findOne({ orgTeamId: team._id });
      if (!group) {
        // Find members
        const members = await OrgTeamMember.find({ teamId: team._id });
        const memberIds = members.map(m => m.userId);

        group = await ChatGroup.create({
          name: team.name,
          orgTeamId: team._id,
          members: memberIds,
        });
        console.log(`Created group for team: ${team.name}`);
      } else {
        console.log(`Group already exists for team: ${team.name}`);
      }
    }

    console.log('Migration complete.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
