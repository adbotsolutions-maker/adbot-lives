# PRD-4: Integração com YouTube APIs

[← Voltar ao Índice](./PRD.md)

---

## 1. YouTube Data API v3

### 1.1 Setup e Autenticação

#### OAuth 2.0 Flow
```typescript
// config/youtube.ts
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  process.env.YOUTUBE_REDIRECT_URI
);

// Scopes necessários
const SCOPES = [
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.force-ssl',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
  'https://www.googleapis.com/auth/yt-analytics-monetary.readonly'
];

export const getAuthUrl = () => {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
};
```

#### Token Management
```typescript
// services/youtube/auth.service.ts
export class YouTubeAuthService {
  async exchangeCode(code: string) {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    // Salvar tokens no DB (criptografados)
    await this.saveTokens(tokens);
    
    return tokens;
  }
  
  async refreshAccessToken(refreshToken: string) {
    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    await this.saveTokens(credentials);
    
    return credentials;
  }
  
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await oauth2Client.getTokenInfo(accessToken);
      return response.expiry_date! > Date.now();
    } catch {
      return false;
    }
  }
}
```

---

### 1.2 LiveBroadcasts API

#### Criar Broadcast
```typescript
// services/youtube/broadcasts.service.ts
import { youtube_v3 } from 'googleapis';

export class YouTubeBroadcastsService {
  private youtube: youtube_v3.Youtube;
  
  constructor(auth: any) {
    this.youtube = google.youtube({ version: 'v3', auth });
  }
  
  async createBroadcast(data: BroadcastCreateData) {
    // 1. Criar LiveBroadcast
    const broadcast = await this.youtube.liveBroadcasts.insert({
      part: ['snippet', 'contentDetails', 'status'],
      requestBody: {
        snippet: {
          title: data.title,
          description: data.description,
          scheduledStartTime: data.scheduledStartTime?.toISOString(),
          scheduledEndTime: data.scheduledEndTime?.toISOString()
        },
        status: {
          privacyStatus: data.privacyStatus,
          selfDeclaredMadeForKids: data.madeForKids,
          enableAutoStart: true,
          enableAutoStop: false,
          recordFromStart: true,
          enableDvr: true
        },
        contentDetails: {
          enableAutoStart: true,
          enableAutoStop: false,
          recordFromStart: true,
          enableDvr: true,
          enableContentEncryption: false,
          enableEmbed: true,
          latencyPreference: 'low'
        }
      }
    });
    
    // 2. Criar LiveStream
    const stream = await this.youtube.liveStreams.insert({
      part: ['snippet', 'cdn', 'contentDetails', 'status'],
      requestBody: {
        snippet: {
          title: `Stream for ${data.title}`
        },
        cdn: {
          frameRate: '30fps',
          ingestionType: 'rtmp',
          resolution: '1080p'
        },
        contentDetails: {
          isReusable: false
        }
      }
    });
    
    // 3. Bind Broadcast to Stream
    await this.youtube.liveBroadcasts.bind({
      part: ['id', 'contentDetails'],
      id: broadcast.data.id!,
      streamId: stream.data.id!
    });
    
    return {
      broadcastId: broadcast.data.id!,
      streamId: stream.data.id!,
      streamKey: stream.data.cdn?.ingestionInfo?.streamName!,
      rtmpUrl: stream.data.cdn?.ingestionInfo?.ingestionAddress!
    };
  }
}
```

#### Atualizar Broadcast
```typescript
async updateBroadcast(broadcastId: string, updates: BroadcastUpdateData) {
  const response = await this.youtube.liveBroadcasts.update({
    part: ['snippet', 'status'],
    requestBody: {
      id: broadcastId,
      snippet: {
        title: updates.title,
        description: updates.description,
        categoryId: updates.categoryId,
        tags: updates.tags
      },
      status: {
        privacyStatus: updates.privacyStatus
      }
    }
  });
  
  return response.data;
}
```

#### Transições de Estado
```typescript
async transitionBroadcast(
  broadcastId: string, 
  broadcastStatus: 'testing' | 'live' | 'complete'
) {
  const response = await this.youtube.liveBroadcasts.transition({
    part: ['status'],
    id: broadcastId,
    broadcastStatus
  });
  
  return response.data;
}

// Workflow completo
async startLive(broadcastId: string) {
  // 1. Testing (verifica stream)
  await this.transitionBroadcast(broadcastId, 'testing');
  
  // Aguardar stream estar "active"
  await this.waitForStreamActive(broadcastId);
  
  // 2. Live (vai ao ar)
  await this.transitionBroadcast(broadcastId, 'live');
}

async stopLive(broadcastId: string) {
  await this.transitionBroadcast(broadcastId, 'complete');
}
```

