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

    const res = await fetch(`${BACKEND_URL}/configure-storage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `Configure storage backend unreachable: ${message}` },
      { status: 503 }
    )
  }
}
