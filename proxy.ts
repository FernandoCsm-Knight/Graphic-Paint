import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'
import { sanitizeNextPath } from '@/lib/auth/validation'

const PROTECTED_PREFIXES = ['/dashboard', '/paint', '/graph', '/automaton']
const AUTH_ONLY_PREFIXES = ['/login', '/register']

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export async function proxy(request: NextRequest) {
  const {
    nextUrl: { pathname },
  } = request

  const { response, user } = await updateSession(request)
  response.headers.set('Cache-Control', 'private, no-store, max-age=0')

  if (!user && matchesPrefix(pathname, PROTECTED_PREFIXES)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('error', 'auth_required')
    redirectUrl.searchParams.set(
      'next',
      sanitizeNextPath(`${request.nextUrl.pathname}${request.nextUrl.search}`, '/dashboard')
    )
    return NextResponse.redirect(redirectUrl)
  }

  if (user && matchesPrefix(pathname, AUTH_ONLY_PREFIXES)) {
    const safeNextPath = sanitizeNextPath(request.nextUrl.searchParams.get('next'), '/dashboard')
    return NextResponse.redirect(new URL(safeNextPath, request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
    '/paint/:path+',
    '/graph/:path+',
    '/automaton/:path+',
    '/login',
    '/register',
  ],
}
