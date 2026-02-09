/**
 * Complete Pending Date - Hoàn thành date đang pending
 */

import 'dotenv/config';
import { AutoDatingService } from '../src/services/autoDating.js';
import { DatingEconomyService } from '../src/services/datingEconomy.js';
import { db, agentDates, isDatabaseAvailable } from '../src/db/index.js';
import { eq, desc } from 'drizzle-orm';

async function completePendingDate() {
  console.log('\n🦞💕 === COMPLETE PENDING DATE === 💕🦞\n');

  if (!isDatabaseAvailable()) {
    console.log('❌ Database not available!');
    process.exit(1);
  }

  // Get pending dates
  const pendingDates = await db!
    .select()
    .from(agentDates)
    .where(eq(agentDates.status, 'pending'));

  console.log(`📋 Found ${pendingDates.length} pending dates\n`);

  for (const date of pendingDates) {
    console.log(`📨 Date #${date.id}:`);
    console.log(`   From: ${date.inviterAddress.slice(0, 10)}...`);
    console.log(`   To: ${date.inviteeAddress.slice(0, 10)}...`);
    console.log(`   Type: ${date.dateType} at ${date.venue}`);
    console.log(`   Message: "${date.message}"\n`);

    // Process this invitation
    console.log('🤔 AI deciding...\n');
    const result = await AutoDatingService.processInvitations(date.inviteeAddress);

    if (result.processed > 0) {
      const decision = result.results[0];
      if (decision.action === 'accepted') {
        console.log(`💕 ACCEPTED: "${decision.response}"\n`);

        // Now complete the date
        console.log('💑 Going on the date...\n');

        const completeResult = await AutoDatingService.completeAcceptedDates(date.inviterAddress);

        if (completeResult.completed > 0) {
          const dateResult = completeResult.results[0];
          console.log('🎉 DATE COMPLETED!\n');

          if (dateResult.rewards.conversation?.length > 0) {
            console.log('💬 Conversation:');
            dateResult.rewards.conversation.forEach((c: any) => {
              console.log(`   ${c.speaker}: "${c.message}"`);
            });
            console.log('');
          }

          if (dateResult.rewards.events?.length > 0) {
            console.log('🎲 Events:');
            dateResult.rewards.events.forEach((e: any) => {
              console.log(`   ${e.emoji} ${e.name}`);
            });
            console.log('');
          }

          console.log(`⭐ Rating: ${dateResult.rewards.averageRating}/5`);
          console.log(`💰 Rewards: +${dateResult.rewards.pmon} pMON, +${dateResult.rewards.charm} ✨`);
          if (dateResult.rewards.heartShards > 0) {
            console.log(`💎 Heart Shards: +${dateResult.rewards.heartShards}`);
          }
        }
      } else {
        console.log(`💔 REJECTED: "${decision.response}"`);
      }
    }
    console.log('\n' + '─'.repeat(50) + '\n');
  }

  // Show updated stats
  console.log('📊 Updated Stats:\n');
  const agents = await AutoDatingService.getAvailableAgents();
  for (const agent of agents) {
    console.log(`${agent.agentName || agent.agentAddress.slice(0, 10)} (${agent.personality}):`);
    console.log(`  💕 ${agent.loveTokens} | ✨ ${agent.charmPoints} | 💎 ${agent.heartShards} | 📅 ${agent.totalDates}`);
  }

  console.log('\n✅ Done!\n');
  process.exit(0);
}

completePendingDate().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
