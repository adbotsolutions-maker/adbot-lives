# PRD-5: Roadmap de Implementação

[← Voltar ao Índice](./PRD.md)

---

## 1. Timeline Geral - 12 Semanas

```
┌─────────────────────────────────────────────────────────────────┐
│                     ROADMAP 12 SEMANAS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Semana 1-2   │ Setup & Fundações                               │
│  Semana 3-4   │ Core Features (Live Control + VPS)              │
│  Semana 5-6   │ YouTube Integration                             │
│  Semana 7-8   │ Analytics & Content Management                  │
│  Semana 9-10  │ Advanced Features & Automação                   │
│  Semana 11-12 │ Testing, Polish & Deploy                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Fase 1: Setup & Fundações (Semanas 1-2)

### Semana 1: Ambiente de Desenvolvimento

#### Dia 1-2: Setup do Projeto
```bash
# Frontend
pnpm create vite@latest adbot-lives-dashboard --template react-ts
cd adbot-lives-dashboard
pnpm install

# Dependências principais
pnpm add react-router-dom zustand @tanstack/react-query
pnpm add tailwindcss postcss autoprefixer
pnpm add socket.io-client xterm @xterm/addon-fit
pnpm add lucide-react recharts framer-motion
pnpm add react-hook-form zod @hookform/resolvers
pnpm add axios date-fns

# Dev dependencies
pnpm add -D @types/node
```

**Estrutura Inicial:**
```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── layout/          # Layout components
│   └── features/        # Feature-specific components
├── pages/
│   ├── Dashboard.tsx
│   ├── LiveControl.tsx
│   ├── Analytics.tsx
│   └── Settings.tsx
├── services/
│   ├── api.ts
│   ├── websocket.ts
│   └── youtube.ts
├── stores/
│   ├── authStore.ts
│   ├── liveStore.ts
│   └── vpsStore.ts
├── types/
│   └── index.ts
├── utils/
│   └── helpers.ts
└── App.tsx
```

**Tasks:**
- [x] Criar projeto Vite
- [x] Configurar TypeScript
- [x] Setup Tailwind CSS
- [x] Instalar shadcn/ui
- [x] Configurar ESLint & Prettier
- [x] Setup Git & .gitignore
- [x] Criar estrutura de pastas

#### Dia 3-4: Backend Setup
```bash
# Backend
mkdir backend && cd backend
pnpm init
pnpm add express cors dotenv
pnpm add googleapis socket.io ssh2
pnpm add zod express-validator
pnpm add drizzle-orm postgres
pnpm add @upstash/redis
pnpm add passport passport-google-oauth20

# Dev dependencies
pnpm add -D typescript @types/node @types/express
pnpm add -D tsx nodemon
pnpm add -D drizzle-kit
```

**Estrutura Backend:**
```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   └── youtube.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── broadcasts.ts
│   │   ├── vps.ts
│   │   └── analytics.ts
│   ├── services/
│   │   ├── youtube/
│   │   ├── ssh/
│   │   └── analytics/
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── validation.ts
│   │   └── rateLimiter.ts
│   ├── db/
│   │   ├── schema.ts
│   │   └── migrations/
│   └── server.ts
├── package.json
└── tsconfig.json
```

**Tasks:**
- [x] Criar projeto Node.js
- [x] Configurar TypeScript
- [x] Setup Express.js
- [x] Configurar Drizzle ORM
- [x] Conectar Supabase (PostgreSQL)
- [x] Conectar Upstash (Redis)
- [x] Configurar variáveis de ambiente

#### Dia 5-7: Autenticação & Database

**Database Schema (Drizzle):**
```typescript
// db/schema.ts
import { pgTable, uuid, varchar, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }),
  googleId: varchar('google_id', { length: 255 }).unique(),
  youtubeChannelId: varchar('youtube_channel_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const credentials = pgTable('credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  accessToken: varchar('access_token'),
  refreshToken: varchar('refresh_token'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow()
});
```

**Google OAuth Setup:**
```typescript
// config/passport.ts
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: '/api/v1/auth/google/callback',
    scope: ['profile', 'email', ...YOUTUBE_SCOPES]
  },
  async (accessToken, refreshToken, profile, done) => {
    // Salvar ou atualizar usuário
    const user = await findOrCreateUser(profile, accessToken, refreshToken);
    done(null, user);
  }
));
```

**Tasks:**
- [x] Implementar schema do banco
- [x] Criar migrations
- [x] Setup Google OAuth
- [x] Implementar auth routes
- [x] Implementar JWT/session
- [x] Testar fluxo de login

---

### Semana 2: Core Infrastructure

#### Dia 8-10: YouTube API Integration

**YouTube Service Base:**
```typescript
// services/youtube/client.ts
import { google } from 'googleapis';

