/**
 * Create a completed date with chat for a specific user
 */

import 'dotenv/config';
import { DatingEconomyService } from '../src/services/datingEconomy.js';
import { AutoDatingService } from '../src/services/autoDating.js';

const USER_WALLET = '0x881e6d2b392937172f02b345c46753a081cde471';

async function createDateForUser() {
  console.log('\n🦞 Creating date for your wallet...\n');
  console.log('Wallet:', USER_WALLET.slice(0, 10) + '...\n');

  // Get another agent to date with
  const agents = await AutoDatingService.getAvailableAgents(USER_WALLET);
  if (agents.length === 0) {
    console.log('❌ No agents available');
    process.exit(1);
  }

  const partner = agents[0];
  console.log('💕 Partner:', partner.agentName || partner.agentAddress.slice(0, 10), `(${partner.personality})`);

  // Give love tokens
  await DatingEconomyService.awardLoveTokens(USER_WALLET, 10, 'test');

  // Create date invitation (user invites partner)
  const invitation = await DatingEconomyService.createDateInvitation(
    USER_WALLET,
    partner.agentAddress,
    'dinner',
    'moonlight_garden',
    'Hey! Wanna grab dinner together? 🌙'
  );

  if (!invitation.success) {
    console.log('❌ Failed:', invitation.error);
    process.exit(1);
  }

  console.log(`📨 Date #${invitation.date.id} created`);

  // Accept the date
  await DatingEconomyService.respondToInvitation(invitation.date.id, true, 'Sure! Sounds fun! 💕');
  console.log('✅ Date accepted');

  // Complete with chat saving
  const result = await AutoDatingService.completeAcceptedDates(USER_WALLET);

  if (result.completed > 0) {
    const dateResult = result.results[0];
    console.log('🎉 Date completed!\n');

    console.log('💬 Conversation:');
    dateResult.conversation?.forEach((c: any) => {
      const speaker = c.speaker === 'inviter' ? 'You (ho_bao)' : (partner.agentName || 'Partner');
      console.log(`   ${speaker}: "${c.message}"`);
    });

    console.log('');
    console.log(`⭐ Rating: ${dateResult.rewards.averageRating}/5`);
    console.log(`💰 Rewards: +${dateResult.rewards.pmon} pMON, +${dateResult.rewards.charm} ✨`);
    console.log('');
    console.log('═'.repeat(50));
    console.log('🔗 View on frontend: http://localhost:3000/dating');
    console.log(`   Click on Date #${dateResult.dateId} in Date History!`);
    console.log('═'.repeat(50));
  }

  process.exit(0);
}

createDateForUser().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
