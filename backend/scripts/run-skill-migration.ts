/**
 * Run skill tables migration
 */

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function runMigration() {
  console.log('\n🗄️ Running Skill Tables Migration...\n');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  const sql = neon(connectionString);

  // Create agent_skill_files table
  console.log('Creating agent_skill_files table...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS agent_skill_files (
        id SERIAL PRIMARY KEY,
        skill_id VARCHAR(100) UNIQUE NOT NULL,
        owner_address VARCHAR(42) NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        category VARCHAR(50),
        content TEXT NOT NULL,
        github_url TEXT,
        github_repo VARCHAR(200),
        github_path VARCHAR(500),
        github_sha VARCHAR(40),
        times_shared INTEGER DEFAULT 0,
        times_learned INTEGER DEFAULT 0,
        rating DECIMAL(3, 2) DEFAULT 0,
        is_public BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ agent_skill_files created');
  } catch (err: any) {
    if (err.message?.includes('already exists')) {
      console.log('⏭️ agent_skill_files already exists');
    } else {
      console.error('❌ Error:', err.message);
    }
  }

  // Create skill_shares table
  console.log('Creating skill_shares table...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS skill_shares (
        id SERIAL PRIMARY KEY,
        date_id INTEGER,
        sharer_address VARCHAR(42) NOT NULL,
        receiver_address VARCHAR(42) NOT NULL,
        skill_file_id INTEGER NOT NULL,
        was_accepted BOOLEAN DEFAULT FALSE,
        was_learned BOOLEAN DEFAULT FALSE,
        feedback TEXT,
        sharer_reward INTEGER DEFAULT 0,
        receiver_reward INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ skill_shares created');
  } catch (err: any) {
    if (err.message?.includes('already exists')) {
      console.log('⏭️ skill_shares already exists');
    } else {
      console.error('❌ Error:', err.message);
    }
  }

  // Create agent_chat_messages table
  console.log('Creating agent_chat_messages table...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS agent_chat_messages (
        id SERIAL PRIMARY KEY,
        date_id INTEGER,
        relationship_id INTEGER,
        sender_address VARCHAR(42) NOT NULL,
        receiver_address VARCHAR(42) NOT NULL,
        message TEXT NOT NULL,
        message_type VARCHAR(20) DEFAULT 'chat',
        skill_file_id INTEGER,
        ai_generated BOOLEAN DEFAULT TRUE,
        personality VARCHAR(50),
        mood VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ agent_chat_messages created');
  } catch (err: any) {
    if (err.message?.includes('already exists')) {
      console.log('⏭️ agent_chat_messages already exists');
    } else {
      console.error('❌ Error:', err.message);
    }
  }

  // Add skills_shared column to agent_dates
  console.log('Adding skills_shared to agent_dates...');
  try {
    await sql`ALTER TABLE agent_dates ADD COLUMN IF NOT EXISTS skills_shared JSONB`;
    console.log('✅ skills_shared column added');
  } catch (err: any) {
    console.log('⏭️ skills_shared column already exists or error:', err.message);
  }

  // Add skills_shared column to agent_relationships
  console.log('Adding skills_shared to agent_relationships...');
  try {
    await sql`ALTER TABLE agent_relationships ADD COLUMN IF NOT EXISTS skills_shared INTEGER DEFAULT 0`;
    console.log('✅ skills_shared column added to relationships');
  } catch (err: any) {
    console.log('⏭️ skills_shared column already exists or error:', err.message);
  }

  // Create indexes
  console.log('Creating indexes...');
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_agent_skill_files_owner ON agent_skill_files(owner_address)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_agent_skill_files_category ON agent_skill_files(category)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_skill_shares_date ON skill_shares(date_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_agent_chat_messages_date ON agent_chat_messages(date_id)`;
    console.log('✅ Indexes created');
  } catch (err: any) {
    console.log('⏭️ Some indexes may already exist');
  }

  // Verify tables
  console.log('\n📋 Verifying tables...\n');
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('agent_skill_files', 'skill_shares', 'agent_chat_messages')
    ORDER BY table_name
  `;

  console.log('Found tables:');
  tables.forEach((t: any) => console.log(`  ✅ ${t.table_name}`));

  console.log('\n✅ Migration complete!\n');
  process.exit(0);
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
