import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { authConfirmSchema, sanitizeNextPath } from '@/lib/auth/validation'
import { createClient } from '@/lib/supabase/server'

// Creating a handler to a GET request to route /auth/confirm
export async function GET(request: NextRequest) {
  const parsed = authConfirmSchema.safeParse({
    token_hash: request.nextUrl.searchParams.get('token_hash') ?? undefined,
    type: request.nextUrl.searchParams.get('type') ?? undefined,
    next: request.nextUrl.searchParams.get('next') ?? undefined,
  })
  const token_hash = parsed.success ? parsed.data.token_hash ?? null : null
  const type = (parsed.success ? parsed.data.type ?? null : null) as EmailOtpType | null
  const nextPath = sanitizeNextPath(parsed.success ? parsed.data.next : null, '/dashboard')

  // Create redirect link without the secret token
  const redirectTo = new URL(nextPath, request.url)
  redirectTo.searchParams.delete('token_hash')
  redirectTo.searchParams.delete('type')

  if (token_hash && type) {
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    if (!error) {
      redirectTo.searchParams.delete('next')
      return NextResponse.redirect(redirectTo)
    }
  }

  // return the user to an error page with some instructions
  redirectTo.pathname = '/login'
  redirectTo.search = ''
  redirectTo.searchParams.set('error', 'auth_confirm')
  return NextResponse.redirect(redirectTo)
}
