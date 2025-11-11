import axios from 'axios'
import Cookies from 'js-cookie'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests
api.interceptors.request.use((config) => {
  const token = Cookies.get('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auth API
export const authAPI = {
  register: async (email: string, password: string, fullName?: string) => {
    const response = await api.post('/api/auth/register', {
      email,
      password,
      full_name: fullName,
    })
    return response.data
  },
  login: async (email: string, password: string) => {
    const formData = new FormData()
    formData.append('username', email)
    formData.append('password', password)
    const response = await api.post('/api/auth/login', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
  getMe: async () => {
    const response = await api.get('/api/auth/me')
    return response.data
  },
}

// Statements API
export const statementsAPI = {
  upload: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/api/statements/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
  getAll: async () => {
    const response = await api.get('/api/statements/')
    return response.data
  },
  delete: async (statementId: number) => {
    await api.delete(`/api/statements/${statementId}`)
  },
  exportCSV: async (statementId: number) => {
    const response = await api.get(`/api/statements/${statementId}/csv`)
    return response.data
  },
}

// Transactions API
export const transactionsAPI = {
  getAll: async (params?: {
    skip?: number
    limit?: number
    category?: string
    transaction_type?: string
    start_date?: string
    end_date?: string
  }) => {
    const response = await api.get('/api/transactions/', { params })
    return response.data
  },
  getDashboard: async (months: number = 6) => {
    const response = await api.get('/api/transactions/dashboard', {
      params: { months },
    })
    return response.data
  },
}

// Goals API
export const goalsAPI = {
  create: async (name: string, targetAmount: number, deadline?: string) => {
    const response = await api.post('/api/goals/', {
      name,
      target_amount: targetAmount,
      deadline,
    })
    return response.data
  },
  getAll: async (activeOnly: boolean = true) => {
    const response = await api.get('/api/goals/', {
      params: { active_only: activeOnly },
    })
    return response.data
  },
  update: async (goalId: number, data: any) => {
    const response = await api.put(`/api/goals/${goalId}`, data)
    return response.data
  },
  delete: async (goalId: number) => {
    await api.delete(`/api/goals/${goalId}`)
  },
}

// Fixed Expenses API
export const fixedExpensesAPI = {
  create: async (
    name: string,
    amount: number,
    category: string,
    recurring: string = 'monthly',
    dayOfMonth?: number
  ) => {
    const response = await api.post('/api/fixed-expenses/', {
      name,
      amount,
      category,
      recurring,
      day_of_month: dayOfMonth,
    })
    return response.data
  },
  getAll: async (activeOnly: boolean = true) => {
    const response = await api.get('/api/fixed-expenses/', {
      params: { active_only: activeOnly },
    })
    return response.data
  },
  update: async (expenseId: number, data: any) => {
    const response = await api.put(`/api/fixed-expenses/${expenseId}`, data)
    return response.data
  },
  delete: async (expenseId: number) => {
    await api.delete(`/api/fixed-expenses/${expenseId}`)
  },
  getMonthlyTotal: async () => {
    const response = await api.get('/api/fixed-expenses/monthly/total')
    return response.data
  },
}

// Recommendations API
export const recommendationsAPI = {
  getAll: async () => {
    const response = await api.get('/api/recommendations/')
    return response.data
  },
  simulate: async (category: string, reductionPercent: number) => {
    const response = await api.post('/api/recommendations/simulate', null, {
      params: { category, reduction_percent: reductionPercent },
    })
    return response.data
  },
}

export default api

