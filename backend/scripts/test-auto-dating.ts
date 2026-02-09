/**
 * Test Auto-Dating - Xem AI agents date với nhau
 *
 * Run: npx tsx scripts/test-auto-dating.ts
 */

import 'dotenv/config';
import { AutoDatingService } from '../src/services/autoDating.js';
import { DatingEconomyService } from '../src/services/datingEconomy.js';
import { db, userAgentWallets, isDatabaseAvailable } from '../src/db/index.js';
import { eq, sql } from 'drizzle-orm';

async function testAutoDating() {
  console.log('\n🦞 === AUTO DATING TEST === 🦞\n');

  if (!isDatabaseAvailable()) {
    console.log('❌ Database not available!');
    process.exit(1);
  }

  // 1. Get all enabled agents
  console.log('📋 Getting available agents...\n');
  const agents = await AutoDatingService.getAvailableAgents();

  if (agents.length < 2) {
    console.log('❌ Need at least 2 enabled agents to test dating!');
    console.log('   Go to the frontend, create agents in "My Agent" and enable them.\n');
    process.exit(1);
  }

  console.log(`Found ${agents.length} agents:\n`);
  agents.forEach((a, i) => {
    console.log(`  ${i + 1}. ${a.agentName || a.agentAddress.slice(0, 10)}...`);
    console.log(`     Personality: ${a.personality || 'newbie'}`);
    console.log(`     Love Tokens: ${a.loveTokens || 0} 💕`);
    console.log(`     Charm Points: ${a.charmPoints || 0} ✨`);
    console.log(`     Total Dates: ${a.totalDates || 0}`);
    console.log('');
  });

  // 2. Give some love tokens to the first agent if they don't have any
  const testAgent = agents[0];
  if ((testAgent.loveTokens || 0) < 3) {
    console.log(`💕 Giving ${testAgent.agentName || testAgent.agentAddress.slice(0, 8)} some Love Tokens to date...\n`);
    await DatingEconomyService.awardLoveTokens(testAgent.agentAddress, 10, 'test_bonus');
  }

  // 3. Find best match using AI
  console.log('🔍 Finding best match using AI...\n');
  const matchResult = await AutoDatingService.findBestMatch(testAgent.agentAddress);

  if (!matchResult.match) {
    console.log(`❌ No match found: ${matchResult.reason}`);
    process.exit(1);
  }

  console.log(`💘 Best match found!`);
  console.log(`   Agent: ${matchResult.match.agentName || matchResult.match.agentAddress.slice(0, 10)}`);
  console.log(`   Personality: ${matchResult.match.personality}`);
  console.log(`   Compatibility: ${matchResult.match.compatibility}%`);
  console.log(`   Reason: ${matchResult.reason}\n`);

  // 4. Run full auto-dating cycle
  console.log('🚀 Running full auto-dating cycle...\n');
  console.log('─'.repeat(50));

  const cycleResult = await AutoDatingService.runFullCycle(testAgent.agentAddress);

  // 5. Show results
  console.log('\n📊 RESULTS:\n');

  // Invitations processed
  if (cycleResult.invitationsProcessed.processed > 0) {
    console.log(`📨 Processed ${cycleResult.invitationsProcessed.processed} invitations:`);
    console.log(`   ✅ Accepted: ${cycleResult.invitationsProcessed.accepted}`);
    console.log(`   ❌ Rejected: ${cycleResult.invitationsProcessed.rejected}`);
    cycleResult.invitationsProcessed.results.forEach(r => {
      console.log(`   - Date #${r.dateId}: ${r.action} - "${r.response}"`);
    });
    console.log('');
  }

  // Dates completed
  if (cycleResult.datesCompleted.completed > 0) {
    console.log(`💑 Completed ${cycleResult.datesCompleted.completed} dates:`);
    cycleResult.datesCompleted.results.forEach(r => {
      console.log(`   - Date #${r.dateId}:`);
      console.log(`     pMON earned: ${r.rewards.pmon}`);
      console.log(`     Charm earned: ${r.rewards.charm} ✨`);
      console.log(`     Heart Shards: ${r.rewards.heartShards} 💎`);
      console.log(`     Rating: ${r.rewards.averageRating} ⭐`);
      if (r.rewards.events?.length > 0) {
        console.log(`     Events: ${r.rewards.events.map((e: any) => e.name).join(', ')}`);
      }
      if (r.rewards.conversation?.length > 0) {
        console.log(`     💬 Conversation:`);
        r.rewards.conversation.slice(0, 4).forEach((c: any) => {
          console.log(`        ${c.speaker}: "${c.message}"`);
        });
      }
    });
    console.log('');
  }

  // New invitation
  if (cycleResult.newInvitation.success) {
    console.log(`💌 New invitation sent!`);
    console.log(`   To: ${cycleResult.newInvitation.match?.agentName || cycleResult.newInvitation.match?.agentAddress?.slice(0, 10)}`);
    console.log(`   Message: "${cycleResult.newInvitation.message}"`);
    console.log(`   Date ID: ${cycleResult.newInvitation.dateId}`);
  } else {
    console.log(`💌 No new invitation: ${cycleResult.newInvitation.error}`);
  }

  console.log('\n' + '─'.repeat(50));
  console.log('✅ Auto-dating test complete!\n');

  // 6. Show updated stats
  console.log('📈 Updated Agent Stats:\n');
  const updatedAgents = await AutoDatingService.getAvailableAgents();
  updatedAgents.slice(0, 3).forEach((a) => {
    console.log(`  ${a.agentName || a.agentAddress.slice(0, 10)}:`);
    console.log(`    💕 Love Tokens: ${a.loveTokens || 0}`);
    console.log(`    ✨ Charm: ${a.charmPoints || 0}`);
    console.log(`    💎 Heart Shards: ${a.heartShards || 0}`);
    console.log(`    📅 Dates: ${a.totalDates || 0}`);
    console.log('');
  });

  process.exit(0);
}

// Run with more detailed logging
testAutoDating().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
