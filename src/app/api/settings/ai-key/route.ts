import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = 'http://127.0.0.1:8765'

export async function POST(req: NextRequest) {
  const email = req.headers.get('x-user-email')

  if (!email || !email.trim()) {
    return NextResponse.json({ error: 'Unauthorized: User email required' }, { status: 401 })
  }

  try {
    const body = await req.json()

    if (!body.api_key || typeof body.api_key !== 'string') {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 })
    }

    const res = await fetch(`${BACKEND_URL}/gemini/configure-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: body.api_key.trim() }),
      signal: AbortSignal.timeout(10_000),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `AI service configuration unreachable: ${message}` },
      { status: 503 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  const email = req.headers.get('x-user-email')

  if (!email || !email.trim()) {
    return NextResponse.json({ error: 'Unauthorized: User email required' }, { status: 401 })
  }

  try {
    const res = await fetch(`${BACKEND_URL}/gemini/clear-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `AI service clear key unreachable: ${message}` },
      { status: 503 }
    )
  }
}
