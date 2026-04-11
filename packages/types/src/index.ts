export interface Channel {
  id: string
  slug: string
  name: string
  webhookUrl: string
  hasSecret: boolean
  createdAt: Date
}

export interface WebhookEvent {
  id: string
  verified: boolean
  status: 'pending' | 'delivered' | 'failed'
  createdAt: Date
}

export interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
}

export interface SseEvent {
  verified: boolean
  payload: unknown
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}
