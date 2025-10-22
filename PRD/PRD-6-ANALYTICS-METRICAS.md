# PRD-6: Analytics e Métricas

[← Voltar ao Índice](./PRD.md)

---

## 1. Métricas em Tempo Real

### 1.1 Dashboard Principal

#### Métricas Críticas (KPIs)
```typescript
interface RealtimeMetrics {
  // Viewership
  concurrentViewers: number;
  peakViewers: number;
  averageViewDuration: number;
  
  // Engagement
  likes: number;
  chatMessagesPerMinute: number;
  newSubscribers: number;
  
  // Performance
  streamHealth: 'excellent' | 'good' | 'fair' | 'poor';
  bitrate: number;
  frameDrops: number;
  
  // Revenue
  estimatedRevenue: number;
  cpm: number;
}
```

#### Coleta de Dados
```typescript
// services/metrics/collector.ts
export class MetricsCollector {
  private interval: NodeJS.Timeout;
  
  startCollection(broadcastId: string) {
    this.interval = setInterval(async () => {
      // 1. Fetch concurrent viewers (YouTube Analytics)
      const viewers = await this.youtubeAnalytics.getConcurrentViewers(broadcastId);
      
      // 2. Fetch engagement (YouTube Data API)
      const engagement = await this.youtube.getVideoStatistics(broadcastId);
      
      // 3. Fetch stream health (VPS metrics)
      const streamHealth = await this.vps.getFFmpegStats();
      
      // 4. Calculate estimates
      const metrics = this.calculateMetrics({
        viewers,
        engagement,
        streamHealth
      });
      
      // 5. Save snapshot
      await this.db.saveSnapshot(broadcastId, metrics);
      
      // 6. Broadcast via WebSocket
      this.io.to(broadcastId).emit('metrics:update', metrics);
      
      // 7. Check alerts
      await this.checkAlerts(broadcastId, metrics);
    }, 30000); // 30s
  }
  
  stopCollection() {
    clearInterval(this.interval);
  }
}
```

---

### 1.2 Componentes de Visualização