---

### 1.3 Videos API (Metadata)

#### Atualizar Metadata do VOD
```typescript
async updateVideoMetadata(videoId: string, metadata: VideoMetadata) {
  const response = await this.youtube.videos.update({
    part: ['snippet', 'status'],
    requestBody: {
      id: videoId,
      snippet: {
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        categoryId: metadata.categoryId,
        defaultLanguage: metadata.defaultLanguage
      },
      status: {
        privacyStatus: metadata.privacyStatus,
        embeddable: true,
        publicStatsViewable: true,
        madeForKids: metadata.madeForKids
      }
    }
  });
  
  return response.data;
}
```

#### Upload Thumbnail
```typescript
async uploadThumbnail(videoId: string, thumbnailPath: string) {
  const response = await this.youtube.thumbnails.set({
    videoId,
    media: {
      mimeType: 'image/jpeg',
      body: fs.createReadStream(thumbnailPath)
    }
  });
  
  return response.data;
}
```

---

### 1.4 Search API

#### Buscar Lives Relacionadas
```typescript
async searchRelatedLives(query: string, maxResults: number = 10) {
  const response = await this.youtube.search.list({
    part: ['snippet'],
    q: query,
    type: ['video'],
    eventType: 'live',
    maxResults,
    order: 'viewCount',
    relevanceLanguage: 'pt'
  });
  
  return response.data.items;
}
```

---

## 2. YouTube Analytics API

### 2.1 Real-time Metrics

#### Concurrent Viewers
```typescript
// services/youtube/analytics.service.ts
export class YouTubeAnalyticsService {
  private youtubeAnalytics: youtubeAnalytics_v2.Youtubeanalytics;
  
  constructor(auth: any) {
    this.youtubeAnalytics = google.youtubeAnalytics({ 
      version: 'v2', 
      auth 
    });
  }
  
  async getConcurrentViewers(videoId: string) {
    const response = await this.youtubeAnalytics.reports.query({
      ids: 'channel==MINE',
      startDate: '2025-01-01', // Data de hoje
      endDate: '2025-12-31',
      metrics: 'concurrentViewers',
      dimensions: 'video',
      filters: `video==${videoId}`,
      sort: '-concurrentViewers'
    });
    
    return response.data.rows?.[0]?.[1] || 0;
  }
}
```

#### Métricas Históricas
```typescript
async getVideoMetrics(
  videoId: string,
  startDate: string,
  endDate: string
) {
  const response = await this.youtubeAnalytics.reports.query({
    ids: 'channel==MINE',
    startDate,
    endDate,
    metrics: [
      'views',
      'estimatedMinutesWatched',
      'averageViewDuration',
      'averageViewPercentage',
      'subscribersGained',
      'subscribersLost',
      'likes',
      'dislikes',
      'comments',
      'shares'
    ].join(','),
    dimensions: 'day',
    filters: `video==${videoId}`,
    sort: 'day'
  });
  
  return this.parseMetrics(response.data);
}
```

### 2.2 Revenue Metrics

```typescript
async getRevenueMetrics(
  startDate: string,
  endDate: string
) {
  const response = await this.youtubeAnalytics.reports.query({
    ids: 'channel==MINE',
    startDate,
    endDate,
    metrics: [
      'estimatedRevenue',
      'estimatedAdRevenue',
      'estimatedRedPartnerRevenue',
      'grossRevenue',
      'monetizedPlaybacks',
      'playbackBasedCpm',
      'adImpressions',
      'cpm'
    ].join(','),
    dimensions: 'day',
    sort: 'day'
  });
  
  return this.parseRevenueMetrics(response.data);
}
```

### 2.3 Engagement Metrics

```typescript
async getEngagementMetrics(videoId: string) {
  const response = await this.youtubeAnalytics.reports.query({
    ids: 'channel==MINE',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    metrics: [
      'likes',
      'dislikes',
      'comments',
      'shares',
      'subscribersGained',
      'subscribersLost',
      'videosAddedToPlaylists',
      'videosRemovedFromPlaylists',
      'averageViewPercentage',
      'annotationClickThroughRate',
      'annotationCloseRate'
    ].join(','),
    filters: `video==${videoId}`
  });
  
  return this.parseEngagementMetrics(response.data);
}
```

---

## 3. YouTube Reporting API

### 3.1 Bulk Reports

