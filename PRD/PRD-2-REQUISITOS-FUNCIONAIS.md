# PRD-2: Requisitos Funcionais Detalhados

[← Voltar ao Índice](./PRD.md)

---

## 1. Módulos e Funcionalidades

### 1.1 Live Control Module

#### RF-001: Controle de Transmissão
**Prioridade:** P0 (Crítico)

**Descrição:** Permitir controle completo do ciclo de vida de uma live

**User Stories:**
- Como criador, quero iniciar uma live com um clique para começar a transmitir rapidamente
- Como criador, quero pausar a transmissão sem finalizá-la para fazer ajustes
- Como criador, quero finalizar a live e salvar automaticamente o VOD

**Critérios de Aceitação:**
- [ ] Botão "Iniciar Live" disponível quando há vídeo configurado
- [ ] Botão "Pausar" disponível durante transmissão ativa
- [ ] Botão "Finalizar" com confirmação modal
- [ ] Feedback visual do status (loading, success, error)
- [ ] Atualização de status em tempo real (< 2s)
- [ ] Logs de todas as ações no histórico

**Fluxo Principal:**
```
1. Usuário seleciona vídeo da biblioteca
2. Usuário configura parâmetros de streaming
3. Usuário clica "Iniciar Live"
4. Sistema valida configurações
5. Sistema executa comando SSH no VPS
6. Sistema cria broadcast via YouTube API
7. Sistema inicia serviço systemd
8. Sistema confirma início da transmissão
9. Dashboard atualiza para status "Live"
```

**Dependências:**
- VPS SSH Module (RF-010)
- YouTube Integration Module (RF-020)
- Video Library (RF-040)

---

#### RF-002: Preview de Stream
**Prioridade:** P1 (Alta)

**Descrição:** Visualizar preview da live antes e durante transmissão

**User Stories:**
- Como criador, quero ver preview do vídeo antes de ir ao ar
- Como criador, quero monitorar o que está sendo transmitido em tempo real

**Critérios de Aceitação:**
- [ ] Preview embeded do YouTube quando live está ativa
- [ ] Thumbnail do vídeo quando live está parada
- [ ] Indicador de qualidade de stream (bitrate, fps)
- [ ] Controles de player (mute, fullscreen)
- [ ] Atualização automática a cada 30s

---

#### RF-003: Configuração de Streaming
**Prioridade:** P0 (Crítico)

**Descrição:** Configurar parâmetros técnicos de transmissão

**User Stories:**
- Como criador, quero ajustar qualidade do vídeo para otimizar bandwidth
- Como criador, quero escolher diferentes presets de encoding

**Critérios de Aceitação:**
- [ ] Seleção de qualidade: 720p, 1080p
- [ ] Seleção de bitrate: 2000k, 3000k, 4500k, 6000k
- [ ] Preset FFmpeg: ultrafast, veryfast, fast, medium
- [ ] Audio bitrate: 96k, 128k, 192k
- [ ] Validação de combinações compatíveis
- [ ] Templates salvos para reutilização

**Parâmetros Configuráveis:**
```typescript
interface StreamConfig {
  video: {
    resolution: '720p' | '1080p';
    bitrate: '2000k' | '3000k' | '4500k' | '6000k';
    codec: 'libx264' | 'h264_nvenc';
    preset: 'ultrafast' | 'veryfast' | 'fast' | 'medium';
    fps: 30 | 60;
    pixelFormat: 'yuv420p';
    keyframeInterval: number; // default: 2s
  };
  audio: {
    codec: 'aac';
    bitrate: '96k' | '128k' | '192k';
    sampleRate: 44100 | 48000;
    channels: 1 | 2;
  };
  streaming: {
    loop: boolean; // -stream_loop -1
    restart: boolean; // auto restart on failure
    restartDelay: number; // seconds
  };
}
```

---

### 1.2 VPS Management Module

#### RF-010: Terminal SSH Integrado
**Prioridade:** P0 (Crítico)

**Descrição:** Terminal web para executar comandos no VPS

