/**
 * Test Full Dating Flow - Xem toàn bộ quá trình AI agents date
 *
 * Run: npx tsx scripts/test-full-dating-flow.ts
 */

import 'dotenv/config';
import { AutoDatingService } from '../src/services/autoDating.js';
import { DatingEconomyService } from '../src/services/datingEconomy.js';
import { db, agentDates, isDatabaseAvailable } from '../src/db/index.js';
import { eq, or, desc } from 'drizzle-orm';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function testFullDatingFlow() {
  console.log('\n🦞💕 === FULL DATING FLOW TEST === 💕🦞\n');

  if (!isDatabaseAvailable()) {
    console.log('❌ Database not available!');
    process.exit(1);
  }

  // 1. Get all enabled agents
  const agents = await AutoDatingService.getAvailableAgents();

  if (agents.length < 2) {
    console.log('❌ Need at least 2 enabled agents!');
    process.exit(1);
  }

  console.log(`👥 Found ${agents.length} agents ready to date:\n`);
  agents.forEach((a, i) => {
    console.log(`  ${i + 1}. ${a.agentName || a.agentAddress.slice(0, 10)} (${a.personality}) - 💕${a.loveTokens || 0}`);
  });

  // 2. Give agents some love tokens if needed
  console.log('\n💕 Ensuring agents have Love Tokens...\n');
  for (const agent of agents) {
    if ((agent.loveTokens || 0) < 5) {
      await DatingEconomyService.awardLoveTokens(agent.agentAddress, 10, 'test_bonus');
      console.log(`  Gave 10 💕 to ${agent.agentName || agent.agentAddress.slice(0, 8)}`);
    }
  }

  // 3. Agent 1 invites Agent 2
  console.log('\n' + '═'.repeat(60));
  console.log('📨 STEP 1: Agent 1 looks for a date...');
  console.log('═'.repeat(60) + '\n');

  const agent1 = agents[0];
  const inviteResult = await AutoDatingService.tryAutoDate(agent1.agentAddress);

  if (inviteResult.success) {
    console.log(`✅ ${agent1.agentName || agent1.agentAddress.slice(0, 8)} sent invitation!`);
    console.log(`   💌 To: ${inviteResult.match?.agentName || inviteResult.match?.agentAddress?.slice(0, 8)}`);
    console.log(`   💬 Message: "${inviteResult.message}"`);
    console.log(`   🎯 Compatibility: ${inviteResult.match?.compatibility}%`);
  } else {
    console.log(`❌ Failed: ${inviteResult.error}`);
  }

  await sleep(1000);

  // 4. Agent 2 responds to invitation
  console.log('\n' + '═'.repeat(60));
  console.log('📩 STEP 2: Agent 2 responds to invitation...');
  console.log('═'.repeat(60) + '\n');

  const agent2 = agents.find(a => a.agentAddress === inviteResult.match?.agentAddress) || agents[1];
  const responseResult = await AutoDatingService.processInvitations(agent2.agentAddress);

  if (responseResult.processed > 0) {
    console.log(`✅ ${agent2.agentName || agent2.agentAddress.slice(0, 8)} processed ${responseResult.processed} invitation(s):`);
    responseResult.results.forEach(r => {
      const emoji = r.action === 'accepted' ? '💕' : '💔';
      console.log(`   ${emoji} ${r.action.toUpperCase()}: "${r.response}"`);
    });
  } else {
    console.log('   No pending invitations to process');
  }

  await sleep(1000);

  // 5. Complete accepted dates
  if (responseResult.accepted > 0) {
    console.log('\n' + '═'.repeat(60));
    console.log('💑 STEP 3: Going on the date...');
    console.log('═'.repeat(60) + '\n');

    // Complete from both sides
    const complete1 = await AutoDatingService.completeAcceptedDates(agent1.agentAddress);
    const complete2 = await AutoDatingService.completeAcceptedDates(agent2.agentAddress);

    const allCompleted = [...complete1.results, ...complete2.results];

    if (allCompleted.length > 0) {
      for (const result of allCompleted) {
        console.log(`🎉 Date #${result.dateId} completed!\n`);

        if (result.rewards.events?.length > 0) {
          console.log(`   🎲 Random Events:`);
          result.rewards.events.forEach((e: any) => {
            console.log(`      ${e.emoji} ${e.name}`);
          });
          console.log('');
        }

        if (result.rewards.conversation?.length > 0) {
          console.log(`   💬 Date Conversation:`);
          result.rewards.conversation.forEach((c: any) => {
            const name = c.speaker === 'inviter' ? (agent1.agentName || 'Agent 1') : (agent2.agentName || 'Agent 2');
            console.log(`      ${name}: "${c.message}"`);
          });
          console.log('');
        }

        console.log(`   ⭐ Average Rating: ${result.rewards.averageRating}/5`);
        console.log(`   💰 Rewards:`);
        console.log(`      +${result.rewards.pmon} pMON`);
        console.log(`      +${result.rewards.charm} ✨ Charm`);
        if (result.rewards.heartShards > 0) {
          console.log(`      +${result.rewards.heartShards} 💎 Heart Shards`);
        }
      }
    } else {
      console.log('   No dates to complete (maybe rejected?)');
    }
  }

  // 6. Show final stats
  console.log('\n' + '═'.repeat(60));
  console.log('📊 FINAL STATS');
  console.log('═'.repeat(60) + '\n');

  const updatedAgents = await AutoDatingService.getAvailableAgents();
  for (const agent of updatedAgents.slice(0, 2)) {
    console.log(`${agent.agentName || agent.agentAddress.slice(0, 10)} (${agent.personality}):`);
    console.log(`  💕 Love Tokens: ${agent.loveTokens || 0}`);
    console.log(`  ✨ Charm Points: ${agent.charmPoints || 0}`);
    console.log(`  💎 Heart Shards: ${agent.heartShards || 0}`);
    console.log(`  📅 Total Dates: ${agent.totalDates || 0}`);
    console.log(`  ⭐ Avg Rating: ${agent.averageRating || '0'}`);
    console.log('');
  }

  // 7. Show recent dates
  console.log('📜 Recent Dates:\n');
  const recentDates = await db!
    .select()
    .from(agentDates)
    .orderBy(desc(agentDates.createdAt))
    .limit(5);

  for (const date of recentDates) {
    const statusEmoji = {
      pending: '⏳',
      accepted: '✅',
      rejected: '❌',
      completed: '💑',
      cancelled: '🚫',
    }[date.status || 'pending'] || '❓';

    console.log(`  ${statusEmoji} Date #${date.id}: ${date.dateType} at ${date.venue}`);
    console.log(`     ${date.inviterAddress.slice(0, 8)} → ${date.inviteeAddress.slice(0, 8)}`);
    if (date.averageRating) {
      console.log(`     Rating: ${date.averageRating}⭐ | Rewards: ${date.rewardsPmon} pMON`);
    }
    console.log('');
  }

  console.log('✅ Test complete!\n');
  process.exit(0);
}

testFullDatingFlow().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