export class YouTubeClient {
  private auth: OAuth2Client;
  private youtube: youtube_v3.Youtube;
  
  constructor(accessToken: string, refreshToken: string) {
    this.auth = new google.auth.OAuth2();
    this.auth.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
    this.youtube = google.youtube({ version: 'v3', auth: this.auth });
  }
  
  async refreshTokenIfNeeded() {
    const tokenInfo = await this.auth.getTokenInfo(this.auth.credentials.access_token!);
    if (tokenInfo.expiry_date! < Date.now() + 300000) { // 5 min antes
      const { credentials } = await this.auth.refreshAccessToken();
      this.auth.setCredentials(credentials);
      return credentials;
    }
    return null;
  }
}
```

**Tasks:**
- [x] Implementar YouTubeClient base
- [x] Setup token refresh automático
- [x] Implementar quota tracking
- [x] Implementar cache layer (Redis)
- [x] Testar criação de broadcast
- [x] Testar transições de estado

#### Dia 11-12: SSH/VPS Integration

**SSH Service:**
```typescript
// services/ssh/client.ts
import { Client } from 'ssh2';

export class SSHClient {
  private conn: Client;
  
  async connect(config: SSHConfig) {
    return new Promise((resolve, reject) => {
      this.conn = new Client();
      this.conn.on('ready', () => resolve(true));
      this.conn.on('error', (err) => reject(err));
      this.conn.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        privateKey: config.privateKey
      });
    });
  }
  
  async executeCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.conn.exec(command, (err, stream) => {
        if (err) return reject(err);
        
        let output = '';
        stream.on('data', (data: Buffer) => {
          output += data.toString();
        });
        
        stream.on('close', () => {
          resolve(output);
        });
      });
    });
  }
  
  async startLiveService(videoPath: string, streamKey: string) {
    const command = `systemctl start youtube-live.service`;
    return await this.executeCommand(command);
  }
}
```

**WebSocket Terminal:**
```typescript
// routes/ws/terminal.ts
import { Server } from 'socket.io';

export const setupTerminalWebSocket = (io: Server) => {
  io.on('connection', (socket) => {
    let sshClient: SSHClient;
    let stream: any;
    
    socket.on('auth', async (credentials) => {
      sshClient = new SSHClient();
      await sshClient.connect(credentials);
      
      sshClient.conn.shell((err, str) => {
        stream = str;
        
        stream.on('data', (data: Buffer) => {
          socket.emit('terminal:output', data.toString());
        });
      });
    });
    
    socket.on('terminal:input', (data) => {
      if (stream) {
        stream.write(data);
      }
    });
    
    socket.on('disconnect', () => {
      if (stream) stream.end();
      if (sshClient) sshClient.disconnect();
    });
  });
};
```

**Tasks:**
- [x] Implementar SSHClient
- [x] Setup WebSocket para terminal
- [x] Implementar comandos systemd
- [x] Testar execução de comandos
- [x] Implementar upload de vídeos (SCP)
- [x] Segurança: whitelist de comandos

#### Dia 13-14: Frontend Base

**Auth Flow:**
```typescript
// stores/authStore.ts
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  
  login: () => {
    window.location.href = `${API_URL}/auth/google`;
  },
  
  logout: async () => {
    await fetch(`${API_URL}/auth/logout`, { method: 'POST' });
    set({ user: null, isAuthenticated: false });
  }
}));
```

**API Client:**
```typescript
// services/api.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true
});

// Interceptor para refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Tentar refresh
      await fetch(`${API_URL}/auth/refresh`, { method: 'POST' });
      return apiClient.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

