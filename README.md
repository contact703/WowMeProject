# WowMe - The Anonymous Social Network for Human Connection

WowMe is a revolutionary social platform that allows users to share their deepest feelings, secrets, and experiences anonymously. Through AI-powered voice transformation and translation, stories are shared globally while protecting user identity.

## 🌟 Features

- **Anonymous Storytelling**: Share personal experiences with complete anonymity
- **AI-Powered Rewriting**: Stories are ethically rewritten by AI to protect identity
- **Multilingual Support**: Content automatically translated to 13+ languages
- **Voice Transformation**: Audio generated with AI to anonymize voices
- **Social Features**: React, comment, and follow other anonymous users
- **Moderation System**: Human-in-the-loop content moderation
- **Semantic Search**: Find similar stories using AI embeddings

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Supabase (Postgres + Auth + Storage + RLS)
- **AI Services**:
  - Groq (Llama-3.3-70B) for story rewriting and classification
  - Jina Embeddings for semantic search
  - DeepL for translation (with Groq fallback)
  - ElevenLabs for text-to-speech
- **Deployment**: Vercel
- **Vector Database**: pgvector extension in Postgres

## 📋 Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- A Supabase account and project
- API keys for:
  - Groq API (required)
  - DeepL API (optional but recommended)
  - ElevenLabs API (optional, for TTS)
  - Jina AI API (optional, for embeddings)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the SQL migration:
   - Go to SQL Editor in Supabase Dashboard
   - Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
   - Execute the migration
3. Enable the `vector` extension (if not already enabled)
4. Create the storage bucket `wowme-public` with public read access

### 3. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GROQ_API_KEY=your_groq_api_key
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### 5. Seed the Database (Optional)

```bash
npx tsx scripts/seed.ts
```

## 📦 Deployment to Vercel

### Via Vercel CLI

```bash
npm install -g vercel
vercel login
vercel
```

### Via GitHub

1. Push your code to GitHub
2. Import the repository in Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy!

## 🔑 Getting API Keys

- **Groq**: [console.groq.com](https://console.groq.com) - Free tier available
- **DeepL**: [deepl.com/pro-api](https://www.deepl.com/pro-api) - 500k chars/month free
- **ElevenLabs**: [elevenlabs.io](https://elevenlabs.io) - 10k chars/month free
- **Jina AI**: [jina.ai](https://jina.ai) - Free tier available

## 📚 API Endpoints

- `POST /api/submit` - Submit a new story
- `GET /api/feed` - Get paginated feed
- `POST /api/moderate` - Approve/reject stories
- `POST /api/process-story` - Process story through AI pipeline
- `POST /api/react` - Add/remove reaction
- `POST /api/comment` - Add comment
- `POST /api/report` - Report content
- `POST /api/follow` - Follow/unfollow user
- `GET /api/profile/[id]` - Get user profile

## 🗄️ Database Schema

Core tables: `stories`, `stories_embeddings`, `suggested_stories`, `profiles`, `follows`, `reactions`, `comments`, `reports`

All tables have Row Level Security (RLS) enabled.

## 🔒 Security & Privacy

- Original stories are never exposed publicly
- AI rewrites stories to protect identity
- Voice transformation via TTS
- Database-level security with RLS
- Mandatory user consent
- Human moderation before AI processing

## 📝 License

This project is created for demonstration purposes. Ensure compliance with data protection laws (GDPR, LGPD, etc.) and mental health regulations.

## 📞 Support

Contact: tiago@titanioproducoes.com.br

---

**Built with ❤️ for human connection**

© 2025 WowMe - A safe space for sharing and healing
