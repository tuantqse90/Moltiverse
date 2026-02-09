// LobsterRobotNFT Contract ABI and Address
// Deployed on Monad Mainnet

export const LOBSTER_NFT_ADDRESS = '0x8d9DA2d734DeD78552136833B124E36d3a50EDfB' as const

export const LOBSTER_NFT_ABI = [
  // Read functions
  {
    inputs: [],
    name: 'mintPrice',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'mintingEnabled',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalMinted',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MAX_SUPPLY',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MAX_PER_WALLET',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'addr', type: 'address' }],
    name: 'canMint',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'addr', type: 'address' }],
    name: 'getMintCost',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'mintsPerWallet',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'tokenSeeds',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Write functions
  {
    inputs: [{ internalType: 'uint256', name: 'seed', type: 'uint256' }],
    name: 'mint',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'seed', type: 'uint256' },
    ],
    name: 'mintTo',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256[]', name: 'seeds', type: 'uint256[]' }],
    name: 'batchMint',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
      { indexed: true, internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'seed', type: 'uint256' },
    ],
    name: 'Minted',
    type: 'event',
  },
] as const

// Mint price in MON (wei)
export const MINT_PRICE_WEI = BigInt('10000000000000000000') // 10 MON

// pMON cost for minting
export const PMON_MINT_COST = 500
