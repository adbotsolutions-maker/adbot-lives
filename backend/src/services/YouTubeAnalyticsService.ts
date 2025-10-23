import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export interface AnalyticsMetrics {
    views: number;
    estimatedMinutesWatched: number;
    averageViewDuration: number;
    subscribersGained: number;
    subscribersLost: number;
    likes: number;
    comments: number;
}

export interface TimeSeriesData {
    day: string;
    views: number;
    estimatedMinutesWatched: number;
}

export interface LiveStreamAnalytics {
    videoId: string;
    title: string;
    publishedAt: string;
    views: number;
    estimatedMinutesWatched: number;
    averageViewDuration: number;
    peakConcurrentViewers: number;
}

export class YouTubeAnalyticsService {
    private oauth2Client: OAuth2Client;
    private youtubeAnalytics: any;

    constructor() {
        // Detectar automaticamente a URL de redirecionamento baseado no ambiente
        const redirectUri = process.env.YOUTUBE_REDIRECT_URI || 
            (process.env.NODE_ENV === 'production' 
                ? 'https://adbot-lives.onrender.com/api/auth/callback'
                : 'http://localhost:3001/api/auth/callback');

        const oauth2Client = new google.auth.OAuth2(
            process.env.YOUTUBE_CLIENT_ID,
            process.env.YOUTUBE_CLIENT_SECRET,
            redirectUri
        );

        this.youtubeAnalytics = google.youtubeAnalytics({
            version: 'v2',
            auth: this.oauth2Client
        });
    }

    setCredentials(tokens: any) {
        this.oauth2Client.setCredentials(tokens);
    }

    /**
     * Obter métricas básicas do canal
     * @param startDate Data inicial (YYYY-MM-DD)
     * @param endDate Data final (YYYY-MM-DD)
     */
    async getChannelMetrics(startDate: string, endDate: string): Promise<AnalyticsMetrics> {
        try {
            const response = await this.youtubeAnalytics.reports.query({
                ids: 'channel==MINE',
                startDate,
                endDate,
                metrics: 'views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost,likes,comments',
                dimensions: ''
            });

            const row = response.data.rows?.[0] || [];

            return {
                views: row[0] || 0,
                estimatedMinutesWatched: row[1] || 0,
                averageViewDuration: row[2] || 0,
                subscribersGained: row[3] || 0,
                subscribersLost: row[4] || 0,
                likes: row[5] || 0,
                comments: row[6] || 0
            };
        } catch (error: any) {
            console.error('Erro ao obter métricas do canal:', error.message);
            throw new Error(`YouTube Analytics API Error: ${error.message}`);
        }
    }

    /**
     * Obter métricas diárias (time series)
     * @param startDate Data inicial (YYYY-MM-DD)
     * @param endDate Data final (YYYY-MM-DD)
     */
    async getDailyMetrics(startDate: string, endDate: string): Promise<TimeSeriesData[]> {
        try {
            const response = await this.youtubeAnalytics.reports.query({
                ids: 'channel==MINE',
                startDate,
                endDate,
                metrics: 'views,estimatedMinutesWatched',
                dimensions: 'day',
                sort: 'day'
            });

            return (response.data.rows || []).map((row: any[]) => ({
                day: row[0],
                views: row[1] || 0,
                estimatedMinutesWatched: row[2] || 0
            }));
        } catch (error: any) {
            console.error('Erro ao obter métricas diárias:', error.message);
            throw new Error(`YouTube Analytics API Error: ${error.message}`);
        }
    }

    /**
     * Obter métricas de lives específicas
     * @param videoIds IDs dos vídeos de live
     * @param startDate Data inicial (YYYY-MM-DD)
     * @param endDate Data final (YYYY-MM-DD)
     */
    async getLiveStreamMetrics(
        videoIds: string[],
        startDate: string,
        endDate: string
    ): Promise<{ videoId: string; metrics: AnalyticsMetrics }[]> {
        try {
            const results = await Promise.all(
                videoIds.map(async (videoId) => {
                    const response = await this.youtubeAnalytics.reports.query({
                        ids: 'channel==MINE',
                        startDate,
                        endDate,
                        metrics: 'views,estimatedMinutesWatched,averageViewDuration,likes,comments',
                        dimensions: '',
                        filters: `video==${videoId}`
                    });

                    const row = response.data.rows?.[0] || [];

                    return {
                        videoId,
                        metrics: {
                            views: row[0] || 0,
                            estimatedMinutesWatched: row[1] || 0,
                            averageViewDuration: row[2] || 0,
                            subscribersGained: 0,
                            subscribersLost: 0,
                            likes: row[3] || 0,
                            comments: row[4] || 0
                        }
                    };
                })
            );

            return results;
        } catch (error: any) {
            console.error('Erro ao obter métricas de lives:', error.message);
            throw new Error(`YouTube Analytics API Error: ${error.message}`);
        }
    }

