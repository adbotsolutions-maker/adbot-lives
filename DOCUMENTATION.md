# AdBot Lives - Technical Documentation

Complete system for automated YouTube live streaming management with integrated VPS control.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Development Setup](#3-development-setup)
4. [YouTube Data API v3](#4-youtube-data-api-v3)
5. [Deployment Strategy](#5-deployment-strategy)
6. [Environment Variables](#6-environment-variables)

---

## 1. Architecture Overview

### System Components

```
Frontend (React + Vite)  <--HTTPS/WSS-->  Backend (Node.js + Express)
    localhost:5173                            localhost:3001
         |                                          |
         |                                          |
         +-- Pages                                  +-- Routes
         |   - Dashboard                            |   - /api/auth/*
         |   - LiveControl                          |   - /api/live/*
         |   - Analytics                            |   - /api/broadcasts/*
         |   - Settings                             |   - /api/analytics/*
         |                                          |   - /api/drive/*
         +-- Stores (Zustand)                       |   - /api/ssh/*
             - authStore                            |
             - liveStore                            +-- Services
                                                    |   - YouTubeService
                                                    |   - VPSService
                                                    |   - GoogleDriveService
                                                    |
                                                    +-- Middleware
                                                        - auth
                                                        - CORS
                                                        - sessions
                    |                                   |
                    |                                   |
                    v                                   v
            YouTube Data API v3              VPS Server (Hostinger)
            - Live Streaming API             - FFmpeg
            - Analytics API                  - Ubuntu 22.04
            - Google Drive API               - systemd
```

### Data Flow: Create and Start Live

1. Client sends POST request to `/api/live/create-and-start`
2. Backend creates broadcast via `liveBroadcasts.insert`
3. Backend creates stream via `liveStreams.insert`
4. Backend binds broadcast to stream via `liveBroadcasts.bind`
5. Backend connects to VPS via SSH
6. Backend downloads media from Google Drive (if provided)
7. Backend starts FFmpeg on VPS with RTMP stream
8. Backend transitions broadcast to 'testing' status
9. Wait 10 seconds for stream stabilization
10. Backend transitions broadcast to 'live' status
11. WebSocket notifies frontend of live status
12. Backend polls YouTube API every 30s for metrics

---

## 2. Technology Stack

### Frontend (Dashboard)

```
Framework:        React 19.1.1 + Vite 7.1.7
Language:         TypeScript 5.9.3
Styling:          Tailwind CSS 4.1.15
State:            Zustand 5.0.8
Routing:          React Router DOM 7.9.4
Data Fetching:    TanStack Query 5.90.5
Charts:           Recharts 3.3.0
WebSocket:        Socket.io Client 4.8.1
Terminal:         xterm 5.3.0
HTTP Client:      Axios 1.12.2
```

**Directory Structure:**

```
dashboard/
├── src/
│   ├── components/
│   │   ├── Layout.tsx
│   │   └── ProtectedRoute.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── LiveControl.tsx
│   │   ├── Analytics.tsx
│   │   └── Settings.tsx
│   ├── stores/
│   │   ├── authStore.ts
│   │   └── liveStore.ts
│   ├── App.tsx
│   └── main.tsx
├── vite.config.ts
└── package.json
```

### Backend (API)

```
Runtime:          Node.js 20+
Framework:        Express 5.1.0
Language:         TypeScript 5.9.3
YouTube API:      googleapis 164.1.0
SSH Client:       ssh2 1.17.0
WebSocket:        socket.io 4.8.1
Sessions:         express-session 1.18.2
CORS:             cors 2.8.5
```

**Directory Structure:**

```
backend/
├── src/
│   ├── services/
│   │   ├── YouTubeService.ts
│   │   ├── VPSService.ts
│   │   └── GoogleDriveService.ts
│   ├── middleware/
│   │   └── auth.ts
│   └── server.ts
├── tsconfig.json
└── package.json
```

### VPS Configuration

```
OS:               Ubuntu 22.04 LTS
Video Encoder:    FFmpeg (latest)
Process Manager:  systemd
Storage:          /root/videos/ (video files)
                  /root/audio/ (audio files)
```

---

## 3. Development Setup

### Prerequisites

- Node.js 20.x or higher
- npm or pnpm
- VPS with SSH access
- Google Cloud Console project with YouTube API enabled

### Installation Steps

**1. Backend Setup**

```powershell
cd backend
npm install
Copy-Item .env.example .env
# Edit .env with your credentials
npm run dev
```

Backend runs at: http://localhost:3001

**2. Frontend Setup**

```powershell
cd dashboard
npm install
npm run dev
```

Frontend runs at: http://localhost:5173

### Configure Google Cloud Console

1. Create project at https://console.cloud.google.com
2. Enable APIs:
   - YouTube Data API v3
   - YouTube Analytics API
   - Google Drive API
3. Create OAuth 2.0 credentials (Web application)
4. Add authorized redirect URI: http://localhost:3001/api/auth/callback
5. Copy Client ID and Client Secret to backend .env

### VPS Setup

```bash
# Connect to VPS
ssh root@your-vps-host

# Install FFmpeg
sudo apt update
sudo apt install ffmpeg -y

# Create directories
mkdir -p /root/videos /root/audio /root/logs

# Verify installation
ffmpeg -version
```

---

## 4. YouTube Data API v3

### Official Documentation

- API Reference: https://developers.google.com/youtube/v3
- Live Streaming: https://developers.google.com/youtube/v3/live/getting-started
- OAuth 2.0: https://developers.google.com/youtube/v3/guides/authentication

### OAuth 2.0 Scopes

```typescript
const scopes = [
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.force-ssl',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
  'https://www.googleapis.com/auth/yt-analytics-monetary.readonly',
  'https://www.googleapis.com/auth/drive.readonly'
];
```

### Core API Methods

**LiveBroadcasts Resource**

```typescript
// Create broadcast
liveBroadcasts.insert({
  part: ['snippet', 'contentDetails', 'status'],
  requestBody: {
    snippet: { title, description, scheduledStartTime },
    contentDetails: { 
      enableDvr: true, 
      recordFromStart: true 
    },
    status: { privacyStatus: 'public' }
  }
})

// List broadcasts
liveBroadcasts.list({
  part: ['snippet', 'status'],
  broadcastStatus: 'active',
  mine: true
})

// Transition status
liveBroadcasts.transition({
  part: ['status'],
  id: broadcastId,
  broadcastStatus: 'testing' | 'live' | 'complete'
})

// Bind stream to broadcast
liveBroadcasts.bind({
  part: ['id', 'contentDetails'],
  id: broadcastId,
  streamId: streamId
})
```

**LiveStreams Resource**

```typescript
// Create stream (generates stream key)
liveStreams.insert({
  part: ['snippet', 'cdn'],
  requestBody: {
    snippet: { title },
    cdn: {
      frameRate: '30fps',
      ingestionType: 'rtmp',
      resolution: '1080p'
    }
  }
})

// Response includes:
{
  cdn: {
    ingestionInfo: {
      streamName: 'xxxx-xxxx-xxxx-xxxx',  // Stream Key
      ingestionAddress: 'rtmp://a.rtmp.youtube.com/live2'
    }
  }
}
```

**Videos Resource (Live Metrics)**

```typescript
// Get real-time metrics
videos.list({
  part: ['statistics', 'liveStreamingDetails'],
  id: [broadcastId]
})

// Returns:
{
  statistics: {
    viewCount: string,
    likeCount: string,
    commentCount: string
  },
  liveStreamingDetails: {
    concurrentViewers: string,
    actualStartTime: string
  }
}
```

**Channels Resource**

```typescript
// Get channel statistics
channels.list({
  part: ['statistics', 'snippet', 'contentDetails'],
  mine: true
})
```

### Rate Limits and Quotas

**Default Quota:** 10,000 units/day (free tier)

**Operation Costs:**

| Operation | Units |
|-----------|-------|
| liveBroadcasts.insert | 1600 |
| liveBroadcasts.update | 50 |
| liveBroadcasts.list | 1 |
| liveStreams.insert | 1600 |
| videos.list | 1 |

**Best Practices:**

- Cache metrics for 30+ seconds
- Batch requests when possible
- Implement exponential backoff for errors
- Monitor quota usage in Google Cloud Console

---

## 5. Deployment Strategy

### Recommended: Separate Deployment

**Frontend (Vercel/Netlify)**
- Platform: Vercel (recommended)
- Build command: `npm run build`
- Output directory: `dist/`
- Environment variable: `VITE_API_URL=https://your-backend-url.com`

**Backend (Railway/Render)**
- Platform: Railway (recommended)
- Build command: `npm run build`
- Start command: `npm start`
- Root directory: `backend/`

### Deployment Steps

**Frontend (Vercel)**

```powershell
# Install Vercel CLI
npm install -g vercel

# Deploy
cd dashboard
vercel

# Set environment variable in Vercel dashboard:
# VITE_API_URL=https://adbot-api.railway.app
```

**Backend (Railway)**

1. Create account at https://railway.app
2. New Project > Deploy from GitHub repo
3. Select backend directory
4. Configure environment variables (see section 6)
5. Deploy

**CORS Configuration**

Backend must allow frontend origin:

```typescript
// server.ts
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://your-frontend.vercel.app'
  ],
  credentials: true
}));
```

Frontend must send credentials:

```typescript
// api.ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true
});
```

### Alternative Platforms

**Backend Options:**
- Railway (5 USD/month free credit, easy setup)
- Render (free tier with limitations)
- Fly.io (free tier, global deployment)
- VPS Hostinger (3.99 USD/month, full control)

**Frontend Options:**
- Vercel (unlimited for hobby projects)
- Netlify (100GB bandwidth free)
- Cloudflare Pages (unlimited, fast CDN)

---

## 6. Environment Variables

### Backend (.env)

```bash
# Server
PORT=3001
NODE_ENV=development

# YouTube API (from Google Cloud Console)
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:3001/api/auth/callback

# VPS SSH
VPS_HOST=72.61.179.97
VPS_USER=root
VPS_PORT=22
VPS_PASSWORD=your_vps_password

# Admin Authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password

# Session Secret (generate random string)
SESSION_SECRET=random_secret_key_minimum_32_chars
```

### Frontend (.env)

```bash
# API URL
VITE_API_URL=http://localhost:3001

# Production:
# VITE_API_URL=https://adbot-api.railway.app
```

### Generate Secure Secrets

```powershell
# PowerShell command to generate random string
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

### Production Checklist

- [ ] All environment variables configured
- [ ] YOUTUBE_REDIRECT_URI updated to production URL
- [ ] SESSION_SECRET is secure random string
- [ ] VPS_PASSWORD is stored securely
- [ ] CORS origins include production frontend URL
- [ ] NODE_ENV set to 'production'

---

## API Endpoints Reference

### Authentication

```
POST   /api/auth/login          # Admin login
POST   /api/auth/logout         # Logout
GET    /api/auth/check          # Check session
GET    /api/auth/youtube        # Get OAuth URL
GET    /api/auth/callback       # OAuth callback
GET    /api/auth/status         # YouTube auth status
```

### Broadcasts

```
POST   /api/live/create-and-start   # Create and start live
POST   /api/broadcasts/create       # Create broadcast only
POST   /api/broadcasts/start        # Start existing broadcast
POST   /api/broadcasts/stop         # Stop live
GET    /api/broadcasts/active       # List active broadcasts
GET    /api/broadcasts/metrics/:id  # Get live metrics
```

### Analytics

```
GET    /api/analytics/channel   # Channel statistics
```

### Google Drive

```
GET    /api/drive/videos        # List video files
GET    /api/drive/audio         # List audio files
```

### VPS/SSH

```
POST   /api/ssh/connect         # Connect to VPS
POST   /api/ssh/execute         # Execute command
GET    /api/ssh/status          # Connection status
```

### Health Check

```
GET    /api/health              # API health status
```

---

## Troubleshooting

### YouTube API Quota Exceeded

**Error:** `quotaExceeded` (403)

**Solution:**
- Implement 30+ second cache for metrics
- Reduce polling frequency
- Wait for quota reset (midnight PST)

### SSH Connection Timeout

**Solution:**
```bash
# Verify VPS is accessible
ping your-vps-host
nc -zv your-vps-host 22

# Check firewall
ssh root@your-vps-host
sudo ufw status
sudo ufw allow 22/tcp
```

### FFmpeg Not Found

**Solution:**
```bash
ssh root@your-vps-host
sudo apt update
sudo apt install ffmpeg -y
ffmpeg -version
```

### CORS Errors

**Solution:**
- Verify backend CORS configuration includes frontend origin
- Ensure frontend sends `withCredentials: true`
- Check both dev and production URLs are configured

### Broadcast Binding Failed

**Error:** `liveBroadcastBindingNotAllowed` (403)

**Solution:**
- Verify broadcast status is 'created' or 'ready'
- Wait a few seconds after creating broadcast before binding
- Check stream and broadcast IDs are correct

---

## Support Resources

- YouTube Data API: https://developers.google.com/youtube/v3
- FFmpeg Documentation: https://ffmpeg.org/documentation.html
- Vite Documentation: https://vitejs.dev
- React Documentation: https://react.dev

For project-specific documentation, see:
- README.md (Quick start guide)
- PRD/PRD.md (Product requirements)
- PRD/PRD-3-ARQUITETURA-TECNICA.md (Detailed architecture)