**Tasks:**
- [x] Implementar auth store
- [x] Implementar API client
- [x] Criar layout base
- [x] Implementar routing
- [x] Criar componentes base
- [x] Protected routes

---

## 3. Fase 2: Core Features (Semanas 3-4)

### Semana 3: Live Control Module

#### Dia 15-17: Interface de Controle

**LiveControl Component:**
```tsx
// pages/LiveControl.tsx
export const LiveControl = () => {
  const { currentBroadcast, startLive, stopLive, isLive } = useLiveStore();
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  
  const handleStart = async () => {
    if (!selectedVideo) return;
    await startLive(selectedVideo.id);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Controle de Transmissão</CardTitle>
        </CardHeader>
        <CardContent>
          <VideoSelector value={selectedVideo} onChange={setSelectedVideo} />
          
          <div className="flex gap-4 mt-4">
            <Button 
              onClick={handleStart} 
              disabled={!selectedVideo || isLive}
              size="lg"
            >
              <Play className="mr-2" /> Iniciar Live
            </Button>
            
            <Button 
              onClick={stopLive} 
              disabled={!isLive}
              variant="destructive"
              size="lg"
            >
              <Square className="mr-2" /> Finalizar Live
            </Button>
          </div>
          
          {isLive && (
            <LiveStatus broadcast={currentBroadcast} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
```

**Tasks:**
- [x] Criar LiveControl page
- [x] Implementar botões de controle
- [x] Integrar com API
- [x] Feedback de loading/error
- [x] Preview de vídeo
- [x] Status indicator

#### Dia 18-19: Stream Configuration

**StreamConfigForm:**
```tsx
// components/features/StreamConfigForm.tsx
const streamConfigSchema = z.object({
  resolution: z.enum(['720p', '1080p']),
  bitrate: z.enum(['2000k', '3000k', '4500k', '6000k']),
  preset: z.enum(['ultrafast', 'veryfast', 'fast']),
  audioBitrate: z.enum(['96k', '128k', '192k'])
});

export const StreamConfigForm = ({ onSubmit }: Props) => {
  const form = useForm({
    resolver: zodResolver(streamConfigSchema),
    defaultValues: {
      resolution: '1080p',
      bitrate: '3000k',
      preset: 'veryfast',
      audioBitrate: '128k'
    }
  });
  
  return (
    <Form {...form}>
      {/* Form fields */}
    </Form>
  );
};
```

**Tasks:**
- [x] Criar form de configuração
- [x] Validação com Zod
- [x] Presets pré-configurados
- [x] Salvar templates
- [x] Load de templates salvos

#### Dia 20-21: VPS Terminal

**Terminal Component:**
```tsx
// components/features/Terminal.tsx
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { useEffect, useRef } from 'react';

export const VPSTerminal = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal>();
  const { socket } = useWebSocket();
  
  useEffect(() => {
    if (!terminalRef.current) return;
    
    terminal.current = new Terminal({
      theme: { background: '#1e1e1e' },
      fontSize: 14,
      fontFamily: 'Monaco, monospace'
    });
    
    const fitAddon = new FitAddon();
    terminal.current.loadAddon(fitAddon);
    terminal.current.open(terminalRef.current);
    fitAddon.fit();
    
    // WebSocket events
    socket.on('terminal:output', (data) => {
      terminal.current?.write(data);
    });
    
    terminal.current.onData((data) => {
      socket.emit('terminal:input', data);
    });
    
    return () => {
      terminal.current?.dispose();
    };
  }, []);
  
  return <div ref={terminalRef} className="h-full" />;
};
```

**Tasks:**
- [x] Integrar xterm.js
- [x] WebSocket connection
- [x] Comandos pré-configurados
- [x] Histórico de comandos
- [x] Copy/paste support
- [x] Theme toggle

---

### Semana 4: YouTube Integration

#### Dia 22-24: Broadcast Creation

