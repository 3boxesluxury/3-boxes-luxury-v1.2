import { create } from 'zustand'

export type View = 'home' | 'product' | 'cart' | 'checkout' | 'orders' | 'order-confirmation' | 'user-dashboard' | 'admin-dashboard' | 'agent-dashboard' | 'team-dashboard' | 'corporate-dashboard' | 'wiki' | 'downloads' | 'security-policy' | 'social-style' | '3box-curate' | 'family-shopping'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'user' | 'agent' | 'team' | 'corporate'
}

export interface CartItem {
  productId: string
  name: string
  price: number
  image: string
  quantity: number
}

export interface CurrencyInfo {
  code: string
  name: string
  symbol: string
  rate: number
}

interface GeoInfo {
  country: string
  countryName: string
  currency: string
  language: string
  flagEmoji: string
}

interface AppState {
  view: View
  selectedProductId: string | null
  searchQuery: string
  selectedCategory: string | null
  cartItems: CartItem[]
  lastOrderId: string | null
  authUser: AuthUser | null
  authToken: string | null
  authView: 'login' | 'register' | null
  authTwoFAStep: boolean
  authPendingUserId: string | null
  authTwoFAMethod: 'email' | 'totp' | null
  authPendingEmail: string | null
  giftBuilderView: boolean

  // Scroll-to-products flag: set to true by "Shop Now" or similar buttons
  // to signal the ProductGrid should scroll into view
  _scrollToProducts: number

  // Multi-currency & i18n
  locale: string
  currency: string
  currencySymbol: string
  currencyRates: Record<string, CurrencyInfo>
  geoInfo: GeoInfo | null
  geoDetected: boolean

  // Theme
  appTheme: 'dark' | 'light'
  setAppTheme: (theme: 'dark' | 'light') => void

  setView: (view: View) => void
  selectProduct: (productId: string) => void
  setSearch: (query: string) => void
  setCategory: (category: string | null) => void
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  setLastOrderId: (orderId: string) => void
  setAuth: (user: AuthUser, token: string) => void
  clearAuth: () => void
  setAuthView: (view: 'login' | 'register' | null) => void
  setAuthTwoFAStep: (step: boolean) => void
  setAuthPendingUserId: (id: string | null) => void
  setAuthTwoFAMethod: (method: 'email' | 'totp' | null) => void
  setAuthPendingEmail: (email: string | null) => void
  toggleGiftBuilder: () => void
  scrollToProducts: () => void
  setLocale: (locale: string) => void
  setCurrency: (code: string) => void
  setCurrencyRates: (rates: Record<string, CurrencyInfo>) => void
  setGeoInfo: (info: GeoInfo) => void
}

function loadAuthFromStorage(): { user: AuthUser | null; token: string | null } {
  if (typeof window === 'undefined') return { user: null, token: null }
  try {
    const stored = localStorage.getItem('3boxes_auth')
    if (stored) {
      const parsed = JSON.parse(stored)
      return { user: parsed.user ?? null, token: parsed.token ?? null }
    }
  } catch {
    // ignore parse errors
  }
  return { user: null, token: null }
}

function loadLocaleFromStorage(): string {
  if (typeof window === 'undefined') return 'en'
  try {
    return localStorage.getItem('3boxes_locale') || 'en'
  } catch {
    return 'en'
  }
}

function loadCurrencyFromStorage(): string {
  if (typeof window === 'undefined') return 'INR'
  try {
    return localStorage.getItem('3boxes_currency') || 'INR'
  } catch {
    return 'INR'
  }
}

function loadThemeFromStorage(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark'
  try {
    const stored = localStorage.getItem('3boxes_theme')
    if (stored === 'light' || stored === 'dark') return stored
    return 'dark'
  } catch {
    return 'dark'
  }
}

const initialAuth = loadAuthFromStorage()

