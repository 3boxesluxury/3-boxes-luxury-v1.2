import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'user' | 'partner'
  avatar?: string
}

type AuthView = 'login' | 'register' | 'forgot-password'
type AppView = 'home' | 'admin' | 'shop' | 'partner-portal'

interface StoreState {
  // Auth
  authUser: User | null
  authToken: string | null
  authView: AuthView
  setAuthUser: (user: User | null) => void
  setAuthToken: (token: string | null) => void
  setAuthView: (view: AuthView) => void
  clearAuth: () => void

  // Navigation
  view: AppView
  setView: (view: AppView) => void
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      // Auth state
      authUser: null,
      authToken: null,
      authView: 'login',

      setAuthUser: (user) => set({ authUser: user }),
      setAuthToken: (token) => set({ authToken: token }),
      setAuthView: (view) => set({ authView: view }),
      clearAuth: () => set({ authUser: null, authToken: null, authView: 'login' }),

      // Navigation state
      view: 'home',
      setView: (view) => set({ view }),
    }),
    {
      name: 'admin-store',
      partialize: (state) => ({
        authUser: state.authUser,
        authToken: state.authToken,
      }),
    }
  )
)
