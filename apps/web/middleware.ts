import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const config = {
  matcher: ['/((?!auth/login|auth/signup|auth/activate|_next|favicon.ico).*)'],
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

export async function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('access_token')?.value
  const refreshToken = request.cookies.get('refresh_token')?.value

  // If we have a valid (non-expired) access token, let the request through
  if (accessToken && !isTokenExpired(accessToken)) {
    return NextResponse.next()
  }

  // Try to refresh if we have a refresh token
  if (refreshToken) {
    try {
      const apiUrl = process.env.INTERNAL_API_URL || 'http://localhost:3000'
      const res = await fetch(`${apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          Cookie: `refresh_token=${refreshToken}`,
        },
      })

      if (res.ok) {
        const setCookies = res.headers.getSetCookie()

        // Extract new access_token so server components see it in this request
        let newAccessToken: string | null = null
        for (const cookie of setCookies) {
          const match = cookie.match(/^access_token=([^;]+)/)
          if (match) {
            newAccessToken = match[1]
            break
          }
        }

        // Update the incoming request's Cookie header so cookies() in server
        // components returns the refreshed token, not the stale expired one
        const requestHeaders = new Headers(request.headers)
        if (newAccessToken) {
          const existing = requestHeaders.get('cookie') ?? ''
          const updated = existing
            .split('; ')
            .filter((c) => !c.startsWith('access_token='))
            .concat(`access_token=${newAccessToken}`)
            .join('; ')
          requestHeaders.set('cookie', updated)
        }

        const response = NextResponse.next({ request: { headers: requestHeaders } })

        // Forward Set-Cookie to the browser so future requests use the new token
        setCookies.forEach((cookie) => {
          response.headers.append('Set-Cookie', cookie)
        })

        return response
      }

      if (res.status === 403) {
        const returnTo = encodeURIComponent(request.nextUrl.pathname)
        return NextResponse.redirect(new URL(`/auth/login?returnTo=${returnTo}`, request.url))
      }
    } catch (e) {
      console.error('Refresh failed:', e)
    }
  }

  // Redirect to login with returnTo
  const returnTo = encodeURIComponent(request.nextUrl.pathname)
  return NextResponse.redirect(new URL(`/auth/login?returnTo=${returnTo}`, request.url))
}
