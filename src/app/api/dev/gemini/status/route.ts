import { NextRequest, NextResponse } from 'next/server'
import { getGeminiApiKey, DEFAULT_GEMINI_MODEL, SUPPORTED_GEMINI_MODELS } from '@/lib/gemini'

export async function GET(req: NextRequest) {
  const email = req.headers.get('x-user-email')

  if (!email || !email.trim()) {
    return NextResponse.json({ error: 'Unauthorized: User email required' }, { status: 401 })
  }

  const key = getGeminiApiKey()
  const isConfigured = Boolean(key && key.trim().length > 10)

  return NextResponse.json(
    {
      configured: isConfigured,
      key_preview:
        isConfigured && key.length > 12
          ? `${key.slice(0, 8)}...${key.slice(-4)}`
          : isConfigured
          ? '••••••••'
          : null,
      model: DEFAULT_GEMINI_MODEL,
      supported_models: SUPPORTED_GEMINI_MODELS,
    },
    { status: 200 }
  )
}
