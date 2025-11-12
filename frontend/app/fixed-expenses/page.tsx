'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { fixedExpensesAPI } from '@/lib/api'
import Layout from '@/components/Layout'

const CATEGORIES = [
  'Food',
  'Transportation',
  'Payments/Recurring expenses',
  'Personal shopping',
  'Entertainment',
]

const RECURRING_OPTIONS = ['monthly', 'weekly', 'yearly']

export default function FixedExpensesPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [expenses, setExpenses] = useState<any[]>([])
  const [monthlyTotal, setMonthlyTotal] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: '',
    recurring: 'monthly',
    day_of_month: '',
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      loadExpenses()
      loadMonthlyTotal()
    }
  }, [user])

  const loadExpenses = async () => {
    try {
      const data = await fixedExpensesAPI.getAll(true)
      setExpenses(data)
    } catch (error) {
      console.error('Error loading fixed expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMonthlyTotal = async () => {
    try {
      const data = await fixedExpensesAPI.getMonthlyTotal()
      setMonthlyTotal(data)
    } catch (error) {
      console.error('Error loading monthly total:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await fixedExpensesAPI.create(
        formData.name,
        parseFloat(formData.amount),
        formData.category,
        formData.recurring,
        formData.day_of_month ? parseInt(formData.day_of_month) : undefined
      )
      setShowModal(false)
      setFormData({ name: '', amount: '', category: '', recurring: 'monthly', day_of_month: '' })
      await loadExpenses()
      await loadMonthlyTotal()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error creating fixed expense')
    }
  }

  const handleDelete = async (expenseId: number) => {
    if (confirm('Are you sure you want to delete this fixed expense?')) {
      try {
        await fixedExpensesAPI.delete(expenseId)
        await loadExpenses()
        await loadMonthlyTotal()
      } catch (error) {
        alert('Error deleting fixed expense')
      }
    }
  }

  const openEditModal = (expense: any) => {
    setSelectedExpense(expense)
    setFormData({
      name: expense.name,
      amount: expense.amount.toString(),
      category: expense.category,
      recurring: expense.recurring,
      day_of_month: expense.day_of_month ? expense.day_of_month.toString() : '',
    })
    setShowEditModal(true)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedExpense) return

    try {
      await fixedExpensesAPI.update(selectedExpense.id, {
        name: formData.name,
        amount: Number.parseFloat(formData.amount),
        category: formData.category,
        recurring: formData.recurring,
        day_of_month: formData.day_of_month ? Number.parseInt(formData.day_of_month) : undefined,
      })
      setShowEditModal(false)
      setSelectedExpense(null)
      setFormData({ name: '', amount: '', category: '', recurring: 'monthly', day_of_month: '' })
      await loadExpenses()
      await loadMonthlyTotal()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error updating fixed expense')
    }
  }

  const handleMarkAsPaid = async (expenseId: number) => {
    try {
      await fixedExpensesAPI.markAsPaid(expenseId)
      await loadExpenses()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error marking expense as paid')
    }
  }

  const isPaidThisMonth = (expense: any) => {
    if (!expense.last_paid_date) return false
    const lastPaid = new Date(expense.last_paid_date)
    const now = new Date()
    return lastPaid.getMonth() === now.getMonth() && lastPaid.getFullYear() === now.getFullYear()
  }

  const getDaysTillDue = (expense: any) => {
    if (!expense.day_of_month || expense.recurring !== 'monthly') return null
    
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const today = now.getDate()
    
    let dueDate = new Date(currentYear, currentMonth, expense.day_of_month)
    
    // If due date has passed this month, check next month
    if (expense.day_of_month < today) {
      dueDate = new Date(currentYear, currentMonth + 1, expense.day_of_month)
    }
    
    const diffTime = dueDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays
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
          <h1 className="text-3xl font-bold text-gray-900">Fixed Expenses</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            + Add Fixed Expense
          </button>
        </div>

        {monthlyTotal && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-gray-700 text-lg font-semibold mb-2">Monthly Fixed Expenses Total</h2>
            <p className="text-3xl font-bold text-primary-600">
              ${monthlyTotal.total_monthly.toFixed(2)} MXN
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {monthlyTotal.expenses} active expense{monthlyTotal.expenses !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Add Expense Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Add Fixed Expense</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expense Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400"
                    placeholder="e.g., Rent, Netflix, Internet"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (MXN)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400"
                    placeholder="1000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recurring
                  </label>
                  <select
                    value={formData.recurring}
                    onChange={(e) => setFormData({ ...formData, recurring: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  >
                    {RECURRING_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                {formData.recurring === 'monthly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Day of Month (1-31)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.day_of_month || ''}
                      onChange={(e) => setFormData({ ...formData, day_of_month: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400"
                      placeholder="15 (e.g., Rent on 15th)"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setFormData({ name: '', amount: '', category: '', recurring: 'monthly', day_of_month: '' })
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

        {/* Edit Expense Modal */}
        {showEditModal && selectedExpense && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Edit Fixed Expense</h2>
              <form onSubmit={handleEdit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expense Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400"
                    placeholder="e.g., Rent, Netflix, Internet"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (MXN)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400"
                    placeholder="1000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recurring
                  </label>
                  <select
                    value={formData.recurring}
                    onChange={(e) => setFormData({ ...formData, recurring: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  >
                    {RECURRING_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                {formData.recurring === 'monthly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Day of Month (1-31)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.day_of_month || ''}
                      onChange={(e) => setFormData({ ...formData, day_of_month: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400"
                      placeholder="15 (e.g., Rent on 15th)"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false)
                      setSelectedExpense(null)
                      setFormData({ name: '', amount: '', category: '', recurring: 'monthly', day_of_month: '' })
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

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recurring
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No fixed expenses added yet. Add your first fixed expense to track recurring costs.
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => {
                  const paid = isPaidThisMonth(expense)
                  const daysTillDue = getDaysTillDue(expense)
                  let statusColor = 'text-gray-500'
                  let statusText = 'N/A'
                  
                  if (paid) {
                    statusColor = 'text-green-600'
                    statusText = '✓ Paid'
                  } else if (daysTillDue !== null) {
                    if (daysTillDue <= 0) {
                      statusColor = 'text-red-600'
                      statusText = '⚠️ Overdue'
                    } else if (daysTillDue <= 7) {
                      statusColor = 'text-yellow-600'
                      statusText = `⏰ Due in ${daysTillDue} day${daysTillDue !== 1 ? 's' : ''}`
                    } else {
                      statusColor = 'text-gray-500'
                      statusText = `Due in ${daysTillDue} days`
                    }
                  }
                  
                  return (
                    <tr key={expense.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {expense.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${expense.amount.toFixed(2)} MXN
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {expense.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {expense.recurring.charAt(0).toUpperCase() + expense.recurring.slice(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {expense.recurring === 'monthly' && expense.day_of_month 
                          ? `Day ${expense.day_of_month}` 
                          : '-'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${statusColor}`}>
                        {statusText}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        {!paid && (
                          <button
                            onClick={() => handleMarkAsPaid(expense.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Mark as paid"
                          >
                            ✓ Paid
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(expense)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}

