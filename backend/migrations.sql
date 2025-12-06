-- Run this in Vercel Postgres dashboard or psql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title TEXT DEFAULT 'New Conversation',
  message_count INTEGER DEFAULT 0,
  archived BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT,
  stage1 JSONB,
  stage2 JSONB,
  stage3 JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conversations_archived ON conversations(archived);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
