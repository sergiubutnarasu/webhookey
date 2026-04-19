'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createApiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface Props {
  id: string
}

export function DisconnectAllButton({ id }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const handleDisconnect = async () => {
    setIsLoading(true)
    try {
      const api = createApiClient()
      await api.disconnectAll(id)
      setIsOpen(false)
      router.refresh()
    } catch (e: any) {
      alert(e.message || 'Failed to disconnect devices')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          Disconnect all
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disconnect all devices?</AlertDialogTitle>
          <AlertDialogDescription>
            This will close all active SSE connections to this channel. Devices will need to reconnect.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDisconnect} disabled={isLoading}>
            {isLoading ? 'Disconnecting…' : 'Disconnect all'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
