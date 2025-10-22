import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { TrendingUp, Users, DollarSign, Eye } from 'lucide-react'

const mockData = [
  { day: 'Seg', viewers: 450, revenue: 45 },
  { day: 'Ter', viewers: 520, revenue: 52 },
  { day: 'Qua', viewers: 680, revenue: 68 },
  { day: 'Qui', viewers: 590, revenue: 59 },
  { day: 'Sex', viewers: 750, revenue: 75 },
  { day: 'Sáb', viewers: 890, revenue: 89 },
  { day: 'Dom', viewers: 720, revenue: 72 },
]

export function Analytics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-1">Análise detalhada de performance</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard
          title="Total Views"
          value="45.2K"
          change="+12.5%"
          icon={<Eye className="w-6 h-6" />}
          color="blue"
        />
        <KPICard
          title="Avg Viewers"
          value="650"
          change="+8.3%"
          icon={<Users className="w-6 h-6" />}
          color="green"
        />
        <KPICard
          title="Revenue"
          value="R$ 892"
          change="+18.2%"
          icon={<DollarSign className="w-6 h-6" />}
          color="yellow"
        />
        <KPICard
          title="CPM"
          value="$8.50"
          change="+5.1%"
          icon={<TrendingUp className="w-6 h-6" />}
          color="purple"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Viewers Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Viewers - Última Semana</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mockData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="viewers" stroke="#74B9FF" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue - Última Semana</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" fill="#9CAF88" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Broadcasts */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Lives Recentes</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Título</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Data</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Views</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Duração</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Revenue</th>
              </tr>
            </thead>
            <tbody>
              <BroadcastRow 
                title="Bitcoin AO VIVO 2025"
                date="22/10/2025"
                views="3.2K"
                duration="4h 32m"
                revenue="R$ 127"
              />
              <BroadcastRow 
                title="Lofi Study Music 24/7"
                date="21/10/2025"
                views="1.8K"
                duration="24h"
                revenue="R$ 89"
              />
              <BroadcastRow 
                title="Análise Mercado Financeiro"
                date="20/10/2025"
                views="2.1K"
                duration="3h 15m"
                revenue="R$ 105"
              />
            </tbody>
          </table>
        </div>
      </div>
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
        <span className="text-sm font-medium text-green-600">{change}</span>
      </div>
      <h3 className="text-sm text-gray-600">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  )
}

function BroadcastRow({ title, date, views, duration, revenue }: any) {
  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="py-3 px-4 text-sm text-gray-900">{title}</td>
      <td className="py-3 px-4 text-sm text-gray-600">{date}</td>
      <td className="py-3 px-4 text-sm text-gray-900">{views}</td>
      <td className="py-3 px-4 text-sm text-gray-600">{duration}</td>
      <td className="py-3 px-4 text-sm font-medium text-green-600">{revenue}</td>
    </tr>
  )
}
