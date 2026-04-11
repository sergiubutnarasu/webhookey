'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createApiClient } from 'lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function NewChannelPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const channel = await createApiClient().createChannel(name)
      router.push(`/channels/${channel.id}`)
    } catch (e: any) {
      setError(e.message || 'Failed to create channel')
      setIsLoading(false)
    }
  }

  return (
    <main className="p-6 max-w-md mx-auto">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-[#4b4b4b] hover:text-[#000000] transition-uber"
        >
          ← Back to channels
        </Link>
      </div>

      <Card className="shadow-card">
        <CardHeader className="p-6">
          <CardTitle className="text-xl font-bold tracking-tight text-[#000000]">
            New Channel
          </CardTitle>
          <CardDescription className="text-[#4b4b4b]">
            Create a new webhook channel to receive events.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setName(e.target.value)
                }
                placeholder="My Channel"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-[#000000]">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Channel'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
