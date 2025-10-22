import { create } from 'zustand'

interface Video {
  id: string
  name: string
  duration: number
  size: number
}

interface Broadcast {
  id: string
  youtubeId?: string
  title: string
  status: 'idle' | 'starting' | 'live' | 'stopping' | 'stopped'
  viewers?: number
  startTime?: Date
}

interface LiveStore {
  currentBroadcast: Broadcast | null
  isLive: boolean
  selectedVideo: Video | null
  
  setSelectedVideo: (video: Video | null) => void
  startLive: (videoId: string, title: string) => Promise<void>
  stopLive: () => Promise<void>
  updateBroadcast: (data: Partial<Broadcast>) => void
}

export const useLiveStore = create<LiveStore>((set, get) => ({
  currentBroadcast: null,
  isLive: false,
  selectedVideo: null,
  
  setSelectedVideo: (video) => set({ selectedVideo: video }),
  
  startLive: async (_videoId: string, title: string) => {
    set({ 
      currentBroadcast: { 
        id: Date.now().toString(), 
        title, 
        status: 'starting' 
      } 
    })
    
    try {
      // TODO: API call to backend
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      set({ 
        currentBroadcast: { 
          ...get().currentBroadcast!, 
          status: 'live',
          startTime: new Date(),
          viewers: 0
        },
        isLive: true 
      })
    } catch (error) {
      set({ 
        currentBroadcast: { 
          ...get().currentBroadcast!, 
          status: 'idle' 
        } 
      })
      throw error
    }
  },
  
  stopLive: async () => {
    set({ 
      currentBroadcast: { 
        ...get().currentBroadcast!, 
        status: 'stopping' 
      } 
    })
    
    try {
      // TODO: API call to backend
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      set({ 
        currentBroadcast: null,
        isLive: false,
        selectedVideo: null
      })
    } catch (error) {
      set({ 
        currentBroadcast: { 
          ...get().currentBroadcast!, 
          status: 'live' 
        } 
      })
      throw error
    }
  },
  
  updateBroadcast: (data) => set({ 
    currentBroadcast: { 
      ...get().currentBroadcast!, 
      ...data 
    } 
  })
}))