**User Stories:**
- Como criador, quero executar comandos SSH sem sair do dashboard
- Como admin, quero visualizar logs do servidor em tempo real

**Critérios de Aceitação:**
- [ ] Terminal interativo usando xterm.js
- [ ] Conexão SSH segura via WebSocket
- [ ] Histórico de comandos (setas up/down)
- [ ] Copy/paste funcional
- [ ] Autocomplete básico de comandos
- [ ] Temas: dark/light
- [ ] Redimensionável
- [ ] Scroll infinito de histórico

**Comandos Pré-configurados:**
```bash
# Status do serviço
systemctl status youtube-live.service

# Logs em tempo real
journalctl -u youtube-live.service -f

# Reiniciar serviço
systemctl restart youtube-live.service

# Verificar processos FFmpeg
ps aux | grep ffmpeg

# Uso de recursos
htop

# Espaço em disco
df -h
```

**Segurança:**
- Autenticação via chave SSH (não password)
- Rate limiting de comandos
- Whitelist de comandos permitidos (opcional)
- Logs de auditoria de todos os comandos
- Timeout de sessão: 30min de inatividade

---

#### RF-011: Gestão de Serviços systemd
**Prioridade:** P0 (Crítico)

**Descrição:** Interface gráfica para gerenciar serviços systemd

**User Stories:**
- Como criador, quero ver status de todos os serviços de forma visual
- Como criador, quero reiniciar serviços com um clique

**Critérios de Aceitação:**
- [ ] Lista de serviços configurados
- [ ] Status em tempo real (active/inactive/failed)
- [ ] Botões: Start, Stop, Restart, Enable, Disable
- [ ] Confirmação para ações destrutivas
- [ ] Logs do serviço integrados
- [ ] Métricas: uptime, restarts, memory, cpu

**Interface:**
```
┌─────────────────────────────────────────────────┐
│ Serviços systemd                                │
├─────────────────────────────────────────────────┤
│ youtube-live.service           ● Active Running │
│   Uptime: 15h 32m              [Stop] [Restart] │
│   CPU: 45%   Memory: 1.2GB                      │
│   Last restart: 2025-10-22 08:30                │
│   [View Logs]                                   │
├─────────────────────────────────────────────────┤
│ flask-api.service              ● Active Running │
│   Uptime: 23d 4h               [Stop] [Restart] │
│   CPU: 2%    Memory: 128MB                      │
│   [View Logs]                                   │
└─────────────────────────────────────────────────┘
```

---

#### RF-012: Logs Viewer
**Prioridade:** P1 (Alta)

**Descrição:** Visualizador de logs do sistema e serviços

**User Stories:**
- Como criador, quero ver logs de erro para diagnosticar problemas
- Como admin, quero filtrar logs por data e severidade

**Critérios de Aceitação:**
- [ ] Logs em tempo real via journalctl
- [ ] Filtros: data, severidade, serviço
- [ ] Busca por texto
- [ ] Color coding por nível (error/warning/info)
- [ ] Export de logs (txt, json)
- [ ] Auto-scroll toggle
- [ ] Limite de 10,000 linhas em memória

---

### 1.3 YouTube Integration Module

#### RF-020: Criar/Editar Broadcast
**Prioridade:** P0 (Crítico)

**Descrição:** Interface para criar e editar transmissões no YouTube

**User Stories:**
- Como criador, quero criar uma live no YouTube diretamente do dashboard
- Como criador, quero editar informações da live antes de começar

**Critérios de Aceitação:**
- [ ] Form com todos os campos obrigatórios
- [ ] Upload de thumbnail
- [ ] Seleção de categoria
- [ ] Privacy: public, unlisted, private
- [ ] Auto-start e DVR habilitados
- [ ] Validação de campos antes de submit
- [ ] Preview de como aparecerá no YouTube

