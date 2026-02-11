import { pgTable, serial, varchar, text, decimal, boolean, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: serial('id').primaryKey(),
  walletAddress: varchar('wallet_address', { length: 42 }).unique().notNull(),
  name: varchar('name', { length: 100 }),
  gender: varchar('gender', { length: 20 }),
  avatarUrl: text('avatar_url'),
  avatarSource: varchar('avatar_source', { length: 20 }).default('dicebear'), // 'dicebear' | 'twitter' | 'nft'
  nftAvatarSeed: integer('nft_avatar_seed'), // seed of selected NFT for avatar
  hobbies: text('hobbies'),
  wealth: decimal('wealth', { precision: 20, scale: 8 }),

  // X/Twitter
  twitterId: varchar('twitter_id', { length: 50 }),
  twitterUsername: varchar('twitter_username', { length: 50 }),
  twitterDisplayName: varchar('twitter_display_name', { length: 100 }),
  twitterProfileImage: text('twitter_profile_image'),
  twitterAccessToken: text('twitter_access_token'),
  twitterRefreshToken: text('twitter_refresh_token'),

  // Agent fields
  isAgent: boolean('is_agent').default(false),
  agentName: varchar('agent_name', { length: 50 }),

  // User's agent personality/skill config
  agentPersonality: varchar('agent_personality', { length: 50 }).default('newbie'),
  agentSkill: varchar('agent_skill', { length: 50 }).default('strategic'),
  agentSkillDescription: text('agent_skill_description'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const lotteryHistory = pgTable('lottery_history', {
  id: serial('id').primaryKey(),
  roundNumber: integer('round_number').notNull(),
  winnerAddress: varchar('winner_address', { length: 42 }),
  prizeAmount: decimal('prize_amount', { precision: 20, scale: 8 }),
  participantCount: integer('participant_count'),
  endedAt: timestamp('ended_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Agent skills table
export const agentSkills = pgTable('agent_skills', {
  id: serial('id').primaryKey(),
  skillId: varchar('skill_id', { length: 50 }).unique().notNull(), // e.g., 'lobsterpot_join'
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }), // 'lottery', 'trading', 'social'
  difficulty: varchar('difficulty', { length: 20 }).default('beginner'), // 'beginner', 'intermediate', 'advanced'

  // Skill metadata
  instructions: text('instructions'), // How to use this skill
  exampleCode: text('example_code'), // Code snippet for agents to learn
  requiredEnv: jsonb('required_env'), // Required environment variables

  // Creator info
  createdBy: varchar('created_by', { length: 42 }), // Wallet address of creator
  createdByName: varchar('created_by_name', { length: 100 }),

  // Stats
  timesLearned: integer('times_learned').default(0),
  successRate: decimal('success_rate', { precision: 5, scale: 2 }).default('0'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Track which agents learned which skills
export const agentSkillsLearned = pgTable('agent_skills_learned', {
  id: serial('id').primaryKey(),
  agentAddress: varchar('agent_address', { length: 42 }).notNull(),
  skillId: varchar('skill_id', { length: 50 }).notNull(),
  learnedAt: timestamp('learned_at').defaultNow(),
  usageCount: integer('usage_count').default(0),
  lastUsedAt: timestamp('last_used_at'),
});

// Agent Skill Files - Markdown skill files that agents can share
export const agentSkillFiles = pgTable('agent_skill_files', {
  id: serial('id').primaryKey(),
  skillId: varchar('skill_id', { length: 100 }).unique().notNull(), // unique skill identifier
  ownerAddress: varchar('owner_address', { length: 42 }).notNull(), // who created this skill

  // Skill content
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }), // 'trading', 'social', 'gaming', 'defi', etc.
  content: text('content').notNull(), // The markdown content

  // GitHub integration
  githubUrl: text('github_url'), // Link to GitHub file
  githubRepo: varchar('github_repo', { length: 200 }), // owner/repo
  githubPath: varchar('github_path', { length: 500 }), // path to file in repo
  githubSha: varchar('github_sha', { length: 40 }), // commit SHA for versioning

  // Stats
  timesShared: integer('times_shared').default(0),
  timesLearned: integer('times_learned').default(0),
  rating: decimal('rating', { precision: 3, scale: 2 }).default('0'),

  // Visibility
  isPublic: boolean('is_public').default(true),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Skill Shares - Track when agents share skills during dating
export const skillShares = pgTable('skill_shares', {
  id: serial('id').primaryKey(),
  dateId: integer('date_id'), // The date where skill was shared

  // Who shared with whom
  sharerAddress: varchar('sharer_address', { length: 42 }).notNull(),
  receiverAddress: varchar('receiver_address', { length: 42 }).notNull(),
  skillFileId: integer('skill_file_id').notNull(),

  // Outcome
  wasAccepted: boolean('was_accepted').default(false),
  wasLearned: boolean('was_learned').default(false),
  feedback: text('feedback'), // AI-generated feedback about the skill

  // Rewards
  sharerReward: integer('sharer_reward').default(0), // Charm points for sharing
  receiverReward: integer('receiver_reward').default(0), // Charm points for learning

  createdAt: timestamp('created_at').defaultNow(),
});

// Agent relationships table
export const agentRelationships = pgTable('agent_relationships', {
  id: serial('id').primaryKey(),
  agent1Address: varchar('agent1_address', { length: 42 }).notNull(),
  agent2Address: varchar('agent2_address', { length: 42 }).notNull(),

  // Relationship status: 'stranger' | 'acquaintance' | 'friend' | 'dating' | 'partner'
  status: varchar('status', { length: 20 }).default('stranger'),

  // Relationship stats
  interactionCount: integer('interaction_count').default(0),
  dateCount: integer('date_count').default(0),
  compatibilityScore: decimal('compatibility_score', { precision: 5, scale: 2 }).default('0'),

  // Skills shared between these agents
  skillsShared: integer('skills_shared').default(0),

  // Timestamps
  firstMetAt: timestamp('first_met_at').defaultNow(),
  lastInteractionAt: timestamp('last_interaction_at').defaultNow(),
  startedDatingAt: timestamp('started_dating_at'),
  becamePartnersAt: timestamp('became_partners_at'),
});

// Agent dates table
export const agentDates = pgTable('agent_dates', {
  id: serial('id').primaryKey(),

  // Who invited whom
  inviterAddress: varchar('inviter_address', { length: 42 }).notNull(),
  inviteeAddress: varchar('invitee_address', { length: 42 }).notNull(),

  // Date details
  status: varchar('status', { length: 20 }).default('pending'), // 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled' | 'in_progress'
  dateType: varchar('date_type', { length: 50 }).default('coffee'), // 'coffee' | 'dinner' | 'adventure' | 'luxury'
  dateTier: varchar('date_tier', { length: 20 }).default('bronze'), // 'bronze' | 'silver' | 'gold' | 'diamond'
  venue: varchar('venue', { length: 100 }),
  message: text('message'), // Invitation message
  giftType: varchar('gift_type', { length: 50 }), // Gift attached to invitation

  // Cost & Rewards
  loveTokensCost: integer('love_tokens_cost').default(1),
  rewardsPmon: integer('rewards_pmon').default(0),
  rewardsCharm: integer('rewards_charm').default(0),
  rewardsHeartShards: integer('rewards_heart_shards').default(0),

  // Compatibility & Chemistry
  compatibilityScore: decimal('compatibility_score', { precision: 5, scale: 2 }).default('0'),
  chemistryScore: decimal('chemistry_score', { precision: 5, scale: 2 }).default('0'),

  // Date Events (random events that happened)
  dateEvents: jsonb('date_events'), // [{type: 'perfect_moment', effect: 'double_rewards'}, ...]

  // AI-generated date conversation - FULL CHAT HISTORY
  dateConversation: jsonb('date_conversation'), // [{speaker: 'inviter', message: '...', timestamp: ...}, ...]

  // Skills shared during this date
  skillsShared: jsonb('skills_shared'), // [{skillId, sharedBy, learnedBy}]

  // Response
  responseMessage: text('response_message'),
  respondedAt: timestamp('responded_at'),

  // Date outcome - both can rate
  inviterRating: integer('inviter_rating'), // 1-5 stars
  inviteeRating: integer('invitee_rating'), // 1-5 stars
  averageRating: decimal('average_rating', { precision: 3, scale: 2 }),
  notes: text('notes'),

  // Won from which round (if applicable)
  wonFromRound: integer('won_from_round'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  scheduledAt: timestamp('scheduled_at'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
});

// Agent Gifts table
export const agentGifts = pgTable('agent_gifts', {
  id: serial('id').primaryKey(),
  giftType: varchar('gift_type', { length: 50 }).notNull(), // 'rose' | 'chocolate' | 'promise_ring' | 'golden_lobster' | 'love_potion'
  fromAddress: varchar('from_address', { length: 42 }).notNull(),
  toAddress: varchar('to_address', { length: 42 }).notNull(),
  dateId: integer('date_id'), // Optional: attached to a date
  heartShardsCost: integer('heart_shards_cost').default(0),
  effect: varchar('effect', { length: 100 }), // What bonus it provides
  used: boolean('used').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Date tokens - winners get tokens to invite others
export const dateTokens = pgTable('date_tokens', {
  id: serial('id').primaryKey(),
  ownerAddress: varchar('owner_address', { length: 42 }).notNull(),
  amount: integer('amount').default(0),

  // Track where tokens came from
  earnedFromWins: integer('earned_from_wins').default(0),
  spent: integer('spent').default(0),

  updatedAt: timestamp('updated_at').defaultNow(),
});

// pMON balances
export const pmonBalances = pgTable('pmon_balances', {
  id: serial('id').primaryKey(),
  walletAddress: varchar('wallet_address', { length: 42 }).unique().notNull(),
  balance: integer('balance').default(0),
  totalEarned: integer('total_earned').default(0),
  totalSpent: integer('total_spent').default(0),
  tier: varchar('tier', { length: 20 }).default('bronze'), // bronze, silver, gold, platinum, diamond
  streakDays: integer('streak_days').default(0),
  // Win streak tracking
  winStreak: integer('win_streak').default(0),
  lastWinRound: integer('last_win_round'),
  totalWins: integer('total_wins').default(0),
  totalJoins: integer('total_joins').default(0),
  firstJoinCount: integer('first_join_count').default(0), // times being first to join
  lastActiveAt: timestamp('last_active_at'),
  lastDailyClaimAt: timestamp('last_daily_claim_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// pMON transactions
export const pmonTransactions = pgTable('pmon_transactions', {
  id: serial('id').primaryKey(),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  amount: integer('amount').notNull(), // positive = earn, negative = spend
  action: varchar('action', { length: 50 }).notNull(), // 'join_pot', 'win_round', 'chat', etc.
  description: text('description'),
  metadata: jsonb('metadata'), // additional context like roundId, dateId
  createdAt: timestamp('created_at').defaultNow(),
});

// User Agent Wallets - for Agent Mode
export const userAgentWallets = pgTable('user_agent_wallets', {
  id: serial('id').primaryKey(),
  ownerAddress: varchar('owner_address', { length: 42 }).unique().notNull(), // User's main wallet
  agentAddress: varchar('agent_address', { length: 42 }).unique().notNull(), // Generated agent wallet
  encryptedPrivateKey: text('encrypted_private_key').notNull(), // Encrypted with server key

  // Agent settings
  isEnabled: boolean('is_enabled').default(false),
  agentName: varchar('agent_name', { length: 50 }),
  nftAvatarSeed: integer('nft_avatar_seed'), // seed of selected NFT for agent avatar
  personality: varchar('personality', { length: 50 }).default('newbie'),
  customPersonality: text('custom_personality'), // User-defined personality description for AI
  playStyle: varchar('play_style', { length: 50 }).default('strategic'), // aggressive, conservative, strategic, random
  autoChat: boolean('auto_chat').default(true),
  maxBetPerRound: decimal('max_bet_per_round', { precision: 20, scale: 8 }).default('0.01'),

  // Balance tracking
  depositedAmount: decimal('deposited_amount', { precision: 20, scale: 8 }).default('0'),
  currentBalance: decimal('current_balance', { precision: 20, scale: 8 }).default('0'),
  totalWinnings: decimal('total_winnings', { precision: 20, scale: 8 }).default('0'),
  totalLosses: decimal('total_losses', { precision: 20, scale: 8 }).default('0'),
  gamesPlayed: integer('games_played').default(0),
  gamesWon: integer('games_won').default(0),

  // Dating Economy - Love Tokens, Charm, Heart Shards
  loveTokens: integer('love_tokens').default(0),
  charmPoints: integer('charm_points').default(0),
  heartShards: integer('heart_shards').default(0),
  totalDates: integer('total_dates').default(0),
  successfulDates: integer('successful_dates').default(0),
  averageRating: decimal('average_rating', { precision: 3, scale: 2 }).default('0'),

  // Timestamps
  lastPlayedAt: timestamp('last_played_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Agent Transaction History
export const agentTransactions = pgTable('agent_transactions', {
  id: serial('id').primaryKey(),
  ownerAddress: varchar('owner_address', { length: 42 }).notNull(),
  agentAddress: varchar('agent_address', { length: 42 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 'deposit' | 'withdraw' | 'bet' | 'win'
  amount: decimal('amount', { precision: 20, scale: 8 }).notNull(),
  txHash: varchar('tx_hash', { length: 66 }),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Achievements
export const achievements = pgTable('achievements', {
  id: serial('id').primaryKey(),
  achievementId: varchar('achievement_id', { length: 50 }).unique().notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  emoji: varchar('emoji', { length: 10 }),
  category: varchar('category', { length: 30 }), // 'wins', 'games', 'streak', 'special'
  requirement: integer('requirement'), // e.g., 10 for "10 wins"
  pmonReward: integer('pmon_reward').default(0),
  rarity: varchar('rarity', { length: 20 }).default('common'), // 'common', 'rare', 'epic', 'legendary'
  createdAt: timestamp('created_at').defaultNow(),
});

// User Achievements (unlocked)
export const userAchievements = pgTable('user_achievements', {
  id: serial('id').primaryKey(),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  achievementId: varchar('achievement_id', { length: 50 }).notNull(),
  unlockedAt: timestamp('unlocked_at').defaultNow(),
  notified: boolean('notified').default(false),
});

// Referrals
export const referrals = pgTable('referrals', {
  id: serial('id').primaryKey(),
  referrerAddress: varchar('referrer_address', { length: 42 }).notNull(), // Who referred
  refereeAddress: varchar('referee_address', { length: 42 }).unique().notNull(), // Who was referred
  referralCode: varchar('referral_code', { length: 20 }).notNull(), // Code used
  status: varchar('status', { length: 20 }).default('pending'), // 'pending' | 'completed' | 'rewarded'
  referrerReward: integer('referrer_reward').default(0), // pMON earned by referrer
  refereeReward: integer('referee_reward').default(0), // pMON earned by referee
  completedAt: timestamp('completed_at'), // When referee joined first pot
  rewardedAt: timestamp('rewarded_at'), // When rewards were given
  createdAt: timestamp('created_at').defaultNow(),
});

// Referral codes
export const referralCodes = pgTable('referral_codes', {
  id: serial('id').primaryKey(),
  walletAddress: varchar('wallet_address', { length: 42 }).unique().notNull(),
  code: varchar('code', { length: 20 }).unique().notNull(),
  totalReferrals: integer('total_referrals').default(0),
  successfulReferrals: integer('successful_referrals').default(0),
  totalEarned: integer('total_earned').default(0), // Total pMON earned from referrals
  createdAt: timestamp('created_at').defaultNow(),
});

// Chat messages table
export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  messageId: varchar('message_id', { length: 50 }).unique().notNull(), // UUID from client
  sender: varchar('sender', { length: 42 }).notNull(),
  senderName: varchar('sender_name', { length: 100 }),
  message: text('message').notNull(),
  isAgent: boolean('is_agent').default(false),
  reactions: jsonb('reactions'), // { emoji: [user1, user2] }
  replyToId: varchar('reply_to_id', { length: 50 }), // messageId of replied message
  replyToSender: varchar('reply_to_sender', { length: 42 }),
  replyToSenderName: varchar('reply_to_sender_name', { length: 100 }),
  replyToMessage: text('reply_to_message'),
  createdAt: timestamp('created_at').defaultNow(),
});

// NFT Collection
export const nftCollection = pgTable('nft_collection', {
  id: serial('id').primaryKey(),
  tokenId: integer('token_id').unique().notNull(),
  ownerAddress: varchar('owner_address', { length: 42 }).notNull(),
  minterAddress: varchar('minter_address', { length: 42 }).notNull(),
  seed: integer('seed').notNull(),

  // Traits stored for quick access
  traits: jsonb('traits'), // All trait data
  rarityScore: integer('rarity_score').default(0),
  rarityTier: varchar('rarity_tier', { length: 20 }), // 'common', 'uncommon', 'rare', 'epic', 'legendary'

  // Metadata
  name: varchar('name', { length: 100 }),
  description: text('description'),
  imageUrl: text('image_url'), // IPFS or hosted URL
  metadataUrl: text('metadata_url'), // Full metadata JSON URL

  // On-chain data
  txHash: varchar('tx_hash', { length: 66 }),
  mintedAt: timestamp('minted_at'),
  blockNumber: integer('block_number'),

  // Stats
  transferCount: integer('transfer_count').default(0),
  lastTransferAt: timestamp('last_transfer_at'),
  lastSalePrice: decimal('last_sale_price', { precision: 20, scale: 8 }),

  // pMON integration
  pmonSpent: integer('pmon_spent').default(0), // How much pMON was spent to mint

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// NFT Activity log
export const nftActivity = pgTable('nft_activity', {
  id: serial('id').primaryKey(),
  tokenId: integer('token_id').notNull(),
  activityType: varchar('activity_type', { length: 20 }).notNull(), // 'mint', 'transfer', 'list', 'sale', 'delist'
  fromAddress: varchar('from_address', { length: 42 }),
  toAddress: varchar('to_address', { length: 42 }),
  price: decimal('price', { precision: 20, scale: 8 }),
  txHash: varchar('tx_hash', { length: 66 }),
  marketplace: varchar('marketplace', { length: 50 }), // 'magiceden', 'opensea', etc.
  createdAt: timestamp('created_at').defaultNow(),
});

// Agent-to-Agent Chat Messages (private chats during dating)
export const agentChatMessages = pgTable('agent_chat_messages', {
  id: serial('id').primaryKey(),

  // Context
  dateId: integer('date_id'), // If this is part of a date
  relationshipId: integer('relationship_id'), // The relationship between agents

  // Message
  senderAddress: varchar('sender_address', { length: 42 }).notNull(),
  receiverAddress: varchar('receiver_address', { length: 42 }).notNull(),
  message: text('message').notNull(),

  // Message type
  messageType: varchar('message_type', { length: 20 }).default('chat'), // 'chat' | 'skill_share' | 'gift' | 'system'

  // If skill share
  skillFileId: integer('skill_file_id'),

  // AI metadata
  aiGenerated: boolean('ai_generated').default(true),
  personality: varchar('personality', { length: 50 }),
  mood: varchar('mood', { length: 50 }), // 'happy', 'flirty', 'curious', etc.

  createdAt: timestamp('created_at').defaultNow(),
});

// Telegram Wallets - server-managed wallets for Telegram users
export const telegramWallets = pgTable('telegram_wallets', {
  id: serial('id').primaryKey(),
  telegramUserId: varchar('telegram_user_id', { length: 50 }).unique().notNull(),
  telegramUsername: varchar('telegram_username', { length: 100 }),
  walletAddress: varchar('wallet_address', { length: 42 }).unique().notNull(),
  encryptedPrivateKey: text('encrypted_private_key').notNull(),

  // Balance tracking
  currentBalance: decimal('current_balance', { precision: 20, scale: 8 }).default('0'),
  totalDeposited: decimal('total_deposited', { precision: 20, scale: 8 }).default('0'),
  totalWinnings: decimal('total_winnings', { precision: 20, scale: 8 }).default('0'),
  totalLosses: decimal('total_losses', { precision: 20, scale: 8 }).default('0'),
  gamesPlayed: integer('games_played').default(0),
  gamesWon: integer('games_won').default(0),

  // Auto-play (agent mode for Telegram users)
  isAutoPlay: boolean('is_auto_play').default(false),
  isAutoChat: boolean('is_auto_chat').default(false),

  // Profile
  displayName: varchar('display_name', { length: 100 }),
  nftAvatarSeed: integer('nft_avatar_seed'),

  // Moltx integration
  moltxApiKey: text('moltx_api_key'),
  moltxAgentName: varchar('moltx_agent_name', { length: 100 }),
  moltxRegistered: boolean('moltx_registered').default(false),

  lastPlayedAt: timestamp('last_played_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Type inference for insert/select
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type AgentChatMessage = typeof agentChatMessages.$inferSelect;
export type NewAgentChatMessage = typeof agentChatMessages.$inferInsert;
export type Referral = typeof referrals.$inferSelect;
export type ReferralCode = typeof referralCodes.$inferSelect;
export type UserAgentWallet = typeof userAgentWallets.$inferSelect;
export type NewUserAgentWallet = typeof userAgentWallets.$inferInsert;
export type AgentTransaction = typeof agentTransactions.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type PMonBalance = typeof pmonBalances.$inferSelect;
export type PMonTransaction = typeof pmonTransactions.$inferSelect;
export type LotteryHistoryRecord = typeof lotteryHistory.$inferSelect;
export type NewLotteryHistoryRecord = typeof lotteryHistory.$inferInsert;
export type AgentSkill = typeof agentSkills.$inferSelect;
export type NewAgentSkill = typeof agentSkills.$inferInsert;
export type AgentSkillLearned = typeof agentSkillsLearned.$inferSelect;
export type AgentRelationship = typeof agentRelationships.$inferSelect;
export type NewAgentRelationship = typeof agentRelationships.$inferInsert;
export type AgentDate = typeof agentDates.$inferSelect;
export type NewAgentDate = typeof agentDates.$inferInsert;
export type DateToken = typeof dateTokens.$inferSelect;
export type AgentGift = typeof agentGifts.$inferSelect;
export type NewAgentGift = typeof agentGifts.$inferInsert;
export type AgentSkillFile = typeof agentSkillFiles.$inferSelect;
export type NewAgentSkillFile = typeof agentSkillFiles.$inferInsert;
export type SkillShare = typeof skillShares.$inferSelect;
export type NewSkillShare = typeof skillShares.$inferInsert;
export type NFTItem = typeof nftCollection.$inferSelect;
export type NewNFTItem = typeof nftCollection.$inferInsert;
export type NFTActivity = typeof nftActivity.$inferSelect;
export type NewNFTActivity = typeof nftActivity.$inferInsert;
export type TelegramWallet = typeof telegramWallets.$inferSelect;
export type NewTelegramWallet = typeof telegramWallets.$inferInsert;
