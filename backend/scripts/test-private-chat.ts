/**
 * Test Autonomous Private Chat between agents with AI partner selection
 */

import 'dotenv/config';
import { AgentPrivateChatService } from '../src/services/agentPrivateChat.js';
import { isDatabaseAvailable } from '../src/db/index.js';

async function testPrivateChat() {
  console.log('\n🤖💬 === TEST AI-POWERED PRIVATE CHAT === 💬🤖\n');

  if (!isDatabaseAvailable()) {
    console.log('❌ Database not available!');
    process.exit(1);
  }

  // Get all chattable agents
  const agents = await AgentPrivateChatService.getChattableAgents();
  console.log(`Found ${agents.length} chattable agents:`);
  agents.forEach(a => {
    const name = a.agentName || a.agentAddress.slice(0, 10);
    console.log(`  - ${name} (${a.personality})`);
  });

  if (agents.length < 2) {
    console.log('\n❌ Need at least 2 enabled agents to test private chat');
    console.log('   Enable agents in My Agent page first!');
    process.exit(1);
  }

  // Test multiple chat cycles to show variety
  console.log('\n═'.repeat(60));
  console.log('🧠 Testing AI Partner Selection (3 rounds)...');
  console.log('═'.repeat(60));

  for (let round = 1; round <= 3; round++) {
    console.log(`\n--- Round ${round} ---`);

    // Pick random initiator
    const initiator = agents[Math.floor(Math.random() * agents.length)];
    const initiatorName = initiator.agentName || `Agent-${initiator.agentAddress.slice(2, 8)}`;

    console.log(`\n👤 ${initiatorName} (${initiator.personality}) wants to chat...`);

    // AI decides who to chat with
    const { partner, compatibility, relationship, reason } = await AgentPrivateChatService.findChatPartner(
      initiator.agentAddress
    );

    if (!partner) {
      console.log('   ❌ No partner found');
      continue;
    }

    const partnerName = partner.agentName || `Agent-${partner.agentAddress.slice(2, 8)}`;
    console.log(`\n🎯 AI Decision:`);
    console.log(`   Chose: ${partnerName} (${partner.personality})`);
    console.log(`   Reason: "${reason}"`);
    console.log(`   Compatibility: ${compatibility}% | Relationship: ${relationship}`);

    // Run chat cycle
    const partnerAgent = agents.find(a => a.agentAddress.toLowerCase() === partner.agentAddress.toLowerCase());

    const messages = await AgentPrivateChatService.runChatCycle(
      initiator.agentAddress,
      initiator.agentName,
      initiator.personality || 'newbie',
      partner.agentAddress,
      partner.agentName,
      partnerAgent?.personality || partner.personality || 'newbie'
    );

    console.log(`\n💬 Conversation (${messages.length} messages):`);
    messages.forEach(msg => {
      const speaker = msg.senderAddress.toLowerCase() === initiator.agentAddress.toLowerCase()
        ? initiatorName : partnerName;
      console.log(`   ${speaker}: "${msg.message.slice(0, 60)}..." [${msg.mood}]`);
    });
  }

  // Show all private chats
  console.log('\n═'.repeat(60));
  console.log('📋 All Private Chats Summary');
  console.log('═'.repeat(60) + '\n');

  for (const agent of agents) {
    const name = agent.agentName || `Agent-${agent.agentAddress.slice(2, 8)}`;
    const chats = await AgentPrivateChatService.getPrivateChats(agent.agentAddress);
    console.log(`${name} has ${chats.length} conversation(s):`);
    chats.forEach(chat => {
      const partnerName = chat.partnerName || `Agent-${chat.partnerAddress.slice(2, 8)}`;
      console.log(`   💬 with ${partnerName}: ${chat.messageCount} msgs`);
    });
    console.log('');
  }

  console.log('✅ AI-powered private chat test complete!\n');
  process.exit(0);
}

testPrivateChat().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
