-- Pomelo v1 — full schema
-- Apply with: supabase db push (or paste into Supabase SQL editor)

-- ─────────────────────────────────────────────────────────────
-- 1. Qualifying sessions
-- ─────────────────────────────────────────────────────────────
CREATE TABLE qualifying_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic      TEXT NOT NULL,
  turns      JSONB NOT NULL DEFAULT '[]',
  status     TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'complete', 'abandoned')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE qualifying_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own qualifying_sessions"
  ON qualifying_sessions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 2. Courses
-- ─────────────────────────────────────────────────────────────
CREATE TABLE courses (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic                  TEXT NOT NULL,
  qualifying_session_id  UUID REFERENCES qualifying_sessions(id),
  user_profile           JSONB NOT NULL,
  daily_goal             INTEGER NOT NULL DEFAULT 1 CHECK (daily_goal >= 1),
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON courses (user_id);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own courses"
  ON courses FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 3. Chapters
-- ─────────────────────────────────────────────────────────────
CREATE TABLE chapters (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id            UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  chapter_index        INTEGER NOT NULL,
  title                TEXT NOT NULL,
  summary              TEXT NOT NULL,
  estimated_minutes    INTEGER NOT NULL,
  content              TEXT,
  status               TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'generating', 'done', 'failed')),
  error                TEXT,
  generation_started_at TIMESTAMPTZ,
  generated_at          TIMESTAMPTZ,
  UNIQUE (course_id, chapter_index)
);

CREATE INDEX ON chapters (course_id);

-- Chapters are readable by the course owner; writes go through service role.
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "course owner reads chapters"
  ON chapters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = chapters.course_id
        AND courses.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 4. Chapter progress
-- ─────────────────────────────────────────────────────────────
CREATE TABLE chapter_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id   UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  opened_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, chapter_id)
);

CREATE INDEX ON chapter_progress (user_id, chapter_id);

ALTER TABLE chapter_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own chapter_progress"
  ON chapter_progress FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 5. Habit reminders
-- ─────────────────────────────────────────────────────────────
CREATE TABLE habit_reminders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id        UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  reminder_hour    INTEGER NOT NULL DEFAULT 20 CHECK (reminder_hour BETWEEN 0 AND 23),
  timezone         TEXT NOT NULL,
  utc_offset_hours INTEGER,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  last_sent_date   DATE,
  UNIQUE (user_id, course_id)
);

CREATE INDEX ON habit_reminders (utc_offset_hours, is_active);

ALTER TABLE habit_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own habit_reminders"
  ON habit_reminders FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
