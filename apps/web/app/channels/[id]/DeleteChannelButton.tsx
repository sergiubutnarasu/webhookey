'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createApiClient } from '../../../lib/api'
import { Button } from '@/components/ui/button'

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
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={isDeleting}
    >
      {isDeleting ? 'Deleting...' : 'Delete'}
    </Button>
  )
}
