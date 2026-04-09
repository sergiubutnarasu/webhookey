import { Channel, WebhookEvent, PaginatedResponse } from '@webhookey/types'

const API_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export interface ApiClient {
  getChannels(): Promise<Channel[]>
  getChannel(id: string): Promise<Channel>
  createChannel(name: string, generateSecret?: boolean): Promise<Channel & { secret: string }>
  deleteChannel(id: string): Promise<void>
  getEvents(channelId: string, page?: number, limit?: number): Promise<PaginatedResponse<WebhookEvent>>
  login(email: string, password: string): Promise<{ access_token: string; refresh_token: string }>
  signup(email: string, password: string, name: string): Promise<{ access_token: string; refresh_token: string }>
  activateDevice(userCode: string): Promise<{ approved: boolean }>
}

export function createApiClient(token?: string): ApiClient {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const fetchJson = async (path: string, options: RequestInit = {}) => {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
      credentials: 'include',
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(error.message || error.error || 'Request failed')
    }

    return res.json()
  }

  return {
    getChannels: () => fetchJson('/channels'),
    getChannel: (id) => fetchJson(`/channels/${id}`),
    createChannel: (name, generateSecret = true) =>
      fetchJson('/channels', {
        method: 'POST',
        body: JSON.stringify({ name, generateSecret }),
      }),
    deleteChannel: (id) =>
      fetchJson(`/channels/${id}`, { method: 'DELETE' }),
    getEvents: (channelId, page = 1, limit = 20) =>
      fetchJson(`/channels/${channelId}/events?page=${page}&limit=${limit}`),
    login: (email, password) =>
      fetchJson('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    signup: (email, password, name) =>
      fetchJson('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      }),
    activateDevice: (userCode) =>
      fetchJson('/auth/activate', {
        method: 'POST',
        body: JSON.stringify({ user_code: userCode }),
      }),
  }
}
