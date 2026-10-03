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

    if (!body.image_base64 || typeof body.image_base64 !== 'string') {
      return NextResponse.json(
        { error: 'Missing image_base64 field' },
        { status: 400 }
      )
    }

    const res = await fetch(`${BACKEND_URL}/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_base64: body.image_base64,
        filename: body.filename ?? 'unknown',
      }),
      // OCR is fast, but allow 2 min to cover first-run model download
      signal: AbortSignal.timeout(120_000),  // 2 min — covers first-run model download
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.includes('abort') || message.includes('timeout')) {
      return NextResponse.json(
        { error: 'OCR timed out' },
        { status: 504 }
      )
    }
    return NextResponse.json(
      { error: `OCR backend unreachable: ${message}` },
      { status: 503 }
    )
  }
}
