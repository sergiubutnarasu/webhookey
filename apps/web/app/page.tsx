import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createApiClient } from '../lib/api'
import Link from 'next/link'

export default async function Home() {
  const cookieStore = cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) {
    redirect('/auth/login')
  }

  const api = createApiClient(token, cookieStore.get('refresh_token')?.value)
  const channels = await api.getChannels()

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Channels</h1>
      <Link
        href="/channels/new"
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4 inline-block"
      >
        New Channel
      </Link>
      <div className="space-y-2">
        {channels.map((channel) => (
          <div key={channel.id} className="border p-4 rounded">
            <Link href={`/channels/${channel.id}`} className="font-medium text-blue-600">
              {channel.name}
            </Link>
            <p className="text-sm text-gray-500">{channel.webhookUrl}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
