'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { goalsAPI, transactionsAPI } from '@/lib/api'
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
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<any>(null)
  const [updateAmount, setUpdateAmount] = useState('')
  const [updateType, setUpdateType] = useState<'add' | 'remove'>('add')
  const [netBalance, setNetBalance] = useState<number>(0)
  const [dashboardLoading, setDashboardLoading] = useState(true)

  // Calculate available balance (net balance minus money already in goals)
  const getAvailableBalance = () => {
    const totalInGoals = goals.reduce((sum, goal) => sum + goal.current_amount, 0)
    return netBalance - totalInGoals
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      loadGoals()
      loadNetBalance()
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

  const loadNetBalance = async () => {
    try {
      const dashboardData = await transactionsAPI.getDashboard(6)
      setNetBalance(dashboardData.net_balance)
    } catch (error) {
      console.error('Error loading net balance:', error)
      setNetBalance(0)
    } finally {
      setDashboardLoading(false)
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

  const openUpdateModal = (goal: any, type: 'add' | 'remove') => {
    const availableBalance = getAvailableBalance()
    
    // Check if trying to add money when available balance is negative or zero
    if (type === 'add' && availableBalance <= 0) {
      const totalInGoals = goals.reduce((sum, g) => sum + g.current_amount, 0)
      alert(`❌ Cannot add money to goals\n\nNo available balance to save.\n\nNet Balance: $${netBalance.toFixed(2)} MXN\nAlready in Goals: $${totalInGoals.toFixed(2)} MXN\nAvailable to Save: $${availableBalance.toFixed(2)} MXN\n\nYou need to earn more or spend less to save additional money.`)
      return
    }
    
    setSelectedGoal(goal)
    setUpdateType(type)
    setUpdateAmount('')
    setShowUpdateModal(true)
  }

  const handleUpdateAmount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGoal) return

    const amount = Number.parseFloat(updateAmount)
    if (Number.isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount')
      return
    }

    const availableBalance = getAvailableBalance()

    try {
      let newCurrentAmount = selectedGoal.current_amount
      
      if (updateType === 'add') {
        // Validate that user doesn't add more than available balance
        if (amount > availableBalance) {
          const totalInGoals = goals.reduce((sum, g) => sum + g.current_amount, 0)
          alert(`❌ Cannot add more than your Available Balance\n\nYou're trying to add: $${amount.toFixed(2)} MXN\nNet Balance: $${netBalance.toFixed(2)} MXN\nAlready in Goals: $${totalInGoals.toFixed(2)} MXN\nAvailable to Save: $${availableBalance.toFixed(2)} MXN\n\nYou can only save money you haven't already allocated to other goals.`)
          return
        }
        newCurrentAmount += amount
      } else {
        newCurrentAmount -= amount
        if (newCurrentAmount < 0) {
          alert('Cannot remove more than the current amount')
          return
        }
      }

      // Cap at target amount
      if (newCurrentAmount > selectedGoal.target_amount) {
        newCurrentAmount = selectedGoal.target_amount
      }

      await goalsAPI.update(selectedGoal.id, {
        current_amount: newCurrentAmount
      })

      setShowUpdateModal(false)
      setUpdateAmount('')
      setSelectedGoal(null)
      await loadGoals()
      // No need to reload dashboard, we calculate available balance from goals
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error updating goal')
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

        {/* Net Balance Banner */}
        {!dashboardLoading && (
          <div className={`rounded-lg p-4 mb-6 ${
            getAvailableBalance() > 0 
              ? 'bg-green-50 border border-green-200' 
              : getAvailableBalance() === 0
              ? 'bg-yellow-50 border border-yellow-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <h3 className={`text-lg font-semibold ${
                  getAvailableBalance() > 0 ? 'text-green-900' : getAvailableBalance() === 0 ? 'text-yellow-900' : 'text-red-900'
                }`}>
                  Available to Save: <span className="text-2xl">${getAvailableBalance().toFixed(2)} MXN</span>
                </h3>
                <div className="mt-2 text-sm space-y-1">
                  <div className="flex justify-between text-gray-700">
                    <span>Net Balance (Income - Expenses):</span>
                    <span className="font-medium">${netBalance.toFixed(2)} MXN</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Already in Goals:</span>
                    <span className="font-medium">-${goals.reduce((sum, g) => sum + g.current_amount, 0).toFixed(2)} MXN</span>
                  </div>
                  <div className={`flex justify-between pt-1 border-t ${
                    getAvailableBalance() > 0 ? 'border-green-300' : getAvailableBalance() === 0 ? 'border-yellow-300' : 'border-red-300'
                  }`}>
                    <span className="font-semibold">Available:</span>
                    <span className="font-bold">${getAvailableBalance().toFixed(2)} MXN</span>
                  </div>
                </div>
                <p className={`text-sm mt-2 ${
                  getAvailableBalance() > 0 ? 'text-green-700' : getAvailableBalance() === 0 ? 'text-yellow-700' : 'text-red-700'
                }`}>
                  {getAvailableBalance() > 0 
                    ? '✅ You can add money to your savings goals!' 
                    : getAvailableBalance() === 0
                    ? '⚠️ All your Net Balance is already allocated to goals.'
                    : '❌ You\'re spending more than you earn or have over-allocated to goals.'}
                </p>
              </div>
              <div className={`text-4xl ml-4 ${
                getAvailableBalance() > 0 ? 'text-green-600' : getAvailableBalance() === 0 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {getAvailableBalance() > 0 ? '✅' : getAvailableBalance() === 0 ? '⚠️' : '❌'}
              </div>
            </div>
          </div>
        )}

        {/* Info Banner */}
        {goals.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">How Savings Goals Work</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✅ <strong>Create a goal</strong> with a target amount and optional deadline</li>
              <li>✅ <strong>Add money</strong> when your Net Balance is positive (you have savings available)</li>
              <li>✅ <strong>Track progress</strong> with the visual progress bar</li>
              <li>✅ <strong>Withdraw</strong> money if needed</li>
            </ul>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-gray-700 text-xl font-semibold mb-4">Create New Goal</h2>
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
                  <h3 className="text-xl font-semibold text-gray-900">{goal.name}</h3>
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
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => openUpdateModal(goal, 'add')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                      getAvailableBalance() > 0
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    disabled={getAvailableBalance() <= 0}
                    title={getAvailableBalance() <= 0 ? 'No available balance to save' : ''}
                  >
                    + Add Money
                  </button>
                  <button
                    onClick={() => openUpdateModal(goal, 'remove')}
                    className="flex-1 bg-orange-600 text-white px-3 py-2 rounded-lg hover:bg-orange-700 text-sm disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                    disabled={goal.current_amount === 0}
                  >
                    - Withdraw
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Update Amount Modal */}
        {showUpdateModal && selectedGoal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">
                {updateType === 'add' ? 'Add Money to Goal' : 'Withdraw Money from Goal'}
              </h2>
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Goal: {selectedGoal.name}</p>
                <p className="text-lg font-semibold text-gray-900">
                  Current: ${selectedGoal.current_amount.toFixed(2)} MXN
                </p>
                <p className="text-sm text-gray-600">
                  Target: ${selectedGoal.target_amount.toFixed(2)} MXN
                </p>
                {updateType === 'add' && (
                  <div className="mt-2 pt-2 border-t border-gray-300">
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Net Balance:</span>
                        <span className="font-medium">${netBalance.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>In Other Goals:</span>
                        <span className="font-medium">-${goals.reduce((sum, g) => sum + g.current_amount, 0).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-green-200">
                      <p className="text-sm text-green-700 font-medium">
                        💰 Available to Save: ${getAvailableBalance().toFixed(2)} MXN
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        This is your Net Balance minus money already in goals
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <form onSubmit={handleUpdateAmount} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (MXN)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={updateType === 'add' ? getAvailableBalance() : selectedGoal.current_amount}
                    value={updateAmount}
                    onChange={(e) => setUpdateAmount(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400"
                    placeholder={updateType === 'add' ? `Max: $${getAvailableBalance().toFixed(2)}` : 'Enter amount'}
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className={`flex-1 ${
                      updateType === 'add' 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-orange-600 hover:bg-orange-700'
                    } text-white px-4 py-2 rounded-lg`}
                  >
                    {updateType === 'add' ? 'Add' : 'Withdraw'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUpdateModal(false)
                      setUpdateAmount('')
                      setSelectedGoal(null)
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
      </div>
    </Layout>
  )
}

