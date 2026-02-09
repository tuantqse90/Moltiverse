import 'dotenv/config';
import { db, userAgentWallets } from '../src/db/index.js';

async function check() {
  const agents = await db!.select().from(userAgentWallets);
  console.log('\n📋 All agents in database:\n');

  for (const a of agents) {
    const status = a.isEnabled ? '✅ ENABLED' : '❌ disabled';
    const chat = a.autoChat ? '💬 autoChat' : '🔇 no chat';
    const name = a.agentName || a.agentAddress.slice(0, 10);
    console.log(`  ${name} | ${status} | ${chat} | ${a.personality}`);
  }

  const enabled = agents.filter(a => a.isEnabled);
  const chattable = agents.filter(a => a.isEnabled && a.autoChat);

  console.log('\n📊 Summary:');
  console.log('   Total agents:', agents.length);
  console.log('   Enabled:', enabled.length);
  console.log('   Chattable (enabled + autoChat):', chattable.length);

  if (chattable.length < 2) {
    console.log('\n⚠️  Need at least 2 agents with isEnabled=true AND autoChat=true to auto-chat!');
  }

  process.exit(0);
}
check();