#### Gerar Report Job
```typescript
// services/youtube/reporting.service.ts
export class YouTubeReportingService {
  private youtubeReporting: youtubeReporting_v1.Youtubereporting;
  
  constructor(auth: any) {
    this.youtubeReporting = google.youtubeReporting({ 
      version: 'v1', 
      auth 
    });
  }
  
  async listReportTypes() {
    const response = await this.youtubeReporting.reportTypes.list();
    return response.data.reportTypes;
  }
  
  async createReportingJob(reportTypeId: string) {
    const response = await this.youtubeReporting.jobs.create({
      requestBody: {
        reportTypeId,
        name: `Report Job ${Date.now()}`
      }
    });
    
    return response.data;
  }
  
  async listReports(jobId: string) {
    const response = await this.youtubeReporting.jobs.reports.list({
      jobId,
      pageSize: 50
    });
    
    return response.data.reports;
  }
  
  async downloadReport(reportUrl: string) {
    // Download do CSV report
    const response = await axios.get(reportUrl, {
      responseType: 'stream'
    });
    
    return response.data;
  }
}
```

---

## 4. Rate Limiting & Quota Management

### 4.1 Quota Tracking

```typescript
// services/youtube/quota.service.ts
export class YouTubeQuotaService {
  private redis: Redis;
  
  // YouTube API Quota: 10,000 units/day
  private readonly DAILY_QUOTA = 10_000;
  
  // Custo de operações (em units)
  private readonly OPERATION_COSTS = {
    // Read operations
    'videos.list': 1,
    'channels.list': 1,
    'search.list': 100,
    'liveBroadcasts.list': 1,
    'liveStreams.list': 1,
    
    // Write operations
    'videos.update': 50,
    'liveBroadcasts.insert': 1600,
    'liveBroadcasts.update': 50,
    'liveBroadcasts.bind': 50,
    'liveBroadcasts.transition': 50,
    'liveStreams.insert': 50,
    'thumbnails.set': 50
  };
  
  async trackOperation(operation: string): Promise<boolean> {
    const cost = this.OPERATION_COSTS[operation] || 1;
    const key = `youtube:quota:${this.getTodayKey()}`;
    
    const current = await this.redis.get(key);
    const used = parseInt(current || '0');
    
    if (used + cost > this.DAILY_QUOTA) {
      throw new QuotaExceededError(
        `YouTube API quota exceeded. Used: ${used}, Needed: ${cost}`
      );
    }
    
    await this.redis.incrby(key, cost);
    await this.redis.expire(key, 86400); // 24h
    
    return true;
  }
  
  async getRemainingQuota(): Promise<number> {
    const key = `youtube:quota:${this.getTodayKey()}`;
    const used = parseInt(await this.redis.get(key) || '0');
    return this.DAILY_QUOTA - used;
  }
  
  private getTodayKey(): string {
    return new Date().toISOString().split('T')[0];
  }
}
```

### 4.2 Rate Limiting Strategy

```typescript
// middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

export const youtubeApiLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:youtube:'
  }),
  windowMs: 60 * 1000, // 1 minuto
  max: 60, // 60 requests por minuto
  message: 'Too many YouTube API requests',
  standardHeaders: true,
  legacyHeaders: false,
  
  // Skip check para operações críticas
  skip: (req) => {
    return req.path.includes('/broadcasts/') && 
           req.method === 'POST' &&
           req.body.priority === 'high';
  }
});
```

---

## 5. Caching Strategy

### 5.1 Redis Cache Layer

```typescript
// services/cache/youtube.cache.ts
export class YouTubeCacheService {
  private redis: Redis;
  
  // TTLs (em segundos)
  private readonly TTL = {
    BROADCAST_DATA: 300,      // 5 min
    VIDEO_METADATA: 3600,     // 1 hora
    ANALYTICS: 1800,          // 30 min
    CHANNEL_INFO: 86400,      // 24 horas
    CONCURRENT_VIEWERS: 30    // 30 segundos
  };
  
  async cacheBroadcast(broadcastId: string, data: any) {
    const key = `broadcast:${broadcastId}`;
    await this.redis.setex(
      key, 
      this.TTL.BROADCAST_DATA, 
      JSON.stringify(data)
    );
  }
  
  async getBroadcast(broadcastId: string): Promise<any | null> {
    const key = `broadcast:${broadcastId}`;
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  async cacheMetrics(videoId: string, metrics: any) {
    const key = `metrics:${videoId}`;
    await this.redis.setex(
      key,
      this.TTL.ANALYTICS,
      JSON.stringify(metrics)
    );
  }
  
  async getMetrics(videoId: string): Promise<any | null> {
    const key = `metrics:${videoId}`;
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  async invalidateBroadcast(broadcastId: string) {
    const key = `broadcast:${broadcastId}`;
    await this.redis.del(key);
  }
}
```

