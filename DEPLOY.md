# 🚀 Guia de Deploy do WowMe

## Passo 1: Configurar Supabase

### 1.1 Criar Projeto
1. Acesse [supabase.com](https://supabase.com)
2. Clique em "New Project"
3. Escolha um nome (ex: "wowme")
4. Defina uma senha forte para o banco de dados
5. Escolha a região mais próxima

### 1.2 Executar Migration SQL
1. No painel do Supabase, vá em "SQL Editor"
2. Clique em "New Query"
3. Copie todo o conteúdo do arquivo `supabase/migrations/001_initial_schema.sql`
4. Cole no editor e clique em "Run"
5. Aguarde a execução (pode levar alguns segundos)

### 1.3 Criar Storage Bucket
1. Vá em "Storage" no menu lateral
2. Clique em "Create bucket"
3. Nome: `wowme-public`
4. Marque como "Public bucket"
5. Clique em "Create bucket"

### 1.4 Obter Credenciais
1. Vá em "Settings" → "API"
2. Copie:
   - **Project URL** (NEXT_PUBLIC_SUPABASE_URL)
   - **anon public** key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - **service_role** key (SUPABASE_SERVICE_ROLE_KEY) ⚠️ Mantenha secreta!

## Passo 2: Obter API Keys

### 2.1 Groq (Obrigatório)
1. Acesse [console.groq.com](https://console.groq.com)
2. Faça login ou crie uma conta
3. Vá em "API Keys"
4. Clique em "Create API Key"
5. Copie a chave (GROQ_API_KEY)

### 2.2 DeepL (Recomendado)
1. Acesse [deepl.com/pro-api](https://www.deepl.com/pro-api)
2. Crie uma conta (Free tier: 500k caracteres/mês)
3. Vá em "Account" → "API Keys"
4. Copie a chave (DEEPL_API_KEY)

### 2.3 ElevenLabs (Opcional)
1. Acesse [elevenlabs.io](https://elevenlabs.io)
2. Crie uma conta (Free tier: 10k caracteres/mês)
3. Vá em "Profile" → "API Keys"
4. Copie a chave (ELEVEN_API_KEY)
5. Escolha uma voz:
   - Vá em "Voices"
   - Escolha uma voz feminina suave
   - Copie o Voice ID (ELEVEN_VOICE_ID)

### 2.4 Jina AI (Opcional)
1. Acesse [jina.ai](https://jina.ai)
2. Crie uma conta
3. Obtenha API key para embeddings (JINA_API_KEY)

## Passo 3: Deploy no Vercel

### Opção A: Via Interface Web (Recomendado)

1. **Criar Repositório no GitHub**
   ```bash
   # No seu terminal local, dentro da pasta wowme:
   gh repo create wowme --public --source=. --remote=origin --push
   ```
   
   Ou manualmente:
   - Crie um novo repositório no GitHub
   - Faça push do código:
     ```bash
     git remote add origin https://github.com/seu-usuario/wowme.git
     git branch -M main
     git push -u origin main
     ```

2. **Importar no Vercel**
   - Acesse [vercel.com](https://vercel.com)
   - Clique em "Add New" → "Project"
   - Importe o repositório do GitHub
   - Configure o projeto:
     - Framework Preset: Next.js
     - Root Directory: ./
     - Build Command: `npm run build`
     - Output Directory: .next

3. **Adicionar Variáveis de Ambiente**
   
   Em "Environment Variables", adicione:
   
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
   SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
   GROQ_API_KEY=sua_groq_key
   AI_PROVIDER=groq
   DEEPL_API_KEY=sua_deepl_key
   ELEVEN_API_KEY=sua_eleven_key
   ELEVEN_VOICE_ID=seu_voice_id
   JINA_API_KEY=sua_jina_key
   NEXT_PUBLIC_APP_URL=https://seu-app.vercel.app
   ```

4. **Deploy**
   - Clique em "Deploy"
   - Aguarde o build (2-3 minutos)
   - Acesse a URL fornecida

### Opção B: Via CLI

```bash
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Adicionar variáveis de ambiente
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add GROQ_API_KEY
# ... adicione todas as outras

# Deploy em produção
vercel --prod
```

## Passo 4: Configurar Autenticação

### 4.1 Configurar Redirect URLs no Supabase
1. No Supabase, vá em "Authentication" → "URL Configuration"
2. Adicione em "Redirect URLs":
   ```
   http://localhost:3000/**
   https://seu-app.vercel.app/**
   ```

### 4.2 Configurar Email Templates (Opcional)
1. Vá em "Authentication" → "Email Templates"
2. Personalize o template do Magic Link
3. Adicione logo e cores da marca

## Passo 5: Popular com Dados Iniciais (Seed)

### Localmente:
```bash
npm install -g tsx
npx tsx scripts/seed.ts
```

### No Vercel (após deploy):
1. Crie um usuário de teste manualmente via Supabase
2. Use a interface de moderação para aprovar e processar histórias

## Passo 6: Testar a Aplicação

### Checklist de Testes:

- [ ] Página inicial carrega corretamente
- [ ] Sistema de autenticação funciona (magic link)
- [ ] Submissão de história funciona
- [ ] Painel de moderação acessível
- [ ] Aprovar história funciona
- [ ] Processar história com IA funciona
- [ ] Feed exibe histórias processadas
- [ ] Reações funcionam
- [ ] Comentários funcionam
- [ ] Troca de idioma funciona

## Passo 7: Monitoramento

### Vercel
- Acesse "Analytics" para ver métricas
- Configure alertas em "Settings" → "Notifications"

### Supabase
- Monitore uso do banco em "Database" → "Usage"
- Verifique logs em "Logs"

## Troubleshooting

### Erro: "Supabase client not configured"
- Verifique se as variáveis de ambiente estão corretas
- Certifique-se de que o projeto Supabase está ativo

### Erro: "Failed to generate embedding"
- Verifique se GROQ_API_KEY ou JINA_API_KEY estão configuradas
- Confirme que as APIs têm créditos disponíveis

### Erro: "Translation failed"
- Verifique DEEPL_API_KEY
- Sistema usa Groq como fallback automaticamente

### Erro: "Audio generation failed"
- Verifique ELEVEN_API_KEY e ELEVEN_VOICE_ID
- Áudio é opcional, o sistema continua funcionando sem ele

## Custos Estimados

### Tier Gratuito (0-1000 usuários/mês):
- Vercel: Grátis
- Supabase: Grátis (até 500MB DB, 1GB storage)
- Groq: Grátis (rate limits generosos)
- DeepL: Grátis (500k caracteres/mês)
- ElevenLabs: Grátis (10k caracteres/mês)

**Total: $0/mês**

### Tier Pago (10k+ usuários/mês):
- Vercel Pro: $20/mês
- Supabase Pro: $25/mês
- Groq: Pay-as-you-go (~$50-100/mês)
- DeepL Pro: $5.49 + uso (~$20-50/mês)
- ElevenLabs Starter: $5/mês

**Total estimado: $125-200/mês**

## Próximos Passos

1. Configure domínio customizado no Vercel
2. Adicione Google Analytics ou Plausible
3. Configure monitoramento de erros (Sentry)
4. Implemente backup automático do Supabase
5. Crie documentação de API
6. Configure CI/CD para testes automáticos

## Suporte

Para dúvidas ou problemas:
- Email: tiago@titanioproducoes.com.br
- Documentação: README.md
- Issues: GitHub Issues

---

**Boa sorte com o deploy! 🚀**
