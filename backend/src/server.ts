import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import session from 'express-session';
import { YouTubeService } from './services/YouTubeService.js';
import { YouTubeAnalyticsService } from './services/YouTubeAnalyticsService.js';
import { VPSService } from './services/VPSService.js';
import { GoogleDriveService } from './services/GoogleDriveService.js';
import { requireAuth, checkCredentials } from './middleware/auth.js';

dotenv.config();

const app = express();
const server = createServer(app);

// Allowed origins
const allowedOrigins = [
  'http://localhost:5173',
  'https://adbot-lives.vercel.app'
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

// Trust proxy - MUST come before session middleware
app.set('trust proxy', 1);

// Determine if we're in production (deployment)
const isProduction = process.env.NODE_ENV === 'production';

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'adbot-secret-change-in-production',
  resave: false, // Don't save session if unmodified
  saveUninitialized: false, // Don't create session until something stored
  rolling: true, // Reset cookie maxAge on every request
  proxy: isProduction, // Only trust proxy in production
  name: 'adbot.sid', // Custom session cookie name
  cookie: { 
    secure: isProduction, // Only require HTTPS in production
    sameSite: isProduction ? 'none' : 'lax', // 'none' for production cross-origin, 'lax' for local
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days default
    path: '/'
    // No domain restriction to allow cross-domain cookies
  }
}));

// CORS configuration - MUST be before any routes
app.use(cors({
  origin: (origin, callback) => {
    console.log('🌐 CORS check for origin:', origin);
    // Allow requests with no origin (like mobile apps, Postman, or same-origin)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('❌ Origin not allowed:', origin);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Manual CORS headers for production debugging
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  next();
});

app.use(express.json());

// Session debugging middleware (optional - can be removed in production)
app.use((req, res, next) => {
  console.log('📋 Session Debug:', {
    path: req.path,
    method: req.method,
    sessionID: req.sessionID,
    authenticated: (req.session as any)?.authenticated,
    username: (req.session as any)?.username,
    cookie: req.headers.cookie
  });
  next();
});

// Services
const youtubeService = new YouTubeService();
const analyticsService = new YouTubeAnalyticsService();
let vpsService: VPSService | null = null;
let activeBroadcastId: string | null = null;
let currentFFmpegPid: string | null = null;

// ===== HEALTH CHECK / PING ROUTE =====
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'AdBot Lives API is running',
    version: '1.0.1',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ===== ADMIN LOGIN ROUTES =====

// Login com usuário/senha
app.post('/api/auth/login', (req, res) => {
  try {
    console.log('📝 Login attempt received:', { 
      username: req.body.username, 
      hasPassword: !!req.body.password,
      sessionID: req.sessionID,
      headers: req.headers
    });
    const { username, password, rememberMe } = req.body;

    if (!username || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (!checkCredentials(username, password)) {
      console.log('❌ Invalid credentials for user:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Salvar na sessão
    (req.session as any).authenticated = true;
    (req.session as any).username = username;
    
    // Se "Lembrar de mim", sessão dura 30 dias, senão expira ao fechar o navegador
    if (rememberMe) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 dias
    }

    // Save session explicitly before sending response
    req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error:', err);
        return res.status(500).json({ error: 'Failed to save session' });
      }
      
      console.log('✅ Login successful for user:', username, {
        sessionID: req.sessionID,
        authenticated: (req.session as any).authenticated,
        cookieMaxAge: req.session.cookie.maxAge
      });
      
      res.json({ 
        success: true, 
        message: 'Login successful',
        username 
      });
    });
  } catch (error: any) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logged out' });
  });
});

// Verificar se está logado
app.get('/api/auth/check', (req, res) => {
  const authenticated = (req.session as any)?.authenticated || false;
  const username = (req.session as any)?.username;
  
  console.log('🔍 Auth check:', {
    sessionID: req.sessionID,
    authenticated,
    username,
    sessionData: req.session,
    cookies: req.headers.cookie
  });
  
  res.json({ 
    authenticated,
    username: authenticated ? username : null
  });
});

// ===== YOUTUBE OAUTH ROUTES =====

app.get('/api/auth/youtube', requireAuth, (req, res) => {
  const authUrl = youtubeService.getAuthUrl();
  res.json({ authUrl });
});