### 5.2 Service Layer com Cache

```typescript
// services/youtube/broadcasts.service.ts (with cache)
export class YouTubeBroadcastsService {
  constructor(
    private auth: any,
    private cache: YouTubeCacheService,
    private quota: YouTubeQuotaService
  ) {
    this.youtube = google.youtube({ version: 'v3', auth });
  }
  
  async getBroadcast(broadcastId: string) {
    // 1. Tentar cache primeiro
    const cached = await this.cache.getBroadcast(broadcastId);
    if (cached) {
      return cached;
    }
    
    // 2. Track quota
    await this.quota.trackOperation('liveBroadcasts.list');
    
    // 3. Fetch do YouTube
    const response = await this.youtube.liveBroadcasts.list({
      part: ['snippet', 'status', 'contentDetails'],
      id: [broadcastId]
    });
    
    const broadcast = response.data.items?.[0];
    
    // 4. Cachear resultado
    if (broadcast) {
      await this.cache.cacheBroadcast(broadcastId, broadcast);
    }
    
    return broadcast;
  }
}
```

---

## 6. Error Handling

### 6.1 YouTube API Errors

```typescript
// utils/youtube-errors.ts
export class YouTubeApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'YouTubeApiError';
  }
}

export const handleYouTubeError = (error: any): YouTubeApiError => {
  const { code, message, errors } = error.response?.data?.error || {};
  
  switch (code) {
    case 403:
      if (message.includes('quota')) {
        return new YouTubeApiError(
          'QUOTA_EXCEEDED',
          403,
          'YouTube API quota exceeded for today',
          errors
        );
      }
      return new YouTubeApiError(
        'FORBIDDEN',
        403,
        'Insufficient permissions',
        errors
      );
      
    case 401:
      return new YouTubeApiError(
        'UNAUTHORIZED',
        401,
        'Invalid or expired credentials',
        errors
      );
      
    case 404:
      return new YouTubeApiError(
        'NOT_FOUND',
        404,
        'Resource not found',
        errors
      );
      
    case 400:
      return new YouTubeApiError(
        'INVALID_REQUEST',
        400,
        message || 'Invalid request',
        errors
      );
      
    default:
      return new YouTubeApiError(
        'UNKNOWN_ERROR',
        error.response?.status || 500,
        message || 'Unknown YouTube API error',
        errors
      );
  }
};
```

### 6.2 Retry Logic

```typescript
// utils/retry.ts
import { retry } from 'async';

export const retryYouTubeOperation = async <T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3
): Promise<T> => {
  return new Promise((resolve, reject) => {
    retry(
      {
        times: maxAttempts,
        interval: (retryCount) => {
          // Exponential backoff: 1s, 2s, 4s
          return Math.pow(2, retryCount) * 1000;
        }
      },
      async () => {
        try {
          return await operation();
        } catch (error: any) {
          // Não retry em erros 4xx (exceto 429)
          if (error.response?.status >= 400 && 
              error.response?.status < 500 &&
              error.response?.status !== 429) {
            throw error;
          }
          throw error;
        }
      },
      (err, result) => {
        if (err) {
          reject(handleYouTubeError(err));
        } else {
          resolve(result);
        }
      }
    );
  });
};
```

---

## 7. Testing

### 7.1 Mock YouTube API

```typescript
// tests/mocks/youtube.mock.ts
export const mockYouTubeClient = {
  liveBroadcasts: {
    insert: jest.fn().mockResolvedValue({
      data: {
        id: 'mock-broadcast-id',
        snippet: { title: 'Test Broadcast' }
      }
    }),
    
    list: jest.fn().mockResolvedValue({
      data: {
        items: [{
          id: 'mock-broadcast-id',
          status: { lifeCycleStatus: 'live' }
        }]
      }
    })
  },
  
  liveStreams: {
    insert: jest.fn().mockResolvedValue({
      data: {
        id: 'mock-stream-id',
        cdn: {
          ingestionInfo: {
            streamName: 'mock-stream-key',
            ingestionAddress: 'rtmp://a.rtmp.youtube.com/live2'
          }
        }
      }
    })
  }
};
```

---

**Próximo:** [PRD-5: Roadmap de Implementação →](./PRD-5-ROADMAP.md)
