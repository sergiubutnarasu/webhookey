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
        const response = NextResponse.next()
        const setCookie = res.headers.getSetCookie()

        // Forward cookies from refresh response
        setCookie.forEach((cookie) => {
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
