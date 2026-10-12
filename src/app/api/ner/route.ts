import { NextRequest, NextResponse } from 'next/server'
import { getHospitalBackendUrl } from '@/lib/server/getHospitalBackendUrl'

export async function POST(req: NextRequest) {
  const hospitalId = req.headers.get('x-hospital-id') ?? ''
  const BACKEND_URL = await getHospitalBackendUrl(hospitalId)

  try {
    const body = await req.json()
    if (!body.text) {
      return NextResponse.json({ error: 'text field required' }, { status: 400 })
    }
    const res = await fetch(`${BACKEND_URL}/ner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: body.text }),
      signal: AbortSignal.timeout(30000),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `NER backend unreachable: ${message}` },
      { status: 503 }
    )
  }
}
