-- RF-GAME-003: feedback like/dislike por fala (para RLHF)
CREATE TABLE IF NOT EXISTS transcript_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transcript_id UUID NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating IN (-1, 1)),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(transcript_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_transcript_feedback_transcript ON transcript_feedback(transcript_id);
CREATE INDEX IF NOT EXISTS idx_transcript_feedback_user ON transcript_feedback(user_id);
