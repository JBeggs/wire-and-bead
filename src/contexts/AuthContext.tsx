'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { authApi, apiClient, newsApi } from '@/lib/api'

interface User {
  id: string
  email: string
  username?: string
  first_name?: string
  last_name?: string
}

interface Profile {
  user: string
  email: string
  username?: string
  full_name?: string
  bio?: string
  avatar_url?: string
  role: 'user' | 'admin' | 'editor' | 'author' | 'business_owner' | 'subscriber'
  is_verified: boolean
  social_links: Record<string, string>
  preferences: Record<string, any>
  last_seen_at?: string
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  companyId: string | null
  loading: boolean
  signIn: (username: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeAuth = async () => {
      // Check for token in storage/cookies
      const token = apiClient.getToken()
      const refreshToken = apiClient.getRefreshToken()
      
      console.log('AuthProvider: Initializing...', { hasToken: !!token, hasRefresh: !!refreshToken })

      if (token) {
        apiClient.setToken(token)
        const storedCompanyId = apiClient.getCompanyId()
        if (storedCompanyId) {
          apiClient.setCompanyId(storedCompanyId)
          setCompanyId(storedCompanyId)
        }
        
        try {
          await fetchProfile()
        } catch (e) {
          console.error('AuthProvider: Profile fetch failed with token', e)
          // If profile fetch fails but we have a refresh token, try refreshing
          if (refreshToken) {
            await tryRefresh(refreshToken)
          } else {
            setLoading(false)
          }
        }
      } else if (refreshToken) {
        // No access token but have refresh token
        await tryRefresh(refreshToken)
      } else {
        console.log('AuthProvider: No tokens found')
        setLoading(false)
      }
    }

    const tryRefresh = async (rToken: string) => {
      try {
        console.log('AuthProvider: Attempting token refresh...')
        const response = await authApi.refreshToken(rToken)
        if (response.access) {
          console.log('AuthProvider: Refresh successful')
          apiClient.setToken(response.access)
          await fetchProfile()
        } else {
          setLoading(false)
        }
      } catch (e) {
        console.error('AuthProvider: Refresh failed', e)
        // JWT fallback: refresh failed but we may have a valid token (e.g. from Cypress session)
        const token = apiClient.getToken()
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1])) as { user_id?: number; sub?: string }
            const uid = payload.user_id ?? (payload.sub != null ? Number(payload.sub) : undefined)
            if (uid != null) {
              setUser({ id: String(uid), email: '' })
            }
          } catch {
            // Ignore JWT decode errors
          }
        }
        setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  useEffect(() => {
    console.log('AuthProvider: State updated', { user: !!user, profile: !!profile, companyId })
  }, [user, profile, companyId])

  const fetchProfile = async () => {
    try {
      const profileData: any = await newsApi.profile.get()
      setProfile(profileData)
      
      // Ensure company ID is synced if found in profile/metadata
      if (profileData.company?.id) {
        apiClient.setCompanyId(profileData.company.id)
        setCompanyId(profileData.company.id)
      } else if (profileData.company_id) {
        apiClient.setCompanyId(profileData.company_id)
        setCompanyId(profileData.company_id)
      }
      
      if (profileData.user) {
        setUser({
          id: profileData.user,
          email: profileData.email,
          username: profileData.username,
          first_name: profileData.full_name?.split(' ')[0],
          last_name: profileData.full_name?.split(' ').slice(1).join(' '),
        })
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error)
      // If unauthorized, check if we can refresh before signing out
      if (error.status === 401) {
        const refreshToken = apiClient.getRefreshToken()
        if (!refreshToken) {
          signOut()
        }
        // If there is a refresh token, initializeAuth will handle it
      } else {
        // JWT fallback: profile fetch failed (404, 500, network) but we have a token.
        // Decode JWT payload to set minimal user so header shows logged-in state.
        const token = apiClient.getToken()
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1])) as { user_id?: number; sub?: string }
            const uid = payload.user_id ?? (payload.sub != null ? Number(payload.sub) : undefined)
            if (uid != null) {
              setUser({ id: String(uid), email: '' })
            }
          } catch {
            // Ignore JWT decode errors
          }
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const refreshProfile = async () => {
    await fetchProfile()
  }

  const signIn = async (username: string, password: string) => {
    setLoading(true)
    try {
      const response = await authApi.login(username, password)
      console.log('AuthProvider: signIn response', { companyId: response.company?.id, user: response.user?.id })
      
      setUser(response.user)
      setCompanyId(response.company?.id || null)
      
      await fetchProfile()
      
      return { error: null }
    } catch (error: any) {
      console.error('Login error:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Login failed. Please check your credentials.'
      return { error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    setLoading(true)
    try {
      const response = await authApi.register({
        email,
        password,
        password_confirm: password,
        full_name: fullName,
      })
      
      setUser(response.user)
      setCompanyId(response.company?.id || null)
      
      await fetchProfile()
      
      return { error: null }
    } catch (error: any) {
      console.error('Registration error:', error)
      
      let errorMessage = 'Registration failed. Please try again.'
      
      if (error?.details?.error) {
        const errorDetails = error.details.error
        if (typeof errorDetails === 'string') {
          errorMessage = errorDetails
        } else if (typeof errorDetails === 'object' && errorDetails !== null) {
          const fieldLabels: Record<string, string> = {
            email: 'Email',
            username: 'Username',
            password: 'Password',
            password_confirm: 'Password confirmation',
            full_name: 'Full name',
          }
          
          const errorMessages = Object.entries(errorDetails).map(([field, messages]: [string, any]) => {
            const fieldLabel = fieldLabels[field] || field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ')
            const messageArray = Array.isArray(messages) ? messages : [messages]
            const messageText = messageArray.join(', ')
            return `${fieldLabel}: ${messageText}`
          })
          errorMessage = errorMessages.join('. ')
        }
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      return { error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      authApi.logout()
      setUser(null)
      setProfile(null)
      setCompanyId(null)
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    profile,
    companyId,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
