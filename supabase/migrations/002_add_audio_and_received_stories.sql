-- Add audio_url column to stories table
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Create user_received_stories table (histórias similares recebidas pelo usuário)
CREATE TABLE IF NOT EXISTS public.user_received_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    suggested_story_id UUID NOT NULL REFERENCES public.suggested_stories(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, suggested_story_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_received_stories_user_id ON public.user_received_stories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_received_stories_created_at ON public.user_received_stories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_received_stories_is_read ON public.user_received_stories(is_read);

-- Enable RLS
ALTER TABLE public.user_received_stories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_received_stories
CREATE POLICY "Users can view their own received stories" ON public.user_received_stories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert received stories" ON public.user_received_stories
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own received stories" ON public.user_received_stories
    FOR UPDATE USING (auth.uid() = user_id);

-- Create function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(target_user_id UUID)
RETURNS TABLE (
    total_stories_sent INT,
    total_stories_received INT,
    total_unread INT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::INT FROM public.stories WHERE user_id = target_user_id AND status = 'approved') AS total_stories_sent,
        (SELECT COUNT(*)::INT FROM public.user_received_stories WHERE user_id = target_user_id) AS total_stories_received,
        (SELECT COUNT(*)::INT FROM public.user_received_stories WHERE user_id = target_user_id AND is_read = false) AS total_unread;
END;
$$;
