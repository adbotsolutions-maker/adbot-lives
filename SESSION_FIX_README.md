# Session Fix - Troubleshooting Guide

## Problema Identificado

Sessões não estão persistindo entre requisições quando o backend está no Render e o frontend no Vercel.

## Causa Raiz

1. **express-session** sem store persistente (memória volátil)
2. Cookies cross-origin não estavam sendo configurados corretamente
3. Proxy settings não estavam completos

## Mudanças Aplicadas

### backend/src/server.ts

```typescript
// Trust proxy configuration
app.set('trust proxy', 1);

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'adbot-secret-change-in-production',
  resave: true, // Force session save even if not modified
  saveUninitialized: false,
  rolling: true, // Reset cookie maxAge on every request
  proxy: true, // Important for Render/proxy environments
  name: 'adbot.sid', // Custom session cookie name
  cookie: { 
    secure: true,
    sameSite: 'none', // Required for cross-origin
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  }
}));
```

### CORS configuration

```typescript
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:5173',
      'https://adbot-lives.vercel.app'
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['set-cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.options('*', cors());
```

## Como Testar

### 1. Deploy no Render

Faça push das mudanças:
```bash
git add .
git commit -m "fix: session persistence with proxy and cors"
git push origin main
```

O Render vai fazer redeploy automático.

### 2. Verificar Logs

No dashboard do Render, veja os logs:
- `✅ Login successful` - deve mostrar sessionID
- `🔒 Auth middleware check` - deve mostrar sessionID consistente
- `🔍 Auth check` - deve mostrar authenticated: true

### 3. Testar no Browser

1. Abra DevTools > Network
2. Faça login em `https://adbot-lives.vercel.app/login`
3. Verifique se o Set-Cookie header está presente
4. Navegue para outra página
5. Verifique se o Cookie header é enviado nas requisições

## Solução Definitiva (Recomendada)

### Usar Redis Store

O Render oferece Valkey/Redis gratuito. Para usar:

1. **Criar Redis no Render**:
   - Dashboard > New > Redis
   - Copiar a `Internal Redis URL`

2. **Instalar dependências**:
```bash
cd backend
npm install connect-redis redis
```

3. **Atualizar server.ts**:
```typescript
import RedisStore from 'connect-redis';
import { createClient } from 'redis';

// Create Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL // Add this to Render env vars
});

redisClient.connect().catch(console.error);

// Use Redis store
app.use(session({
  store: new RedisStore({
    client: redisClient,
    prefix: 'adbot:sess:'
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    secure: true,
    sameSite: 'none',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));
```

4. **Adicionar variável de ambiente no Render**:
   - `REDIS_URL` = (Internal Redis URL do Render)

## Verificação

Após deploy, teste novamente:
1. Login
2. Navegue para Dashboard
3. Recarregue a página (F5)
4. **Deve continuar logado** ✅

## Troubleshooting

Se ainda não funcionar:

### Verificar Cookies no Browser
1. DevTools > Application > Cookies
2. Procure por `adbot.sid`
3. Verifique:
   - `Secure`: Yes
   - `SameSite`: None
   - `HttpOnly`: Yes

### Verificar Headers
Network > Request Headers devem incluir:
```
Cookie: adbot.sid=s%3A...
```

Response Headers devem incluir:
```
Set-Cookie: adbot.sid=s%3A...; Path=/; HttpOnly; Secure; SameSite=None
```

### Logs do Backend
No Render, verifique se aparecem:
```
🌐 CORS check for origin: https://adbot-lives.vercel.app
✅ Login successful for user: admin { sessionID: '...' }
🔒 Auth middleware check: { authenticated: true }
```
