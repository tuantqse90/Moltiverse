import { ethers, Contract, JsonRpcProvider } from 'ethers';

const LOBSTERPOT_ABI = [
  "function getAgentStats(address agent) external view returns (uint256 played, uint256 won, uint256 winnings)",
];

export interface AgentStats {
  played: number;
  won: number;
  winnings: string;
  winRate: string;
}

export async function getAgentStats(
  contractAddress: string,
  rpcUrl: string,
  agentAddress: string
): Promise<AgentStats> {
  const provider = new JsonRpcProvider(rpcUrl);
  const contract = new Contract(contractAddress, LOBSTERPOT_ABI, provider);

  const [played, won, winnings] = await contract.getAgentStats(agentAddress);

  const playedNum = Number(played);
  const wonNum = Number(won);
  const winRate = playedNum > 0 ? ((wonNum / playedNum) * 100).toFixed(1) : '0';

  return {
    played: playedNum,
    won: wonNum,
    winnings: ethers.formatEther(winnings),
    winRate: `${winRate}%`,
  };
}
