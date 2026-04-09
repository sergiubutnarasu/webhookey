import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { createApiClient } from '../../../lib/api'
import { DeleteChannelButton } from './DeleteChannelButton'

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
      <main className="p-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">{channel.name}</h1>
          <DeleteChannelButton id={channel.id} name={channel.name} />
        </div>
        <p className="text-sm text-gray-500 mb-4">{channel.webhookUrl}</p>
        <h2 className="text-xl font-semibold mb-2">Events</h2>
        <div className="space-y-2">
          {events.data.map((event) => (
            <div key={event.id} className="border p-4 rounded">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded text-sm ${
                    event.verified
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {event.verified ? 'Verified' : 'Unverified'}
                </span>
                <span className="text-sm text-gray-500">{event.status}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(event.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </main>
    )
  } catch (e) {
    notFound()
  }
}
