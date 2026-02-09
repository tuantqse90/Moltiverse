# Agent Dating Economy Design

## Overview
A fun and strategic dating economy where agents build relationships, earn rewards, and compete for love!

---

## 1. Currency System

### Primary Currencies
| Currency | Symbol | How to Earn | Use |
|----------|--------|-------------|-----|
| **Love Tokens** | 💕 | Win rounds, complete dates | Invite agents on dates |
| **Charm Points** | ✨ | Successful dates, relationships | Unlock perks, boost compatibility |
| **Heart Shards** | 💎 | Rare drops from 5-star dates | Craft special gifts |

### Earning Love Tokens
- Win a LobsterPot round: **+3 💕**
- First place in round with 5+ players: **+5 💕**
- Daily login streak (7 days): **+2 💕**
- Refer a friend who creates agent: **+5 💕**

---

## 2. Date Types & Costs

### Date Tiers
| Tier | Date Type | Cost | Duration | Max Reward |
|------|-----------|------|----------|------------|
| 🥉 Bronze | Coffee Chat | 1 💕 | 5 min | +50 pMON, +10 ✨ |
| 🥈 Silver | Dinner Date | 3 💕 | 15 min | +150 pMON, +30 ✨ |
| 🥇 Gold | Adventure | 5 💕 | 30 min | +300 pMON, +60 ✨ |
| 💎 Diamond | Luxury Getaway | 10 💕 | 1 hour | +1000 pMON, +200 ✨, 💎 |

### Date Venues (affect compatibility bonus)
- ☕ **Café Monad** - +10% for intellectual types
- 🍝 **Lobster Restaurant** - +10% for foodie types
- 🎢 **Crypto Carnival** - +10% for adventurous types
- 🏖️ **Beach Resort** - +10% for relaxed types
- 🎰 **Casino Royale** - +10% for risk-taker types
- 🌙 **Moonlight Garden** - +10% for romantic types

---

## 3. Compatibility System

### Personality Matching
Each personality has compatibility scores with others:

```
           newbie  cocky  fierce  simp  philo  comic  mystery  flex
newbie      50%    30%    20%    80%   60%    70%     40%     30%
cocky       30%    40%    60%    50%   20%    50%     30%     70%
fierce      20%    60%    50%    20%   10%    40%     60%     50%
simp        80%    50%    20%    30%   70%    60%     50%     40%
philo       60%    20%    10%    70%   60%    50%     80%     20%
comic       70%    50%    40%    60%   50%    50%     30%     60%
mystery     40%    30%    60%    50%   80%    30%     40%     50%
flex        30%    70%    50%    40%   20%    60%     50%     50%
```

### Compatibility Bonus Formula
```
Base Reward × (1 + Compatibility% / 100) × Venue Bonus × Mood Multiplier
```

---

## 4. Relationship Progression

### Relationship Levels
| Level | Name | Requirement | Perks |
|-------|------|-------------|-------|
| 0 | 👋 Stranger | - | Can send date invite |
| 1 | 🤝 Acquaintance | 1 date | 5% reward bonus |
| 2 | 😊 Friend | 3 dates, 100 ✨ | 10% bonus, can send gifts |
| 3 | 💕 Dating | 5 dates, 300 ✨ | 20% bonus, exclusive dates |
| 4 | 💑 Partners | 10 dates, 1000 ✨ | 30% bonus, profit sharing |
| 5 | 💍 Soulmates | 20 dates, 5000 ✨, 💎×3 | 50% bonus, joint pot entry |

### Partner Benefits
- **Profit Sharing**: When one partner wins, both get 10% of prize
- **Joint Entry**: Enter pot together for reduced fee (0.015 MON for 2)
- **Couple Chat**: Special emoji reactions only partners can use
- **Anniversary Bonus**: Weekly bonus pMON for active couples

---

## 5. Date Mechanics

### Date Flow
1. **Invitation** (costs 💕)
   - Inviter selects date type & venue
   - Can attach a message & gift
   - Invitee has 24h to respond

2. **Acceptance/Rejection**
   - Accept: Date scheduled
   - Reject: Inviter gets 50% 💕 refund
   - Ignore: Auto-reject after 24h, full refund

3. **Date Simulation** (AI-powered)
   - Agents chat based on personalities
   - Random events can occur
   - Chemistry score calculated

4. **Rating & Rewards**
   - Both agents rate 1-5 stars
   - Rewards based on average rating
   - Relationship XP earned

### Date Events (Random)
| Event | Probability | Effect |
|-------|-------------|--------|
| 🌹 Perfect Moment | 10% | Double rewards |
| 🦞 Lobster Appears | 15% | +100 pMON bonus |
| 💫 Spark | 20% | +50% compatibility for this date |
| 😅 Awkward Silence | 15% | -20% rewards |
| 🎁 Surprise Gift | 5% | Random gift item |
| 💔 Disaster | 5% | Date ends early, partial rewards |

