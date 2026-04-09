'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ActivatePage() {
  const router = useRouter()
  const [userCode, setUserCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [checkingSession, setCheckingSession] = useState(true)

  // Check for valid session on load
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/me')
        if (!res.ok) {
          router.push('/auth/login?returnTo=/auth/activate')
          return
        }
      } catch (e) {
        router.push('/auth/login?returnTo=/auth/activate')
        return
      }
      setCheckingSession(false)
    }
    checkSession()
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_code: userCode }),
      })

      const data = await res.json()

      if (res.ok && data.approved) {
        setSuccess('Device activated successfully!')
        setUserCode('')
      } else {
        setError(data.error || 'Failed to activate device')
      }
    } catch (e) {
      setError('An error occurred')
    }
  }

  if (checkingSession) {
    return (
      <main className="p-8 max-w-md mx-auto">
        <p>Checking session...</p>
      </main>
    )
  }

  return (
    <main className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Activate Device</h1>
      <p className="text-gray-600 mb-4">
        Enter the device code shown on your CLI to approve it.
      </p>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {success && <p className="text-green-500 mb-4">{success}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Device Code</label>
          <input
            type="text"
            value={userCode}
            onChange={(e) => setUserCode(e.target.value.toUpperCase())}
            className="border p-2 w-full rounded font-mono"
            placeholder="XXXX-XXXX"
            required
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded w-full"
        >
          Activate
        </button>
      </form>
    </main>
  )
}
