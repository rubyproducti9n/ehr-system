import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const session = request.cookies.get('__session')?.value
  const { pathname } = request.nextUrl

  const isLoginPage = pathname === '/login'
  const isPublicStatic =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico')

  if (isPublicStatic) {
    return NextResponse.next()
  }

  // If unauthenticated and trying to access dashboard/protected route
  if (!session && !isLoginPage) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // If authenticated and trying to access /login
  if (session && isLoginPage) {
    const dashboardUrl = new URL('/', request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