#### Metrics Cards
```tsx
// components/analytics/MetricsCards.tsx
export const MetricsCards = () => {
  const { data: metrics, isLoading } = useRealtimeMetrics();
  
  if (isLoading) return <MetricsSkeleton />;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <MetricCard
        title="Viewers Ativos"
        value={metrics.concurrentViewers}
        trend={calculateTrend(metrics.concurrentViewers)}
        icon={<Users />}
        color="blue"
      />
      
      <MetricCard
        title="Pico do Dia"
        value={metrics.peakViewers}
        subtitle={`às ${metrics.peakTime}`}
        icon={<TrendingUp />}
        color="green"
      />
      
      <MetricCard
        title="Receita Estimada"
        value={formatCurrency(metrics.estimatedRevenue)}
        trend={calculateRevenueTrend(metrics)}
        icon={<DollarSign />}
        color="yellow"
      />
    </div>
  );
};

const MetricCard = ({ title, value, trend, icon, color }: Props) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className={`p-2 rounded-full bg-${color}-100`}>
        {icon}
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold">{value}</div>
      {trend && (
        <p className={`text-sm mt-2 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}% vs última hora
        </p>
      )}
    </CardContent>
  </Card>
);
```

#### Real-time Chart
```tsx
// components/analytics/ViewersChart.tsx
export const ViewersChart = () => {
  const { data: history } = useMetricsHistory('24h');
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Viewers - Últimas 24 horas</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={history}>
            <defs>
              <linearGradient id="colorViewers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={(ts) => format(new Date(ts), 'HH:mm')}
            />
            <YAxis />
            <CartesianGrid strokeDasharray="3 3" />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="viewers" 
              stroke="#8884d8" 
              fillOpacity={1} 
              fill="url(#colorViewers)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
```

---

## 2. Analytics Históricos

### 2.1 Agregação de Dados

#### Time-series Queries
```sql
-- Viewers por hora (últimos 7 dias)
SELECT 
  date_trunc('hour', snapshot_at) as hour,
  AVG(concurrent_viewers) as avg_viewers,
  MAX(concurrent_viewers) as peak_viewers,
  SUM(watch_time_minutes) as total_watch_time
FROM analytics_snapshots
WHERE broadcast_id = $1
  AND snapshot_at >= NOW() - INTERVAL '7 days'
GROUP BY hour
ORDER BY hour DESC;

-- Crescimento diário de inscritos
SELECT 
  DATE(snapshot_at) as date,
  SUM(new_subscribers) as daily_subs,
  SUM(new_subscribers) OVER (ORDER BY DATE(snapshot_at)) as cumulative_subs
FROM analytics_snapshots
WHERE user_id = $1
  AND snapshot_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(snapshot_at)
ORDER BY date DESC;

-- Top broadcasts por revenue
SELECT 
  b.id,
  b.title,
  SUM(a.estimated_revenue) as total_revenue,
  AVG(a.cpm) as avg_cpm,
  MAX(a.concurrent_viewers) as peak_viewers,
  SUM(a.watch_time_minutes) / 60 as total_hours
FROM broadcasts b
JOIN analytics_snapshots a ON a.broadcast_id = b.id
WHERE b.user_id = $1
  AND b.status = 'ended'
GROUP BY b.id, b.title
ORDER BY total_revenue DESC
LIMIT 10;
```

#### Analytics Service
```typescript
// services/analytics/historical.service.ts
export class HistoricalAnalyticsService {
  async getBroadcastSummary(broadcastId: string) {
    const snapshots = await db
      .select()
      .from(analyticsSnapshots)
      .where(eq(analyticsSnapshots.broadcastId, broadcastId))
      .orderBy(desc(analyticsSnapshots.snapshotAt));
    
    return {
      totalViews: sum(snapshots.map(s => s.totalViews)),
      totalWatchTime: sum(snapshots.map(s => s.watchTimeMinutes)),
      peakViewers: max(snapshots.map(s => s.concurrentViewers)),
      avgViewers: avg(snapshots.map(s => s.concurrentViewers)),
      totalRevenue: sum(snapshots.map(s => s.estimatedRevenue)),
      avgCPM: avg(snapshots.map(s => s.cpm)),
      engagement: {
        likes: last(snapshots)?.likes || 0,
        newSubscribers: sum(snapshots.map(s => s.newSubscribers)),
        chatMessages: sum(snapshots.map(s => s.chatMessages))
      }
    };
  }
  
  async getChannelOverview(userId: string, period: Period) {
    const { startDate, endDate } = this.getPeriodDates(period);
    
    const broadcasts = await this.getBroadcastsInPeriod(userId, startDate, endDate);
    const snapshots = await this.getSnapshotsForBroadcasts(broadcasts.map(b => b.id));
    
    return {
      totalBroadcasts: broadcasts.length,
      totalHoursLive: this.calculateTotalHours(broadcasts),
      totalViews: sum(snapshots.map(s => s.totalViews)),
      totalWatchTime: sum(snapshots.map(s => s.watchTimeMinutes)),
      totalRevenue: sum(snapshots.map(s => s.estimatedRevenue)),
      avgCPM: avg(snapshots.map(s => s.cpm)),
      subscribersGained: sum(snapshots.map(s => s.newSubscribers)),
      trends: await this.calculateTrends(userId, period)
    };
  }
}
```

---

### 2.2 Visualizações Avançadas

#### Performance Dashboard
```tsx
// pages/Analytics.tsx
export const AnalyticsPage = () => {
  const [period, setPeriod] = useState<Period>('7d');
  const { data: overview } = useChannelOverview(period);
  
  return (
    <div className="space-y-6">
      {/* Header com período */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>
      
      {/* Overview Cards */}
      <OverviewCards data={overview} />
      
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ViewersOverTimeChart period={period} />
        <WatchTimeChart period={period} />
        <RevenueChart period={period} />
        <EngagementChart period={period} />
      </div>
      
      {/* Top Broadcasts Table */}
      <TopBroadcastsTable period={period} />
      
      {/* Detailed Reports */}
      <ReportsSection period={period} />
    </div>
  );
};
```

#### Comparison View
```tsx
// components/analytics/ComparisonView.tsx
export const ComparisonView = () => {
  const [broadcasts, setBroadcasts] = useState<string[]>([]);
  const { data: comparison } = useCompareBroadcasts(broadcasts);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparar Broadcasts</CardTitle>
      </CardHeader>
      <CardContent>
        <BroadcastSelector 
          value={broadcasts} 
          onChange={setBroadcasts}
          max={4}
        />
        
        {comparison && (
          <>
            <ComparisonTable data={comparison} />
            <ComparisonCharts data={comparison} />
          </>
        )}
      </CardContent>
    </Card>
  );
};
```

---

## 3. Revenue Analytics

### 3.1 Cálculos de Revenue

#### Revenue Estimator
```typescript
// services/analytics/revenue.service.ts
export class RevenueService {
  async estimateRevenue(broadcastId: string) {
    const snapshots = await this.getSnapshots(broadcastId);
    const latestCPM = this.getLatestCPM(snapshots);
    
    // Formula: (Views / 1000) * CPM * % de monetização
    const totalViews = last(snapshots)?.totalViews || 0;
    const monetizationRate = 0.55; // 55% das views são monetizadas
    
    const estimated = (totalViews / 1000) * latestCPM * monetizationRate;
    
    return {
      estimated,
      cpm: latestCPM,
      rpm: estimated / (totalViews / 1000),
      monetizedViews: totalViews * monetizationRate
    };
  }
  
  async getRevenueBreakdown(userId: string, period: Period) {
    const data = await this.youtubeAnalytics.getRevenueMetrics(
      this.getPeriodDates(period)
    );
    
    return {
      total: data.estimatedRevenue,
      breakdown: {
        ads: data.estimatedAdRevenue,
        youtube_premium: data.estimatedRedPartnerRevenue,
        super_chat: await this.getSuperChatRevenue(userId, period),
        memberships: await this.getMembershipsRevenue(userId, period)
      },
      byCountry: data.revenueByCountry,
      byDevice: data.revenueByDevice
    };
  }
  
  async projectMonthlyRevenue(userId: string) {
    const currentMonth = await this.getRevenueThisMonth(userId);
    const daysElapsed = new Date().getDate();
    const daysInMonth = new Date(
      new Date().getFullYear(), 
      new Date().getMonth() + 1, 
      0
    ).getDate();
    
    const dailyAverage = currentMonth.total / daysElapsed;
    const projected = dailyAverage * daysInMonth;
    
    return {
      current: currentMonth.total,
      projected,
      dailyAverage,
      confidence: this.calculateConfidence(daysElapsed, daysInMonth)
    };
  }
}
```

#### Revenue Dashboard
```tsx
// components/analytics/RevenueDashboard.tsx
export const RevenueDashboard = () => {
  const { data: revenue } = useRevenueMetrics('30d');
  const { data: projection } = useMonthlyProjection();
  
  return (
    <div className="space-y-6">
      {/* Current Month */}
      <Card>
        <CardHeader>
          <CardTitle>Receita do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Atual</p>
              <p className="text-2xl font-bold">
                {formatCurrency(revenue.current)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Projeção</p>
              <p className="text-2xl font-bold">
                {formatCurrency(projection.projected)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Média/Dia</p>
              <p className="text-2xl font-bold">
                {formatCurrency(projection.dailyAverage)}
              </p>
            </div>
          </div>
          
          <Progress 
            value={(revenue.current / projection.projected) * 100} 
            className="mt-4"
          />
        </CardContent>
      </Card>
      
      {/* Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Breakdown de Receita</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={revenue.breakdown}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {revenue.breakdown.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* CPM Trends */}
      <CPMTrendsChart />
    </div>
  );
};
```

---

## 4. Alertas e Notificações

### 4.1 Sistema de Alertas

#### Alert Rules
```typescript
// services/alerts/rules.ts
interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: Metrics) => boolean;
  severity: 'info' | 'warning' | 'critical';
  message: (metrics: Metrics) => string;
  actions: AlertAction[];
}

const ALERT_RULES: AlertRule[] = [
  {
    id: 'low-viewers',
    name: 'Baixa Audiência',
    condition: (m) => m.concurrentViewers < 50,
    severity: 'warning',
    message: (m) => `Apenas ${m.concurrentViewers} viewers. Considere otimizar.`,
    actions: ['notify']
  },
  {
    id: 'stream-health-poor',
    name: 'Stream com Problemas',
    condition: (m) => m.streamHealth === 'poor',
    severity: 'critical',
    message: () => 'Stream health crítico. Verificar VPS.',
    actions: ['notify', 'log', 'auto-restart']
  },
  {
    id: 'high-cpm',
    name: 'CPM Elevado',
    condition: (m) => m.cpm > 15,
    severity: 'info',
    message: (m) => `CPM excelente: $${m.cpm}. Continue assim!`,
    actions: ['notify']
  },
  {
    id: 'quota-warning',
    name: 'Quota YouTube API',
    condition: (m) => m.quotaRemaining < 1000,
    severity: 'warning',
    message: (m) => `Quota restante: ${m.quotaRemaining} units`,
    actions: ['notify', 'throttle']
  }
];
```

#### Alert Checker
```typescript
// services/alerts/checker.ts
export class AlertChecker {
  private activeAlerts = new Map<string, Date>();
  
  async checkAlerts(broadcastId: string, metrics: Metrics) {
    for (const rule of ALERT_RULES) {
      const isTriggered = rule.condition(metrics);
      const alertKey = `${broadcastId}:${rule.id}`;
      
      if (isTriggered && !this.activeAlerts.has(alertKey)) {
        // Novo alerta
        await this.triggerAlert(broadcastId, rule, metrics);
        this.activeAlerts.set(alertKey, new Date());
      } else if (!isTriggered && this.activeAlerts.has(alertKey)) {
        // Alerta resolvido
        await this.resolveAlert(broadcastId, rule);
        this.activeAlerts.delete(alertKey);
      }
    }
  }
  
  private async triggerAlert(
    broadcastId: string, 
    rule: AlertRule, 
    metrics: Metrics
  ) {
    const alert = {
      broadcastId,
      rule: rule.id,
      severity: rule.severity,
      message: rule.message(metrics),
      triggeredAt: new Date()
    };
    
    // Save to DB
    await db.insert(alerts).values(alert);
    
    // Execute actions
    for (const action of rule.actions) {
      await this.executeAction(action, alert);
    }
  }
  
  private async executeAction(action: AlertAction, alert: Alert) {
    switch (action) {
      case 'notify':
        await this.notificationService.send(alert);
        break;
      case 'log':
        logger.warn('Alert triggered', alert);
        break;
      case 'auto-restart':
        await this.vps.restartService();
        break;
      case 'throttle':
        await this.youtube.enableThrottling();
        break;
    }
  }
}
```

---

### 4.2 Notificações

#### Notification Service
```typescript
// services/notifications/service.ts
export class NotificationService {
  async send(alert: Alert) {
    const user = await this.getUser(alert.userId);
    
    if (!user.notificationsEnabled) return;
    
    // Push notification (via WebSocket)
    this.io.to(user.id).emit('notification', {
      type: alert.severity,
      title: alert.rule.name,
      message: alert.message,
      timestamp: alert.triggeredAt
    });
    
    // Email notification (apenas para critical)
    if (alert.severity === 'critical') {
      await this.sendEmail(user.email, alert);
    }
    
    // SMS notification (opcional, para critical)
    if (user.smsNotifications && alert.severity === 'critical') {
      await this.sendSMS(user.phone, alert);
    }
  }
}
```

#### Notification Component
```tsx
// components/notifications/NotificationCenter.tsx
export const NotificationCenter = () => {
  const { notifications, markAsRead, clearAll } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell />
          {notifications.unread > 0 && (
            <Badge className="absolute -top-1 -right-1" variant="destructive">
              {notifications.unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Notificações</h3>
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Limpar todas
            </Button>
          </div>
          
          <ScrollArea className="h-80">
            {notifications.items.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={() => markAsRead(notification.id)}
              />
            ))}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
};
```

---

## 5. Export e Reports

### 5.1 Export Functionality

```typescript
// services/export/service.ts
export class ExportService {
  async exportToCSV(userId: string, options: ExportOptions) {
    const data = await this.fetchData(userId, options);
    
    const csv = parse(data, {
      fields: options.fields,
      delimiter: ',',
      quote: '"'
    });
    
    return {
      content: csv,
      filename: `analytics-${options.period}-${Date.now()}.csv`,
      mimeType: 'text/csv'
    };
  }
  
  async exportToJSON(userId: string, options: ExportOptions) {
    const data = await this.fetchData(userId, options);
    
    return {
      content: JSON.stringify(data, null, 2),
      filename: `analytics-${options.period}-${Date.now()}.json`,
      mimeType: 'application/json'
    };
  }
  
  async generatePDFReport(userId: string, period: Period) {
    const overview = await this.analytics.getChannelOverview(userId, period);
    const charts = await this.generateCharts(userId, period);
    
    const pdf = await this.pdfGenerator.create({
      title: `Analytics Report - ${period}`,
      data: overview,
      charts
    });
    
    return pdf;
  }
}
```

---

**🎉 PRD Completo!**

Todos os documentos do PRD foram criados com sucesso:
- ✅ PRD.md - Índice geral
- ✅ PRD-1-VISAO-PRODUTO.md - Visão e objetivos
- ✅ PRD-2-REQUISITOS-FUNCIONAIS.md - Requisitos detalhados
- ✅ PRD-3-ARQUITETURA-TECNICA.md - Stack e arquitetura
- ✅ PRD-4-INTEGRACAO-APIS.md - YouTube APIs
- ✅ PRD-5-ROADMAP.md - Roadmap de 12 semanas
- ✅ PRD-6-ANALYTICS-METRICAS.md - Analytics e métricas

**Próximos Passos:**
1. Revisar e aprovar o PRD
2. Começar implementação pela Semana 1 do Roadmap
3. Setup do ambiente de desenvolvimento
