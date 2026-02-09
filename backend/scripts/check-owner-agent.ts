import 'dotenv/config';
import { db, userAgentWallets } from '../src/db/index.js';

async function check() {
  const agents = await db!.select().from(userAgentWallets);
  console.log('\n📋 Owner vs Agent addresses:\n');

  for (const a of agents) {
    console.log('Owner:  ', a.ownerAddress);
    console.log('Agent:  ', a.agentAddress);
    console.log('Name:   ', a.agentName);
    console.log('Enabled:', a.isEnabled);
    console.log('---');
  }
  process.exit(0);
}
check();
