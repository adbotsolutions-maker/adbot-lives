import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { TrendingUp, Users, DollarSign, Eye } from 'lucide-react'
import { useEffect, useState } from 'react'
import { API_ENDPOINTS } from '../config/api'

interface DailyMetrics {
  day: string
  views: number
  estimatedMinutesWatched: number
}

interface TopVideo {
  videoId: string
  title: string
  publishedAt: string
  thumbnail: string
  views: number
  estimatedMinutesWatched: number
  averageViewDuration: number
  likes: number
  comments: number
}

interface ChannelMetrics {
  views: number
  estimatedMinutesWatched: number
  averageViewDuration: number
  subscribersGained: number
  subscribersLost: number
  likes: number
  comments: number
}

export function Analytics() {
  const [dailyData, setDailyData] = useState<DailyMetrics[]>([])
  const [topVideos, setTopVideos] = useState<TopVideo[]>([])
  const [channelMetrics, setChannelMetrics] = useState<ChannelMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Últimos 7 dias
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 7)

      const formatDate = (date: Date) => date.toISOString().split('T')[0]

      const startDateStr = formatDate(startDate)
      const endDateStr = formatDate(endDate)

      // Buscar métricas do canal
      const metricsResponse = await fetch(
        `${API_ENDPOINTS.analytics.metrics}?startDate=${startDateStr}&endDate=${endDateStr}`,
        { credentials: 'include' }
      )

      if (metricsResponse.ok) {
        const metrics = await metricsResponse.json()
        setChannelMetrics(metrics)
      }

      // Buscar métricas diárias
      const dailyResponse = await fetch(
        `${API_ENDPOINTS.analytics.daily}?startDate=${startDateStr}&endDate=${endDateStr}`,
        { credentials: 'include' }
      )

      if (dailyResponse.ok) {
        const daily = await dailyResponse.json()
        setDailyData(daily.map((d: any) => ({
          day: formatDayLabel(d.day),
          views: d.views,
          estimatedMinutesWatched: d.estimatedMinutesWatched
        })))
      }

      // Buscar top vídeos
      const topVideosResponse = await fetch(
        `${API_ENDPOINTS.analytics.topVideos}?startDate=${startDateStr}&endDate=${endDateStr}&maxResults=5`,
        { credentials: 'include' }
      )

      if (topVideosResponse.ok) {
        const videos = await topVideosResponse.json()
        setTopVideos(videos)
      }

    } catch (err: any) {
      console.error('Error fetching analytics:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDayLabel = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR', { weekday: 'short' })
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

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Carregando análises...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-10 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Análise detalhada de performance</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-600">
            Conecte sua conta do YouTube nas configurações para visualizar analytics
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-1">Análise detalhada de performance (últimos 7 dias)</p>
      </div>

      {/* KPIs */}
      {channelMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <KPICard
            title="Total Views"
            value={formatNumber(channelMetrics.views)}
            change={`${channelMetrics.likes} curtidas`}
            icon={<Eye className="w-6 h-6" />}
            color="blue"
          />
          <KPICard
            title="Tempo Assistido"
            value={formatDuration(channelMetrics.estimatedMinutesWatched * 60)}
            change={`${formatDuration(channelMetrics.averageViewDuration)} médio`}
            icon={<TrendingUp className="w-6 h-6" />}
            color="green"
          />
          <KPICard
            title="Inscritos Ganhos"
            value={channelMetrics.subscribersGained.toString()}
            change={`-${channelMetrics.subscribersLost} perdidos`}
            icon={<Users className="w-6 h-6" />}
            color="purple"
          />
          <KPICard
            title="Engajamento"
            value={channelMetrics.comments.toString()}
            change="comentários"
            icon={<DollarSign className="w-6 h-6" />}
            color="yellow"
          />
        </div>
      )}

      {/* Charts */}
      {dailyData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Viewers Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Views - Última Semana</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="views" stroke="#74B9FF" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Watch Time Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tempo Assistido - Última Semana</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="estimatedMinutesWatched" fill="#9CAF88" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top Videos */}
      {topVideos.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Vídeos (Últimos 7 dias)</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Título</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Data</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Views</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Duração Média</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Curtidas</th>
                </tr>
              </thead>
              <tbody>
                {topVideos.map(video => (
                  <tr key={video.videoId} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">
                      <div className="flex items-center gap-3">
                        {video.thumbnail && (
                          <img 
                            src={video.thumbnail} 
                            alt={video.title}
                            className="w-16 h-9 object-cover rounded"
                          />
                        )}
                        <span className="line-clamp-2">{video.title || video.videoId}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(video.publishedAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">{formatNumber(video.views)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDuration(video.averageViewDuration)}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-green-600">
                      {formatNumber(video.likes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(!channelMetrics && !dailyData.length && !topVideos.length) && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-600">Nenhum dado disponível para o período selecionado</p>
        </div>
      )}
    </div>
  )
}

function KPICard({ title, value, change, icon, color }: any) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600',
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
        <span className="text-sm font-medium text-gray-600">{change}</span>
      </div>
      <h3 className="text-sm text-gray-600">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  )
}
