'use client'

import { useState, useCallback } from 'react'
import { useStore } from '@/lib/store'
import type { AuthUser } from '@/lib/store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp'
import { Separator } from '@/components/ui/separator'
import { Mail, Lock, User, Shield, Loader2, Eye, EyeOff, Building2, ChevronRight, ArrowLeft, Phone, Globe, Hash, Briefcase } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { showToast } from '@/hooks/use-toast-notification'

type RoleType = 'corporate' | 'user' | 'team'

export function AuthDialog() {
  const authView = useStore((s) => s.authView)
  const authTwoFAStep = useStore((s) => s.authTwoFAStep)
  const authPendingUserId = useStore((s) => s.authPendingUserId)
  const authTwoFAMethod = useStore((s) => s.authTwoFAMethod)
  const authPendingEmail = useStore((s) => s.authPendingEmail)
  const setAuth = useStore((s) => s.setAuth)
  const setAuthView = useStore((s) => s.setAuthView)
  const setAuthTwoFAStep = useStore((s) => s.setAuthTwoFAStep)
  const setAuthPendingUserId = useStore((s) => s.setAuthPendingUserId)
  const setAuthTwoFAMethod = useStore((s) => s.setAuthTwoFAMethod)
  const setAuthPendingEmail = useStore((s) => s.setAuthPendingEmail)

  // Login form
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginShowPassword, setLoginShowPassword] = useState(false)

  // Register form - common
  const [regEmail, setRegEmail] = useState('')
  const [regName, setRegName] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [regShowPassword, setRegShowPassword] = useState(false)
  const [regEnable2FA, setRegEnable2FA] = useState(false)

  // Corporate registration fields
  const [regCompanyName, setRegCompanyName] = useState('')
  const [regContactName, setRegContactName] = useState('')
  const [regContactPhone, setRegContactPhone] = useState('')
  const [regIndustry, setRegIndustry] = useState('')
  const [regWebsite, setRegWebsite] = useState('')
  const [regGstNumber, setRegGstNumber] = useState('')

  // Team/Agent registration fields
  const [regEmployeeId, setRegEmployeeId] = useState('')
  const [regDepartment, setRegDepartment] = useState('')

  // 2FA
  const [twoFACode, setTwoFACode] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  // UI state
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')
  const [selectedLoginRole, setSelectedLoginRole] = useState<RoleType | null>(null)

  const isOpen = authView === 'login' || authView === 'register'

  // Get placeholder data based on role
  const getLoginPlaceholder = () => {
    switch (selectedLoginRole) {
      case 'corporate': return { email: 'corporate@3boxes.com', password: 'Enter your password' }
      case 'team': return { email: 'team@3boxes.com', password: 'Enter your password' }
      default: return { email: 'pmkshar@gmail.com', password: 'Enter your password' }
    }
  }

  const getRegPlaceholder = () => {
    switch (selectedLoginRole) {
      case 'corporate': return { email: 'rajesh@techcorp.in', name: 'Rajesh Kumar' }
      case 'team': return { email: 'agent@3boxes.in', name: 'Amit Singh' }
      default: return { email: 'priya.sharma@email.com', name: 'Priya Sharma' }
    }
  }

  const resetForm = useCallback(() => {
    setLoginEmail('')
    setLoginPassword('')
    setLoginShowPassword(false)
    setRegEmail('')
    setRegName('')
    setRegPassword('')
    setRegConfirmPassword('')
    setRegShowPassword(false)
    setRegEnable2FA(false)
    setRegCompanyName('')
    setRegContactName('')
    setRegContactPhone('')
    setRegIndustry('')
    setRegWebsite('')
    setRegGstNumber('')
    setRegEmployeeId('')
    setRegDepartment('')
    setTwoFACode('')
    setResendCooldown(0)
    setError(null)
    setSuccess(null)
    setLoading(false)
    setSelectedLoginRole(null)
  }, [])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setAuthView(null)
        resetForm()
      }
    },
    [setAuthView, resetForm]
  )

  const handleTabChange = useCallback(
    (value: string) => {
      setActiveTab(value as 'login' | 'register')
      setError(null)
      setSuccess(null)
      setAuthView(value as 'login' | 'register')
    },
    [setAuthView]
  )

  // Sync tab with authView when dialog opens
  const handleDialogMount = useCallback(() => {
    if (authView === 'login' || authView === 'register') {
      setActiveTab(authView)
    }
    resetForm()
  }, [authView, resetForm])

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)
      setSuccess(null)

      if (!loginEmail.trim() || !loginPassword.trim()) {
        setError('Please fill in all fields.')
        return
      }

      setLoading(true)
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || data.message || 'Login failed. Please try again.')
          return
        }

        // Check if 2FA is required by the server
        if (data.requiresTwoFactor) {
          setAuthPendingUserId(data.userId)
          setAuthTwoFAMethod(data.method || 'email')
          setAuthPendingEmail(data.email || null)
          setAuthTwoFAStep(true)

          const isEmail2FA = data.method === 'email'
          if (isEmail2FA) {
            setSuccess(`A 6-digit verification code has been sent to ${data.email || 'your email'}. Please check your inbox.`)
            // In demo/dev mode, show the OTP via toast for testing
            if (data._otp) {
              showToast('info', `🔐 Your verification code: ${data._otp}`)
            }
          } else {
            setSuccess('Please enter the verification code from your authenticator app.')
          }

          // Start resend cooldown timer
          setResendCooldown(60)
          const cooldownInterval = setInterval(() => {
            setResendCooldown(prev => {
              if (prev <= 1) {
                clearInterval(cooldownInterval)
                return 0
              }
              return prev - 1
            })
          }, 1000)

          return
        }

        // Check if email is verified
        if (data.emailVerified === false) {
          setError('Please verify your email address before logging in.')
          return
        }

        // Successful login
        if (data.user && data.token) {
          const user: AuthUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role || 'USER',
          }
          setAuth(user, data.token)
          showToast('success', `Welcome back, ${user.name}! Successfully signed in.`)

          // Show role-specific message for admin users
          if (user.role === 'admin' || user.role === 'team') {
            setSuccess('Welcome back, Administrator. Full access granted.')
          }
        }
      } catch {
        setError('Network error. Please check your connection and try again.')
        showToast('error', 'Login failed. Please check your credentials.')
      } finally {
        setLoading(false)
      }
    },
    [loginEmail, loginPassword, selectedLoginRole, setAuth, setAuthPendingUserId, setAuthTwoFAStep, setAuthTwoFAMethod, setAuthPendingEmail]
  )

  const handleRegister = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)
      setSuccess(null)

      if (!regEmail.trim() || !regName.trim() || !regPassword.trim()) {
        setError('Please fill in all required fields.')
        return
      }

      if (regPassword.length < 8) {
        setError('Password must be at least 8 characters long.')
        return
      }

      if (regPassword !== regConfirmPassword) {
        setError('Passwords do not match.')
        return
      }

      // Corporate registration validation
      if (selectedLoginRole === 'corporate') {
        if (!regCompanyName.trim() || !regContactName.trim()) {
          setError('Company name and contact name are required for corporate accounts.')
          return
        }
      }

      // Team/Agent registration validation
      if (selectedLoginRole === 'team') {
        if (!regEmployeeId.trim()) {
          setError('Employee/Agent ID is required for team accounts.')
          return
        }
      }

      setLoading(true)
      try {
        let res: Response

        if (selectedLoginRole === 'corporate') {
          // Use corporate registration endpoint
          res = await fetch('/api/corporate/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: regEmail.trim(),
              name: regName.trim(),
              password: regPassword,
              companyName: regCompanyName.trim(),
              contactName: regContactName.trim(),
              contactPhone: regContactPhone.trim() || undefined,
              industry: regIndustry.trim() || undefined,
              website: regWebsite.trim() || undefined,
              gstNumber: regGstNumber.trim() || undefined,
            }),
          })
        } else if (selectedLoginRole === 'team') {
          // Use team/agent registration endpoint
          res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: regEmail.trim(),
              name: regName.trim(),
              password: regPassword,
              role: 'team',
              employeeId: regEmployeeId.trim(),
              department: regDepartment.trim() || undefined,
              enable2FA: true, // 2FA is always enabled for team accounts
            }),
          })
        } else {
          // Customer registration
          res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: regEmail.trim(),
              name: regName.trim(),
              password: regPassword,
              role: 'user',
              enable2FA: regEnable2FA,
            }),
          })
        }

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || data.message || 'Registration failed. Please try again.')
          return
        }

        // Check if registration requires approval
        if (data.approvalStatus === 'pending') {
          if (selectedLoginRole === 'corporate' || selectedLoginRole === 'team') {
            showToast('info', 'Registration submitted. Awaiting admin approval.')
            setSuccess(
              selectedLoginRole === 'corporate'
                ? 'Your corporate registration is pending admin approval. You will be notified once your account is approved.'
                : 'Your team registration is pending admin approval. You will be notified once approved.'
            )
          } else {
            setSuccess('Your registration is pending approval. You will be notified once your account is approved.')
          }
          return
        }

        // Successful registration with auto-login
        if (data.user && data.token) {
          const user: AuthUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role || 'user',
          }
          setAuth(user, data.token)
          showToast('success', 'Account created successfully! Welcome to 3 Boxes Luxury.')
        } else if (data.user && !data.token) {
          // Account created but no token (needs verification/approval)
          showToast('info', 'Registration submitted. Awaiting admin approval.')
          setSuccess(
            'Account created successfully! Please check your email to verify your account.'
          )
        }
      } catch {
        setError('Network error. Please check your connection and try again.')
      } finally {
        setLoading(false)
      }
    },
    [regEmail, regName, regPassword, regConfirmPassword, selectedLoginRole, regCompanyName, regContactName, regContactPhone, regIndustry, regWebsite, regGstNumber, regEmployeeId, regDepartment, regEnable2FA, setAuth]
  )

  const handle2FAVerify = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)

      if (twoFACode.length !== 6) {
        setError('Please enter the complete 6-digit verification code.')
        return
      }

      if (!authPendingUserId) {
        setError('Session expired. Please try logging in again.')
        setAuthTwoFAStep(false)
        return
      }

      setLoading(true)
      try {
        const res = await fetch('/api/auth/2fa/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: authPendingUserId,
            code: twoFACode,
            method: authTwoFAMethod || 'email',
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || data.message || 'Verification failed. Please try again.')
          return
        }

        if (data.verified && data.user && data.token) {
          const user: AuthUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role || 'USER',
          }
          setAuth(user, data.token)
          showToast('success', 'Verification successful! Welcome back.')

          // Show role-specific message for admin users
          if (user.role === 'admin' || user.role === 'team') {
            setSuccess('Welcome back, Administrator. Full access granted.')
          }
        } else if (data.verified && !data.token) {
          setError('Verification succeeded but no session was created. Please try logging in again.')
          setAuthTwoFAStep(false)
        } else {
          setError('Invalid verification code. Please try again.')
        }
      } catch {
        setError('Network error. Please check your connection and try again.')
      } finally {
        setLoading(false)
      }
    },
    [twoFACode, authPendingUserId, authTwoFAMethod, setAuth, setAuthTwoFAStep]
  )

  const handleSocialLogin = useCallback(
    async (provider: string) => {
      setError(null)
      setSuccess(null)

      // Facebook Login - Real OAuth redirect
      if (provider === 'Facebook') {
        const appId = '1638724140532761'
        const redirectUri = encodeURIComponent(
          typeof window !== 'undefined' && window.location.hostname === 'localhost'
            ? 'http://localhost:3000/api/auth/facebook/callback'
            : 'https://3boxes-luxury-v12.vercel.app/api/auth/facebook/callback'
        )
        const state = Math.random().toString(36).substring(2, 15)
        const facebookAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&state=${state}&scope=email,public_profile&response_type=code`
        window.location.href = facebookAuthUrl
        return
      }

      // Other providers - simulated social login
      setLoading(true)
      try {
        const res = await fetch('/api/auth/social', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: provider.toLowerCase(),
            name: `${provider} User`,
            socialId: `social_${Date.now()}`,
            email: `user_${Date.now()}@${provider.toLowerCase()}.com`,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || data.message || 'Social login failed. Please try again.')
          return
        }

        if (data.user && data.token) {
          const user: AuthUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role || 'USER',
          }
          setAuth(user, data.token)
          showToast('success', `Welcome, ${user.name}! Successfully signed in.`)
        }
      } catch {
        setError('Social login failed. Please try again later.')
      } finally {
        setLoading(false)
      }
    },
    [setAuth]
  )

  // Determine if we need a wider dialog (for corporate/team registration)
  const needsWideDialog = selectedLoginRole !== null && activeTab === 'register'

  // Role selection cards config for registration descriptions
  const roleCardConfig: Record<RoleType, { login: { title: string; desc: string }; register: { title: string; desc: string } }> = {
    user: {
      login: { title: 'Customer / User', desc: 'Personal shopping account' },
      register: { title: 'Customer Account', desc: 'Create your personal shopping account' },
    },
    corporate: {
      login: { title: 'Corporate Account', desc: 'Business gifting & bulk orders' },
      register: { title: 'Corporate Account', desc: 'Register your business for gifting & bulk orders' },
    },
    team: {
      login: { title: '3 Boxes Team / Agent', desc: 'Internal team portal & support' },
      register: { title: 'Team / Agent Account', desc: 'Join the 3 Boxes team (requires approval)' },
    },
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={`border-amber-900/30 bg-stone-950 text-amber-50 max-h-[90vh] overflow-y-auto ${needsWideDialog ? 'sm:max-w-lg' : 'sm:max-w-md'} [&>button]:text-amber-200/60 [&>button]:hover:text-amber-200`}
        onOpenAutoFocus={handleDialogMount}
      >
        {/* 2FA Verification Step */}
        <AnimatePresence mode="wait">
          {authTwoFAStep ? (
            <motion.div
              key="2fa"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <DialogHeader className="mb-4">
                <DialogTitle className="gold-shimmer text-2xl font-bold tracking-wide">
                  Two-Factor Authentication
                </DialogTitle>
                <DialogDescription className="text-amber-200/50">
                  {authTwoFAMethod === 'email'
                    ? 'Enter the 6-digit code sent to your email'
                    : 'Enter the 6-digit code from your authenticator app'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handle2FAVerify} className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-amber-700/40 bg-amber-900/20">
                    {authTwoFAMethod === 'email' ? (
                      <Mail className="h-8 w-8 text-amber-500" />
                    ) : (
                      <Shield className="h-8 w-8 text-amber-500" />
                    )}
                  </div>
                  {authTwoFAMethod === 'email' && (
                    <div className="text-center space-y-1">
                      <p className="text-sm text-amber-200/60">
                        A verification code has been sent to
                      </p>
                      <p className="text-sm font-semibold text-amber-300">
                        {authPendingEmail || 'your email'}
                      </p>
                      <p className="text-xs text-amber-200/40">
                        Code expires in 5 minutes
                      </p>
                    </div>
                  )}
                  {authTwoFAMethod !== 'email' && (
                    <p className="text-center text-sm text-amber-200/60">
                      Please enter the verification code from your authenticator app
                    </p>
                  )}

                  <InputOTP
                    maxLength={6}
                    value={twoFACode}
                    onChange={setTwoFACode}
                    containerClassName="gap-2"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot
                        index={0}
                        className="h-12 w-12 border-amber-900/40 bg-stone-900/50 text-lg font-semibold text-amber-100 data-[active=true]:border-amber-600/60 data-[active=true]:ring-amber-600/30"
                      />
                      <InputOTPSlot
                        index={1}
                        className="h-12 w-12 border-amber-900/40 bg-stone-900/50 text-lg font-semibold text-amber-100 data-[active=true]:border-amber-600/60 data-[active=true]:ring-amber-600/30"
                      />
                      <InputOTPSlot
                        index={2}
                        className="h-12 w-12 border-amber-900/40 bg-stone-900/50 text-lg font-semibold text-amber-100 data-[active=true]:border-amber-600/60 data-[active=true]:ring-amber-600/30"
                      />
                    </InputOTPGroup>
                    <InputOTPSeparator className="text-amber-700/40" />
                    <InputOTPGroup>
                      <InputOTPSlot
                        index={3}
                        className="h-12 w-12 border-amber-900/40 bg-stone-900/50 text-lg font-semibold text-amber-100 data-[active=true]:border-amber-600/60 data-[active=true]:ring-amber-600/30"
                      />
                      <InputOTPSlot
                        index={4}
                        className="h-12 w-12 border-amber-900/40 bg-stone-900/50 text-lg font-semibold text-amber-100 data-[active=true]:border-amber-600/60 data-[active=true]:ring-amber-600/30"
                      />
                      <InputOTPSlot
                        index={5}
                        className="h-12 w-12 border-amber-900/40 bg-stone-900/50 text-lg font-semibold text-amber-100 data-[active=true]:border-amber-600/60 data-[active=true]:ring-amber-600/30"
                      />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-md border border-red-800/40 bg-red-950/30 px-4 py-2.5 text-center text-sm text-red-300"
                  >
                    {error}
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-md border border-amber-700/40 bg-amber-950/30 px-4 py-2.5 text-center text-sm text-amber-300"
                  >
                    {success}
                  </motion.div>
                )}

                <Button
                  type="submit"
                  disabled={loading || twoFACode.length !== 6}
                  className="w-full bg-amber-600 text-stone-950 font-semibold hover:bg-amber-500 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Code'
                  )}
                </Button>

                {/* Resend OTP for email method */}
                {authTwoFAMethod === 'email' && (
                  <div className="text-center">
                    <button
                      type="button"
                      disabled={resendCooldown > 0}
                      onClick={async () => {
                        if (resendCooldown > 0 || !authPendingUserId) return
                        try {
                          const res = await fetch('/api/auth/2fa/email-otp', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: authPendingUserId }),
                          })
                          const data = await res.json()
                          if (data._otp) {
                            showToast('info', `🔐 Your new verification code: ${data._otp}`)
                          }
                          if (data.success) {
                            showToast('success', 'A new verification code has been sent to your email.')
                            setSuccess(`A new code has been sent to ${data.email || authPendingEmail || 'your email'}.`)
                          }
                          // Restart cooldown
                          setResendCooldown(60)
                          const cooldownInterval = setInterval(() => {
                            setResendCooldown(prev => {
                              if (prev <= 1) {
                                clearInterval(cooldownInterval)
                                return 0
                              }
                              return prev - 1
                            })
                          }, 1000)
                        } catch {
                          setError('Failed to resend code. Please try again.')
                        }
                      }}
                      className="text-sm text-amber-200/50 transition-colors hover:text-amber-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {resendCooldown > 0
                        ? `Resend code in ${resendCooldown}s`
                        : "Didn't receive the code? Resend"}
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setAuthTwoFAStep(false)
                    setAuthTwoFAMethod(null)
                    setAuthPendingEmail(null)
                    setTwoFACode('')
                    setError(null)
                    setSuccess(null)
                  }}
                  className="w-full text-center text-sm text-amber-200/50 transition-colors hover:text-amber-200"
                >
                  Back to login
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="auth"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <DialogHeader className="mb-2">
                <DialogTitle className="gold-shimmer text-2xl font-bold tracking-wide text-center">
                  3 BOXES LUXURY
                </DialogTitle>
                <DialogDescription className="text-amber-200/50 text-center">
                  {selectedLoginRole
                    ? activeTab === 'register'
                      ? 'Create your exclusive account'
                      : 'Sign in to your exclusive account'
                    : 'Choose Your Account Type'}
                </DialogDescription>
              </DialogHeader>

              {/* Step 0: Role Selection */}
              {!selectedLoginRole && (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-amber-100">Choose Your Account Type</h3>
                    <p className="text-xs text-amber-200/40">Select how you'd like to continue</p>
                  </div>
                  <div className="space-y-3">
                    {/* Customer/User */}
                    <button
                      onClick={() => {
                        setSelectedLoginRole('user')
                      }}
                      className="w-full flex items-center gap-4 rounded-xl border border-amber-600/30 bg-stone-900/60 p-4 transition-all hover:border-amber-500/50 hover:bg-stone-900/80 hover:shadow-lg hover:shadow-amber-900/20 text-left"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-600/20">
                        <User className="h-6 w-6 text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-100">Customer / User</p>
                        <p className="text-xs text-amber-200/50">Personal shopping account</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-amber-400/40" />
                    </button>

                    {/* Corporate */}
                    <button
                      onClick={() => {
                        setSelectedLoginRole('corporate')
                      }}
                      className="w-full flex items-center gap-4 rounded-xl border border-amber-500/40 bg-stone-900/60 p-4 transition-all hover:border-amber-400/60 hover:bg-stone-900/80 hover:shadow-lg hover:shadow-amber-900/30 text-left"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/20">
                        <Building2 className="h-6 w-6 text-amber-300" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-100">Corporate Account</p>
                        <p className="text-xs text-amber-200/50">Business gifting & bulk orders</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-amber-400/40" />
                    </button>

                    {/* Team / Agent */}
                    <button
                      onClick={() => {
                        setSelectedLoginRole('team')
                      }}
                      className="w-full flex items-center gap-4 rounded-xl border border-purple-500/30 bg-stone-900/60 p-4 transition-all hover:border-purple-400/50 hover:bg-stone-900/80 hover:shadow-lg hover:shadow-purple-900/20 text-left"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-600/20">
                        <Shield className="h-6 w-6 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-100">3 Boxes Team / Agent</p>
                        <p className="text-xs text-amber-200/50">Internal team portal & support</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-amber-400/40" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 1: Login/Register Form */}
              {selectedLoginRole && (
              <>
              <button
                type="button"
                onClick={() => {
                  setSelectedLoginRole(null)
                  setError(null)
                  setSuccess(null)
                }}
                className="flex items-center gap-1.5 text-sm text-amber-200/50 hover:text-amber-200 transition-colors mb-3"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to role selection
              </button>
              <Tabs
                value={activeTab}
                onValueChange={handleTabChange}
                className="w-full"
              >
                <TabsList className="mx-auto mb-4 w-full bg-stone-900/60 border border-amber-900/30">
                  <TabsTrigger
                    value="login"
                    className="flex-1 data-[state=active]:bg-amber-700/30 data-[state=active]:text-amber-200 text-amber-200/50 transition-all"
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="flex-1 data-[state=active]:bg-amber-700/30 data-[state=active]:text-amber-200 text-amber-200/50 transition-all"
                  >
                    Create Account
                  </TabsTrigger>
                </TabsList>

                {/* ============ Login Form ============ */}
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    {/* Role badge */}
                    <div className="flex items-center gap-2 mb-2">
                      {selectedLoginRole === 'user' && (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-600/20 px-2.5 py-1 text-xs font-medium text-amber-300 border border-amber-600/30">
                          <User className="h-3 w-3" />
                          {roleCardConfig.user.login.title}
                        </span>
                      )}
                      {selectedLoginRole === 'corporate' && (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/20 px-2.5 py-1 text-xs font-medium text-amber-300 border border-amber-500/30">
                          <Building2 className="h-3 w-3" />
                          {roleCardConfig.corporate.login.title}
                        </span>
                      )}
                      {selectedLoginRole === 'team' && (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-purple-600/20 px-2.5 py-1 text-xs font-medium text-purple-300 border border-purple-500/30">
                          <Shield className="h-3 w-3" />
                          {roleCardConfig.team.login.title}
                        </span>
                      )}
                      {(selectedLoginRole === 'corporate' || selectedLoginRole === 'team') && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-500/60">
                          <Lock className="h-3 w-3" />
                          2FA Required
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-amber-200/70 text-xs uppercase tracking-wider">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600/50" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder={getLoginPlaceholder().email}
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="border-amber-900/40 bg-stone-900/50 pl-10 text-amber-50 placeholder:text-amber-200/30 focus:border-amber-600/60 focus:ring-amber-600/30"
                          autoComplete="email"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-amber-200/70 text-xs uppercase tracking-wider">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600/50" />
                        <Input
                          id="login-password"
                          type={loginShowPassword ? 'text' : 'password'}
                          placeholder={getLoginPlaceholder().password}
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="border-amber-900/40 bg-stone-900/50 pl-10 pr-10 text-amber-50 placeholder:text-amber-200/30 focus:border-amber-600/60 focus:ring-amber-600/30"
                          autoComplete="current-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setLoginShowPassword(!loginShowPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-200/40 transition-colors hover:text-amber-200"
                          aria-label={loginShowPassword ? 'Hide password' : 'Show password'}
                        >
                          {loginShowPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        className="text-xs text-amber-500/70 transition-colors hover:text-amber-400"
                      >
                        Forgot password?
                      </button>
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-md border border-red-800/40 bg-red-950/30 px-4 py-2.5 text-center text-sm text-red-300"
                      >
                        {error}
                      </motion.div>
                    )}

                    {success && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-md border border-amber-700/40 bg-amber-950/30 px-4 py-2.5 text-center text-sm text-amber-300"
                      >
                        {success}
                      </motion.div>
                    )}

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-amber-600 text-stone-950 font-semibold hover:bg-amber-500 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Signing In...
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </Button>
                  </form>

                  {/* Social Login Divider - only for customer */}
                  {selectedLoginRole === 'user' && (
                    <>
                      <div className="relative my-6">
                        <Separator className="bg-amber-900/30" />
                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-stone-950 px-3 text-xs text-amber-200/40 uppercase tracking-wider">
                          or continue with
                        </span>
                      </div>

                      {/* Social Login Buttons */}
                      <div className="grid grid-cols-3 gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={loading}
                          onClick={() => handleSocialLogin('Google')}
                          className="border-amber-900/40 bg-stone-900/30 text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-200 hover:border-amber-700/50 transition-all"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                          <span className="sr-only sm:not-sr-only sm:text-xs">Google</span>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          disabled={loading}
                          onClick={() => handleSocialLogin('Facebook')}
                          className="border-amber-900/40 bg-stone-900/30 text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-200 hover:border-amber-700/50 transition-all"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#1877F2">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                          <span className="sr-only sm:not-sr-only sm:text-xs">Facebook</span>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          disabled={loading}
                          onClick={() => handleSocialLogin('LinkedIn')}
                          className="border-amber-900/40 bg-stone-900/30 text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-200 hover:border-amber-700/50 transition-all"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#0A66C2">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                          <span className="sr-only sm:not-sr-only sm:text-xs">LinkedIn</span>
                        </Button>
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* ============ Register Form ============ */}
                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-3">
                    {/* Role badge */}
                    <div className="flex items-center gap-2 mb-2">
                      {selectedLoginRole === 'user' && (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-600/20 px-2.5 py-1 text-xs font-medium text-amber-300 border border-amber-600/30">
                          <User className="h-3 w-3" />
                          {roleCardConfig.user.register.title}
                        </span>
                      )}
                      {selectedLoginRole === 'corporate' && (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/20 px-2.5 py-1 text-xs font-medium text-amber-300 border border-amber-500/30">
                          <Building2 className="h-3 w-3" />
                          {roleCardConfig.corporate.register.title}
                        </span>
                      )}
                      {selectedLoginRole === 'team' && (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-purple-600/20 px-2.5 py-1 text-xs font-medium text-purple-300 border border-purple-500/30">
                          <Shield className="h-3 w-3" />
                          {roleCardConfig.team.register.title}
                        </span>
                      )}
                      {(selectedLoginRole === 'corporate' || selectedLoginRole === 'team') && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-500/60">
                          <Lock className="h-3 w-3" />
                          2FA Enabled
                        </span>
                      )}
                    </div>

                    {/* Common fields: Email, Name, Password, Confirm Password */}
                    <div className="space-y-2">
                      <Label htmlFor="reg-email" className="text-amber-200/70 text-xs uppercase tracking-wider">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600/50" />
                        <Input
                          id="reg-email"
                          type="email"
                          placeholder={getRegPlaceholder().email}
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="border-amber-900/40 bg-stone-900/50 pl-10 text-amber-50 placeholder:text-amber-200/30 focus:border-amber-600/60 focus:ring-amber-600/30"
                          autoComplete="email"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-name" className="text-amber-200/70 text-xs uppercase tracking-wider">
                        Full Name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600/50" />
                        <Input
                          id="reg-name"
                          type="text"
                          placeholder={getRegPlaceholder().name}
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          className="border-amber-900/40 bg-stone-900/50 pl-10 text-amber-50 placeholder:text-amber-200/30 focus:border-amber-600/60 focus:ring-amber-600/30"
                          autoComplete="name"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-password" className="text-amber-200/70 text-xs uppercase tracking-wider">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600/50" />
                        <Input
                          id="reg-password"
                          type={regShowPassword ? 'text' : 'password'}
                          placeholder="Min. 8 characters"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="border-amber-900/40 bg-stone-900/50 pl-10 pr-10 text-amber-50 placeholder:text-amber-200/30 focus:border-amber-600/60 focus:ring-amber-600/30"
                          autoComplete="new-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setRegShowPassword(!regShowPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-200/40 transition-colors hover:text-amber-200"
                          aria-label={regShowPassword ? 'Hide password' : 'Show password'}
                        >
                          {regShowPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-confirm-password" className="text-amber-200/70 text-xs uppercase tracking-wider">
                        Confirm Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600/50" />
                        <Input
                          id="reg-confirm-password"
                          type={regShowPassword ? 'text' : 'password'}
                          placeholder="Re-enter your password"
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          className="border-amber-900/40 bg-stone-900/50 pl-10 text-amber-50 placeholder:text-amber-200/30 focus:border-amber-600/60 focus:ring-amber-600/30"
                          autoComplete="new-password"
                          required
                        />
                      </div>
                    </div>

                    {/* ===== Corporate-specific fields ===== */}
                    {selectedLoginRole === 'corporate' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3 border-t border-amber-900/30 pt-3"
                      >
                        <p className="text-xs text-amber-500/60 font-medium uppercase tracking-wider">
                          Corporate Details
                        </p>

                        <div className="space-y-2">
                          <Label className="text-amber-200/70 text-xs uppercase tracking-wider">
                            Company Name *
                          </Label>
                          <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600/50" />
                            <Input
                              type="text"
                              placeholder="TechCorp India Pvt. Ltd."
                              value={regCompanyName}
                              onChange={(e) => setRegCompanyName(e.target.value)}
                              className="border-amber-900/40 bg-stone-900/50 pl-10 text-amber-50 placeholder:text-amber-200/30 focus:border-amber-600/60 focus:ring-amber-600/30"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-amber-200/70 text-xs uppercase tracking-wider">
                            Contact Person Name *
                          </Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600/50" />
                            <Input
                              type="text"
                              placeholder="Rajesh Kumar"
                              value={regContactName}
                              onChange={(e) => setRegContactName(e.target.value)}
                              className="border-amber-900/40 bg-stone-900/50 pl-10 text-amber-50 placeholder:text-amber-200/30 focus:border-amber-600/60 focus:ring-amber-600/30"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-amber-200/70 text-xs uppercase tracking-wider">
                              Phone
                            </Label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600/50" />
                              <Input
                                type="tel"
                                placeholder="+91-9876543210"
                                value={regContactPhone}
                                onChange={(e) => setRegContactPhone(e.target.value)}
                                className="border-amber-900/40 bg-stone-900/50 pl-10 text-amber-50 placeholder:text-amber-200/30 focus:border-amber-600/60 focus:ring-amber-600/30"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-amber-200/70 text-xs uppercase tracking-wider">
                              Industry
                            </Label>
                            <Input
                              type="text"
                              placeholder="Technology"
                              value={regIndustry}
                              onChange={(e) => setRegIndustry(e.target.value)}
                              className="border-amber-900/40 bg-stone-900/50 text-amber-50 placeholder:text-amber-200/30 focus:border-amber-600/60 focus:ring-amber-600/30"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-amber-200/70 text-xs uppercase tracking-wider">
                              Website
                            </Label>
                            <div className="relative">
                              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600/50" />
                              <Input
                                type="url"
                                placeholder="https://techcorp.in"
                                value={regWebsite}
                                onChange={(e) => setRegWebsite(e.target.value)}
                                className="border-amber-900/40 bg-stone-900/50 pl-10 text-amber-50 placeholder:text-amber-200/30 focus:border-amber-600/60 focus:ring-amber-600/30"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-amber-200/70 text-xs uppercase tracking-wider">
                              GST Number
                            </Label>
                            <div className="relative">
                              <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600/50" />
                              <Input
                                type="text"
                                placeholder="29AABCT1234F1ZH"
                                value={regGstNumber}
                                onChange={(e) => setRegGstNumber(e.target.value)}
                                className="border-amber-900/40 bg-stone-900/50 pl-10 text-amber-50 placeholder:text-amber-200/30 focus:border-amber-600/60 focus:ring-amber-600/30"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="rounded-md border border-amber-700/30 bg-amber-950/20 px-3 py-2.5 text-xs text-amber-300/70">
                          Corporate accounts require admin approval. You will be notified once approved. Two-factor authentication is mandatory.
                        </div>
                      </motion.div>
                    )}

                    {/* ===== Team/Agent-specific fields ===== */}
                    {selectedLoginRole === 'team' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3 border-t border-purple-900/30 pt-3"
                      >
                        <p className="text-xs text-purple-400/60 font-medium uppercase tracking-wider">
                          Team / Agent Details
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-amber-200/70 text-xs uppercase tracking-wider">
                              Employee/Agent ID *
                            </Label>
                            <div className="relative">
                              <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-600/50" />
                              <Input
                                type="text"
                                placeholder="3B-2024-0142"
                                value={regEmployeeId}
                                onChange={(e) => setRegEmployeeId(e.target.value)}
                                className="border-amber-900/40 bg-stone-900/50 pl-10 text-amber-50 placeholder:text-amber-200/30 focus:border-amber-600/60 focus:ring-amber-600/30"
                                required
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-amber-200/70 text-xs uppercase tracking-wider">
                              Department
                            </Label>
                            <div className="relative">
                              <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-600/50" />
                              <Input
                                type="text"
                                placeholder="Customer Success"
                                value={regDepartment}
                                onChange={(e) => setRegDepartment(e.target.value)}
                                className="border-amber-900/40 bg-stone-900/50 pl-10 text-amber-50 placeholder:text-amber-200/30 focus:border-amber-600/60 focus:ring-amber-600/30"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="rounded-md border border-purple-700/30 bg-purple-950/20 px-3 py-2.5 text-xs text-purple-300/70">
                          Team/Agent accounts require admin approval before access is granted. Two-factor authentication is mandatory for all team accounts.
                        </div>
                      </motion.div>
                    )}

                    {/* ===== Customer-specific: 2FA option ===== */}
                    {selectedLoginRole === 'user' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-start gap-3 rounded-md border border-amber-900/20 bg-stone-900/30 p-3"
                      >
                        <Checkbox
                          id="reg-2fa"
                          checked={regEnable2FA}
                          onCheckedChange={(checked) => setRegEnable2FA(checked === true)}
                          className="mt-0.5 border-amber-700/50 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                        />
                        <div>
                          <Label htmlFor="reg-2fa" className="text-amber-200/80 text-xs font-medium cursor-pointer">
                            Enable two-factor authentication
                          </Label>
                          <p className="text-xs text-amber-200/40 mt-0.5">
                            Add an extra layer of security to your account with 2FA verification.
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-md border border-red-800/40 bg-red-950/30 px-4 py-2.5 text-center text-sm text-red-300"
                      >
                        {error}
                      </motion.div>
                    )}

                    {success && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-md border border-amber-700/40 bg-amber-950/30 px-4 py-2.5 text-center text-sm text-amber-300"
                      >
                        {success}
                      </motion.div>
                    )}

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-amber-600 text-stone-950 font-semibold hover:bg-amber-500 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        selectedLoginRole === 'corporate' || selectedLoginRole === 'team'
                          ? 'Submit for Approval'
                          : 'Create Account'
                      )}
                    </Button>

                    <p className="text-center text-xs text-amber-200/30">
                      By creating an account, you agree to our{' '}
                      <span className="cursor-pointer text-amber-500/60 hover:text-amber-400 transition-colors">
                        Terms of Service
                      </span>{' '}
                      and{' '}
                      <span className="cursor-pointer text-amber-500/60 hover:text-amber-400 transition-colors">
                        Privacy Policy
                      </span>
                    </p>
                  </form>

                  {/* Social Registration - only for customer */}
                  {selectedLoginRole === 'user' && (
                    <>
                      <div className="relative my-6">
                        <Separator className="bg-amber-900/30" />
                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-stone-950 px-3 text-xs text-amber-200/40 uppercase tracking-wider">
                          or sign up with
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={loading}
                          onClick={() => handleSocialLogin('Google')}
                          className="border-amber-900/40 bg-stone-900/30 text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-200 hover:border-amber-700/50 transition-all"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                          <span className="sr-only sm:not-sr-only sm:text-xs">Google</span>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          disabled={loading}
                          onClick={() => handleSocialLogin('Facebook')}
                          className="border-amber-900/40 bg-stone-900/30 text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-200 hover:border-amber-700/50 transition-all"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#1877F2">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                          <span className="sr-only sm:not-sr-only sm:text-xs">Facebook</span>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          disabled={loading}
                          onClick={() => handleSocialLogin('LinkedIn')}
                          className="border-amber-900/40 bg-stone-900/30 text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-200 hover:border-amber-700/50 transition-all"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#0A66C2">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                          <span className="sr-only sm:not-sr-only sm:text-xs">LinkedIn</span>
                        </Button>
                      </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>
              </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