**BroadcastForm Component:**
```tsx
// components/features/BroadcastForm.tsx
export const BroadcastForm = ({ onSuccess }: Props) => {
  const { mutate: createBroadcast, isPending } = useCreateBroadcast();
  
  const form = useForm<BroadcastFormData>({
    resolver: zodResolver(broadcastSchema)
  });
  
  const onSubmit = (data: BroadcastFormData) => {
    createBroadcast(data, {
      onSuccess: (broadcast) => {
        toast.success('Live criada com sucesso!');
        onSuccess(broadcast);
      }
    });
  };
  
  return (
    <Form {...form}>
      <FormField name="title" label="Título" />
      <FormField name="description" label="Descrição" />
      <FormField name="category" label="Categoria" />
      <TagsInput name="tags" />
      <ThumbnailUpload name="thumbnail" />
      {/* ... */}
    </Form>
  );
};
```

**Tasks:**
- [x] Criar form de broadcast
- [x] Upload de thumbnail
- [x] Tag selector
- [x] Category selector
- [x] Privacy settings
- [x] Schedule picker

#### Dia 25-26: Metadata Management

**SEO Optimizer:**
```tsx
// components/features/SEOOptimizer.tsx
export const SEOOptimizer = ({ data, onChange }: Props) => {
  const analysis = useSEOAnalysis(data);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>SEO Score: {analysis.score}/100</CardTitle>
      </CardHeader>
      <CardContent>
        <Progress value={analysis.score} />
        
        <div className="mt-4 space-y-2">
          {analysis.suggestions.map((suggestion) => (
            <Alert key={suggestion.id}>
              <AlertTitle>{suggestion.title}</AlertTitle>
              <AlertDescription>{suggestion.description}</AlertDescription>
            </Alert>
          ))}
        </div>
        
        <SEOChecklist checks={analysis.checks} />
      </CardContent>
    </Card>
  );
};
```

**Tasks:**
- [x] SEO analysis engine
- [x] Sugestões automáticas
- [x] Templates de metadata
- [x] Gerador de hashtags
- [x] Character counters

#### Dia 27-28: Integration Testing

**E2E Flow Test:**
```typescript
describe('Live Start Flow', () => {
  it('should create broadcast, upload video, and start live', async () => {
    // 1. Login
    await login();
    
    // 2. Upload video
    const video = await uploadVideo('test-video.mp4');
    
    // 3. Create broadcast
    const broadcast = await createBroadcast({
      title: 'Test Live',
      description: 'Test'
    });
    
    // 4. Start live
    await startLive(broadcast.id, video.id);
    
    // 5. Verify status
    const status = await getBroadcastStatus(broadcast.id);
    expect(status).toBe('live');
  });
});
```

**Tasks:**
- [x] Unit tests
- [x] Integration tests
- [x] E2E tests
- [x] Error handling
- [x] Loading states
- [x] Bug fixes

---

## 4. Fase 3: Analytics & Content (Semanas 5-6)

### Semana 5: Analytics Dashboard

**Tasks:**
- [ ] Real-time metrics component
- [ ] Charts integration (Recharts)
- [ ] Historical data view
- [ ] Revenue tracking
- [ ] Engagement metrics
- [ ] Export functionality

### Semana 6: Content Management

**Tasks:**
- [ ] Video library
- [ ] Upload manager
- [ ] Template system
- [ ] Template marketplace UI
- [ ] Scheduler interface
- [ ] Calendar view

---

## 5. Fase 4: Advanced Features (Semanas 7-8)

### Semana 7: Automation

**Tasks:**
- [ ] Cron job scheduler
- [ ] Auto-start lives
- [ ] Content rotation
- [ ] Notification system
- [ ] Alerting (downtime, errors)

### Semana 8: Optimization

**Tasks:**
- [ ] Performance optimization
- [ ] Code splitting
- [ ] Lazy loading
- [ ] Cache optimization
- [ ] Bundle size reduction

---

## 6. Fase 5: Polish & Deploy (Semanas 9-10)

### Semana 9: Testing & Refinement

**Tasks:**
- [ ] Full E2E testing
- [ ] Performance testing
- [ ] Security audit
- [ ] Bug fixes
- [ ] UI/UX refinements

### Semana 10: Deploy

**Tasks:**
- [ ] Setup CI/CD
- [ ] Deploy frontend (Vercel)
- [ ] Deploy backend (Railway)
- [ ] Database migrations
- [ ] DNS configuration
- [ ] SSL certificates
- [ ] Monitoring setup

---

**Próximo:** [PRD-6: Analytics e Métricas →](./PRD-6-ANALYTICS-METRICAS.md)
