import 'dotenv/config';
import { db, userAgentWallets } from '../src/db/index.js';
import { eq } from 'drizzle-orm';

async function enableAllAgents() {
  console.log('\n🤖 Enabling all agents with different personalities...\n');

  const personalities = ['triet_gia', 'hai_huoc', 'bi_an', 'flex_king', 'bo_lao'];

  const agents = await db!.select().from(userAgentWallets).where(eq(userAgentWallets.isEnabled, false));

  for (let i = 0; i < agents.length; i++) {
    const personality = personalities[i % personalities.length];
    const name = `Agent-${agents[i].agentAddress.slice(2, 8)}`;

    await db!.update(userAgentWallets)
      .set({
        isEnabled: true,
        autoChat: true,
        personality,
        agentName: name
      })
      .where(eq(userAgentWallets.id, agents[i].id));

    console.log(`✅ Enabled ${name} as ${personality}`);
  }

  // Show all agents now
  const allAgents = await db!.select().from(userAgentWallets);
  console.log('\n📋 All agents now:');
  allAgents.forEach(a => {
    const status = a.isEnabled ? '✅' : '❌';
    const name = a.agentName || a.agentAddress.slice(0, 10);
    console.log(`  ${status} ${name} (${a.personality})`);
  });

  console.log(`\n🎉 Enabled ${agents.length} agents! Total: ${allAgents.length} agents ready to chat.\n`);
  process.exit(0);
}

enableAllAgents().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
