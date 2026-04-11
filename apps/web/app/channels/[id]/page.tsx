import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createApiClient } from '../../../lib/api'
import { DeleteChannelButton } from './DeleteChannelButton'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Props {
  params: { id: string }
}

export default async function ChannelPage({ params }: Props) {
  const cookieStore = cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) {
    redirect('/auth/login')
  }

  const api = createApiClient(token, cookieStore.get('refresh_token')?.value)

  try {
    const [channel, events] = await Promise.all([
      api.getChannel(params.id),
      api.getEvents(params.id),
    ])

    return (
      <main className="p-6 max-w-4xl mx-auto">
        <div className="mb-2">
          <Link href="/" className="text-sm text-[#4b4b4b] hover:text-[#000000] transition-uber">
            ← Back to channels
          </Link>
        </div>

        <Card className="mb-6 shadow-card">
          <CardHeader className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <CardTitle className="text-2xl font-bold tracking-tight text-[#000000]">
                  {channel.name}
                </CardTitle>
                <CardDescription className="font-mono text-xs mt-2 text-[#4b4b4b]">
                  {channel.webhookUrl}
                </CardDescription>
              </div>
              <DeleteChannelButton id={channel.id} name={channel.name} />
            </div>
          </CardHeader>
        </Card>

        <div className="space-y-4">
          <h2 className="text-lg font-bold tracking-tight text-[#000000]">
            Events <Badge variant="default">{events.data.length}</Badge>
          </h2>

          <div className="space-y-3">
            {events.data.length === 0 ? (
              <Card className="border-dashed border-[#afafaf]">
                <CardContent className="p-8 text-center">
                  <p className="text-[#4b4b4b]">No events received yet.</p>
                  <p className="text-sm text-[#afafaf] mt-1">
                    Send a webhook to the URL above to see events here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              events.data.map((event) => (
                <Card key={event.id} className="hover:bg-[#f3f3f3] transition-uber">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={event.verified ? 'inverted' : 'secondary'}
                        >
                          {event.verified ? 'Verified' : 'Unverified'}
                        </Badge>
                        <span className="text-sm font-medium text-[#000000]">
                          {event.status}
                        </span>
                      </div>
                      <time className="text-xs text-[#afafaf]">
                        {new Date(event.createdAt).toLocaleString()}
                      </time>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    )
  } catch (e) {
    notFound()
  }
}
