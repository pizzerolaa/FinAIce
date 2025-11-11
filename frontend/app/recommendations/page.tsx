'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { recommendationsAPI } from '@/lib/api'
import Layout from '@/components/Layout'

export default function RecommendationsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)
  const [simulationResult, setSimulationResult] = useState<any>(null)
  const [simulationForm, setSimulationForm] = useState({
    category: '',
    reduction_percent: '20',
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      loadRecommendations()
    }
  }, [user])

  const loadRecommendations = async () => {
    try {
      const data = await recommendationsAPI.getAll()
      setRecommendations(data)
    } catch (error) {
      console.error('Error loading recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!simulationForm.category) {
      alert('Please select a category')
      return
    }

    setSimulating(true)
    setSimulationResult(null)

    try {
      const result = await recommendationsAPI.simulate(
        simulationForm.category,
        parseFloat(simulationForm.reduction_percent)
      )
      setSimulationResult(result)
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error running simulation')
    } finally {
      setSimulating(false)
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 border-red-300 text-red-800'
      case 'medium':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800'
      default:
        return 'bg-blue-100 border-blue-300 text-blue-800'
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

  const categories = [
    'Food',
    'Transportation',
    'Payments/Recurring expenses',
    'Personal shopping',
    'Entertainment',
  ]

  return (
    <Layout>
      <div className="px-4 py-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Financial Recommendations</h1>

        {/* Recommendations */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Personalized Recommendations</h2>
          {recommendations.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              No recommendations available yet. Upload statements to get personalized insights.
            </div>
          ) : (
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-6 ${getImpactColor(rec.impact)}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">{rec.category}</h3>
                      <p className="mb-2">{rec.message}</p>
                      <div className="text-sm mt-2">
                        <p>Current Spending: ${rec.current_spending.toFixed(2)} MXN</p>
                        <p>Suggested Saving: ${rec.suggested_saving.toFixed(2)} MXN</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Savings Simulator */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Savings Simulator</h2>
          <p className="text-gray-600 mb-4">
            See how much you could save by reducing spending in a specific category.
          </p>

          <form onSubmit={handleSimulate} className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={simulationForm.category}
                  onChange={(e) =>
                    setSimulationForm({ ...simulationForm, category: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reduction Percentage
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={simulationForm.reduction_percent}
                  onChange={(e) =>
                    setSimulationForm({ ...simulationForm, reduction_percent: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={simulating}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {simulating ? 'Simulating...' : 'Run Simulation'}
            </button>
          </form>

          {simulationResult && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Simulation Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Category</p>
                  <p className="text-lg font-semibold">{simulationResult.category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Current Spending</p>
                  <p className="text-lg font-semibold">
                    ${simulationResult.current_spending.toFixed(2)} MXN
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Reduction</p>
                  <p className="text-lg font-semibold">{simulationResult.reduction_percent}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Potential Saving</p>
                  <p className="text-lg font-semibold text-green-600">
                    ${simulationResult.potential_saving.toFixed(2)} MXN
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Current Available</p>
                  <p className="text-lg font-semibold">
                    ${simulationResult.current_available.toFixed(2)} MXN
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Available After Reduction</p>
                  <p className="text-lg font-semibold text-green-600">
                    ${simulationResult.available_after_reduction.toFixed(2)} MXN
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600">Improvement</p>
                  <p className="text-2xl font-bold text-green-600">
                    +${simulationResult.improvement.toFixed(2)} MXN
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

