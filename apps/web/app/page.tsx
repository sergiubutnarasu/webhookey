import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createApiClient } from '../lib/api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function Home() {
  const cookieStore = cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) {
    redirect('/auth/login')
  }

  const api = createApiClient(token, cookieStore.get('refresh_token')?.value)
  const channels = await api.getChannels()

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Channels</h1>
          <Badge variant="secondary">{channels.length}</Badge>
        </div>
        <Link href="/channels/new" className="inline-flex">
          <Button>New Channel</Button>
        </Link>
      </div>

      <div className="space-y-4">
        {channels.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No channels yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first channel to receive webhooks.
              </p>
            </CardContent>
          </Card>
        ) : (
          channels.map((channel) => (
            <Link key={channel.id} href={`/channels/${channel.id}`} className="block">
              <Card className="hover:bg-accent/30 transition-pastel cursor-pointer">
                <CardHeader className="p-5">
                  <CardTitle className="text-lg text-foreground">
                    {channel.name}
                  </CardTitle>
                  <CardDescription className="font-mono text-xs">
                    {channel.webhookUrl}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))
      </div>
    </main>
  )
}
