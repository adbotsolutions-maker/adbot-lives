import { useLiveStore } from '../stores/liveStore'
import { Radio as RadioIcon, Users, Video, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { API_ENDPOINTS } from '../config/api'

interface ChannelAnalytics {
  channel: {
    channelId: string
    title: string
    statistics: {
      viewCount: number
      subscriberCount: number
      videoCount: number
    }
  }
  totalLives: number
  totalViews: number
  totalSubscribers: number
  totalVideos: number
}

interface ActiveBroadcast {
  id: string
  title: string
  youtubeUrl?: string
}

export function Dashboard() {
  const { currentBroadcast, isLive } = useLiveStore()
  const [analytics, setAnalytics] = useState<ChannelAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [, setError] = useState<string | null>(null)
  const [activeLive, setActiveLive] = useState<ActiveBroadcast | null>(null)
  const [showEmbedded, setShowEmbedded] = useState(false)

  useEffect(() => {
    fetchAnalytics()
    checkActiveBroadcasts()
    // Atualizar a cada 30 segundos
    const interval = setInterval(checkActiveBroadcasts, 30000)
    return () => clearInterval(interval)
  }, [])

  const checkActiveBroadcasts = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.broadcasts.active, {
        credentials: 'include'
      })

      if (response.ok) {
        const broadcasts = await response.json()
        if (broadcasts.length > 0) {
          const active = broadcasts[0]
          setActiveLive({
            id: active.id,
            title: active.snippet?.title || 'Live Stream',
            youtubeUrl: `https://www.youtube.com/watch?v=${active.id}`
          })
          setShowEmbedded(true)
        } else {
          setActiveLive(null)
          setShowEmbedded(false)
        }
      }
    } catch (error) {
      console.error('Erro ao verificar broadcasts ativos:', error)
    }
  }

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(API_ENDPOINTS.analytics.channel, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const data = await response.json()
      setAnalytics(data)
    } catch (err: any) {
      console.error('Error fetching analytics:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  return (
    <div className="flex gap-4">
      {/* Main Content */}
      <div className={`flex-1 space-y-6 transition-all duration-300 ${showEmbedded ? 'mr-0' : ''}`}>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Visão geral das suas lives automatizadas</p>
        </div>

      {/* Status Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Status da Live</h3>
            <p className="text-sm text-gray-500 mt-1">
              {isLive ? 'Transmitindo agora' : 'Nenhuma transmissão ativa'}
            </p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${isLive ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
            }`}>
            <RadioIcon className={`w-5 h-5 ${isLive ? 'animate-pulse' : ''}`} />
            <span className="font-medium">{isLive ? 'AO VIVO' : 'Offline'}</span>
          </div>
        </div>

        {currentBroadcast && isLive && (
          <div className="mt-6 grid grid-cols-3 gap-4">
            <MetricCard title="Viewers" value={currentBroadcast.viewers || 0} />
            <MetricCard title="Duração" value={getDuration(currentBroadcast.startTime)} />
            <MetricCard title="Status" value="Excellent" color="green" />
          </div>
        )}
      </div>

      {/* Quick Stats */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-10 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : analytics ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            title="Total Lives"
            value={analytics.totalLives.toString()}
            change={analytics.totalLives > 0 ? `${analytics.totalLives} transmissões` : 'Nenhuma ainda'}
            icon={<RadioIcon className="w-6 h-6" />}
          />
          <StatsCard
            title="Total Views"
            value={formatNumber(analytics.totalViews)}
            change={`${analytics.totalSubscribers} inscritos`}
            icon={<Users className="w-6 h-6" />}
          />
          <StatsCard
            title="Total de Vídeos"
            value={analytics.totalVideos.toString()}
            change={`${analytics.channel.title}`}
            icon={<Video className="w-6 h-6" />}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            title="Total Lives"
            value="--"
            change="Conecte sua conta do YouTube"
            icon={<RadioIcon className="w-6 h-6" />}
          />
          <StatsCard
            title="Total Views"
            value="--"
            change="Conecte sua conta do YouTube"
            icon={<Users className="w-6 h-6" />}
          />
          <StatsCard
            title="Total de Vídeos"
            value="--"
            change="Conecte sua conta do YouTube"
            icon={<Video className="w-6 h-6" />}
          />
        </div>
      )}
      </div>

      {/* Embedded Live Player - Sidebar Retrátil */}
      {activeLive && (
        <div className={`transition-all duration-300 ${showEmbedded ? 'w-96' : 'w-12'} bg-white rounded-lg shadow-lg overflow-hidden flex flex-col`}>
          {/* Toggle Button */}
          <button
            onClick={() => setShowEmbedded(!showEmbedded)}
            className="p-3 bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center justify-center"
            title={showEmbedded ? 'Ocultar player' : 'Mostrar player'}
          >
            {showEmbedded ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>

          {/* Player Container */}
          {showEmbedded && (
            <div className="flex-1 flex flex-col p-4">
              <div className="mb-3">
                <h3 className="font-semibold text-gray-900 text-sm mb-1">🔴 AO VIVO</h3>
                <p className="text-xs text-gray-600 line-clamp-2">{activeLive.title}</p>
              </div>
              
              {/* YouTube Embedded Player */}
              <div className="aspect-video bg-black rounded-lg overflow-hidden mb-3">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${activeLive.id}?autoplay=1&mute=1`}
                  title="Live Stream"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>

              {/* Live Chat */}
              <div className="flex-1 bg-gray-50 rounded-lg overflow-hidden">
                <iframe
                  src={`https://www.youtube.com/live_chat?v=${activeLive.id}&embed_domain=${window.location.hostname}`}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  title="Live Chat"
                  className="w-full h-full min-h-[400px]"
                />
              </div>

              {/* Action Button */}
              <a
                href={activeLive.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 w-full bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors text-center"
              >
                Abrir no YouTube
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MetricCard({ title, value, color = 'blue' }: { title: string; value: string | number; color?: string }) {
  return (
    <div className="bg-gray-50 rounded p-4">
      <p className="text-sm text-gray-600">{title}</p>
      <p className={`text-2xl font-bold text-${color}-600 mt-1`}>{value}</p>
    </div>
  )
}

function StatsCard({ title, value, change, icon }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div className="text-gray-400">{icon}</div>
        <span className="text-sm text-green-600 font-medium">{change}</span>
      </div>
      <h3 className="text-sm text-gray-600 mt-4">{title}</h3>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  )
}

function getDuration(startTime?: Date): string {
  if (!startTime) return '0m'
  const minutes = Math.floor((Date.now() - startTime.getTime()) / 60000)
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
}
