import { NextRequest, NextResponse } from 'next/server'
import { getHospitalBackendUrl } from '@/lib/server/getHospitalBackendUrl'

// Health check
export async function GET(req: NextRequest) {
  const email = req.headers.get('x-user-email')
  const hospitalId = req.headers.get('x-hospital-id')

  if (!email || !email.trim()) {
    return NextResponse.json({ error: 'Unauthorized: User email required' }, { status: 401 })
  }

  const BACKEND_URL = await getHospitalBackendUrl(hospitalId ?? '')

  try {
    const res = await fetch(`${BACKEND_URL}/health`, { cache: 'no-store', signal: AbortSignal.timeout(10_000) })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { status: 'offline', error: 'Backend server not running' },
      { status: 503 }
    )
  }
}

// Extraction request
export async function POST(req: NextRequest) {
  const email = req.headers.get('x-user-email')
  const hospitalId = req.headers.get('x-hospital-id')

  if (!email || !email.trim()) {
    return NextResponse.json({ error: 'Unauthorized: User email required' }, { status: 401 })
  }

  const BACKEND_URL = await getHospitalBackendUrl(hospitalId ?? '')

  try {
    const body = await req.json()

    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid text field' },
        { status: 400 }
      )
    }

    const res = await fetch(`${BACKEND_URL}/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: body.text,
        document_type: body.document_type ?? 'auto',
      }),
      // 180 second timeout — GTX 1650 may be slow on long documents
      signal: AbortSignal.timeout(180_000),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.includes('abort') || message.includes('timeout')) {
      return NextResponse.json(
        { error: 'Inference timed out — document may be too long' },
        { status: 504 }
      )
    }
    return NextResponse.json(
      { error: `Backend unreachable: ${message}` },
      { status: 503 }
    )
  }
}
