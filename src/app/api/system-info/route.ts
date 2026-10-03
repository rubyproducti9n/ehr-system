import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch('http://127.0.0.1:8765/system-info', {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
      headers: {
        Accept: 'application/json',
        Origin: 'http://localhost:3000',
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
