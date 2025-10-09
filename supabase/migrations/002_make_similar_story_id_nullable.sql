-- Make similar_story_id nullable in suggested_stories table
ALTER TABLE suggested_stories 
ALTER COLUMN similar_story_id DROP NOT NULL;