app.get('/api/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      return res.status(400).send('Missing authorization code');
    }

    const tokens = await youtubeService.getTokensFromCode(code);
    
    // Salvar tokens na sessão
    (req.session as any).youtubeTokens = tokens;
    
    res.send(`
      <html>
        <body>
          <h1>✅ Autenticação concluída!</h1>
          <p>Você pode fechar esta janela e voltar ao dashboard.</p>
          <script>
            const origins = ['http://localhost:5173', 'https://adbot-lives.vercel.app'];
            origins.forEach(origin => {
              try {
                window.opener?.postMessage({ type: 'youtube-auth-success' }, origin);
              } catch (e) {}
            });
            setTimeout(() => window.close(), 2000);
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

app.get('/api/auth/status', (req, res) => {
  const tokens = (req.session as any).youtubeTokens;
  res.json({ 
    authenticated: !!tokens,
    hasRefreshToken: !!tokens?.refresh_token 
  });
});

// ===== BROADCAST ROUTES ===== (Todas protegidas)

app.get('/api/analytics/channel', requireAuth, async (req, res) => {
  try {
    const tokens = (req.session as any).youtubeTokens;
    if (!tokens) {
      return res.status(401).json({ error: 'Not authenticated with YouTube' });
    }

    youtubeService.setCredentials(tokens);

    const channelStats = await youtubeService.getChannelStatistics();
    const completedBroadcasts = await youtubeService.getCompletedBroadcastsCount();

    // Buscar vídeos recentes se tiver playlist de uploads
    let recentVideos: any[] = [];
    if (channelStats.uploadsPlaylistId) {
      recentVideos = await youtubeService.getChannelVideos(channelStats.uploadsPlaylistId, 5);
    }

    // Calcular total de views de todos os vídeos recentes
    const totalRecentViews = recentVideos.reduce((sum, video) => sum + video.statistics.viewCount, 0);

    res.json({
      channel: channelStats,
      totalLives: completedBroadcasts.totalLives,
      totalViews: channelStats.statistics.viewCount,
      totalSubscribers: channelStats.statistics.subscriberCount,
      totalVideos: channelStats.statistics.videoCount,
      recentVideos
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ===== YOUTUBE ANALYTICS ROUTES =====

app.get('/api/analytics/metrics', requireAuth, async (req, res) => {
  try {
    const tokens = (req.session as any).youtubeTokens;
    if (!tokens) {
      return res.status(401).json({ error: 'Not authenticated with YouTube' });
    }

    analyticsService.setCredentials(tokens);

    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const metrics = await analyticsService.getChannelMetrics(
      startDate as string,
      endDate as string
    );

    res.json(metrics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/analytics/daily', requireAuth, async (req, res) => {
  try {
    const tokens = (req.session as any).youtubeTokens;
    if (!tokens) {
      return res.status(401).json({ error: 'Not authenticated with YouTube' });
    }

    analyticsService.setCredentials(tokens);

    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const dailyMetrics = await analyticsService.getDailyMetrics(
      startDate as string,
      endDate as string
    );

    res.json(dailyMetrics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/analytics/top-videos', requireAuth, async (req, res) => {
  try {
    const tokens = (req.session as any).youtubeTokens;
    if (!tokens) {
      return res.status(401).json({ error: 'Not authenticated with YouTube' });
    }

    analyticsService.setCredentials(tokens);
    youtubeService.setCredentials(tokens);

    const { startDate, endDate, maxResults } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const topVideos = await analyticsService.getTopVideos(
      startDate as string,
      endDate as string,
      maxResults ? parseInt(maxResults as string) : 10
    );

    // Buscar informações detalhadas dos vídeos
    const videoIds = topVideos.map(v => v.videoId);
    const videosData = await youtubeService['youtube'].videos.list({
      part: ['snippet'],
      id: videoIds
    });

    const videosWithDetails = topVideos.map(video => {
      const videoData = videosData.data.items?.find((v: any) => v.id === video.videoId);
      return {
        ...video,
        title: videoData?.snippet?.title,
        publishedAt: videoData?.snippet?.publishedAt,
        thumbnail: videoData?.snippet?.thumbnails?.default?.url
      };
    });

    res.json(videosWithDetails);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/analytics/traffic-sources', requireAuth, async (req, res) => {
  try {
    const tokens = (req.session as any).youtubeTokens;
    if (!tokens) {
      return res.status(401).json({ error: 'Not authenticated with YouTube' });
    }

    analyticsService.setCredentials(tokens);

    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const trafficSources = await analyticsService.getTrafficSources(
      startDate as string,
      endDate as string
    );

    res.json(trafficSources);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/analytics/countries', requireAuth, async (req, res) => {
  try {
    const tokens = (req.session as any).youtubeTokens;
    if (!tokens) {
      return res.status(401).json({ error: 'Not authenticated with YouTube' });
    }

    analyticsService.setCredentials(tokens);

    const { startDate, endDate, maxResults } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const countries = await analyticsService.getMetricsByCountry(
      startDate as string,
      endDate as string,
      maxResults ? parseInt(maxResults as string) : 10
    );

    res.json(countries);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/live/create-and-start', requireAuth, async (req, res) => {
  try {
    const tokens = (req.session as any).youtubeTokens;
    if (!tokens) {
      return res.status(401).json({ error: 'Not authenticated with YouTube' });
    }

    youtubeService.setCredentials(tokens);

    const { title, description, videoSource, audioSource, loopType, loopDuration, loopCount, removeAudio } = req.body;

    // 1. Criar broadcast no YouTube
    console.log('📺 Criando broadcast no YouTube...');
    const broadcast = await youtubeService.createBroadcast(
      title || 'Live Stream',
      description || 'Automated live stream',
      new Date().toISOString()
    );

    // 2. Conectar ao VPS se ainda não conectado
    if (!vpsService || !vpsService.getConnectionStatus()) {
      console.log('🔌 Conectando ao VPS...');
      vpsService = new VPSService({
        host: process.env.VPS_HOST || '72.61.179.97',
        port: parseInt(process.env.VPS_PORT || '22'),
        username: process.env.VPS_USER || 'root',
        password: process.env.VPS_PASSWORD
      });
      await vpsService.connect();
    }

    // 3. Baixar mídia do Google Drive para o VPS (se necessário)
    let videoPath = '/root/videos/default.mp4';
    let audioPath: string | undefined;
    
    if (videoSource?.type === 'drive' && videoSource?.fileId) {
      console.log('📥 Baixando vídeo do Google Drive...');
      const driveService = new GoogleDriveService(youtubeService['oauth2Client']);
      const fileMetadata = await driveService.getFileMetadata(videoSource.fileId);
      videoPath = `/root/videos/${fileMetadata.name}`;
      
      // Download direto no VPS via comando wget com link compartilhado
      await vpsService.executeCommand(`mkdir -p /root/videos`);
      await vpsService.executeCommand(
        `wget -O "${videoPath}" "https://drive.google.com/uc?export=download&id=${videoSource.fileId}"`
      );
    }

    // Baixar áudio se fornecido
    if (audioSource?.type === 'drive' && audioSource?.fileId) {
      console.log('🎵 Baixando áudio do Google Drive...');
      const driveService = new GoogleDriveService(youtubeService['oauth2Client']);
      const audioMetadata = await driveService.getFileMetadata(audioSource.fileId);
      audioPath = `/root/audio/${audioMetadata.name}`;
      
      await vpsService.executeCommand(`mkdir -p /root/audio`);
      await vpsService.executeCommand(
        `wget -O "${audioPath}" "https://drive.google.com/uc?export=download&id=${audioSource.fileId}"`
      );
    }

    // 4. Iniciar FFmpeg stream no VPS PRIMEIRO
    console.log('🎥 Iniciando streaming FFmpeg no VPS...');
    currentFFmpegPid = await vpsService.startFFmpegStream({
      streamUrl: broadcast.rtmpUrl || 'rtmp://a.rtmp.youtube.com/live2',
      streamKey: broadcast.streamKey || '',
      videoPath,
      audioPath, // Passa o caminho do áudio se existir
      removeAudio: removeAudio || false, // Remove áudio se marcado
      loopType: loopType || 'infinite',
      loopDuration: loopDuration ? parseInt(loopDuration) : undefined,
      loopCount: loopCount ? parseInt(loopCount) : undefined
    });
    console.log(`✅ FFmpeg iniciado com PID: ${currentFFmpegPid}`);

    // 5. Aguardar alguns segundos para FFmpeg estabilizar
    console.log('⏳ Aguardando 10s para FFmpeg inicializar...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 6. Aguardar stream ficar ativo (polling do YouTube API)
    console.log('� Monitorando status do stream no YouTube...');
    const streamActive = await youtubeService.waitForStreamActive(
      broadcast.streamId!,
      {
        maxAttempts: 60, // 5 minutos máximo
        intervalMs: 5000, // Verificar a cada 5 segundos
        onProgress: (attempt, status) => {
          io.emit('stream:status', {
            broadcastId: broadcast.broadcastId,
            attempt,
            status,
            message: `Verificando stream... (${attempt}/60)`
          });
        }
      }
    );

    if (!streamActive) {
      throw new Error('Stream não ficou ativo após 5 minutos. Verifique a conexão FFmpeg.');
    }

    // 7. Transitar broadcast para "testing" (agora que o stream está ativo)
    console.log('🔄 Stream ativo! Transicionando broadcast para TESTING...');
    await youtubeService.transitionBroadcast(broadcast.broadcastId!, 'testing');
    io.emit('broadcast:testing', { broadcastId: broadcast.broadcastId });

    // 8. Aguardar alguns segundos para estabilizar no testing
    console.log('⏳ Aguardando 15s no modo testing...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    // 9. Transitar para "live" (ao vivo público)
    console.log('📡 Transicionando para LIVE (público)...');
    await youtubeService.transitionBroadcast(broadcast.broadcastId!, 'live');
    activeBroadcastId = broadcast.broadcastId!;
    io.emit('broadcast:live', { broadcastId: broadcast.broadcastId });
    console.log('🎉 Broadcast está AO VIVO!');

    res.json({
      success: true,
      broadcast: {
        id: broadcast.broadcastId,
        title: broadcast.title,
        youtubeUrl: broadcast.youtubeUrl,
        streamKey: broadcast.streamKey
      }
    });
  } catch (error: any) {
    console.error('❌ Erro no fluxo de live:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/broadcasts/create', requireAuth, async (req, res) => {
  try {
    const tokens = (req.session as any).youtubeTokens;
    if (!tokens) {
      return res.status(401).json({ error: 'Not authenticated with YouTube' });
    }

    youtubeService.setCredentials(tokens);

    const { title, description, scheduledStartTime } = req.body;

    const broadcast = await youtubeService.createBroadcast(
      title || 'Live Stream',
      description || 'Automated live stream',
      scheduledStartTime || new Date().toISOString()
    );

    res.json({
      success: true,
      broadcast
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/broadcasts/start', requireAuth, async (req, res) => {
  try {
    const tokens = (req.session as any).youtubeTokens;
    if (!tokens) {
      return res.status(401).json({ error: 'Not authenticated with YouTube' });
    }

    youtubeService.setCredentials(tokens);

    const { broadcastId, videoPath } = req.body;

    // 1. Transitar broadcast para "testing"
    await youtubeService.transitionBroadcast(broadcastId, 'testing');

    // 2. Obter informações do stream
    const broadcasts = await youtubeService.listActiveBroadcasts();
    const broadcast = broadcasts.find(b => b.id === broadcastId);
    
    if (!broadcast) {
      throw new Error('Broadcast not found');
    }

    // 3. Conectar SSH e iniciar FFmpeg
    if (!vpsService) {
      vpsService = new VPSService({
        host: process.env.VPS_HOST || '72.61.179.97',
        port: parseInt(process.env.VPS_PORT || '22'),
        username: process.env.VPS_USER || 'root',
        password: process.env.VPS_PASSWORD
      });
      await vpsService.connect();
    }

    // Extrair stream key e RTMP URL do broadcast criado
    const streamKey = broadcast.contentDetails?.monitorStream?.embedHtml || '';
    const rtmpUrl = 'rtmp://a.rtmp.youtube.com/live2';

    currentFFmpegPid = await vpsService.startFFmpegStream({
      streamUrl: rtmpUrl,
      streamKey,
      videoPath: videoPath || '/root/videos/default.mp4',
      loop: true
    });

    // 4. Aguardar e transitar para "live"
    setTimeout(async () => {
      await youtubeService.transitionBroadcast(broadcastId, 'live');
      activeBroadcastId = broadcastId;
      io.emit('broadcast:live', { broadcastId });
    }, 5000);

    res.json({
      success: true,
      broadcastId,
      message: 'Live starting...'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/broadcasts/stop', requireAuth, async (req, res) => {
  try {
    const tokens = (req.session as any).youtubeTokens;
    if (!tokens) {
      return res.status(401).json({ error: 'Not authenticated with YouTube' });
    }

    youtubeService.setCredentials(tokens);

    const { broadcastId } = req.body;

    // 1. Parar FFmpeg no VPS
    if (vpsService && currentFFmpegPid) {
      await vpsService.stopFFmpegStream(currentFFmpegPid);
      currentFFmpegPid = null;
    }

    // 2. Transitar broadcast para "complete"
    await youtubeService.transitionBroadcast(broadcastId, 'complete');

    activeBroadcastId = null;
    io.emit('broadcast:ended', { broadcastId });

    res.json({
      success: true,
      message: 'Live stopped'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/broadcasts/metrics/:broadcastId', requireAuth, async (req, res) => {
  try {
    const tokens = (req.session as any).youtubeTokens;
    if (!tokens) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    youtubeService.setCredentials(tokens);

    const metrics = await youtubeService.getLiveMetrics(req.params.broadcastId);
    res.json(metrics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/broadcasts/active', requireAuth, async (req, res) => {
  try {
    const tokens = (req.session as any).youtubeTokens;
    if (!tokens) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    youtubeService.setCredentials(tokens);

    const broadcasts = await youtubeService.listActiveBroadcasts();
    res.json(broadcasts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ===== GOOGLE DRIVE ROUTES =====

app.get('/api/drive/videos', requireAuth, async (req, res) => {
  try {
    const tokens = (req.session as any).youtubeTokens;
    if (!tokens) {
      return res.status(401).json({ error: 'Not authenticated with Google' });
    }

    youtubeService.setCredentials(tokens);
    const driveService = new GoogleDriveService(youtubeService['oauth2Client']);
    
    const videos = await driveService.listVideos(20);
    res.json({ videos });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/drive/audio', requireAuth, async (req, res) => {
  try {
    const tokens = (req.session as any).youtubeTokens;
    if (!tokens) {
      return res.status(401).json({ error: 'Not authenticated with Google' });
    }

    youtubeService.setCredentials(tokens);
    const driveService = new GoogleDriveService(youtubeService['oauth2Client']);
    
    const audio = await driveService.listAudio(20);
    res.json({ audio });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ===== SSH ROUTES ===== (Todas protegidas)

app.post('/api/ssh/connect', requireAuth, async (req, res) => {
  try {
    const { host, port, username, password } = req.body;

    vpsService = new VPSService({
      host: host || process.env.VPS_HOST!,
      port: port || parseInt(process.env.VPS_PORT || '22'),
      username: username || process.env.VPS_USER!,
      password: password || process.env.VPS_PASSWORD
    });

    await vpsService.connect();

    res.json({
      success: true,
      message: 'VPS connected via SSH'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ssh/execute', requireAuth, async (req, res) => {
  try {
    if (!vpsService || !vpsService.getConnectionStatus()) {
      return res.status(400).json({ error: 'VPS not connected' });
    }

    const { command } = req.body;
    const output = await vpsService.executeCommand(command);

    res.json({
      success: true,
      output
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ssh/status', requireAuth, (req, res) => {
  res.json({
    connected: vpsService?.getConnectionStatus() || false
  });
});

// ===== HEALTH CHECK =====

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'AdBot Lives API is running',
    vpsConnected: vpsService?.getConnectionStatus() || false,
    activeBroadcast: activeBroadcastId,
    ffmpegRunning: !!currentFFmpegPid
  });
});

// ===== WEBSOCKET =====

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('terminal:create', async () => {
    try {
      if (!vpsService || !vpsService.getConnectionStatus()) {
        socket.emit('terminal:error', { message: 'VPS not connected' });
        return;
      }

      vpsService.createInteractiveShell(
        (data) => socket.emit('terminal:data', data),
        () => socket.emit('terminal:close')
      );

      vpsService.once('shell-ready', (sendCommand) => {
        socket.on('terminal:input', (command: string) => {
          sendCommand(command);
        });
      });

    } catch (error: any) {
      socket.emit('terminal:error', { message: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Metrics real-time updates (se houver broadcast ativo)
setInterval(async () => {
  if (activeBroadcastId) {
    try {
      const metrics = await youtubeService.getLiveMetrics(activeBroadcastId);
      io.emit('metrics:update', metrics);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  }
}, 10000); // A cada 10 segundos

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 WebSocket ready on ws://localhost:${PORT}`);
  console.log(`🔑 YouTube OAuth: ${process.env.YOUTUBE_CLIENT_ID ? '✅' : '❌'}`);
  console.log(`📡 VPS Host: ${process.env.VPS_HOST}`);
});
