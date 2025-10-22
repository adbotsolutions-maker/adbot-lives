# PRD-3: Arquitetura Técnica

[← Voltar ao Índice](./PRD.md)

---

## 1. Stack Tecnológica Completa

### 1.1 Frontend

#### Framework Core
```json
{
  "framework": "Vite 5.x + React 18.x",
  "language": "TypeScript 5.x",
  "buildTool": "Vite (ESBuild)",
  "packageManager": "pnpm"
}
```

**Justificativa Vite:**
- ⚡ Build extremamente rápido (ESBuild)
- 🔥 Hot Module Replacement (HMR) instantâneo
- 📦 Otimização de bundle automática
- 🎯 Tree-shaking eficiente
- 💻 Dev server performático
- 🔧 Configuração simples e intuitiva

#### UI & Styling
```json
{
  "styling": "Tailwind CSS 3.x",
  "components": "shadcn/ui",
  "icons": "Lucide React",
  "charts": "Recharts",
  "animations": "Framer Motion"
}
```

**shadcn/ui Benefits:**
- Componentes copiáveis (não biblioteca)
- Totalmente customizável
- Acessibilidade built-in (ARIA)
- Componentes com Radix UI
- Dark mode nativo
- TypeScript first

#### State Management
```json
{
  "global": "Zustand",
  "server": "TanStack Query (React Query)",
  "forms": "React Hook Form + Zod"
}
```

**Zustand:** State management minimalista
```typescript
// stores/liveStore.ts
import { create } from 'zustand';

interface LiveState {
  isLive: boolean;
  viewers: number;
  duration: number;
  currentVideo: Video | null;
  
  startLive: (videoId: string) => Promise<void>;
  stopLive: () => Promise<void>;
  updateMetrics: (metrics: Metrics) => void;
}

export const useLiveStore = create<LiveState>((set, get) => ({
  isLive: false,
  viewers: 0,
  duration: 0,
  currentVideo: null,
  
  startLive: async (videoId) => {
    // implementation
  },
  
  stopLive: async () => {
    // implementation
  },
  
  updateMetrics: (metrics) => set({ ...metrics })
}));
```

**TanStack Query:** Data fetching & caching
```typescript
// hooks/useLiveMetrics.ts
import { useQuery } from '@tanstack/react-query';

export const useLiveMetrics = () => {
  return useQuery({
    queryKey: ['liveMetrics'],
    queryFn: fetchLiveMetrics,
    refetchInterval: 30000, // 30s
    staleTime: 25000,
  });
};
```

#### Terminal & SSH
```json
{
  "terminal": "xterm.js 5.x",
  "terminalAddons": ["xterm-addon-fit", "xterm-addon-web-links"],
  "ssh": "WebSocket connection to backend"
}
```

#### Real-time Communication
```json
{
  "websocket": "Socket.io Client",
  "protocol": "Socket.io",
  "fallback": "Long polling"
}
```

---

### 1.2 Backend

#### Runtime & Framework
```json
{
  "runtime": "Node.js 20 LTS",
  "framework": "Express.js 4.x",
  "language": "TypeScript 5.x",
  "processManager": "PM2"
}
```

#### APIs & Integrations
```typescript
// Backend API Structure
{
  "youtube": "googleapis (YouTube Data API v3)",
  "ssh": "ssh2",
  "websocket": "socket.io",
  "validation": "zod",
  "auth": "passport.js (Google OAuth 2.0)"
}
```

#### Database & Cache
```json
{
  "primary": "PostgreSQL 15+ (Supabase)",
  "cache": "Redis 7.x (Upstash)",
  "orm": "Drizzle ORM"
}
```

**Justificativa PostgreSQL:**
- Relacional para dados estruturados
- JSON support para metadata flexível
- Triggers e functions para automação
- Full-text search para logs
- Row-level security (RLS) com Supabase

**Redis Use Cases:**
- Cache de YouTube API responses
- Session storage
- Rate limiting
- Real-time metrics buffer
- Job queue (Bull)

---

### 1.3 Infraestrutura

#### VPS Configuration
```yaml
vps:
  provider: Hostinger
  os: Ubuntu 22.04 LTS
  specs:
    cpu: 4+ cores
    ram: 8GB+
    storage: 200GB+ SSD
    bandwidth: 10TB+
  
  software:
    streaming:
      - ffmpeg (latest)
      - obs-studio (optional)
    
    system:
      - systemd
      - nginx
      - python3 (Flask API)
    
    monitoring:
      - htop
      - iotop
      - nethogs
```

