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
