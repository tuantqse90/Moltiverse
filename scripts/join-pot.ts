import { ethers, Wallet, JsonRpcProvider, Contract } from 'ethers';

// Configuration
const RPC_URL = 'https://rpc.monad.xyz';
const CONTRACT_ADDRESS = '0x7c5c78c1156798C02136856b0A32D9D130fdEc3f';
const ENTRY_FEE = ethers.parseEther('0.01'); // 0.01 MON

// Contract ABI (only what we need)
const ABI = [
  'function joinPot() external payable',
  'function getCurrentRoundInfo() external view returns (uint256 round, uint256 startTime, uint256 endTime, uint256 potAmount, uint256 participantCount, bool isEnded)',
  'function getParticipants() external view returns (address[])',
  'function hasJoined(address) external view returns (bool)',
];

// Wallet private keys
const WALLETS = [
  { name: 'Wallet 1', privateKey: '0x4148ae3885ffd4eb1124b13e9b90983c5204df489b42c1ddbcb661cbcabcc6d7' },
  { name: 'Wallet 2', privateKey: '0x3ac0a91078de32b81eca0ef2df270b6057d5307d13842de3ea375ff2aa3345dc' },
  { name: 'Wallet 3', privateKey: '0xa436f8236513738e127e8f9aaf93d9af9fbe5833988d24756a1a556de46f6d3e' },
  { name: 'Wallet 4', privateKey: '0x174abe4b8af4e5d675e7c5fa4120ae496fa89de5eec3e0aa93c0137149c5dd13' },
  { name: 'Wallet 5', privateKey: '0x181bcfa7c4232d54de419eace1fbaeb9536fb63482bed8182ca84c6074080105' },
  { name: 'Wallet 6', privateKey: '0x0b74cc43911c544c5afffaa142dd6d216859d1343647923b29368bdd08385028' },
  { name: 'Wallet 7', privateKey: '0xb15593390268b78fcfcd5c46239943c2ae59ab528fd0a917ef0fc51d4436ce88' },
  { name: 'Wallet 8', privateKey: '0x6aa0e744cc92470b9bfec57c9b08d637ecd1f2f267c87751ab661dd2e7133dbb' },
  { name: 'Wallet 9', privateKey: '0x64b8828a0faf85bfc2a243d39bf87b51347b45340b7a031de9ec66132efa3b6a' },
  { name: 'Wallet 10', privateKey: '0x3e5399e801e31c1b63c507a15e0a058076084565295b7196df8014d5eb64a32e' },
];

async function main() {
  console.log('🦞🦞🦞 LobsterPot - Mass Join Script 🦞🦞🦞\n');
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`Network: Monad Mainnet\n`);

  const provider = new JsonRpcProvider(RPC_URL);
  const contract = new Contract(CONTRACT_ADDRESS, ABI, provider);

  // Get current round info
  const [round, startTime, endTime, potAmount, participantCount, isEnded] =
    await contract.getCurrentRoundInfo();

  console.log('=== Current Round Info ===');
  console.log(`Round: #${round}`);
  console.log(`Pot Amount: ${ethers.formatEther(potAmount)} MON`);
  console.log(`Participants: ${participantCount}`);
  console.log(`Is Ended: ${isEnded}`);
  console.log('');

  if (isEnded) {
    console.log('⚠️  Round has ended! Wait for new round or call drawWinner.');
    return;
  }

  // Join with each wallet
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const walletInfo of WALLETS) {
    const wallet = new Wallet(walletInfo.privateKey, provider);
    const contractWithSigner = contract.connect(wallet);

    try {
      // Check if already joined
      const hasJoined = await contract.hasJoined(wallet.address);
      if (hasJoined) {
        console.log(`⏭️  ${walletInfo.name} (${wallet.address.slice(0, 8)}...) - Already joined, skipping`);
        skipCount++;
        continue;
      }

      // Check balance
      const balance = await provider.getBalance(wallet.address);
      if (balance < ENTRY_FEE) {
        console.log(`❌ ${walletInfo.name} - Insufficient balance (${ethers.formatEther(balance)} MON)`);
        failCount++;
        continue;
      }

      // Join pot
      console.log(`🦞 ${walletInfo.name} (${wallet.address.slice(0, 8)}...) - Joining pot...`);
      const tx = await contractWithSigner.joinPot({ value: ENTRY_FEE });
      const receipt = await tx.wait();
      console.log(`   ✅ Success! TX: ${tx.hash.slice(0, 16)}...`);
      successCount++;

      // Small delay to avoid nonce issues
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error: any) {
      console.log(`   ❌ Failed: ${error.message?.slice(0, 50)}...`);
      failCount++;
    }
  }

  // Summary
  console.log('\n=== Summary ===');
  console.log(`✅ Joined: ${successCount}`);
  console.log(`⏭️  Skipped: ${skipCount}`);
  console.log(`❌ Failed: ${failCount}`);

  // Get updated round info
  const [, , , newPotAmount, newParticipantCount] = await contract.getCurrentRoundInfo();
  console.log(`\n💰 New Pot Amount: ${ethers.formatEther(newPotAmount)} MON`);
  console.log(`👥 Total Participants: ${newParticipantCount}`);

  // List participants
  const participants = await contract.getParticipants();
  console.log('\n=== Participants ===');
  participants.forEach((addr: string, i: number) => {
    console.log(`${i + 1}. ${addr}`);
  });

  console.log('\n🦞 Done! May the best lobster win! 🦞');
}

main().catch(console.error);
