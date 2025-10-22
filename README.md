# 🎥 AdBot Lives Dashboard

Sistema completo de gestão de lives automatizadas no YouTube com controle VPS integrado.

## 🚀 Quick Start (1 Hora Challenge - CONCLUÍDO!)

### Frontend (Dashboard)

```bash
cd dashboard
npm install
npm run dev
```

Acesse: http://localhost:5173

### Backend (API)

```bash
cd backend
npm install
npm run dev
```

API rodando em: http://localhost:3001

## 📦 O que foi implementado

### ✅ Frontend (React + Vite + TypeScript)

- **Dashboard Principal** - Visão geral com status da live e métricas
- **Live Control** - Interface para iniciar/parar lives com upload de vídeo
- **Analytics** - Gráficos de viewers e revenue com Recharts
- **Settings** - Configuração de VPS e YouTube API
- **State Management** - Zustand para gerenciamento de estado
- **Routing** - React Router com navegação completa
- **UI** - Tailwind CSS com design moderno

### ✅ Backend (Node.js + Express + Socket.io)

- **API REST** - Endpoints para controle de broadcasts
- **WebSocket** - Socket.io para comunicação em tempo real
- **TypeScript** - Tipagem completa
- **Estrutura base** - Pronto para integração YouTube + SSH

## 🎯 Próximos Passos (Implementação Completa)

### Prioridade Alta

1. **Integração YouTube API**
   - OAuth 2.0 flow
   - Criar/gerenciar broadcasts
   - Fetch metrics em tempo real

2. **SSH/VPS Integration**
   - Cliente SSH com ssh2
   - Terminal web com xterm.js
   - Executar comandos systemd

3. **Database**
   - Setup PostgreSQL/Supabase
   - Migrations com Drizzle
   - Persistência de dados

### Prioridade Média

4. **Analytics Avançado**
   - YouTube Analytics API
   - Revenue tracking real
   - Relatórios exportáveis

5. **Automação**
   - Scheduler de lives
   - Templates reutilizáveis
   - Sistema de alertas

6. **Content Management**
   - Upload de vídeos para VPS
   - Biblioteca de conteúdo
   - Preview de streams

## 🏗️ Arquitetura

```
adbot-lives/
├── dashboard/          # Frontend (Vite + React)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── stores/
│   │   └── App.tsx
│   └── package.json
│
├── backend/           # Backend (Node.js + Express)
│   ├── src/
│   │   └── server.ts
│   └── package.json
│
└── PRD*.md           # Documentação completa
```

## 🛠️ Stack Tecnológica

### Frontend
- **Vite** - Build tool ultra-rápido
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **TanStack Query** - Data fetching
- **React Router** - Navegação
- **Recharts** - Gráficos
- **Lucide React** - Ícones
- **Socket.io Client** - WebSocket

### Backend
- **Node.js 20+** - Runtime
- **Express** - API framework
- **TypeScript** - Type safety
- **Socket.io** - WebSocket server
- **googleapis** - YouTube API (pronto para uso)
- **ssh2** - SSH client (pronto para uso)

## 📊 Features Principais

### 1. Dashboard
- Status da live em tempo real
- Métricas de performance
- Quick stats

### 2. Live Control
- Upload de vídeo
- Configuração de título
- Botões start/stop
- Status indicator animado
- Métricas durante live

### 3. Analytics
- Gráficos de viewers
- Gráficos de revenue
- Tabela de lives recentes
- KPIs principais

### 4. Settings
- Configuração VPS (host, user, SSH key)
- YouTube API credentials
- Notificações

## 🎨 Design

- **Cores primárias**: Sage (#9CAF88) e Muted Blue (#74B9FF)
- **UI moderna**: Gradientes suaves e sombras
- **Responsivo**: Desktop-first (mobile em v2)
- **Animações**: Transições suaves

## 📝 Documentação Completa

Veja os arquivos PRD para documentação detalhada:

- `PRD.md` - Visão geral
- `PRD-1-VISAO-PRODUTO.md` - Objetivos e escopo
- `PRD-2-REQUISITOS-FUNCIONAIS.md` - Features detalhadas
- `PRD-3-ARQUITETURA-TECNICA.md` - Stack e arquitetura
- `PRD-4-INTEGRACAO-APIS.md` - YouTube APIs
- `PRD-5-ROADMAP.md` - Plano de 12 semanas
- `PRD-6-ANALYTICS-METRICAS.md` - Sistema de métricas

## 🔐 Configuração

### YouTube API

1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Crie um projeto
3. Ative YouTube Data API v3
4. Crie credenciais OAuth 2.0
5. Configure em Settings

### VPS

1. Tenha um VPS com SSH (Hostinger recomendado)
2. Instale FFmpeg
3. Configure systemd service (ver `guialives (2).md`)
4. Configure credenciais em Settings

## 🎉 Status do Projeto

**Challenge de 1 Hora: CONCLUÍDO! ✅**

- ✅ Setup completo (Frontend + Backend)
- ✅ UI moderna e funcional
- ✅ 4 páginas principais implementadas
- ✅ State management
- ✅ WebSocket ready
- ✅ API REST básica
- ✅ Estrutura escalável

**Próxima fase:** Integração real com YouTube APIs e VPS SSH

## 📞 Suporte

Para dúvidas ou sugestões, consulte a documentação completa no diretório PRD.

---

**Desenvolvido com ⚡ em tempo recorde!**