**Campos do Form:**
```typescript
interface BroadcastData {
  // Básico
  title: string; // max 100 chars
  description: string; // max 5000 chars
  category: YouTubeCategory;
  
  // Agendamento
  scheduledStartTime?: Date;
  scheduledEndTime?: Date;
  
  // Visibilidade
  privacyStatus: 'public' | 'unlisted' | 'private';
  
  // Recursos
  enableDvr: boolean;
  enableAutoStart: boolean;
  enableAutoStop: boolean;
  recordFromStart: boolean;
  
  // Monetização
  enableMonetization: boolean;
  madeForKids: boolean;
  ageRestricted: boolean;
  
  // SEO
  tags: string[]; // max 500 chars total
  defaultLanguage: string;
  thumbnail?: File;
}
```

---

#### RF-021: Gestão de Metadata
**Prioridade:** P1 (Alta)

**Descrição:** Otimizar SEO e metadata de lives

**User Stories:**
- Como criador, quero usar templates de título/descrição para economizar tempo
- Como criador, quero seguir boas práticas de SEO automaticamente

**Critérios de Aceitação:**
- [ ] Templates salvos e reutilizáveis
- [ ] Sugestões de tags baseadas em nicho
- [ ] Preview de título/thumbnail como aparece no YT
- [ ] Validação de caracteres especiais
- [ ] Contador de caracteres
- [ ] Gerador de hashtags relevantes
- [ ] Análise de SEO score

**SEO Optimizer:**
```typescript
interface SEOAnalysis {
  score: number; // 0-100
  suggestions: string[];
  warnings: string[];
  
  checks: {
    titleLength: boolean; // 60-70 chars ideal
    descriptionLength: boolean; // >150 chars
    keywordsInTitle: boolean;
    keywordsInDescription: boolean;
    tagsCount: boolean; // 8-12 tags
    thumbnailQuality: boolean;
    categoryMatch: boolean;
  };
}
```

**Templates Exemplo:**
```javascript
const templates = {
  finance: {
    title: "[CRIPTO] Bitcoin AO VIVO - Análise em Tempo Real 2025 📈",
    description: `🔴 LIVE 24/7: Acompanhe Bitcoin e principais criptomoedas em tempo real!

📊 O que você vai encontrar:
• Cotações atualizadas
• Análise técnica
• Alertas de volatilidade
• Tendências do mercado

⏰ Live contínua 24 horas
💰 Informações para investidores

#Bitcoin #Cripto #Investimentos #LiveAoVivo #BTC`,
    tags: ['bitcoin', 'criptomoedas', 'investimentos', 'analise tecnica', 
           'btc', 'trading', 'live 24/7', 'mercado financeiro']
  },
  lofi: {
    title: "Lofi Hip Hop 24/7 📚 Beats para Estudar, Relaxar e Focar",
    description: `🎵 Stream de música lofi 24 horas por dia

Perfect para:
📚 Estudar
💼 Trabalhar
🧘 Relaxar
✍️ Criar

Inscreva-se e deixe o like! 🎧

#lofi #studymusic #chillbeats`,
    tags: ['lofi', 'study music', 'chill beats', 'relaxing music',
           'work music', 'concentration', '24/7 live', 'background music']
  }
};
```

---

#### RF-022: Stream Key Management
**Prioridade:** P0 (Crítico)

**Descrição:** Gerenciar stream keys do YouTube

**User Stories:**
- Como criador, quero ver minha stream key sem expor no código
- Como criador, quero resetar stream key se comprometida

**Critérios de Aceitação:**
- [ ] Exibir stream key mascarada (****-****-****)
- [ ] Botão "Mostrar" com confirmação
- [ ] Botão "Copiar" para clipboard
- [ ] Botão "Resetar" com confirmação
- [ ] Histórico de keys antigas (últimas 5)
- [ ] Notificação quando key é comprometida
- [ ] Auto-update da key no VPS

---

### 1.4 Analytics Dashboard

#### RF-030: Métricas em Tempo Real
**Prioridade:** P1 (Alta)

**Descrição:** Dashboard com métricas live da transmissão

**User Stories:**
- Como criador, quero ver quantos viewers tenho agora
- Como criador, quero acompanhar crescimento de inscritos durante a live

**Critérios de Aceitação:**
- [ ] Atualização a cada 30-60 segundos
- [ ] Current viewers (número grande destacado)
- [ ] Peak viewers (máximo do dia)
- [ ] Like/Dislike ratio
- [ ] Chat activity (mensagens/minuto)
- [ ] Subscriber count
- [ ] Watch time acumulado
- [ ] Gráficos de tendência

**Layout Dashboard:**
```
┌─────────────────────────────────────────────────────────┐
│  🔴 LIVE AGORA                   Duração: 15h 32m        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   1,247     │  │    3,891    │  │    15.2h    │     │
│  │  Viewers    │  │  Peak Today │  │  Watch Time │     │
│  │   +12% ↗    │  │   às 14:30  │  │   +8% ↗     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │    342      │  │    98.5%    │  │    $45.23   │     │
│  │  New Subs   │  │  Retention  │  │  Est. Rev.  │     │
│  │   +5 today  │  │   Excellent │  │   Today     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                           │
│  📊 Viewers Last 24h                                     │
│  [────────────── Gráfico Área ──────────────]           │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