#### Deployment
```json
{
  "frontend": "Vercel / Netlify",
  "backend": "Railway / Render / Fly.io",
  "database": "Supabase (PostgreSQL)",
  "cache": "Upstash (Redis)",
  "storage": "Cloudflare R2 / Backblaze B2"
}
```

---

## 2. Arquitetura de Sistema

### 2.1 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│                   (Browser - React + Vite)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Pages     │  │ Components  │  │   Stores    │             │
│  │             │  │             │  │             │             │
│  │ - Dashboard │  │ - LiveCard  │  │ - liveStore │             │
│  │ - Settings  │  │ - Terminal  │  │ - authStore │             │
│  │ - Analytics │  │ - Charts    │  │ - vpsStore  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                   │
│  ┌─────────────────────────────────────────────────────┐        │
│  │              Services Layer                          │        │
│  │  - apiClient.ts  - wsClient.ts  - sshClient.ts      │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS / WSS
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                         API LAYER                                │
│                   (Node.js + Express)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │                   Routes                              │       │
│  │  /api/v1/                                            │       │
│  │    ├── auth/        (Google OAuth)                   │       │
│  │    ├── live/        (CRUD broadcasts)                │       │
│  │    ├── vps/         (SSH commands)                   │       │
│  │    ├── analytics/   (YouTube Analytics)              │       │
│  │    ├── videos/      (Library management)             │       │
│  │    └── templates/   (Template CRUD)                  │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Services   │  │ Middleware   │  │   Workers    │          │
│  │              │  │              │  │              │          │
│  │ - YouTube    │  │ - Auth       │  │ - Scheduler  │          │
│  │ - SSH        │  │ - Validation │  │ - Metrics    │          │
│  │ - Analytics  │  │ - RateLimit  │  │ - Notifier   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
└──────────┬──────────────────────┬──────────────────────┬────────┘
           │                      │                      │
           │                      │                      │
┌──────────▼────────┐  ┌─────────▼────────┐  ┌─────────▼────────┐
│   PostgreSQL      │  │      Redis       │  │  YouTube APIs    │
│   (Supabase)      │  │    (Upstash)     │  │                  │
│                   │  │                  │  │  - Data v3       │
│  - Users          │  │  - Cache         │  │  - Analytics     │
│  - Lives          │  │  - Sessions      │  │  - Reporting     │
│  - Videos         │  │  - Metrics       │  │                  │
│  - Templates      │  │  - Jobs Queue    │  │                  │
│  - Analytics      │  │                  │  │                  │
└───────────────────┘  └──────────────────┘  └──────────────────┘
                                                       │
                                                       │
                                            ┌──────────▼──────────┐
                                            │   VPS Hostinger     │
                                            │                     │
                                            │  - FFmpeg           │
                                            │  - systemd          │
                                            │  - Flask API        │
                                            │  - Video Storage    │
                                            └─────────────────────┘
```

---

### 2.2 Data Flow

#### Live Start Flow
```
┌──────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│  Client  │         │ Backend  │         │ YouTube  │         │   VPS    │
└────┬─────┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │                    │
     │ 1. Start Live      │                    │                    │
     ├───────────────────>│                    │                    │
     │                    │                    │                    │
     │                    │ 2. Create Broadcast│                    │
     │                    ├───────────────────>│                    │
     │                    │                    │                    │
     │                    │ 3. Broadcast Data  │                    │
     │                    │<───────────────────┤                    │
     │                    │                    │                    │
     │                    │ 4. SSH: Start FFmpeg                    │
     │                    ├────────────────────────────────────────>│
     │                    │                    │                    │
     │                    │           5. FFmpeg streaming to YT     │
     │                    │                    │<───────────────────┤
     │                    │                    │                    │
     │ 6. Live Started    │                    │                    │
     │<───────────────────┤                    │                    │
     │                    │                    │                    │
     │ 7. WebSocket: Status Updates             │                    │
     │<─ ─ ─ ─ ─ ─ ─ ─ ─ ┤                    │                    │
     │                    │                    │                    │
```

#### Metrics Update Flow
```
┌──────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│  Client  │         │ Backend  │         │  Redis   │         │ YouTube  │
└────┬─────┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │                    │
     │                    │ (Every 30s)        │                    │
     │                    │ 1. Fetch Metrics   │                    │
     │                    ├───────────────────────────────────────>│
     │                    │                    │                    │
     │                    │ 2. Metrics Data    │                    │
     │                    │<───────────────────────────────────────┤
     │                    │                    │                    │
     │                    │ 3. Cache Metrics   │                    │
     │                    ├───────────────────>│                    │
     │                    │                    │                    │
     │                    │ 4. WS: Push Update │                    │
     │                    ├───────────────────>│                    │
     │                    │                    │                    │
     │ 5. Real-time Update│                    │                    │
     │<───────────────────┤                    │                    │
     │                    │                    │                    │
