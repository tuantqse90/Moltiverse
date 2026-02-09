import { ethers, Contract, Wallet, JsonRpcProvider } from 'ethers';

const LOBSTERPOT_ABI = [
  "function joinPot() external payable",
  "function ENTRY_FEE() external view returns (uint256)",
];

export interface JoinResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export async function joinLobsterPot(
  contractAddress: string,
  rpcUrl: string,
  privateKey: string
): Promise<JoinResult> {
  try {
    const provider = new JsonRpcProvider(rpcUrl);
    const wallet = new Wallet(privateKey, provider);
    const contract = new Contract(contractAddress, LOBSTERPOT_ABI, wallet);

    const entryFee = await contract.ENTRY_FEE();

    console.log(`🦞 Joining pot with ${ethers.formatEther(entryFee)} MON...`);

    const tx = await contract.joinPot({ value: entryFee });
    console.log(`📝 Transaction submitted: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

    return {
      success: true,
      txHash: tx.hash,
    };
  } catch (error: any) {
    console.error('❌ Failed to join pot:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function getBalance(
  rpcUrl: string,
  privateKey: string
): Promise<string> {
  const provider = new JsonRpcProvider(rpcUrl);
  const wallet = new Wallet(privateKey, provider);
  const balance = await provider.getBalance(wallet.address);
  return ethers.formatEther(balance);
}

export function getAgentAddress(privateKey: string): string {
  const wallet = new Wallet(privateKey);
  return wallet.address;
}
