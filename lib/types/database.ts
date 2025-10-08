export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      stories: {
        Row: {
          id: string
          user_id: string
          language: string
          text: string
          status: 'pending' | 'approved' | 'rejected'
          consent: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          language: string
          text: string
          status?: 'pending' | 'approved' | 'rejected'
          consent: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          language?: string
          text?: string
          status?: 'pending' | 'approved' | 'rejected'
          consent?: boolean
          created_at?: string
        }
      }
      stories_embeddings: {
        Row: {
          story_id: string
          embedding: number[]
          archetype: string
          emotion_tone: string
          created_at: string
        }
        Insert: {
          story_id: string
          embedding: number[]
          archetype: string
          emotion_tone: string
          created_at?: string
        }
        Update: {
          story_id?: string
          embedding?: number[]
          archetype?: string
          emotion_tone?: string
          created_at?: string
        }
      }
      suggested_stories: {
        Row: {
          id: string
          source_story_id: string
          similar_story_id: string
          target_language: string
          rewritten_text: string
          audio_url: string | null
          model_versions: Json
          created_at: string
        }
        Insert: {
          id?: string
          source_story_id: string
          similar_story_id: string
          target_language: string
          rewritten_text: string
          audio_url?: string | null
          model_versions?: Json
          created_at?: string
        }
        Update: {
          id?: string
          source_story_id?: string
          similar_story_id?: string
          target_language?: string
          rewritten_text?: string
          audio_url?: string | null
          model_versions?: Json
          created_at?: string
        }
      }
      profiles: {
        Row: {
          user_id: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          preferred_language: string
          created_at: string
        }
        Insert: {
          user_id: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          preferred_language?: string
          created_at?: string
        }
        Update: {
          user_id?: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          preferred_language?: string
          created_at?: string
        }
      }
      follows: {
        Row: {
          follower: string
          followed: string
          created_at: string
        }
        Insert: {
          follower: string
          followed: string
          created_at?: string
        }
        Update: {
          follower?: string
          followed?: string
          created_at?: string
        }
      }
      reactions: {
        Row: {
          id: string
          suggested_id: string
          user_id: string
          type: string
          created_at: string
        }
        Insert: {
          id?: string
          suggested_id: string
          user_id: string
          type: string
          created_at?: string
        }
        Update: {
          id?: string
          suggested_id?: string
          user_id?: string
          type?: string
          created_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          suggested_id: string
          user_id: string
          text: string
          created_at: string
        }
        Insert: {
          id?: string
          suggested_id: string
          user_id: string
          text: string
          created_at?: string
        }
        Update: {
          id?: string
          suggested_id?: string
          user_id?: string
          text?: string
          created_at?: string
        }
      }
      reports: {
        Row: {
          id: string
          suggested_id: string
          user_id: string
          reason: string
          created_at: string
        }
        Insert: {
          id?: string
          suggested_id: string
          user_id: string
          reason: string
          created_at?: string
        }
        Update: {
          id?: string
          suggested_id?: string
          user_id?: string
          reason?: string
          created_at?: string
        }
      }
    }
    Functions: {
      match_stories: {
        Args: {
          query_embedding: number[]
          match_threshold: number
          match_count: number
        }
        Returns: {
          story_id: string
          similarity: number
        }[]
      }
    }
  }
}
