import { Server, Key, Bell } from 'lucide-react'
import { useState } from 'react'

export function Settings() {
  const [vpsHost, setVpsHost] = useState('72.61.179.97')
  const [vpsUser, setVpsUser] = useState('root')
  const [isConnecting, setIsConnecting] = useState(false)

  const handleYouTubeConnect = async () => {
    try {
      setIsConnecting(true)
      const response = await fetch('http://localhost:3001/api/auth/youtube', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to get YouTube auth URL')
      }

      const { authUrl } = await response.json()
      window.open(authUrl, '_blank', 'width=600,height=700')
    } catch (error) {
      console.error('Error connecting to YouTube:', error)
      alert('Erro ao conectar com YouTube')
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Configure suas preferências e credenciais</p>
      </div>

      {/* VPS Configuration */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <Server className="w-6 h-6 text-gray-700" />
          <h2 className="text-xl font-semibold text-gray-900">Configuração VPS</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Host
            </label>
            <input
              type="text"
              value={vpsHost}
              onChange={(e) => setVpsHost(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Usuário
            </label>
            <input
              type="text"
              value={vpsUser}
              onChange={(e) => setVpsUser(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SSH Private Key
            </label>
            <textarea
              rows={4}
              placeholder="Insira sua chave privada SSH..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>

          <button className="bg-linear-to-r from-[#9CAF88] to-[#74B9FF] text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all">
            Salvar Configurações VPS
          </button>
        </div>
      </div>

      {/* YouTube API */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <Key className="w-6 h-6 text-gray-700" />
          <h2 className="text-xl font-semibold text-gray-900">YouTube API</h2>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            As credenciais do YouTube (Client ID e Client Secret) são configuradas nas variáveis de ambiente do servidor por segurança.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              ℹ️ Para conectar sua conta do YouTube, clique no botão abaixo para autorizar o acesso.
            </p>
          </div>

          <button 
            onClick={handleYouTubeConnect}
            disabled={isConnecting}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? 'Conectando...' : 'Conectar YouTube Account'}
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-6 h-6 text-gray-700" />
          <h2 className="text-xl font-semibold text-gray-900">Notificações</h2>
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input type="checkbox" className="w-5 h-5 text-blue-600" defaultChecked />
            <span className="text-sm text-gray-700">Notificar quando live iniciar</span>
          </label>

          <label className="flex items-center gap-3">
            <input type="checkbox" className="w-5 h-5 text-blue-600" defaultChecked />
            <span className="text-sm text-gray-700">Notificar em caso de erro</span>
          </label>

          <label className="flex items-center gap-3">
            <input type="checkbox" className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-700">Relatórios diários por email</span>
          </label>
        </div>
      </div>
    </div>
  )
}