export const useStore = create<AppState>((set, get) => ({
  view: 'home',
  selectedProductId: null,
  searchQuery: '',
  selectedCategory: null,
  cartItems: [],
  lastOrderId: null,
  authUser: initialAuth.user,
  authToken: initialAuth.token,
  authView: null,
  authTwoFAStep: false,
  authPendingUserId: null,
  authTwoFAMethod: null,
  authPendingEmail: null,
  giftBuilderView: false,
  _scrollToProducts: 0,

  // Multi-currency & i18n
  locale: typeof window !== 'undefined' ? loadLocaleFromStorage() : 'en',
  currency: typeof window !== 'undefined' ? loadCurrencyFromStorage() : 'INR',
  currencySymbol: '₹',
  currencyRates: {},
  geoInfo: null,
  geoDetected: false,

  // Theme
  appTheme: typeof window !== 'undefined' ? loadThemeFromStorage() : 'dark',

  setView: (view) => set({ view }),
  selectProduct: (productId) => set({ selectedProductId: productId, view: 'product' }),
  setSearch: (query) => set({ searchQuery: query }),
  setCategory: (category) => set({ selectedCategory: category }),
  addItem: (item) =>
    set((state) => {
      const existing = state.cartItems.find((ci) => ci.productId === item.productId)
      if (existing) {
        return {
          cartItems: state.cartItems.map((ci) =>
            ci.productId === item.productId
              ? { ...ci, quantity: ci.quantity + 1 }
              : ci
          ),
        }
      }
      return { cartItems: [...state.cartItems, { ...item, quantity: 1 }] }
    }),
  removeItem: (productId) =>
    set((state) => ({
      cartItems: state.cartItems.filter((ci) => ci.productId !== productId),
    })),
  updateQuantity: (productId, quantity) =>
    set((state) => ({
      cartItems:
        quantity <= 0
          ? state.cartItems.filter((ci) => ci.productId !== productId)
          : state.cartItems.map((ci) =>
              ci.productId === productId ? { ...ci, quantity } : ci
            ),
    })),
  clearCart: () => set({ cartItems: [] }),
  setLastOrderId: (orderId) => set({ lastOrderId: orderId }),
  setAuth: (user, token) => {
    try {
      localStorage.setItem('3boxes_auth', JSON.stringify({ user, token }))
    } catch {
      // ignore storage errors
    }
    set({ authUser: user, authToken: token, authView: null, authTwoFAStep: false, authPendingUserId: null, authTwoFAMethod: null, authPendingEmail: null })
  },
  clearAuth: () => {
    try {
      localStorage.removeItem('3boxes_auth')
    } catch {
      // ignore storage errors
    }
    set({ authUser: null, authToken: null, authView: null, authTwoFAStep: false, authPendingUserId: null, authTwoFAMethod: null, authPendingEmail: null })
  },
  setAuthView: (view) => set({ authView: view }),
  setAuthTwoFAStep: (step) => set({ authTwoFAStep: step }),
  setAuthPendingUserId: (id) => set({ authPendingUserId: id }),
  setAuthTwoFAMethod: (method) => set({ authTwoFAMethod: method }),
  setAuthPendingEmail: (email) => set({ authPendingEmail: email }),
  toggleGiftBuilder: () => set((state) => ({ giftBuilderView: !state.giftBuilderView })),
  scrollToProducts: () => set((state) => ({ _scrollToProducts: state._scrollToProducts + 1 })),
  setAppTheme: (theme) => {
    try {
      localStorage.setItem('3boxes_theme', theme)
    } catch {
      // ignore storage errors
    }
    set({ appTheme: theme })
  },
  setLocale: (locale) => {
    try {
      localStorage.setItem('3boxes_locale', locale)
    } catch {
      // ignore storage errors
    }
    set({ locale })
  },
  setCurrency: (code) => {
    const rates = get().currencyRates
    const info = rates[code]
    try {
      localStorage.setItem('3boxes_currency', code)
    } catch {
      // ignore storage errors
    }
    set({ currency: code, currencySymbol: info?.symbol || '₹' })
  },
  setCurrencyRates: (rates) => {
    const currentCode = get().currency
    const info = rates[currentCode]
    set({
      currencyRates: rates,
      currencySymbol: info?.symbol || '₹',
    })
  },
  setGeoInfo: (info) => {
    const currentCurrency = get().currency
    // Only auto-set currency and language if user hasn't manually changed them
    const storedCurrency = typeof window !== 'undefined' ? localStorage.getItem('3boxes_currency') : null
    const storedLocale = typeof window !== 'undefined' ? localStorage.getItem('3boxes_locale') : null

    const updates: Partial<AppState> = { geoInfo: info, geoDetected: true }

    // Auto-detect currency from geo if user hasn't set one manually
    if (!storedCurrency && info.currency) {
      try { localStorage.setItem('3boxes_currency', info.currency) } catch {}
      updates.currency = info.currency
    }

    // Auto-detect language from geo if user hasn't set one manually
    // Default language is English for all locations, but suggest the local language
    if (!storedLocale) {
      // Keep English as default, but store detected language for suggestion
      try { localStorage.setItem('3boxes_locale', 'en') } catch {}
      updates.locale = 'en'
    }

    set(updates as AppState)
  },
}))