#### RF-031: Analytics Históricos
**Prioridade:** P2 (Média)

**Descrição:** Visualização de métricas históricas

**User Stories:**
- Como criador, quero comparar performance de diferentes dias
- Como criador, quero identificar melhores horários para lives

**Critérios de Aceitação:**
- [ ] Gráficos: linha, barra, pizza
- [ ] Filtros: 7d, 30d, 90d, custom range
- [ ] Métricas: views, watch time, revenue, engagement
- [ ] Comparação período anterior
- [ ] Export para CSV/Excel
- [ ] Anotações em datas importantes

---

#### RF-032: Revenue Tracking
**Prioridade:** P1 (Alta)

**Descrição:** Acompanhamento de monetização

**User Stories:**
- Como criador, quero ver quanto estou ganhando por dia
- Como criador, quero projetar revenue do mês

**Critérios de Aceitação:**
- [ ] Revenue estimado (atualizado diariamente)
- [ ] CPM médio do período
- [ ] RPM (revenue per mille)
- [ ] Breakdown por tipo: ads, super chat, membros
- [ ] Projeção mensal baseada em tendência
- [ ] Comparativo com mês anterior
- [ ] Alertas de queda de CPM

**Cálculos:**
```typescript
interface RevenueMetrics {
  estimated: {
    today: number;
    week: number;
    month: number;
    projected: number; // projeção fim do mês
  };
  
  cpm: {
    current: number;
    average30d: number;
    trend: 'up' | 'down' | 'stable';
  };
  
  rpm: {
    current: number;
    average30d: number;
  };
  
  breakdown: {
    ads: number;
    superChat: number;
    memberships: number;
    youtube_premium: number;
  };
}
```

---

### 1.5 Content Manager

#### RF-040: Video Library
**Prioridade:** P0 (Crítico)

**Descrição:** Biblioteca de vídeos para streaming

**User Stories:**
- Como criador, quero fazer upload de vídeos para usar nas lives
- Como criador, quero organizar vídeos por categoria

**Critérios de Aceitação:**
- [ ] Upload de vídeos (drag & drop)
- [ ] Preview de vídeos
- [ ] Informações: duração, tamanho, resolução, codec
- [ ] Tags e categorias
- [ ] Busca e filtros
- [ ] Delete com confirmação
- [ ] Storage quota indicator

**Upload Flow:**
```
1. Usuário seleciona arquivo (ou drag & drop)
2. Validação: formato, tamanho, codec
3. Upload para VPS via SCP/SFTP
4. Verificação de integridade (checksum)
5. Geração de thumbnail automática
6. Salvamento de metadata no DB
7. Disponibilização na biblioteca
```

**Validações:**
- Formatos aceitos: mp4, mkv, avi, mov
- Tamanho máximo: 50GB
- Codecs suportados: h264, h265
- Resolução mínima: 720p
- FPS: 24, 30, 60

