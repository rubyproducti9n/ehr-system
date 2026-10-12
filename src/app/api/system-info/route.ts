import { NextRequest, NextResponse } from 'next/server'
import { getHospitalBackendUrl } from '@/lib/server/getHospitalBackendUrl'

export async function GET(req: NextRequest) {
  const hospitalId = req.headers.get('x-hospital-id')
  const BACKEND_URL = await getHospitalBackendUrl(hospitalId ?? '')

  try {
    const res = await fetch(`${BACKEND_URL}/system-info`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
      headers: {
        Accept: 'application/json',
      },
    })
    if (!res.ok) throw new Error(`Backend returned ${res.status}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      {
        default_documents_path: null,
        username: null,
        platform: 'windows',
        error: 'Backend offline',
        hardware: {
          cpu_name: null,
          cpu_cores: null,
          is_cpu_supported: false,
          total_ram_gb: null,
          avail_ram_gb: null,
          is_ram_supported: false,
          gpu_detected: false,
          gpu_name: null,
          gpu_vram_gb: null,
          is_vram_supported: false,
          has_local_model: false,
          is_supported: false,
          is_ready: false,
          missing_requirements: ['Local AI service is offline'],
          recommendation_reason: 'Local AI service is offline.',
        },
      },
      { status: 503 }
    )
  }
}
