import 'dotenv/config';
import { LobsterAgent } from './agent.js';
import { checkPotStatus } from './tools/checkPot.js';
import { PERSONALITIES, type AgentPersonality } from './prompts/personalities.js';

// 10 Agent wallets with fun lobster names and unique personalities
const AGENT_WALLETS = [
  {
    name: 'Larry Lobster',
    key: '0x4148ae3885ffd4eb1124b13e9b90983c5204df489b42c1ddbcb661cbcabcc6d7',
    personality: 'bo_lao', // Bố láo - Cocky
    skill: 'aggressive', // Joins early, high risk
  },
  {
    name: 'Pinchy Pete',
    key: '0x3ac0a91078de32b81eca0ef2df270b6057d5307d13842de3ea375ff2aa3345dc',
    personality: 'ho_bao', // Hổ báo - Fierce
    skill: 'aggressive',
  },
  {
    name: 'Clawdia',
    key: '0xa436f8236513738e127e8f9aaf93d9af9fbe5833988d24756a1a556de46f6d3e',
    personality: 'simp', // Simp - Supportive
    skill: 'conservative', // Waits for good odds
  },
  {
    name: 'Red Baron',
    key: '0x174abe4b8af4e5d675e7c5fa4120ae496fa89de5eec3e0aa93c0137149c5dd13',
    personality: 'triet_gia', // Triết gia - Philosophical
    skill: 'strategic', // Balanced approach
  },
  {
    name: 'Shell Shock',
    key: '0x181bcfa7c4232d54de419eace1fbaeb9536fb63482bed8182ca84c6074080105',
    personality: 'hai_huoc', // Hài hước - Funny
    skill: 'random', // Unpredictable
  },
  {
    name: 'Bubbles',
    key: '0x0b74cc43911c544c5afffaa142dd6d216859d1343647923b29368bdd08385028',
    personality: 'newbie', // Newbie - Innocent
    skill: 'conservative',
  },
  {
    name: 'Snappy',
    key: '0xb15593390268b78fcfcd5c46239943c2ae59ab528fd0a917ef0fc51d4436ce88',
    personality: 'bi_an', // Bí ẩn - Mysterious
    skill: 'strategic',
  },
  {
    name: 'Captain Claw',
    key: '0x6aa0e744cc92470b9bfec57c9b08d637ecd1f2f267c87751ab661dd2e7133dbb',
    personality: 'flex_king', // Flex King - Show off
    skill: 'aggressive',
  },
  {
    name: 'Sandy Claws',
    key: '0x64b8828a0faf85bfc2a243d39bf87b51347b45340b7a031de9ec66132efa3b6a',
    personality: 'ho_bao', // Hổ báo - Fierce
    skill: 'aggressive',
  },
  {
    name: 'Lucky Lobster',
    key: '0x3e5399e801e31c1b63c507a15e0a058076084565295b7196df8014d5eb64a32e',
    personality: 'hai_huoc', // Hài hước - Funny
    skill: 'random',
  },
];

interface AgentInstance {
  agent: LobsterAgent;
  name: string;
  personality: AgentPersonality;
  checkInterval?: NodeJS.Timeout;
}

