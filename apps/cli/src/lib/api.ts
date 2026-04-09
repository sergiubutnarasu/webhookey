import {
  getApiUrl,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  clearTokens,
} from './config'

interface ErrorResponse {
  error?: string
  message?: string
}

interface TokenResponse {
  access_token: string
  refresh_token: string
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const apiUrl = getApiUrl()
  let token = await getAccessToken()

  const doRequest = async (accessToken: string | null): Promise<Response> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (options.headers) {
      const otherHeaders = options.headers as Record<string, string>
      Object.assign(headers, otherHeaders)
    }

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    return fetch(`${apiUrl}${path}`, {
      ...options,
      headers,
    })
  }

  let res = await doRequest(token)

  // Handle 401 - try refresh
  if (res.status === 401) {
    const refresh = await getRefreshToken()
    if (refresh) {
      const refreshRes = await fetch(`${apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: refresh }),
      })

      if (refreshRes.ok) {
        const tokens = await refreshRes.json() as TokenResponse
        await setAccessToken(tokens.access_token)
        await setRefreshToken(tokens.refresh_token)
        res = await doRequest(tokens.access_token)
      } else {
        await clearTokens()
        throw new Error('Session expired — run webhookey login')
      }
    } else {
      throw new Error('Session expired — run webhookey login')
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' })) as ErrorResponse
    throw new Error(error.error || error.message || 'Request failed')
  }

  return res.json() as Promise<T>
}

export const api = {
  deviceCode: () =>
    request<{ device_code: string; user_code: string; verification_uri: string; interval: number }>(
      '/auth/device',
      { method: 'POST' },
    ),
  token: (deviceCode: string) =>
    request<{ error?: string; access_token?: string; refresh_token?: string }>('/auth/token', {
      method: 'POST',
      body: JSON.stringify({ device_code: deviceCode }),
    }),
  logout: (refreshToken: string) =>
    request<unknown>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),
  me: () =>
    request<{ id: string; email: string; name: string }>('/auth/me'),
  getChannels: () =>
    request<Array<{ id: string; slug: string; name: string; webhookUrl: string; createdAt: string }>>(
      '/channels',
    ),
  createChannel: (name: string, generateSecret = true) =>
    request<{ id: string; slug: string; name: string; webhookUrl: string; secret?: string }>(
      '/channels',
      {
        method: 'POST',
        body: JSON.stringify({ name, generateSecret }),
      },
    ),
  deleteChannel: (id: string) =>
    request<{ success: boolean }>(`/channels/${id}`, {
      method: 'DELETE',
    }),
}
