'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createApiClient } from '../../../lib/api'

interface Props {
  id: string
  name: string
}

export function DeleteChannelButton({ id, name }: Props) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Delete channel "${name}" and all its events?`)) {
      return
    }

    setIsDeleting(true)
    try {
      const api = createApiClient()
      await api.deleteChannel(id)
      router.push('/')
      router.refresh()
    } catch (e: any) {
      alert(e.message || 'Failed to delete channel')
      setIsDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isDeleting ? 'Deleting...' : 'Delete Channel'}
    </button>
  )
}
