import 'dotenv/config';
import { LobsterAgent } from './agent.js';
import { checkPotStatus } from './tools/checkPot.js';
import * as readline from 'readline';

async function main() {
  // Validate environment
  const requiredEnvVars = ['DEEPSEEK_API_KEY', 'CONTRACT_ADDRESS', 'MONAD_RPC_URL', 'PRIVATE_KEY'];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`❌ Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }

  const config = {
    contractAddress: process.env.CONTRACT_ADDRESS!,
    rpcUrl: process.env.MONAD_RPC_URL!,
    privateKey: process.env.PRIVATE_KEY!,
    autoJoin: process.env.AUTO_JOIN === 'true',
    maxBetPerDay: parseInt(process.env.MAX_BET_PER_DAY || '10'),
  };

  const agent = new LobsterAgent(config);

  console.log(`
  🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞

       LOBSTERBOT - AI Lottery Agent
       Powered by DeepSeek

  🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞🦞
  `);
  console.log(`📍 Agent Address: ${agent.getAddress()}`);
  console.log(`🎰 Contract: ${config.contractAddress}`);
  console.log(`🔗 RPC: ${config.rpcUrl}`);
  console.log(`📊 Max bets per day: ${config.maxBetPerDay}`);
  console.log('');

  // Check current pot status
  try {
    const status = await checkPotStatus(config.contractAddress, config.rpcUrl);
    console.log(`📊 Current Round: #${status.round}`);
    console.log(`💰 Pot Amount: ${status.potAmount} MON`);
    console.log(`👥 Participants: ${status.participantCount}`);
    console.log(`⏱️  Time Remaining: ${status.timeRemaining}s`);
    console.log('');
  } catch (error) {
    console.log('⚠️  Could not fetch pot status (contract may not be deployed yet)');
    console.log('');
  }

  // Interactive mode or auto mode
  const mode = process.argv[2];

  if (mode === '--auto') {
    // Auto-play mode
    console.log('🤖 Running in AUTO mode...\n');
    await agent.autoPlay();

    // Set up periodic checks
    const checkInterval = parseInt(process.env.CHECK_INTERVAL || '60000'); // 1 minute default
    console.log(`\n⏰ Will check again in ${checkInterval / 1000} seconds...`);

    setInterval(async () => {
      console.log('\n--- Auto check ---');
      await agent.autoPlay();
    }, checkInterval);

  } else {
    // Interactive chat mode
    console.log('💬 Running in INTERACTIVE mode');
    console.log('Type your message to chat with LobsterBot, or "quit" to exit.\n');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const prompt = () => {
      rl.question('You: ', async (input) => {
        const trimmed = input.trim();

        if (trimmed.toLowerCase() === 'quit' || trimmed.toLowerCase() === 'exit') {
          console.log('\n🦞 Goodbye! May the pot be ever in your favor!');
          rl.close();
          process.exit(0);
        }

        if (!trimmed) {
          prompt();
          return;
        }

        try {
          const response = await agent.chat(trimmed);
          console.log(`\n🦞 LobsterBot: ${response}\n`);
        } catch (error: any) {
          console.error(`\n❌ Error: ${error.message}\n`);
        }

        prompt();
      });
    };

    prompt();
  }
}

main().catch(console.error);
