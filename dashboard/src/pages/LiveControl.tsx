import { Play, Square, Radio, Calendar, Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { API_ENDPOINTS } from '../config/api'

interface DriveFile {
  id: string
  name: string
  mimeType: string
  size?: string
  thumbnailLink?: string
}

interface ActiveBroadcast {
  id: string
  title: string
  status: string
  youtubeUrl?: string
}

export function LiveControl() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [scheduledStartTime, setScheduledStartTime] = useState('')
  const [isScheduled, setIsScheduled] = useState(false)
  
  // Google Drive media
  const [driveVideos, setDriveVideos] = useState<DriveFile[]>([])
  const [driveAudio, setDriveAudio] = useState<DriveFile[]>([])
  const [selectedVideo, setSelectedVideo] = useState<DriveFile | null>(null)
  const [selectedAudio, setSelectedAudio] = useState<DriveFile | null>(null)
  const [loadingMedia, setLoadingMedia] = useState(false)

  // Active broadcast
  const [activeBroadcast, setActiveBroadcast] = useState<ActiveBroadcast | null>(null)
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    fetchDriveMedia()
    checkActiveBroadcasts()
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
          setActiveBroadcast({
            id: active.id,
            title: active.snippet?.title || 'Live Stream',
            status: active.status?.lifeCycleStatus || 'active',
            youtubeUrl: `https://www.youtube.com/watch?v=${active.id}`
          })
          setIsLive(true)
        }
      }
    } catch (error) {
      console.error('Erro ao verificar broadcasts ativos:', error)
    }
  }

  const fetchDriveMedia = async () => {
    try {
      setLoadingMedia(true)
      
      const [videosRes, audioRes] = await Promise.all([
        fetch(API_ENDPOINTS.drive.videos, { credentials: 'include' }),
        fetch(API_ENDPOINTS.drive.audio, { credentials: 'include' })
      ])

      if (videosRes.ok) {
        const { videos } = await videosRes.json()
        setDriveVideos(videos || [])
      }

      if (audioRes.ok) {
        const { audio } = await audioRes.json()
        setDriveAudio(audio || [])
      }
    } catch (error) {
      console.error('Erro ao buscar mídia do Drive:', error)
    } finally {
      setLoadingMedia(false)
    }
  }

  const handleStart = async () => {
    if (!title || !selectedVideo) {
      alert('Preencha o título e selecione um vídeo')
      return
    }

    if (isScheduled && !scheduledStartTime) {
      alert('Defina a data e hora de início para agendar a live')
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch(API_ENDPOINTS.live.createAndStart, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title,
          description,
          scheduledStartTime: isScheduled && scheduledStartTime ? new Date(scheduledStartTime).toISOString() : new Date().toISOString(),
          videoSource: {
            type: 'drive',
            fileId: selectedVideo.id
          },
          audioSource: selectedAudio ? {
            type: 'drive',
            fileId: selectedAudio.id
          } : null
        })
      })

      if (!response.ok) {
        throw new Error('Falha ao iniciar live')
      }

      const data = await response.json()
      
      setActiveBroadcast({
        id: data.broadcast.id,
        title: data.broadcast.title,
        status: 'live',
        youtubeUrl: data.broadcast.youtubeUrl
      })
      setIsLive(true)
      
      const message = isScheduled 
        ? `✅ Live agendada com sucesso!\n\nURL: ${data.broadcast.youtubeUrl}\n\nInício: ${new Date(scheduledStartTime).toLocaleString('pt-BR')}\n\nA live começará automaticamente no horário agendado.`
        : `✅ Live criada com sucesso!\n\nURL: ${data.broadcast.youtubeUrl}\n\nA live estará ao vivo em ~10 segundos.`
      
      alert(message)
      
    } catch (error: any) {
      console.error('Erro ao iniciar live:', error)
      alert(`❌ Erro: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleStop = async () => {
    if (!activeBroadcast) return

    setLoading(true)
    try {
      const response = await fetch(API_ENDPOINTS.broadcasts.stop, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          broadcastId: activeBroadcast.id
        })
      })

      if (!response.ok) {
        throw new Error('Falha ao parar live')
      }

      setActiveBroadcast(null)
      setIsLive(false)
      setTitle('')
      setDescription('')
      setSelectedVideo(null)
      setSelectedAudio(null)

      alert('✅ Live finalizada com sucesso!')
      
    } catch (error: any) {
      console.error('Erro ao parar live:', error)
      alert(`❌ Erro: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Controle de Live</h1>
        <p className="text-gray-600 mt-1">Gerencie suas transmissões ao vivo</p>
      </div>

      {/* Control Panel */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-6">Configuração da Live</h2>
        
        {!isLive ? (
          <div className="space-y-4">
            {/* Title Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título da Live
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Bitcoin AO VIVO - Análise em Tempo Real 2025 📈"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição (opcional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição da live..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Agendamento */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Calendar className="w-4 h-4" />
                  Agendar Live
                </label>
                <button
                  type="button"
                  onClick={() => setIsScheduled(!isScheduled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isScheduled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isScheduled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              {isScheduled && (
                <div className="space-y-3">
                  <div>
                    <label className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                      <Clock className="w-3 h-3" />
                      Data e Hora de Início
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledStartTime}
                      onChange={(e) => setScheduledStartTime(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    ⚠️ A live será criada no YouTube e iniciará automaticamente no horário agendado
                  </p>
                </div>
              )}
            </div>

            {/* Video Selection from Google Drive */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vídeo (Google Drive)
              </label>
              <select
                value={selectedVideo?.id || ''}
                onChange={(e) => {
                  const video = driveVideos.find(v => v.id === e.target.value)
                  setSelectedVideo(video || null)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione um vídeo do Drive</option>
                {driveVideos.map((video) => (
                  <option key={video.id} value={video.id}>
                    {video.name}
                  </option>
                ))}
              </select>
              {driveVideos.length === 0 && !loadingMedia && (
                <p className="text-sm text-gray-500 mt-1">Conecte sua conta do YouTube nas configurações para acessar o Drive</p>
              )}
            </div>

            {/* Audio Selection from Google Drive */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Música de Fundo (Google Drive) - Opcional
              </label>
              <select
                value={selectedAudio?.id || ''}
                onChange={(e) => {
                  const audio = driveAudio.find(a => a.id === e.target.value)
                  setSelectedAudio(audio || null)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sem música de fundo</option>
                {driveAudio.map((audio) => (
                  <option key={audio.id} value={audio.id}>
                    {audio.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStart}
              disabled={!title || !selectedVideo || loading || (isScheduled && !scheduledStartTime)}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isScheduled ? <Calendar className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              {loading ? 'Criando Live...' : (isScheduled ? 'Agendar Live' : 'Criar e Iniciar Live')}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Live Status */}
            <div className="bg-linear-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Radio className="w-8 h-8 text-red-600 animate-pulse" />
                <div>
                  <h3 className="text-xl font-bold text-red-900">AO VIVO</h3>
                  <p className="text-sm text-red-700">{activeBroadcast?.title}</p>
                </div>
              </div>

              {activeBroadcast?.youtubeUrl && (
                <a
                  href={activeBroadcast.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors mb-4"
                >
                  🔴 Abrir no YouTube
                </a>
              )}

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-white rounded p-3">
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="text-lg font-bold text-green-600">● LIVE</p>
                </div>
                <div className="bg-white rounded p-3">
                  <p className="text-sm text-gray-600">Broadcast ID</p>
                  <p className="text-xs font-mono text-gray-900">{activeBroadcast?.id.substring(0, 12)}...</p>
                </div>
              </div>
            </div>

            {/* Stop Button */}
            <button
              onClick={handleStop}
              disabled={loading}
              className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Square className="w-5 h-5" />
              {loading ? 'Finalizando...' : 'Finalizar Live'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
