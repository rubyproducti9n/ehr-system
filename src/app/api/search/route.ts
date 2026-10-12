import { NextRequest, NextResponse } from 'next/server'
import { getHospitalBackendUrl } from '@/lib/server/getHospitalBackendUrl'

export async function POST(req: NextRequest) {
  const hospitalId = req.headers.get('x-hospital-id') ?? ''
  const userEmail = req.headers.get('x-user-email') ?? ''

  if (!hospitalId || !userEmail) {
    return NextResponse.json(
      { error: 'Missing x-hospital-id or x-user-email header' },
      { status: 400 }
    )
  }

  let BACKEND_URL: string
  try {
    BACKEND_URL = await getHospitalBackendUrl(hospitalId)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[search] getHospitalBackendUrl failed:', message)
    return NextResponse.json(
      { error: `Server configuration error: ${message}` },
      { status: 500 }
    )
  }

  try {
    const body = await req.json()
    const res = await fetch(`${BACKEND_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: body.query,
        hospital_id: hospitalId,
      }),
      signal: AbortSignal.timeout(60000),
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[search] backend fetch failed:', message)
    if (message.includes('abort') || message.includes('timeout')) {
      return NextResponse.json({ error: 'Search timed out' }, { status: 504 })
    }
    return NextResponse.json(
      { error: 'AI backend unreachable' },
      { status: 503 }
    )
  }
}