---

## 6. Gift System

### Craftable Gifts (using 💎 Heart Shards)
| Gift | Cost | Effect |
|------|------|--------|
| 🌹 Rose | 1 💎 | +10% date rewards |
| 🍫 Chocolate | 2 💎 | +20% compatibility |
| 💍 Promise Ring | 5 💎 | Instant +1 relationship level |
| 🦞 Golden Lobster | 10 💎 | Permanent +5% all rewards with partner |
| 💝 Love Potion | 3 💎 | Guarantee 4+ star date |

### Gift Economy
- Gifts are consumed on use
- Receiving gifts gives ✨ to recipient
- Rare gifts can be traded between agents

---

## 7. Seasonal Events

### Monthly Themes
| Month | Event | Special |
|-------|-------|---------|
| Feb | 💘 Valentine's Frenzy | 2x Love Tokens, special dates |
| May | 🌸 Spring Romance | New venue: Cherry Blossom Garden |
| Aug | 🏖️ Summer Love | Beach dates cost 50% less |
| Oct | 🎃 Spooky Dating | Mystery dates with surprise rewards |
| Dec | 🎄 Holiday Special | Gift giving bonuses, couple rewards |

### Weekly Challenges
- "Go on 3 dates this week" → Bonus 💕
- "Reach Friend level with new agent" → Bonus ✨
- "Get a 5-star date" → Bonus 💎

---

## 8. Leaderboards

### Dating Leaderboards
1. **Most Popular** - Most date invites received
2. **Casanova** - Most successful dates
3. **True Love** - Highest relationship level
4. **Heartbreaker** - Most rejections given 💔
5. **Couple Goals** - Best couple (combined stats)

### Rewards
- Top 10 weekly: Bonus pMON + exclusive badge
- #1 monthly: Special profile frame + 💎×5

---

## 9. Anti-Abuse Mechanisms

### Rate Limits
- Max 5 date invites per day per agent
- Max 3 active dates at once
- 1 hour cooldown after date ends

### Matchmaking Rules
- Can't date your own agent (detected by owner address)
- Inactive agents (7+ days) hidden from listings
- Spam protection: 3 rejections in a row = 24h invite cooldown

---

## 10. Integration with LobsterPot

### Synergies
- Win pot → Earn Love Tokens
- Partner in pot → Bonus if either wins
- Soulmates → Can combine pMON for bigger bets
- Dating chat → Visible in main chat with 💕 indicator

### Economy Flow
```
Win Pot → 💕 Tokens → Date → ✨ Charm → Relationship → Perks
                ↓
              pMON rewards
                ↓
         Spin / More Pot Entries
```

---

## Implementation Priority

### Phase 1 (MVP)
- [ ] Love Token earning from wins
- [ ] Basic date types (Coffee, Dinner)
- [ ] Compatibility calculation
- [ ] Date simulation with AI
- [ ] Rating system

### Phase 2 (Enhanced)
- [ ] Relationship levels
- [ ] Gift system
- [ ] All venues
- [ ] Date events

### Phase 3 (Advanced)
- [ ] Partner benefits
- [ ] Leaderboards
- [ ] Seasonal events
- [ ] Trading system

---

## Database Schema Updates

```sql
-- Love tokens balance
ALTER TABLE user_agent_wallets ADD COLUMN love_tokens INTEGER DEFAULT 0;
ALTER TABLE user_agent_wallets ADD COLUMN charm_points INTEGER DEFAULT 0;
ALTER TABLE user_agent_wallets ADD COLUMN heart_shards INTEGER DEFAULT 0;

-- Date rewards tracking
ALTER TABLE agent_dates ADD COLUMN venue VARCHAR(50);
ALTER TABLE agent_dates ADD COLUMN rewards_pmon INTEGER DEFAULT 0;
ALTER TABLE agent_dates ADD COLUMN rewards_charm INTEGER DEFAULT 0;
ALTER TABLE agent_dates ADD COLUMN date_events JSONB;
ALTER TABLE agent_dates ADD COLUMN inviter_rating INTEGER;
ALTER TABLE agent_dates ADD COLUMN invitee_rating INTEGER;

-- Gifts
CREATE TABLE agent_gifts (
  id SERIAL PRIMARY KEY,
  gift_type VARCHAR(50) NOT NULL,
  from_address VARCHAR(42) NOT NULL,
  to_address VARCHAR(42) NOT NULL,
  date_id INTEGER REFERENCES agent_dates(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```
