'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { transactionsAPI } from '@/lib/api'
import Layout from '@/components/Layout'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

// Format number with commas
const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Shorten category names for display
const shortenCategoryName = (name: string): string => {
  const shortNames: { [key: string]: string } = {
    'Payments/Recurring expenses': 'Recurring',
    'Personal shopping': 'Shopping',
    'Transportation': 'Transport',
    'Entertainment': 'Entertain',
    'Food': 'Food'
  }
  return shortNames[name] || name
}

// Custom tooltip for charts
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]
    const name = data.name || data.payload?.category || ''
    const value = data.value || 0
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-gray-900 font-semibold">{name}</p>
        <p className="text-gray-700">
          ${formatCurrency(value)} MXN
        </p>
      </div>
    )
  }
  return null
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      loadDashboard()
    }
  }, [user])

  const loadDashboard = async () => {
    try {
      const data = await transactionsAPI.getDashboard(6)
      setDashboardData(data)
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    )
  }

  if (!dashboardData) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">No data available. Upload a statement to get started.</p>
        </div>
      </Layout>
    )
  }

  const pieData = dashboardData.category_summary.map((cat: any) => ({
    name: cat.category,
    shortName: shortenCategoryName(cat.category),
    value: cat.total,
  }))

  // Upcoming payments data for bar chart
  const upcomingPaymentsData = (dashboardData.upcoming_payments || []).map((payment: any) => {
    const dueDate = new Date(payment.due_date)
    const daysText = payment.days_until === 0 ? 'Today' : 
                     payment.days_until === 1 ? 'Tomorrow' : 
                     `${payment.days_until} days`
    return {
      name: payment.name.length > 20 ? payment.name.substring(0, 20) + '...' : payment.name,
      fullName: payment.name,
      amount: payment.amount,
      dueDate: dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      daysUntil: payment.days_until,
      daysText: daysText,
      category: payment.category || 'Unknown'
    }
  })

  return (
    <Layout>
      <div className="px-4 py-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Income</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">
              ${formatCurrency(dashboardData.total_income)} MXN
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Expenses</h3>
            <p className="text-3xl font-bold text-red-600 mt-2">
              ${formatCurrency(dashboardData.total_expenses)} MXN
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Net Balance</h3>
            <p className={`text-3xl font-bold mt-2 ${
              dashboardData.net_balance >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              ${formatCurrency(dashboardData.net_balance)} MXN
            </p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Expenses by Category - Pie Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Expenses by Category</h2>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  labelLine={false}
                  label={({ shortName, percent }) => `${shortName} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  content={<CustomTooltip />}
                  formatter={(value: any, name: any, props: any) => [
                    `$${formatCurrency(value)} MXN`,
                    props.payload.name
                  ]}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value, entry: any) => entry.payload.name}
                  wrapperStyle={{ fontSize: '12px', color: '#374151' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Upcoming Payments - Bar Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Upcoming Payments</h2>
            {upcomingPaymentsData.length === 0 ? (
              <div className="flex items-center justify-center h-96 text-gray-500">
                No upcoming payments. Add fixed expenses to track recurring payments.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={upcomingPaymentsData} 
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    type="number"
                    tick={{ fill: '#374151', fontSize: 12 }}
                    tickFormatter={(value) => {
                      if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
                      return `$${value}`
                    }}
                  />
                  <YAxis 
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fill: '#374151', fontSize: 11 }}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                            <p className="text-gray-900 font-semibold mb-1">{data.fullName}</p>
                            <p className="text-gray-700 text-sm mb-1">
                              ${formatCurrency(data.amount)} MXN
                            </p>
                            <p className="text-gray-500 text-xs mb-1">
                              Due: {data.dueDate} ({data.daysText})
                            </p>
                            <p className="text-gray-500 text-xs">
                              {data.category}
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="amount" radius={[0, 8, 8, 0]}>
                    {upcomingPaymentsData.map((entry: any, index: number) => {
                      let color = '#0EA5E9' // Blue for later
                      if (entry.daysUntil === 0) color = '#EF4444' // Red for today
                      else if (entry.daysUntil <= 7) color = '#F59E0B' // Orange for this week
                      return <Cell key={`bar-cell-${index}`} fill={color} />
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Monthly Trend</h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={dashboardData.monthly_trend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="month" 
                tick={{ fill: '#374151', fontSize: 12 }}
              />
              <YAxis 
                tick={{ fill: '#374151', fontSize: 12 }}
                tickFormatter={(value) => {
                  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
                  return `$${value}`
                }}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                        <p className="text-gray-900 font-semibold mb-2">{payload[0].payload.month}</p>
                        {payload.map((entry: any, index: number) => (
                          <p key={index} className="text-gray-700" style={{ color: entry.color }}>
                            {entry.name}: ${formatCurrency(entry.value)} MXN
                          </p>
                        ))}
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend 
                wrapperStyle={{ color: '#374151', paddingTop: '20px' }}
                iconType="line"
              />
              <Line 
                type="monotone" 
                dataKey="income" 
                stroke="#00C49F" 
                strokeWidth={3}
                name="Income"
                dot={{ fill: '#00C49F', r: 5 }}
                activeDot={{ r: 7 }}
              />
              <Line 
                type="monotone" 
                dataKey="expenses" 
                stroke="#FF8042" 
                strokeWidth={3}
                name="Expenses"
                dot={{ fill: '#FF8042', r: 5 }}
                activeDot={{ r: 7 }}
              />
              <Line 
                type="monotone" 
                dataKey="net" 
                stroke="#0088FE" 
                strokeWidth={3}
                name="Net Balance"
                dot={{ fill: '#0088FE', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Layout>
  )
}

