import { NextRequest, NextResponse } from 'next/server'
import { extractGeminiClinicalData, DEFAULT_GEMINI_MODEL } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  const email = req.headers.get('x-user-email')

  if (!email || !email.trim()) {
    return NextResponse.json({ error: 'Unauthorized: User email required' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { image_base64, mime_type, model } = body

    if (!image_base64) {
      return NextResponse.json(
        { success: false, error: 'image_base64 is required' },
        { status: 400 }
      )
    }

    const result = await extractGeminiClinicalData(
      image_base64,
      mime_type || 'image/jpeg',
      model || DEFAULT_GEMINI_MODEL
    )

    if (!result.success) {
      return NextResponse.json(result, { status: 200 })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.includes('abort') || message.includes('timeout')) {
      return NextResponse.json(
        { success: false, error: 'Gemini extraction timed out' },
        { status: 504 }
      )
    }
    return NextResponse.json(
      { success: false, error: `Gemini extraction failed: ${message}` },
      { status: 500 }
    )
  }
}
