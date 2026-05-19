-- Pomelo v2 — YouTube videos, cited sources, chapter chat

-- ── Enrich chapters with videos and sources ───────────────────
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS videos  JSONB NOT NULL DEFAULT '[]';
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS sources JSONB NOT NULL DEFAULT '[]';
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS enriched BOOLEAN NOT NULL DEFAULT false;

-- ── Multi-thread chapter chat ─────────────────────────────────
CREATE TABLE chapter_chats (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id  UUID NOT NULL REFERENCES chapters(id)     ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  thread_name TEXT NOT NULL DEFAULT 'Main',
  messages    JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (chapter_id, user_id, thread_name)
);

CREATE INDEX ON chapter_chats (chapter_id, user_id);

ALTER TABLE chapter_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own chapter_chats"
  ON chapter_chats FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
