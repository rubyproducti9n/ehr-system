import { NextRequest, NextResponse } from 'next/server'
import { getHospitalBackendUrl } from '@/lib/server/getHospitalBackendUrl'

export async function POST(req: NextRequest) {
  const email = req.headers.get('x-user-email')
  const hospitalId = req.headers.get('x-hospital-id')

  if (!email || !email.trim()) {
    return NextResponse.json({ error: 'Unauthorized: User email required' }, { status: 401 })
  }

  const BACKEND_URL = await getHospitalBackendUrl(hospitalId ?? '')

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
      signal: AbortSignal.timeout(120_000),
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