```

---

### 2.3 Database Schema

#### Core Tables

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  google_id VARCHAR(255) UNIQUE,
  youtube_channel_id VARCHAR(255),
  
  -- Settings
  timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
  theme VARCHAR(20) DEFAULT 'dark',
  notifications_enabled BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- API Credentials (encrypted)
CREATE TABLE credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  type VARCHAR(50) NOT NULL, -- 'youtube', 'vps_ssh', etc
  
  -- Encrypted fields
  access_token TEXT,
  refresh_token TEXT,
  ssh_private_key TEXT,
  
  expires_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, type)
);

-- VPS Servers
CREATE TABLE vps_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  host VARCHAR(255) NOT NULL,
  port INTEGER DEFAULT 22,
  username VARCHAR(100) NOT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_ping TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Videos
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  
  -- File info
  size_bytes BIGINT,
  duration_seconds INTEGER,
  resolution VARCHAR(20), -- '1080p', '720p'
  codec VARCHAR(50),
  fps INTEGER,
  
  -- Storage
  storage_path TEXT NOT NULL,
  vps_server_id UUID REFERENCES vps_servers(id),
  
  -- Metadata
  title VARCHAR(255),
  description TEXT,
  tags TEXT[], -- Array of tags
  thumbnail_url TEXT,
  
  -- Status
  upload_status VARCHAR(50) DEFAULT 'uploading',
  is_available BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Live Broadcasts
CREATE TABLE broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id),
  vps_server_id UUID REFERENCES vps_servers(id),
  
  -- YouTube Data
  youtube_broadcast_id VARCHAR(255) UNIQUE,
  youtube_stream_id VARCHAR(255),
  stream_key TEXT,
  
  -- Metadata
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  tags TEXT[],
  privacy_status VARCHAR(20) DEFAULT 'public',
  
  -- Streaming Config (JSONB for flexibility)
  stream_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Scheduling
  scheduled_start_time TIMESTAMP,
  scheduled_end_time TIMESTAMP,
  actual_start_time TIMESTAMP,
  actual_end_time TIMESTAMP,
  
  -- Status
  status VARCHAR(50) DEFAULT 'created', 
  -- 'created', 'scheduled', 'live', 'paused', 'ended', 'error'
  
  error_message TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Analytics (Time-series data)
CREATE TABLE analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID REFERENCES broadcasts(id) ON DELETE CASCADE,
  
  -- Timestamp
  snapshot_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Metrics
  concurrent_viewers INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  dislikes INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  watch_time_minutes DECIMAL(12,2) DEFAULT 0,
  
  -- Engagement
  chat_messages INTEGER DEFAULT 0,
  new_subscribers INTEGER DEFAULT 0,
  
  -- Revenue (estimated)
  estimated_revenue DECIMAL(10,2) DEFAULT 0,
  cpm DECIMAL(10,2) DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Index for time-series queries
  INDEX idx_broadcast_time (broadcast_id, snapshot_at DESC)
);

-- Templates
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  
  -- Template Data
  stream_config JSONB NOT NULL,
  broadcast_metadata JSONB NOT NULL,
  
  -- Stats
  usage_count INTEGER DEFAULT 0,
  
  -- Sharing
  is_public BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Schedules
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES templates(id),
  video_id UUID REFERENCES videos(id),
  
  name VARCHAR(255) NOT NULL,
  
  -- Recurrence
  frequency VARCHAR(50) NOT NULL, -- 'once', 'daily', 'weekly', 'custom'
  cron_expression VARCHAR(100), -- For custom schedules
  
  -- Time
  start_time TIME,
  duration_minutes INTEGER,
  timezone VARCHAR(50),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  next_execution TIMESTAMP,
  last_execution TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Activity Logs (Audit trail)
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  
  details JSONB,
  
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_user_created (user_id, created_at DESC)
);
```

#### Indexes & Performance

```sql
-- Composite indexes for common queries
CREATE INDEX idx_broadcasts_user_status ON broadcasts(user_id, status);
CREATE INDEX idx_broadcasts_scheduled ON broadcasts(scheduled_start_time) 
  WHERE status = 'scheduled';

-- Full-text search
CREATE INDEX idx_videos_search ON videos 
  USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Partial indexes
CREATE INDEX idx_active_broadcasts ON broadcasts(id) 
  WHERE status IN ('live', 'scheduled');
```

