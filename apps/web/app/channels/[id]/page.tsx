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
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-pastel">
            ← Back to channels
          </Link>
        </div>

        <Card className="mb-6 shadow-soft">
          <CardHeader className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <CardTitle className="text-2xl font-semibold tracking-tight">
                  {channel.name}
                </CardTitle>
                <CardDescription className="font-mono text-xs mt-2">
                  {channel.webhookUrl}
                </CardDescription>
              </div>
              <DeleteChannelButton id={channel.id} name={channel.name} />
            </div>
          </CardHeader>
        </Card>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Events <Badge variant="secondary">{events.data.length}</Badge>
          </h2>

          <div className="space-y-3">
            {events.data.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No events received yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Send a webhook to the URL above to see events here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              events.data.map((event) => (
                <Card key={event.id} className="hover:bg-accent/30 transition-pastel">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={event.verified ? 'default' : 'outline'}
                          className={event.verified ? 'bg-emerald-500/80 hover:bg-emerald-500/70' : ''}
                        >
                          {event.verified ? 'Verified' : 'Unverified'}
                        </Badge>
                        <span className="text-sm font-medium">
                          {event.status}
                        </span>
                      </div>
                      <time className="text-xs text-muted-foreground">
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
