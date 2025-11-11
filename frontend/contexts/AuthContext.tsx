'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '@/lib/api'
import Cookies from 'js-cookie'
import { useRouter } from 'next/navigation'

interface User {
  id: number
  email: string
  full_name: string | null
  created_at: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName?: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = Cookies.get('token')
    if (token) {
      try {
        const userData = await authAPI.getMe()
        setUser(userData)
      } catch (error) {
        Cookies.remove('token')
        setUser(null)
      }
    }
    setLoading(false)
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password)
      Cookies.set('token', response.access_token, { expires: 7 })
      const userData = await authAPI.getMe()
      setUser(userData)
      router.push('/dashboard')
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Login failed')
    }
  }

  const register = async (email: string, password: string, fullName?: string) => {
    try {
      await authAPI.register(email, password, fullName)
      // After registration, login automatically
      const response = await authAPI.login(email, password)
      Cookies.set('token', response.access_token, { expires: 7 })
      const userData = await authAPI.getMe()
      setUser(userData)
      router.push('/dashboard')
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Registration failed')
    }
  }

  const logout = () => {
    Cookies.remove('token')
    setUser(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
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