---

#### RF-041: Template System
**Prioridade:** P1 (Alta)

**Descrição:** Sistema de templates reutilizáveis

**User Stories:**
- Como criador, quero salvar configurações como template
- Como criador, quero usar template para criar lives rapidamente

**Critérios de Aceitação:**
- [ ] Criar template de qualquer configuração
- [ ] Editar templates existentes
- [ ] Delete com confirmação
- [ ] Categorização de templates
- [ ] Template marketplace (v2.0)
- [ ] Import/Export de templates (JSON)

**Template Structure:**
```typescript
interface LiveTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  
  // Configurações de streaming
  streamConfig: StreamConfig;
  
  // Metadata YouTube
  broadcast: {
    titlePattern: string; // pode ter variáveis {{date}}, {{time}}
    descriptionPattern: string;
    tags: string[];
    category: string;
    privacy: 'public' | 'unlisted' | 'private';
  };
  
  // Agendamento
  schedule?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'custom';
    time: string; // HH:MM
    duration?: number; // minutes
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
  isPublic: boolean; // para marketplace
}
```

**Templates Pré-configurados:**
1. **Lofi 24/7** - Música lofi, 720p, loop infinito
2. **Finance Live** - Tela de cotações, 1080p, atualização tempo real
3. **Study Stream** - ASMR/Nature sounds, 720p, baixo bitrate
4. **Gaming Highlights** - Compilação de jogos, 1080p60, alto bitrate
5. **News Aggregator** - Feed de notícias, 720p, texto overlays

---

#### RF-042: Scheduler
**Prioridade:** P1 (Alta)

**Descrição:** Agendador de lives automáticas

**User Stories:**
- Como criador, quero agendar lives para começarem automaticamente
- Como criador, quero rotacionar conteúdo em horários específicos

**Critérios de Aceitação:**
- [ ] Criar agendamentos recorrentes (diário, semanal)
- [ ] Definir hora de início e fim
- [ ] Vincular template ao agendamento
- [ ] Vincular vídeo ou playlist
- [ ] Preview de próximas execuções
- [ ] Editar/Deletar agendamentos
- [ ] Logs de execuções passadas
- [ ] Notificações de falhas

**Scheduler UI:**
```
┌─────────────────────────────────────────────────────────┐
│ Agendamentos Ativos                           [+ Novo]  │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ 🟢 Lofi 24/7                                             │
│    Template: Lofi Music Stream                          │
│    Frequência: Diário às 00:00                          │
│    Duração: 24 horas                                     │
│    Próxima: Amanhã às 00:00                             │
│    [Editar] [Pausar] [Deletar]                          │
│                                                           │
│ 🟡 Bitcoin Analysis (Pausado)                            │
│    Template: Finance Live                               │
│    Frequência: Segunda a Sexta às 09:00                 │
│    Duração: 8 horas                                      │
│    [Editar] [Ativar] [Deletar]                          │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

### 1.6 Settings & Configuration

#### RF-050: User Settings
**Prioridade:** P1 (Alta)

**Descrição:** Configurações de usuário e preferências

**Critérios de Aceitação:**
- [ ] Perfil: nome, email, avatar
- [ ] Credenciais YouTube (OAuth)
- [ ] Credenciais VPS (SSH key)
- [ ] Notificações (email, push)
- [ ] Tema: light/dark
- [ ] Timezone
- [ ] Idioma (v2.0)

---

#### RF-051: API Keys Management
**Prioridade:** P0 (Crítico)

**Descrição:** Gerenciar chaves de API

**Critérios de Aceitação:**
- [ ] YouTube API Key (mascarada)
- [ ] OAuth Client ID/Secret
- [ ] VPS SSH Key
- [ ] Testar conectividade
- [ ] Rotação de keys
- [ ] Audit log de uso de keys

---

**Próximo:** [PRD-3: Arquitetura Técnica →](./PRD-3-ARQUITETURA-TECNICA.md)