---

### 2.4 API Endpoints

#### Authentication
```typescript
POST   /api/v1/auth/google           // OAuth login
POST   /api/v1/auth/refresh          // Refresh token
POST   /api/v1/auth/logout           // Logout
GET    /api/v1/auth/me               // Get current user
```

#### Broadcasts
```typescript
GET    /api/v1/broadcasts            // List all broadcasts
POST   /api/v1/broadcasts            // Create broadcast
GET    /api/v1/broadcasts/:id        // Get broadcast details
PATCH  /api/v1/broadcasts/:id        // Update broadcast
DELETE /api/v1/broadcasts/:id        // Delete broadcast

POST   /api/v1/broadcasts/:id/start  // Start live
POST   /api/v1/broadcasts/:id/stop   // Stop live
POST   /api/v1/broadcasts/:id/pause  // Pause live

GET    /api/v1/broadcasts/:id/status // Get real-time status
GET    /api/v1/broadcasts/:id/metrics // Get metrics
```

#### Videos
```typescript
GET    /api/v1/videos                // List videos
POST   /api/v1/videos/upload         // Upload video
GET    /api/v1/videos/:id            // Get video details
PATCH  /api/v1/videos/:id            // Update video metadata
DELETE /api/v1/videos/:id            // Delete video

GET    /api/v1/videos/:id/thumbnail  // Get thumbnail
```

#### VPS Management
```typescript
GET    /api/v1/vps/servers           // List VPS servers
POST   /api/v1/vps/servers           // Add VPS server
GET    /api/v1/vps/servers/:id       // Get server details
DELETE /api/v1/vps/servers/:id       // Remove server

POST   /api/v1/vps/servers/:id/test  // Test connection
POST   /api/v1/vps/servers/:id/exec  // Execute command

GET    /api/v1/vps/servers/:id/services      // List systemd services
POST   /api/v1/vps/servers/:id/services/:name/start
POST   /api/v1/vps/servers/:id/services/:name/stop
POST   /api/v1/vps/servers/:id/services/:name/restart
GET    /api/v1/vps/servers/:id/services/:name/logs

WS     /api/v1/vps/servers/:id/terminal      // WebSocket terminal
```

#### Analytics
```typescript
GET    /api/v1/analytics/broadcasts/:id      // Broadcast analytics
GET    /api/v1/analytics/broadcasts/:id/realtime  // Real-time metrics
GET    /api/v1/analytics/overview            // User overview
GET    /api/v1/analytics/revenue              // Revenue metrics

GET    /api/v1/analytics/export              // Export data (CSV/JSON)
```

#### Templates
```typescript
GET    /api/v1/templates                     // List templates
POST   /api/v1/templates                     // Create template
GET    /api/v1/templates/:id                 // Get template
PATCH  /api/v1/templates/:id                 // Update template
DELETE /api/v1/templates/:id                 // Delete template

GET    /api/v1/templates/public              // Public marketplace
POST   /api/v1/templates/:id/clone           // Clone template
```

#### Schedules
```typescript
GET    /api/v1/schedules                     // List schedules
POST   /api/v1/schedules                     // Create schedule
GET    /api/v1/schedules/:id                 // Get schedule
PATCH  /api/v1/schedules/:id                 // Update schedule
DELETE /api/v1/schedules/:id                 // Delete schedule

POST   /api/v1/schedules/:id/toggle          // Enable/disable
GET    /api/v1/schedules/upcoming            // Next executions
```

---

### 2.5 WebSocket Events

#### Client → Server
```typescript
// Connection
'auth'              // Authenticate WS connection
'join:broadcast'    // Subscribe to broadcast updates
'leave:broadcast'   // Unsubscribe from broadcast

// Terminal
'terminal:input'    // Send command to terminal
'terminal:resize'   // Resize terminal

// Ping
'ping'              // Keep-alive ping
```

#### Server → Client
```typescript
// Authentication
'authenticated'     // Auth successful
'unauthorized'      // Auth failed

// Broadcast Updates
'broadcast:status'  // Status change (live, stopped, error)
'broadcast:metrics' // Real-time metrics update

// Terminal
'terminal:output'   // Terminal output data
'terminal:error'    // Terminal error

// Notifications
'notification'      // General notifications
'error'             // Error messages

// Ping
'pong'              // Keep-alive response
```

---

**Próximo:** [PRD-4: Integração com APIs →](./PRD-4-INTEGRACAO-APIS.md)
