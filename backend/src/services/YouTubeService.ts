import { google, youtube_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export class YouTubeService {
  private oauth2Client: OAuth2Client;
  private youtube: youtube_v3.Youtube;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI
    );

    this.youtube = google.youtube({
      version: 'v3',
      auth: this.oauth2Client
    });
  }

  // Gerar URL de autorização OAuth
  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.force-ssl',
      'https://www.googleapis.com/auth/yt-analytics.readonly',
      'https://www.googleapis.com/auth/yt-analytics-monetary.readonly',
      'https://www.googleapis.com/auth/drive.readonly' // Google Drive read access
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  // Trocar código por tokens
  async getTokensFromCode(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  // Setar tokens salvos
  setCredentials(tokens: any) {
    this.oauth2Client.setCredentials(tokens);
  }

  // Criar broadcast (live)
  async createBroadcast(title: string, description: string, scheduledStartTime: string) {
    try {
      // 1. Criar LiveBroadcast
      const broadcastResponse = await this.youtube.liveBroadcasts.insert({
        part: ['snippet', 'contentDetails', 'status'],
        requestBody: {
          snippet: {
            title,
            description,
            scheduledStartTime
          },
          contentDetails: {
            enableAutoStart: false,
            enableAutoStop: false,
            enableDvr: true,
            enableContentEncryption: false,
            enableEmbed: true,
            recordFromStart: true
          },
          status: {
            privacyStatus: 'public',
            selfDeclaredMadeForKids: false
          }
        }
      });

      const broadcast = broadcastResponse.data;

      // 2. Criar LiveStream (gera stream key)
      const streamResponse = await this.youtube.liveStreams.insert({
        part: ['snippet', 'cdn', 'contentDetails', 'status'],
        requestBody: {
          snippet: {
            title: `Stream: ${title}`
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

      const stream = streamResponse.data;

      // 3. Bind broadcast + stream
      await this.youtube.liveBroadcasts.bind({
        part: ['id', 'contentDetails'],
        id: broadcast.id!,
        streamId: stream.id!
      });

      return {
        broadcastId: broadcast.id,
        streamId: stream.id,
        streamKey: stream.cdn?.ingestionInfo?.streamName,
        rtmpUrl: stream.cdn?.ingestionInfo?.ingestionAddress,
        title: broadcast.snippet?.title,
        scheduledStartTime: broadcast.snippet?.scheduledStartTime,
        youtubeUrl: `https://www.youtube.com/watch?v=${broadcast.id}`
      };
    } catch (error: any) {
      console.error('Erro ao criar broadcast:', error.message);
      throw new Error(`YouTube API Error: ${error.message}`);
    }
  }

  // Transição de status da live
  async transitionBroadcast(broadcastId: string, status: 'testing' | 'live' | 'complete') {
    try {
      const response = await this.youtube.liveBroadcasts.transition({
        part: ['status', 'id'],
        broadcastStatus: status,
        id: broadcastId
      });

      return response.data;
    } catch (error: any) {
      console.error('Erro ao transitar broadcast:', error.message);
      throw new Error(`YouTube API Error: ${error.message}`);
    }
  }

  // Obter métricas em tempo real
  async getLiveMetrics(broadcastId: string) {
    try {
      const response = await this.youtube.videos.list({
        part: ['statistics', 'liveStreamingDetails'],
        id: [broadcastId]
      });

      const video = response.data.items?.[0];
      if (!video) {
        throw new Error('Broadcast not found');
      }

      return {
        viewCount: parseInt(video.statistics?.viewCount || '0'),
        likeCount: parseInt(video.statistics?.likeCount || '0'),
        commentCount: parseInt(video.statistics?.commentCount || '0'),
        concurrentViewers: parseInt(video.liveStreamingDetails?.concurrentViewers || '0'),
        actualStartTime: video.liveStreamingDetails?.actualStartTime,
        actualEndTime: video.liveStreamingDetails?.actualEndTime
      };
    } catch (error: any) {
      console.error('Erro ao obter métricas:', error.message);
      throw new Error(`YouTube API Error: ${error.message}`);
    }
  }

  // Atualizar metadata da live
  async updateBroadcast(broadcastId: string, updates: {
    title?: string;
    description?: string;
  }) {
    try {
      const response = await this.youtube.liveBroadcasts.update({
        part: ['snippet'],
        requestBody: {
          id: broadcastId,
          snippet: {
            title: updates.title,
            description: updates.description
          }
        }
      });

      return response.data;
    } catch (error: any) {
      console.error('Erro ao atualizar broadcast:', error.message);
      throw new Error(`YouTube API Error: ${error.message}`);
    }
  }

  // Listar lives ativas
  async listActiveBroadcasts() {
    try {
      const response = await this.youtube.liveBroadcasts.list({
        part: ['snippet', 'contentDetails', 'status'],
        broadcastStatus: 'active',
        maxResults: 25
      });

      return response.data.items || [];
    } catch (error: any) {
      console.error('Erro ao listar broadcasts:', error.message);
      throw new Error(`YouTube API Error: ${error.message}`);
    }
  }

  // Deletar broadcast
  async deleteBroadcast(broadcastId: string) {
    try {
      await this.youtube.liveBroadcasts.delete({
        id: broadcastId
      });
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao deletar broadcast:', error.message);
      throw new Error(`YouTube API Error: ${error.message}`);
    }
  }

  // Obter estatísticas do canal autenticado
  async getChannelStatistics() {
    try {
      const response = await this.youtube.channels.list({
        part: ['statistics', 'snippet', 'contentDetails'],
        mine: true
      });

      const channel = response.data.items?.[0];
      if (!channel) {
        throw new Error('Channel not found');
      }

      return {
        channelId: channel.id,
        title: channel.snippet?.title,
        description: channel.snippet?.description,
        thumbnail: channel.snippet?.thumbnails?.default?.url,
        statistics: {
          viewCount: parseInt(channel.statistics?.viewCount || '0'),
          subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
          videoCount: parseInt(channel.statistics?.videoCount || '0')
        },
        uploadsPlaylistId: channel.contentDetails?.relatedPlaylists?.uploads
      };
    } catch (error: any) {
      console.error('Erro ao obter estatísticas do canal:', error.message);
      throw new Error(`YouTube API Error: ${error.message}`);
    }
  }

  // Obter vídeos do canal (uploads)
  async getChannelVideos(uploadsPlaylistId: string, maxResults: number = 10) {
    try {
      const response = await this.youtube.playlistItems.list({
        part: ['snippet', 'contentDetails'],
        playlistId: uploadsPlaylistId,
        maxResults
      });

      const videoIds = response.data.items?.map(item => item.contentDetails?.videoId).filter(Boolean) || [];

      if (videoIds.length === 0) {
        return [];
      }

      // Buscar estatísticas dos vídeos
      const videosResponse = await this.youtube.videos.list({
        part: ['statistics', 'snippet', 'contentDetails'],
        id: videoIds as string[]
      });

      return videosResponse.data.items?.map(video => ({
        videoId: video.id,
        title: video.snippet?.title,
        description: video.snippet?.description,
        publishedAt: video.snippet?.publishedAt,
        thumbnail: video.snippet?.thumbnails?.default?.url,
        statistics: {
          viewCount: parseInt(video.statistics?.viewCount || '0'),
          likeCount: parseInt(video.statistics?.likeCount || '0'),
          commentCount: parseInt(video.statistics?.commentCount || '0')
        },
        duration: video.contentDetails?.duration
      })) || [];
    } catch (error: any) {
      console.error('Erro ao obter vídeos do canal:', error.message);
      throw new Error(`YouTube API Error: ${error.message}`);
    }
  }

  // Obter total de lives realizadas (broadcasts completados)
  async getCompletedBroadcastsCount() {
    try {
      const response = await this.youtube.liveBroadcasts.list({
        part: ['id'],
        broadcastStatus: 'completed',
        maxResults: 50 // YouTube permite até 50 por request
      });

      return {
        totalLives: response.data.items?.length || 0,
        pageInfo: response.data.pageInfo
      };
    } catch (error: any) {
      console.error('Erro ao obter broadcasts completados:', error.message);
      throw new Error(`YouTube API Error: ${error.message}`);
    }
  }
}
