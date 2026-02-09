/**
 * Force Successful Date - Demo a complete successful date with conversation
 */

import 'dotenv/config';
import { DatingEconomyService, DATE_TYPES, VENUES } from '../src/services/datingEconomy.js';
import { AutoDatingService } from '../src/services/autoDating.js';
import { db, agentDates, userAgentWallets, isDatabaseAvailable } from '../src/db/index.js';
import { eq } from 'drizzle-orm';

async function forceSuccessfulDate() {
  console.log('\n🦞💕 === FORCE SUCCESSFUL DATE DEMO === 💕🦞\n');

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

  // Ensure agent1 has love tokens
  await DatingEconomyService.awardLoveTokens(agent1.agentAddress, 10, 'demo_bonus');

  // Step 1: Create invitation
  console.log('═'.repeat(60));
  console.log('📨 STEP 1: Creating Date Invitation');
  console.log('═'.repeat(60) + '\n');

  const message = await AutoDatingService['generateInvitationMessage'](
    agent1.personality || 'newbie',
    agent2.personality || 'newbie',
    'dinner',
    'moonlight_garden'
  );

  const invitation = await DatingEconomyService.createDateInvitation(
    agent1.agentAddress,
    agent2.agentAddress,
    'dinner',
    'moonlight_garden',
    message
  );

  if (!invitation.success) {
    console.log('❌ Failed:', invitation.error);
    process.exit(1);
  }

  console.log(`✅ Invitation sent!`);
  console.log(`   Date ID: ${invitation.date.id}`);
  console.log(`   Type: Dinner at Moonlight Garden 🌙`);
  console.log(`   💬 "${message}"\n`);

  // Step 2: Force accept (bypass AI decision)
  console.log('═'.repeat(60));
  console.log('💕 STEP 2: Accepting the Invitation');
  console.log('═'.repeat(60) + '\n');

  const responseMessage = agent2.personality === 'simp'
    ? "OMG YES! This is literally the best day of my life! 🥰💕"
    : agent2.personality === 'ho_bao'
    ? "Fine, I'll give you a chance. Don't disappoint me. 😏"
    : "I'd love to! Let's do this! ✨";

  await DatingEconomyService.respondToInvitation(invitation.date.id, true, responseMessage);

  console.log(`✅ ${agent2.agentName || agent2.agentAddress.slice(0, 10)} accepted!`);
  console.log(`   💬 "${responseMessage}"\n`);

  // Step 3: Complete the date
  console.log('═'.repeat(60));
  console.log('💑 STEP 3: Going on the Date...');
  console.log('═'.repeat(60) + '\n');

  const dateResult = await DatingEconomyService.completeDate(
    invitation.date.id,
    4, // Inviter rating
    5  // Invitee rating
  );

  if (!dateResult.success) {
    console.log('❌ Failed:', dateResult.error);
    process.exit(1);
  }

  console.log('🎉 DATE COMPLETED!\n');

  // Show conversation
  if (dateResult.rewards?.conversation?.length > 0) {
    console.log('💬 Date Conversation:\n');
    const name1 = agent1.agentName || 'Agent 1';
    const name2 = agent2.agentName || 'Agent 2';

    dateResult.rewards.conversation.forEach((c: any) => {
      const speaker = c.speaker === 'inviter' ? name1 : name2;
      console.log(`   ${speaker}: "${c.message}"`);
    });
    console.log('');
  }

  // Show events
  if (dateResult.rewards?.events?.length > 0) {
    console.log('🎲 Random Events:\n');
    dateResult.rewards.events.forEach((e: any) => {
      console.log(`   ${e.emoji} ${e.name} - ${e.effect}`);
    });
    console.log('');
  }

  // Show rating & rewards
  console.log('═'.repeat(60));
  console.log('📊 Date Summary');
  console.log('═'.repeat(60) + '\n');

  console.log(`   ⭐ Average Rating: ${dateResult.rewards?.averageRating}/5`);
  console.log('');
  console.log('   💰 Rewards Earned:');
  console.log(`      +${dateResult.rewards?.pmon || 0} pMON (each)`);
  console.log(`      +${dateResult.rewards?.charm || 0} ✨ Charm Points (each)`);
  if ((dateResult.rewards?.heartShards || 0) > 0) {
    console.log(`      +${dateResult.rewards?.heartShards} 💎 Heart Shards!`);
  }
  console.log('');

  // Show updated agent stats
  console.log('═'.repeat(60));
  console.log('📈 Updated Agent Stats');
  console.log('═'.repeat(60) + '\n');

  const updatedAgents = await AutoDatingService.getAvailableAgents();
  for (const agent of updatedAgents) {
    const stats = await DatingEconomyService.getAgentDatingStats(agent.agentAddress);
    console.log(`${agent.agentName || agent.agentAddress.slice(0, 10)} (${agent.personality}):`);
    console.log(`  💕 Love Tokens: ${stats?.loveTokens || 0}`);
    console.log(`  ✨ Charm Points: ${stats?.charmPoints || 0}`);
    console.log(`  💎 Heart Shards: ${stats?.heartShards || 0}`);
    console.log(`  📅 Total Dates: ${stats?.totalDates || 0}`);
    console.log(`  ✅ Successful: ${stats?.successfulDates || 0}`);
    console.log('');
  }

  console.log('🦞 Dating Demo Complete! 🦞\n');
  process.exit(0);
}

forceSuccessfulDate().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
