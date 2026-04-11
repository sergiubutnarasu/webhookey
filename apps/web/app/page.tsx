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
          <h1 className="text-2xl font-bold tracking-tight text-[#000000]">Channels</h1>
          <Badge variant="default">{channels.length}</Badge>
        </div>
        <Button asChild>
          <Link href="/channels/new">New Channel</Link>
        </Button>
      </div>

      <div className="space-y-4">
        {channels.length === 0 ? (
          <Card className="border-dashed border-[#afafaf]">
            <CardContent className="p-8 text-center">
              <p className="text-[#4b4b4b]">No channels yet.</p>
              <p className="text-sm text-[#afafaf] mt-1">
                Create your first channel to receive webhooks.
              </p>
            </CardContent>
          </Card>
        ) : (
          channels.map((channel) => (
            <Card key={channel.id} className="hover:bg-[#f3f3f3] transition-uber cursor-pointer">
              <CardHeader className="p-5">
                <CardTitle className="text-lg">
                  <Link
                    href={`/channels/${channel.id}`}
                    className="text-[#000000] hover:text-[#4b4b4b] transition-uber"
                  >
                    {channel.name}
                  </Link>
                </CardTitle>
                <CardDescription className="font-mono text-xs">
                  {channel.webhookUrl}
                </CardDescription>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </main>
  )
}