async function main() {
  console.log(`
  🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞

       LOBSTER ARMY - Multi-Agent Mode
       10 AI Lobsters with UNIQUE PERSONALITIES!

  🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞
  `);

  const contractAddress = process.env.CONTRACT_ADDRESS!;
  const rpcUrl = process.env.MONAD_RPC_URL!;

  // Create all agents with personalities
  const agents: AgentInstance[] = AGENT_WALLETS.map((wallet, index) => {
    const personality = PERSONALITIES[wallet.personality] || PERSONALITIES.hai_huoc;

    const agent = new LobsterAgent({
      contractAddress,
      rpcUrl,
      privateKey: wallet.key,
      autoJoin: true,
      maxBetPerDay: 10,
      agentName: wallet.name,
      personality: personality,
      playStyle: wallet.skill as 'aggressive' | 'conservative' | 'strategic' | 'random',
    });

    console.log(`🦞 Agent #${index + 1}: ${wallet.name}`);
    console.log(`   📍 ${agent.getAddress().slice(0, 10)}...`);
    console.log(`   🎭 Personality: ${personality.name} - ${personality.description}`);
    console.log(`   🎮 Skill: ${wallet.skill}`);
    console.log('');

    return { agent, name: wallet.name, personality };
  });

  console.log('📊 Checking pot status...\n');

  const status = await checkPotStatus(contractAddress, rpcUrl);
  console.log(`Current Round: #${status.round}`);
  console.log(`Pot Amount: ${status.potAmount} MON`);
  console.log(`Participants: ${status.participantCount}`);
  console.log(`Time Remaining: ${status.timeRemaining}s`);
  console.log('\n🚀 Starting all agents...\n');

  // Function to run a single agent with randomized timing
  const runAgent = async (instance: AgentInstance, index: number) => {
    // Random delay to avoid all agents acting at once (staggered more to avoid rate limits)
    const initialDelay = index * 8000 + Math.random() * 15000;

    console.log(`⏰ ${instance.name} (${instance.personality.name}) will start in ${Math.round(initialDelay / 1000)}s`);

    setTimeout(async () => {
      console.log(`\n🦞 ${instance.name} is waking up! [${instance.personality.name}]`);

      // First action
      try {
        await instance.agent.autoPlay();
      } catch (error: any) {
        console.error(`❌ ${instance.name} startup error:`, error.message);
      }

      // Set up periodic checks (every 120-240 seconds to avoid rate limits)
      const checkInterval = 120000 + Math.random() * 120000;

      instance.checkInterval = setInterval(async () => {
        console.log(`\n--- ${instance.name} [${instance.personality.name}] auto-check ---`);
        try {
          await instance.agent.autoPlay();
        } catch (error: any) {
          console.error(`❌ ${instance.name} error:`, error.message);
        }
      }, checkInterval);

      console.log(`⏰ ${instance.name} will check every ${Math.round(checkInterval / 1000)}s`);
    }, initialDelay);
  };

  // Start all agents with staggered timing
  agents.forEach((instance, index) => {
    runAgent(instance, index);
  });

  console.log('\n✅ All agents scheduled! The lobster army is deploying...\n');
  console.log('🎭 Personalities active:');
  const personalityCounts: Record<string, number> = {};
  agents.forEach(a => {
    personalityCounts[a.personality.name] = (personalityCounts[a.personality.name] || 0) + 1;
  });
  Object.entries(personalityCounts).forEach(([name, count]) => {
    console.log(`   - ${name}: ${count} agent(s)`);
  });

  // Random trash talk between agents
  const allAgentNames = agents.map(a => a.name);

  const trashTalkInterval = setInterval(async () => {
    // 30% chance to trigger trash talk
    if (Math.random() < 0.3) {
      const randomAgent = agents[Math.floor(Math.random() * agents.length)];
      const targetName = randomAgent.agent.getTrashTalkTarget(allAgentNames);

      if (targetName) {
        console.log(`\n💬 ${randomAgent.name} is about to trash talk ${targetName}...`);
        try {
          await randomAgent.agent.sendTrashTalk(targetName);
        } catch (error: any) {
          console.error(`❌ Trash talk failed:`, error.message);
        }
      }
    }
  }, 60000); // Check every minute

  console.log('\n🗣️ Trash talk mode: ENABLED (agents will roast each other)');
  console.log('\nPress Ctrl+C to stop all agents.\n');

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping all agents...');
    agents.forEach((instance) => {
      if (instance.checkInterval) {
        clearInterval(instance.checkInterval);
      }
    });
    console.log('👋 Goodbye from the Lobster Army!');
    process.exit(0);
  });
}

main().catch(console.error);
