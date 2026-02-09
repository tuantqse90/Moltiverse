/**
 * Test Chat Saving - Demo skill sharing and chat history
 */

import 'dotenv/config';
import { DatingEconomyService } from '../src/services/datingEconomy.js';
import { AutoDatingService } from '../src/services/autoDating.js';
import { SkillSharingService } from '../src/services/skillSharing.js';
import { db, agentDates, agentChatMessages, isDatabaseAvailable } from '../src/db/index.js';
import { eq, desc } from 'drizzle-orm';

async function testChatSaving() {
  console.log('\n🦞💬 === TEST CHAT SAVING === 💬🦞\n');

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

  // First, let's create a skill for agent1
  console.log('📚 Creating test skill for agent 1...\n');
  const skillResult = await SkillSharingService.createSkillFile(
    agent1.agentAddress,
    'Trading Strategy 101',
    `# Trading Strategy 101

## Introduction
This is a basic trading strategy for beginners.

## Key Points
- Always use stop losses
- Never invest more than you can afford to lose
- DYOR (Do Your Own Research)

## Tips
1. Start small
2. Learn technical analysis
3. Stay patient
`,
    'trading',
    'A beginner-friendly trading guide'
  );

  if (skillResult.success) {
    console.log(`✅ Created skill: ${skillResult.skillFile.name}`);
    console.log(`   ID: ${skillResult.skillFile.skillId}\n`);
  }

  // Create and force-accept a date
  console.log('═'.repeat(60));
  console.log('📨 Creating Date...');
  console.log('═'.repeat(60) + '\n');

  // Ensure agent1 has love tokens
  await DatingEconomyService.awardLoveTokens(agent1.agentAddress, 10, 'test_bonus');

  // Create invitation
  const invitation = await DatingEconomyService.createDateInvitation(
    agent1.agentAddress,
    agent2.agentAddress,
    'dinner',
    'moonlight_garden',
    'Would you like to learn some trading strategies together? 📚'
  );

  if (!invitation.success) {
    console.log('❌ Failed:', invitation.error);
    process.exit(1);
  }

  const dateId = invitation.date.id;
  console.log(`✅ Date #${dateId} created\n`);

  // Force accept
  console.log('💕 Force accepting date...\n');
  await DatingEconomyService.respondToInvitation(dateId, true, "Sure, I'd love to learn!");

  // Now complete the date using AutoDatingService (which saves chat)
  console.log('═'.repeat(60));
  console.log('💑 Completing Date with Chat Saving...');
  console.log('═'.repeat(60) + '\n');

  const result = await AutoDatingService.completeAcceptedDates(agent1.agentAddress);

  if (result.completed > 0) {
    const dateResult = result.results[0];
    console.log('🎉 DATE COMPLETED!\n');

    // Show conversation
    console.log('💬 Generated Conversation:');
    if (dateResult.conversation?.length > 0) {
      const name1 = agent1.agentName || 'Agent 1';
      const name2 = agent2.agentName || 'Agent 2';
      dateResult.conversation.forEach((c: any) => {
        const speaker = c.speaker === 'inviter' ? name1 : name2;
        console.log(`   ${speaker}: "${c.message}"`);
      });
    }
    console.log('');

    // Show skills shared
    if (dateResult.skillsShared?.length > 0) {
      console.log('📚 Skills Shared:');
      dateResult.skillsShared.forEach((s: any) => {
        console.log(`   Skill #${s.skillId}: ${s.sharedBy.slice(0, 8)} → ${s.learnedBy.slice(0, 8)}`);
      });
      console.log('');
    }

    // Show rewards
    console.log(`⭐ Rating: ${dateResult.rewards.averageRating}/5`);
    console.log(`💰 Rewards: +${dateResult.rewards.pmon} pMON, +${dateResult.rewards.charm} ✨\n`);
  }

  // Verify chat was saved to database
  console.log('═'.repeat(60));
  console.log('📋 Verifying Chat in Database...');
  console.log('═'.repeat(60) + '\n');

  const savedMessages = await SkillSharingService.getDateChatHistory(dateId);
  console.log(`Found ${savedMessages.length} messages saved:\n`);

  for (const msg of savedMessages) {
    const isAgent1 = msg.senderAddress.toLowerCase() === agent1.agentAddress.toLowerCase();
    const senderName = isAgent1 ? (agent1.agentName || 'Agent 1') : (agent2.agentName || 'Agent 2');
    const moodEmoji = {
      happy: '😊',
      flirty: '😏',
      curious: '🤔',
      excited: '🎉',
    }[msg.mood || 'happy'] || '💬';
    console.log(`  ${moodEmoji} [${senderName}] (${msg.messageType}): "${msg.message}"`);
  }

  // Also check via API
  console.log('\n📡 Checking via API...\n');
  const response = await fetch(`http://localhost:3001/api/skill-files/chat/date/${dateId}`);
  const apiResult = await response.json();
  console.log(`API returned ${apiResult.messages?.length || 0} messages`);

  console.log('\n✅ Test complete!\n');
  process.exit(0);
}

testChatSaving().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
