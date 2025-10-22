export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export const API_ENDPOINTS = {
  auth: {
    login: `${API_BASE_URL}/api/auth/login`,
    logout: `${API_BASE_URL}/api/auth/logout`,
    check: `${API_BASE_URL}/api/auth/check`,
    youtube: `${API_BASE_URL}/api/auth/youtube`,
  },
  broadcasts: {
    active: `${API_BASE_URL}/api/broadcasts/active`,
    stop: `${API_BASE_URL}/api/broadcasts/stop`,
  },
  live: {
    createAndStart: `${API_BASE_URL}/api/live/create-and-start`,
  },
  drive: {
    videos: `${API_BASE_URL}/api/drive/videos`,
    audio: `${API_BASE_URL}/api/drive/audio`,
  },
  analytics: {
    channel: `${API_BASE_URL}/api/analytics/channel`,
    metrics: `${API_BASE_URL}/api/analytics/metrics`,
    daily: `${API_BASE_URL}/api/analytics/daily`,
    topVideos: `${API_BASE_URL}/api/analytics/top-videos`,
    trafficSources: `${API_BASE_URL}/api/analytics/traffic-sources`,
    countries: `${API_BASE_URL}/api/analytics/countries`,
  },
}
