'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { goalsAPI } from '@/lib/api'
import Layout from '@/components/Layout'
import { format } from 'date-fns'

export default function GoalsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [goals, setGoals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    target_amount: '',
    deadline: '',
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      loadGoals()
    }
  }, [user])

  const loadGoals = async () => {
    try {
      const data = await goalsAPI.getAll(true)
      setGoals(data)
    } catch (error) {
      console.error('Error loading goals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await goalsAPI.create(
        formData.name,
        parseFloat(formData.target_amount),
        formData.deadline || undefined
      )
      setShowModal(false)
      setFormData({ name: '', target_amount: '', deadline: '' })
      await loadGoals()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error creating goal')
    }
  }

  const handleDelete = async (goalId: number) => {
    if (confirm('Are you sure you want to delete this goal?')) {
      try {
        await goalsAPI.delete(goalId)
        await loadGoals()
      } catch (error) {
        alert('Error deleting goal')
      }
    }
  }

  const getProgress = (goal: any) => {
    return Math.min((goal.current_amount / goal.target_amount) * 100, 100)
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

  return (
    <Layout>
      <div className="px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Savings Goals</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            + New Goal
          </button>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-semibold mb-4">Create New Goal</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Goal Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400"
                    placeholder="e.g., Vacation Fund"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Amount (MXN)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.target_amount}
                    onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400"
                    placeholder="5000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deadline (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setFormData({ name: '', target_amount: '', deadline: '' })
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              No goals yet. Create your first savings goal!
            </div>
          ) : (
            goals.map((goal) => (
              <div key={goal.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold">{goal.name}</h3>
                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Progress</span>
                    <span>
                      ${goal.current_amount.toFixed(2)} / ${goal.target_amount.toFixed(2)} MXN
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-primary-600 h-2.5 rounded-full transition-all"
                      style={{ width: `${getProgress(goal)}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {getProgress(goal).toFixed(1)}% complete
                  </p>
                </div>
                {goal.deadline && (
                  <p className="text-sm text-gray-500">
                    Deadline: {format(new Date(goal.deadline), 'MMM dd, yyyy')}
                  </p>
                )}
                <div className="mt-4">
                  <p className="text-lg font-semibold text-gray-700">
                    Remaining: ${(goal.target_amount - goal.current_amount).toFixed(2)} MXN
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  )
}

