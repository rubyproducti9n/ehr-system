import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/', '/login', '/register/hospital', '/register/staff']
const AUTH_ONLY_PATHS = ['/dev', '/settings']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const session = req.cookies.get('__session')?.value

  const isPublicPath = PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/register/')
  const isApiPath = pathname.startsWith('/api')

  if (isApiPath) return NextResponse.next()

  if (!session) {
    if (!isPublicPath) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return NextResponse.next()
  }

  // If authenticated user visits login or register pages, redirect to dashboard
  if (session && (pathname === '/login' || pathname.startsWith('/register/'))) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
