import { NextRequest, NextResponse } from 'next/server'
import { setGeminiApiKey, clearGeminiApiKey } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  const email = req.headers.get('x-user-email')

  if (!email || !email.trim()) {
    return NextResponse.json({ error: 'Unauthorized: User email required' }, { status: 401 })
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
      { success: true, message: 'AI API key saved successfully.' },
      { status: 200 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `AI service configuration error: ${message}` },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  const email = req.headers.get('x-user-email')

  if (!email || !email.trim()) {
    return NextResponse.json({ error: 'Unauthorized: User email required' }, { status: 401 })
  }

  try {
    clearGeminiApiKey()
    return NextResponse.json({ success: true, message: 'API key cleared successfully.' }, { status: 200 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to clear API key: ${message}` },
      { status: 500 }
    )
  }
}
