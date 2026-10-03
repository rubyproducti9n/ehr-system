import { NextRequest, NextResponse } from 'next/server'
import { isDeveloper } from '@/lib/devAccess'

const BACKEND_URL = 'http://127.0.0.1:8765'

export async function GET(req: NextRequest) {
  const email = req.headers.get('x-user-email')

  if (!email || !email.trim()) {
    return NextResponse.json({ error: 'Unauthorized: User email required' }, { status: 401 })
  }

  try {
    const res = await fetch(`${BACKEND_URL}/gemini/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `Gemini status backend unreachable: ${message}` },
      { status: 503 }
    )
  }
}
