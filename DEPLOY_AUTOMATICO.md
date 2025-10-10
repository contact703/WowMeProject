# 🚀 Deploy Automático - WowMe

## Opção 1: Script de Deploy (Recomendado)

### Passo 1: Execute o script

```bash
cd /home/ubuntu/wowme
./deploy-vercel.sh
```

O script irá:
1. ✅ Verificar dependências
2. ✅ Fazer login no Vercel (se necessário)
3. ✅ Testar build local
4. ✅ Fazer deploy em produção

### Passo 2: Configure variáveis de ambiente

Após o deploy, acesse o dashboard do Vercel e adicione as seguintes variáveis:

**Obrigatórias:**
```
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_do_supabase

GROQ_API_KEY=sua_groq_api_key

AI_PROVIDER=groq
```

**Nota:** As chaves reais estão no arquivo `.env.local` do projeto.

**Opcionais:**
```
DEEPL_API_KEY=sua_key_se_tiver
ELEVEN_API_KEY=sua_key_se_tiver
ELEVEN_VOICE_ID=seu_voice_id_se_tiver
JINA_API_KEY=sua_key_se_tiver
```

### Passo 3: Redeploy

Após adicionar as variáveis, faça um redeploy:

1. Vá em **Deployments**
2. Clique nos 3 pontos do último deploy
3. Selecione **Redeploy**

---

## Opção 2: Deploy via Dashboard do Vercel

### Passo 1: Acesse o Vercel

1. Vá para https://vercel.com/dashboard
2. Clique em **Add New...** → **Project**

### Passo 2: Importe o repositório

1. Selecione **Import Git Repository**
2. Escolha **contact703/WowMeProject**
3. Configure:
   - Framework: Next.js (auto-detectado)
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`

### Passo 3: Adicione variáveis de ambiente

Clique em **Environment Variables** e adicione:

```
NEXT_PUBLIC_SUPABASE_URL=sua_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
GROQ_API_KEY=sua_groq_api_key
AI_PROVIDER=groq
```

**Nota:** Copie as chaves do arquivo `.env.local` do projeto.

### Passo 4: Deploy

Clique em **Deploy** e aguarde (2-5 minutos).

---

## Opção 3: Deploy via GitHub (Automático)

O projeto já está conectado ao GitHub. Toda vez que você fizer push, o Vercel fará deploy automaticamente!

### Como configurar:

1. Acesse https://vercel.com/dashboard
2. Vá em **Settings** → **Git**
3. Conecte o repositório **contact703/WowMeProject**
4. Ative **Auto Deploy**

Pronto! Agora todo `git push` fará deploy automaticamente.

---

## ✅ Checklist pós-deploy

Após o deploy, verifique:

- [ ] Site carrega sem erro 404
- [ ] Autenticação funciona
- [ ] Submissão de história funciona
- [ ] História recebida está em primeira pessoa
- [ ] Botão de áudio funciona
- [ ] Seleção de país funciona (interface)

---

## 🐛 Troubleshooting

### Erro: "Supabase client not configured"

**Solução:** Adicione as variáveis de ambiente do Supabase no dashboard.

### Erro: "GROQ API error"

**Solução:** Verifique se a variável `GROQ_API_KEY` está correta.

### Erro: Build falhou

**Solução:** Execute `npm run build` localmente para ver o erro específico.

### Site retorna 404

**Solução:** 
1. Delete o projeto no Vercel
2. Crie novamente
3. Verifique se o Root Directory está correto (`./`)

---

## 📞 Suporte

- **Dashboard Vercel:** https://vercel.com/dashboard
- **Logs:** Deployments → Functions
- **Repositório:** https://github.com/contact703/WowMeProject

---

**Última atualização:** 10 de outubro de 2025

