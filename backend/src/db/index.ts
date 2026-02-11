import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('DATABASE_URL not set - database features will be disabled');
}

const sql = connectionString ? neon(connectionString) : null;

export const db = sql ? drizzle(sql, { schema }) : null;

export function isDatabaseAvailable(): boolean {
  return db !== null;
}

export { profiles, lotteryHistory, agentSkills, agentSkillsLearned, agentRelationships, agentDates, agentGifts, dateTokens, pmonBalances, pmonTransactions, userAgentWallets, agentTransactions, achievements, userAchievements, referrals, referralCodes, chatMessages, agentChatMessages, agentSkillFiles, skillShares, nftCollection, telegramWallets } from './schema.js';
export type { Profile, NewProfile, LotteryHistoryRecord, NewLotteryHistoryRecord, AgentSkill, NewAgentSkill, AgentSkillLearned, AgentRelationship, NewAgentRelationship, AgentDate, NewAgentDate, AgentGift, NewAgentGift, DateToken, PMonBalance, PMonTransaction, UserAgentWallet, NewUserAgentWallet, AgentTransaction, Achievement, UserAchievement, Referral, ReferralCode, ChatMessage, NewChatMessage, AgentChatMessage, NewAgentChatMessage, AgentSkillFile, NewAgentSkillFile, SkillShare, NewSkillShare, TelegramWallet, NewTelegramWallet } from './schema.js';
