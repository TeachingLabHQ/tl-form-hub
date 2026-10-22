-- One row per question asked of the staffing assistant ("Ask AI" on the
-- contractor availability admin page), for cost tracking, debugging wrong
-- answers, and auditing what was sent to Anthropic.
CREATE TABLE IF NOT EXISTS staffing_assistant_questions (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    user_email text NOT NULL,
    question text NOT NULL,
    tools_used text[] NOT NULL DEFAULT '{}',
    input_tokens integer,
    output_tokens integer,
    finish_reason text,
    duration_ms integer,
    error text
);

CREATE INDEX IF NOT EXISTS staffing_assistant_questions_user_created_idx
ON staffing_assistant_questions (user_email, created_at DESC);

COMMENT ON TABLE staffing_assistant_questions IS 'Questions asked of the CBS staffing assistant, with token usage';

-- The route writes with the signed-in staff member's session, so they can
-- only log rows as themselves. Nobody reads through the API; review the log
-- in the Supabase dashboard.
ALTER TABLE staffing_assistant_questions ENABLE ROW LEVEL SECURITY;

-- Safe to re-run if it was applied by hand before the deploy pipeline ran it
DROP POLICY IF EXISTS "Users can log their own questions" ON staffing_assistant_questions;

CREATE POLICY "Users can log their own questions"
ON staffing_assistant_questions
FOR INSERT
WITH CHECK (auth.email() = user_email);
