import { NextRequest, NextResponse } from 'next/server'
import { isDeveloper } from '@/lib/devAccess'
import { setGeminiApiKey } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  const email = req.headers.get('x-user-email')
  const role = req.headers.get('x-user-role')

  if (!isDeveloper(email, role)) {
    return NextResponse.json({ error: 'Unauthorized: Developer access required' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const apiKey = (body.api_key || '').trim()

    if (!apiKey || apiKey.length < 15) {
      return NextResponse.json(
        { error: 'API key too short. Please enter a valid API key from Google AI Studio.' },
        { status: 400 }
      )
    }

    setGeminiApiKey(apiKey)

    return NextResponse.json(
      {
        success: true,
        message: 'Gemini API key configured successfully.',
      },
      { status: 200 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to configure key: ${message}` }, { status: 500 })
  }
}
