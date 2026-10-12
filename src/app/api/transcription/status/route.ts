import { NextRequest, NextResponse } from 'next/server'
import { getHospitalBackendUrl } from '@/lib/server/getHospitalBackendUrl'

export async function GET(req: NextRequest) {
  const hospitalId = req.headers.get('x-hospital-id') ?? ''
  const BACKEND_URL = await getHospitalBackendUrl(hospitalId)
  try {
    const res = await fetch(`${BACKEND_URL}/transcription/status`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { status: 'offline', error: 'Backend unreachable' },
      { status: 503 }
    )
  }
}
