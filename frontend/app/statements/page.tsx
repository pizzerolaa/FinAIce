'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { statementsAPI } from '@/lib/api'
import Layout from '@/components/Layout'
import { format } from 'date-fns'

export default function StatementsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [statements, setStatements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      loadStatements()
    }
  }, [user])

  const loadStatements = async () => {
    try {
      const data = await statementsAPI.getAll()
      setStatements(data)
    } catch (error) {
      console.error('Error loading statements:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.pdf')) {
      setUploadError('Only PDF files are supported')
      return
    }

    setUploading(true)
    setUploadError('')

    try {
      await statementsAPI.upload(file)
      await loadStatements()
      alert('Statement uploaded and processed successfully!')
    } catch (error: any) {
      setUploadError(error.response?.data?.detail || 'Error uploading file')
    } finally {
      setUploading(false)
      // Reset input
      e.target.value = ''
    }
  }

  const handleExportCSV = async (statementId: number, filename: string) => {
    try {
      const data = await statementsAPI.exportCSV(statementId)
      const blob = new Blob([data.content], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = data.filename || `${filename.replace('.pdf', '')}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting CSV:', error)
      alert('Error exporting CSV')
    }
  }

  const handleDelete = async (statementId: number, filename: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${filename}" y todas sus transacciones?`)) {
      return
    }

    try {
      await statementsAPI.delete(statementId)
      await loadStatements()
      alert('Statement eliminado correctamente')
    } catch (error: any) {
      console.error('Error deleting statement:', error)
      alert(error.response?.data?.detail || 'Error al eliminar statement')
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

  return (
    <Layout>
      <div className="px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Bank Statements</h1>
          <label className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 cursor-pointer">
            {uploading ? 'Uploading...' : 'Upload PDF'}
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        {uploadError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {uploadError}
          </div>
        )}

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Filename
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uploaded
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
              {statements.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    No statements uploaded yet. Upload your first PDF to get started.
                  </td>
                </tr>
              ) : (
                statements.map((statement) => (
                  <tr key={statement.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {statement.filename}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(statement.uploaded_at), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          statement.processed
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {statement.processed ? 'Processed' : 'Processing'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-3">
                        {statement.processed && (
                          <button
                            onClick={() => handleExportCSV(statement.id, statement.filename)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            Export CSV
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(statement.id, statement.filename)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}

