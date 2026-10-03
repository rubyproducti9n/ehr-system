import { NextRequest, NextResponse } from 'next/server'
import { isDeveloper } from '@/lib/devAccess'

const BACKEND_URL = 'http://127.0.0.1:8765'

export async function POST(req: NextRequest) {
  const email = req.headers.get('x-user-email')
  const role = req.headers.get('x-user-role')

  if (!isDeveloper(email, role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const body = await req.json()

    const res = await fetch(`${BACKEND_URL}/gemini/configure-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `Gemini configure-key backend unreachable: ${message}` },
      { status: 503 }
    )
  }
}
