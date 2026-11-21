import { type NextRequest, NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD
  if (!password) return NextResponse.next()

  const header = request.headers.get('authorization') ?? ''
  const [scheme, encoded] = header.split(' ')
  const supplied = scheme === 'Basic' && encoded ? atob(encoded).split(':').slice(1).join(':') : ''
  if (supplied === password) return NextResponse.next()

  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Pipeline"' },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|icon.svg).*)'],
}
