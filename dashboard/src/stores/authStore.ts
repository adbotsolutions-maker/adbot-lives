import { create } from 'zustand'
import { API_ENDPOINTS } from '../config/api'

interface AuthState {
  isAuthenticated: boolean
  username: string | null
  isLoading: boolean
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  username: null,
  isLoading: true,

  login: async (username: string, password: string, rememberMe?: boolean) => {
    console.log('🔐 Attempting login...', { username, rememberMe });
    const response = await fetch(API_ENDPOINTS.auth.login, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password, rememberMe })
    })

    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      const error = await response.json()
      console.error('❌ Login failed:', error);
      throw new Error(error.error || 'Login failed')
    }

    const data = await response.json()
    console.log('✅ Login successful:', data);
    set({ isAuthenticated: true, username: data.username })
  },

  logout: async () => {
    await fetch(API_ENDPOINTS.auth.logout, {
      method: 'POST',
      credentials: 'include'
    })
    set({ isAuthenticated: false, username: null })
  },

  checkAuth: async () => {
    try {
      const response = await fetch(API_ENDPOINTS.auth.check, {
        credentials: 'include'
      })
      const data = await response.json()
      set({ 
        isAuthenticated: data.authenticated, 
        username: data.username,
        isLoading: false 
      })
    } catch (error) {
      set({ isAuthenticated: false, username: null, isLoading: false })
    }
  }
}))