    /**
     * Obter top vídeos do canal
     * @param startDate Data inicial (YYYY-MM-DD)
     * @param endDate Data final (YYYY-MM-DD)
     * @param maxResults Número máximo de resultados (até 200)
     */
    async getTopVideos(
        startDate: string,
        endDate: string,
        maxResults: number = 10
    ): Promise<any[]> {
        try {
            const response = await this.youtubeAnalytics.reports.query({
                ids: 'channel==MINE',
                startDate,
                endDate,
                metrics: 'views,estimatedMinutesWatched,averageViewDuration,likes,comments',
                dimensions: 'video',
                sort: '-views',
                maxResults
            });

            return (response.data.rows || []).map((row: any[]) => ({
                videoId: row[0],
                views: row[1] || 0,
                estimatedMinutesWatched: row[2] || 0,
                averageViewDuration: row[3] || 0,
                likes: row[4] || 0,
                comments: row[5] || 0
            }));
        } catch (error: any) {
            console.error('Erro ao obter top vídeos:', error.message);
            throw new Error(`YouTube Analytics API Error: ${error.message}`);
        }
    }

    /**
     * Obter métricas de concurrent viewers para lives
     * @param videoId ID do vídeo de live
     */
    async getLiveConcurrentViewers(videoId: string): Promise<any[]> {
        try {
            const response = await this.youtubeAnalytics.reports.query({
                ids: 'channel==MINE',
                metrics: 'averageConcurrentViewers,peakConcurrentViewers',
                dimensions: 'livestreamPosition',
                filters: `video==${videoId}`,
                maxResults: 500
            });

            return (response.data.rows || []).map((row: any[]) => ({
                position: row[0],
                averageConcurrentViewers: row[1] || 0,
                peakConcurrentViewers: row[2] || 0
            }));
        } catch (error: any) {
            console.error('Erro ao obter concurrent viewers:', error.message);
            throw new Error(`YouTube Analytics API Error: ${error.message}`);
        }
    }

    /**
     * Obter métricas por país
     * @param startDate Data inicial (YYYY-MM-DD)
     * @param endDate Data final (YYYY-MM-DD)
     */
    async getMetricsByCountry(startDate: string, endDate: string, maxResults: number = 10) {
        try {
            const response = await this.youtubeAnalytics.reports.query({
                ids: 'channel==MINE',
                startDate,
                endDate,
                metrics: 'views,estimatedMinutesWatched',
                dimensions: 'country',
                sort: '-views',
                maxResults
            });

            return (response.data.rows || []).map((row: any[]) => ({
                country: row[0],
                views: row[1] || 0,
                estimatedMinutesWatched: row[2] || 0
            }));
        } catch (error: any) {
            console.error('Erro ao obter métricas por país:', error.message);
            throw new Error(`YouTube Analytics API Error: ${error.message}`);
        }
    }

    /**
     * Obter fontes de tráfego
     * @param startDate Data inicial (YYYY-MM-DD)
     * @param endDate Data final (YYYY-MM-DD)
     */
    async getTrafficSources(startDate: string, endDate: string) {
        try {
            const response = await this.youtubeAnalytics.reports.query({
                ids: 'channel==MINE',
                startDate,
                endDate,
                metrics: 'views,estimatedMinutesWatched',
                dimensions: 'insightTrafficSourceType',
                sort: '-views'
            });

            return (response.data.rows || []).map((row: any[]) => ({
                trafficSource: row[0],
                views: row[1] || 0,
                estimatedMinutesWatched: row[2] || 0
            }));
        } catch (error: any) {
            console.error('Erro ao obter fontes de tráfego:', error.message);
            throw new Error(`YouTube Analytics API Error: ${error.message}`);
        }
    }
}
