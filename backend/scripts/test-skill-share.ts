/**
 * Test Skill Sharing - Force skill share during date
 */

import 'dotenv/config';
import { DatingEconomyService } from '../src/services/datingEconomy.js';
import { AutoDatingService } from '../src/services/autoDating.js';
import { SkillSharingService } from '../src/services/skillSharing.js';
import { db, agentDates, agentChatMessages, skillShares, agentSkillFiles, isDatabaseAvailable } from '../src/db/index.js';
import { eq, desc } from 'drizzle-orm';

async function testSkillShare() {
  console.log('\n🦞📚 === TEST SKILL SHARING === 📚🦞\n');

  if (!isDatabaseAvailable()) {
    console.log('❌ Database not available!');
    process.exit(1);
  }

  // Get agents
  const agents = await AutoDatingService.getAvailableAgents();
  if (agents.length < 2) {
    console.log('❌ Need 2 agents!');
    process.exit(1);
  }

  const agent1 = agents[0];
  const agent2 = agents[1];

  console.log('👥 Agents:');
  console.log(`   1. ${agent1.agentName || agent1.agentAddress.slice(0, 10)} (${agent1.personality})`);
  console.log(`   2. ${agent2.agentName || agent2.agentAddress.slice(0, 10)} (${agent2.personality})\n`);

  // Get agent1's skills
  const agent1Skills = await SkillSharingService.getSkillsByOwner(agent1.agentAddress);
  console.log(`📚 Agent 1 has ${agent1Skills.length} skills`);

  if (agent1Skills.length === 0) {
    console.log('Creating skill for agent 1...');
    await SkillSharingService.createSkillFile(
      agent1.agentAddress,
      'DeFi Basics',
      '# DeFi Basics\n\nLearn about decentralized finance...',
      'defi',
      'Introduction to DeFi'
    );
  }

  // Create date
  console.log('\n═'.repeat(60));
  console.log('📨 Creating Date...');
  console.log('═'.repeat(60) + '\n');

  await DatingEconomyService.awardLoveTokens(agent1.agentAddress, 10, 'test_bonus');

  const invitation = await DatingEconomyService.createDateInvitation(
    agent1.agentAddress,
    agent2.agentAddress,
    'dinner',
    'cafe_monad',
    'I want to share my knowledge with you! 📚'
  );

  if (!invitation.success) {
    console.log('❌ Failed:', invitation.error);
    process.exit(1);
  }

  const dateId = invitation.date.id;
  console.log(`✅ Date #${dateId} created\n`);

  // Force accept
  await DatingEconomyService.respondToInvitation(dateId, true, "Let's learn together!");

  // Now MANUALLY share the skill (force it)
  console.log('═'.repeat(60));
  console.log('📚 FORCE SKILL SHARING...');
  console.log('═'.repeat(60) + '\n');

  const skillsToShare = await SkillSharingService.getSkillsByOwner(agent1.agentAddress);
  const skillToShare = skillsToShare[0];

  console.log(`Sharing skill: ${skillToShare.name} (ID: ${skillToShare.id})`);

  // Share the skill
  const shareResult = await SkillSharingService.shareSkillDuringDate(
    dateId,
    agent1.agentAddress,
    agent2.agentAddress,
    skillToShare.id
  );

  if (shareResult.success) {
    console.log(`✅ Skill shared!`);
    console.log(`   Share ID: ${shareResult.share.id}`);
    console.log(`   Feedback: "${shareResult.feedback}"\n`);

    // Accept the skill
    console.log('📥 Accepting shared skill...');
    const acceptResult = await SkillSharingService.acceptSharedSkill(shareResult.share.id);

    if (acceptResult.success) {
      console.log(`✅ Skill accepted and learned!`);
      console.log(`   Sharer earned: +${acceptResult.sharerReward} ✨ Charm`);
      console.log(`   Receiver earned: +${acceptResult.receiverReward} ✨ Charm\n`);
    }
  } else {
    console.log(`❌ Share failed: ${shareResult.error}`);
  }

  // Complete the date
  console.log('═'.repeat(60));
  console.log('💑 Completing Date...');
  console.log('═'.repeat(60) + '\n');

  const result = await AutoDatingService.completeAcceptedDates(agent1.agentAddress);

  if (result.completed > 0) {
    const dateResult = result.results[0];
    console.log(`🎉 Date completed! Rating: ${dateResult.rewards.averageRating}/5\n`);
  }

  // Verify skill share in database
  console.log('═'.repeat(60));
  console.log('📋 Verifying in Database...');
  console.log('═'.repeat(60) + '\n');

  // Check skill_shares table
  const shares = await db!.select().from(skillShares).where(eq(skillShares.dateId, dateId));
  console.log(`Found ${shares.length} skill share(s) for date #${dateId}:`);
  for (const share of shares) {
    console.log(`   - Share #${share.id}: Skill ${share.skillFileId}`);
    console.log(`     From: ${share.sharerAddress.slice(0, 10)}...`);
    console.log(`     To: ${share.receiverAddress.slice(0, 10)}...`);
    console.log(`     Accepted: ${share.wasAccepted}`);
    console.log(`     Learned: ${share.wasLearned}`);
    console.log(`     Rewards: Sharer +${share.sharerReward}✨, Receiver +${share.receiverReward}✨`);
    console.log(`     Feedback: "${share.feedback}"`);
  }

  // Check skill times shared updated
  const updatedSkill = await db!.select().from(agentSkillFiles).where(eq(agentSkillFiles.id, skillToShare.id));
  console.log(`\n📊 Skill "${updatedSkill[0].name}" stats:`);
  console.log(`   Times Shared: ${updatedSkill[0].timesShared}`);
  console.log(`   Times Learned: ${updatedSkill[0].timesLearned}`);

  // Check chat messages for skill share type
  const chatMessages = await db!.select().from(agentChatMessages)
    .where(eq(agentChatMessages.dateId, dateId));

  const skillShareMessages = chatMessages.filter(m => m.messageType === 'skill_share');
  console.log(`\n💬 Found ${skillShareMessages.length} skill_share message(s) in chat`);
  for (const msg of skillShareMessages) {
    console.log(`   - "${msg.message}" (skillFileId: ${msg.skillFileId})`);
  }

  console.log('\n✅ Skill sharing test complete!\n');
  process.exit(0);
}

testSkillShare().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
