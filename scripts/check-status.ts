import { ethers, JsonRpcProvider, Contract } from 'ethers';

const RPC_URL = 'https://rpc.monad.xyz';
const CONTRACT_ADDRESS = '0x7c5c78c1156798C02136856b0A32D9D130fdEc3f';

const ABI = [
  'function getCurrentRoundInfo() external view returns (uint256 round, uint256 startTime, uint256 endTime, uint256 potAmount, uint256 participantCount, bool isEnded)',
  'function getParticipants() external view returns (address[])',
  'function getTimeRemaining() external view returns (uint256)',
  'function getRoundInfo(uint256) external view returns (address winner, uint256 prize, uint256 participantCount)',
];

async function main() {
  console.log('🦞 LobsterPot Status Checker\n');

  const provider = new JsonRpcProvider(RPC_URL);
  const contract = new Contract(CONTRACT_ADDRESS, ABI, provider);

  const [round, startTime, endTime, potAmount, participantCount, isEnded] =
    await contract.getCurrentRoundInfo();
  const timeRemaining = await contract.getTimeRemaining();
  const participants = await contract.getParticipants();

  console.log('=== Current Round ===');
  console.log(`Round: #${round}`);
  console.log(`Pot Amount: ${ethers.formatEther(potAmount)} MON`);
  console.log(`Participants: ${participantCount}`);
  console.log(`Time Remaining: ${timeRemaining} seconds (${Math.floor(Number(timeRemaining) / 60)}m ${Number(timeRemaining) % 60}s)`);
  console.log(`Is Ended: ${isEnded}`);

  if (participants.length > 0) {
    console.log('\n=== Participants ===');
    participants.forEach((addr: string, i: number) => {
      console.log(`${i + 1}. ${addr}`);
    });
  }

  // Check previous round winner
  if (Number(round) > 1) {
    try {
      const [winner, prize, prevCount] = await contract.getRoundInfo(Number(round) - 1);
      if (winner !== ethers.ZeroAddress) {
        console.log('\n=== Previous Round Winner ===');
        console.log(`Round: #${Number(round) - 1}`);
        console.log(`Winner: ${winner}`);
        console.log(`Prize: ${ethers.formatEther(prize)} MON`);
        console.log(`Participants: ${prevCount}`);
      }
    } catch (e) {
      // No previous round
    }
  }

  console.log('\n🦞 Check complete!');
}

main().catch(console.error);
