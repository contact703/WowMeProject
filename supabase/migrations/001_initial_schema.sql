-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create stories table
CREATE TABLE IF NOT EXISTS public.stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    language TEXT NOT NULL,
    text TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    consent BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create stories_embeddings table
CREATE TABLE IF NOT EXISTS public.stories_embeddings (
    story_id UUID PRIMARY KEY REFERENCES public.stories(id) ON DELETE CASCADE,
    embedding vector(384),
    archetype TEXT NOT NULL,
    emotion_tone TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create suggested_stories table
CREATE TABLE IF NOT EXISTS public.suggested_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    similar_story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    target_language TEXT NOT NULL,
    rewritten_text TEXT NOT NULL,
    audio_url TEXT,
    model_versions JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    preferred_language TEXT NOT NULL DEFAULT 'en',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create follows table
CREATE TABLE IF NOT EXISTS public.follows (
    follower UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    followed UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (follower, followed)
);

-- Create reactions table
CREATE TABLE IF NOT EXISTS public.reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suggested_id UUID NOT NULL REFERENCES public.suggested_stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(suggested_id, user_id, type)
);

-- Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suggested_id UUID NOT NULL REFERENCES public.suggested_stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create reports table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suggested_id UUID NOT NULL REFERENCES public.suggested_stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON public.stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_status ON public.stories(status);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON public.stories(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stories_embeddings_embedding ON public.stories_embeddings 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_suggested_stories_target_language ON public.suggested_stories(target_language);
CREATE INDEX IF NOT EXISTS idx_suggested_stories_created_at ON public.suggested_stories(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reactions_suggested_id ON public.reactions(suggested_id);
CREATE INDEX IF NOT EXISTS idx_comments_suggested_id ON public.comments(suggested_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);

-- Create RPC function for similarity search
CREATE OR REPLACE FUNCTION match_stories(
    query_embedding vector(384),
    match_threshold float,
    match_count int
)
RETURNS TABLE (
    story_id UUID,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        se.story_id,
        1 - (se.embedding <=> query_embedding) AS similarity
    FROM public.stories_embeddings se
    WHERE 1 - (se.embedding <=> query_embedding) > match_threshold
    ORDER BY se.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Enable Row Level Security
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggested_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stories
CREATE POLICY "Users can view their own stories" ON public.stories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stories" ON public.stories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stories" ON public.stories
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for stories_embeddings
CREATE POLICY "Users can view embeddings of their own stories" ON public.stories_embeddings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.stories
            WHERE stories.id = stories_embeddings.story_id
            AND stories.user_id = auth.uid()
        )
    );

-- RLS Policies for suggested_stories (public read)
CREATE POLICY "Anyone can view suggested stories" ON public.suggested_stories
    FOR SELECT USING (true);

-- RLS Policies for profiles
CREATE POLICY "Anyone can view profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for follows
CREATE POLICY "Anyone can view follows" ON public.follows
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own follows" ON public.follows
    FOR INSERT WITH CHECK (auth.uid() = follower);

CREATE POLICY "Users can delete their own follows" ON public.follows
    FOR DELETE USING (auth.uid() = follower);

-- RLS Policies for reactions
CREATE POLICY "Anyone can view reactions" ON public.reactions
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own reactions" ON public.reactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions" ON public.reactions
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for comments
CREATE POLICY "Anyone can view comments" ON public.comments
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own comments" ON public.comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON public.comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.comments
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for reports
CREATE POLICY "Users can insert their own reports" ON public.reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('wowme-public', 'wowme-public', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for audio files
CREATE POLICY "Anyone can view audio files" ON storage.objects
    FOR SELECT USING (bucket_id = 'wowme-public');

CREATE POLICY "Authenticated users can upload audio files" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'wowme-public' AND auth.role() = 'authenticated');
