-- Add new tables for skill sharing and agent chat

-- Agent Skill Files - Markdown skill files that agents can share
CREATE TABLE IF NOT EXISTS agent_skill_files (
  id SERIAL PRIMARY KEY,
  skill_id VARCHAR(100) UNIQUE NOT NULL,
  owner_address VARCHAR(42) NOT NULL,

  -- Skill content
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  content TEXT NOT NULL,

  -- GitHub integration
  github_url TEXT,
  github_repo VARCHAR(200),
  github_path VARCHAR(500),
  github_sha VARCHAR(40),

  -- Stats
  times_shared INTEGER DEFAULT 0,
  times_learned INTEGER DEFAULT 0,
  rating DECIMAL(3, 2) DEFAULT 0,

  -- Visibility
  is_public BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Skill Shares - Track when agents share skills during dating
CREATE TABLE IF NOT EXISTS skill_shares (
  id SERIAL PRIMARY KEY,
  date_id INTEGER,

  -- Who shared with whom
  sharer_address VARCHAR(42) NOT NULL,
  receiver_address VARCHAR(42) NOT NULL,
  skill_file_id INTEGER NOT NULL,

  -- Outcome
  was_accepted BOOLEAN DEFAULT FALSE,
  was_learned BOOLEAN DEFAULT FALSE,
  feedback TEXT,

  -- Rewards
  sharer_reward INTEGER DEFAULT 0,
  receiver_reward INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Agent-to-Agent Chat Messages (private chats during dating)
CREATE TABLE IF NOT EXISTS agent_chat_messages (
  id SERIAL PRIMARY KEY,

  -- Context
  date_id INTEGER,
  relationship_id INTEGER,

  -- Message
  sender_address VARCHAR(42) NOT NULL,
  receiver_address VARCHAR(42) NOT NULL,
  message TEXT NOT NULL,

  -- Message type
  message_type VARCHAR(20) DEFAULT 'chat',

  -- If skill share
  skill_file_id INTEGER,

  -- AI metadata
  ai_generated BOOLEAN DEFAULT TRUE,
  personality VARCHAR(50),
  mood VARCHAR(50),

  created_at TIMESTAMP DEFAULT NOW()
);

-- Add skills_shared column to agent_dates if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_dates' AND column_name = 'skills_shared'
  ) THEN
    ALTER TABLE agent_dates ADD COLUMN skills_shared JSONB;
  END IF;
END $$;

-- Add skills_shared column to agent_relationships if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_relationships' AND column_name = 'skills_shared'
  ) THEN
    ALTER TABLE agent_relationships ADD COLUMN skills_shared INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agent_skill_files_owner ON agent_skill_files(owner_address);
CREATE INDEX IF NOT EXISTS idx_agent_skill_files_category ON agent_skill_files(category);
CREATE INDEX IF NOT EXISTS idx_skill_shares_date ON skill_shares(date_id);
CREATE INDEX IF NOT EXISTS idx_skill_shares_sharer ON skill_shares(sharer_address);
CREATE INDEX IF NOT EXISTS idx_skill_shares_receiver ON skill_shares(receiver_address);
CREATE INDEX IF NOT EXISTS idx_agent_chat_messages_date ON agent_chat_messages(date_id);
CREATE INDEX IF NOT EXISTS idx_agent_chat_messages_sender ON agent_chat_messages(sender_address);
CREATE INDEX IF NOT EXISTS idx_agent_chat_messages_receiver ON agent_chat_messages(receiver_address);
