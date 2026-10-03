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
    const formData = await req.formData()

    const res = await fetch(`${BACKEND_URL}/upload`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(60_000),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.includes('abort') || message.includes('timeout')) {
      return NextResponse.json(
        { error: 'Upload timed out' },
        { status: 504 }
      )
    }
    return NextResponse.json(
      { error: `Upload backend unreachable: ${message}` },
      { status: 503 }
    )
  }
}
