#!/bin/bash

# Script de Deploy Automático - WowMe
# Data: 10 de outubro de 2025

echo "🚀 Iniciando deploy do WowMe no Vercel..."
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erro: Execute este script na pasta do projeto WowMe${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Verificando dependências...${NC}"

# Verificar se Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚙️  Instalando Vercel CLI...${NC}"
    npm install -g vercel
fi

echo -e "${GREEN}✅ Vercel CLI instalado${NC}"
echo ""

# Fazer login no Vercel (se necessário)
echo -e "${YELLOW}🔐 Verificando autenticação...${NC}"
if ! vercel whoami &> /dev/null; then
    echo -e "${YELLOW}Por favor, faça login no Vercel:${NC}"
    vercel login
fi

echo -e "${GREEN}✅ Autenticado no Vercel${NC}"
echo ""

# Fazer build local para verificar erros
echo -e "${YELLOW}🔨 Testando build local...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro no build local. Corrija os erros antes de fazer deploy.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build local bem-sucedido${NC}"
echo ""

# Fazer deploy
echo -e "${YELLOW}🚀 Fazendo deploy no Vercel...${NC}"
echo ""

vercel --prod

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
    echo ""
    echo -e "${YELLOW}📋 Próximos passos:${NC}"
    echo "1. Acesse a URL fornecida acima"
    echo "2. Teste a aplicação"
    echo "3. Configure as variáveis de ambiente no dashboard do Vercel se necessário"
    echo ""
    echo -e "${YELLOW}🔗 Dashboard: https://vercel.com/dashboard${NC}"
else
    echo ""
    echo -e "${RED}❌ Erro no deploy. Verifique os logs acima.${NC}"
    exit 1
fi

