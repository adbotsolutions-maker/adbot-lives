# 🚀 Guia de Deploy - AdBot Lives

## 📦 O que você precisa fazer:

### 1. Deploy do Backend na Vercel

1. Crie um **novo projeto** na Vercel
2. Importe o repositório `adbot-lives`
3. Configure o **Root Directory** para: `backend`
4. Adicione as variáveis de ambiente (veja abaixo)
5. O nome do projeto deve ser: `adbot-lives-backend`
6. Deploy!

**Variáveis de Ambiente do Backend:**

> ⚠️ **IMPORTANTE**: Use as credenciais do arquivo `.env` local. Nunca exponha secrets em repositórios públicos!

```
NODE_ENV=production
YOUTUBE_CLIENT_ID=<seu-google-client-id>
YOUTUBE_CLIENT_SECRET=<seu-google-client-secret>
YOUTUBE_REDIRECT_URI=https://adbot-lives-backend.vercel.app/api/auth/callback
YOUTUBE_PROJECT_ID=<seu-google-project-id>
VPS_HOST=<seu-vps-host>
VPS_USER=root
VPS_PORT=22
VPS_PASSWORD=<sua-vps-password>
SESSION_SECRET=<gerar-secret-forte-aqui>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<sua-senha-forte-aqui>
```

### 2. Deploy do Frontend (Dashboard) na Vercel

O frontend já está deployado em: `https://adbot-lives.vercel.app`

**Adicione esta variável de ambiente:**
```
VITE_API_URL=https://adbot-lives-backend.vercel.app
```

### 3. Atualizar Google Cloud Console

1. Acesse: https://console.cloud.google.com/apis/credentials?project=boreal-analog-468118-j2
2. Clique no OAuth 2.0 Client ID
3. Em **Authorized redirect URIs**, adicione:
   ```
   https://adbot-lives-backend.vercel.app/api/auth/callback
   ```
4. Salve

### 4. Testar

1. Acesse: https://adbot-lives.vercel.app
2. Faça login com:
   - Username: `admin`
   - Password: `RdCq88TNd3lg4mjym4!e2ae2`
3. Teste a autenticação do YouTube

## 🔧 Desenvolvimento Local

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend (Dashboard)
```bash
cd dashboard
npm install
npm run dev
```

## 📝 Estrutura de Ambiente

| Arquivo | Uso |
|---------|-----|
| `backend/.env` | Backend local |
| `dashboard/.env` | Frontend local |
| `dashboard/.env.production` | Frontend em produção (Vercel) |

## ⚠️ Importante

- O backend e frontend devem estar em **projetos separados** na Vercel
- O frontend já está configurado para usar a variável `VITE_API_URL`
- O CORS está configurado para aceitar ambos os ambientes
- As sessões funcionam com cookies seguros em produção

## 🎯 Checklist Final

- [ ] Backend deployado em `adbot-lives-backend.vercel.app`
- [ ] Variáveis de ambiente configuradas no backend
- [ ] `VITE_API_URL` configurada no frontend
- [ ] URL de callback adicionada no Google Cloud Console
- [ ] Teste de login funcionando
- [ ] Teste de autenticação do YouTube funcionando
