import { NextRequest, NextResponse } from 'next/server'
import { isDeveloper } from '@/lib/devAccess'
import { clearGeminiApiKey } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  const email = req.headers.get('x-user-email')
  const role = req.headers.get('x-user-role')

  if (!isDeveloper(email, role)) {
    return NextResponse.json({ error: 'Unauthorized: Developer access required' }, { status: 403 })
  }

  try {
    clearGeminiApiKey()
    return NextResponse.json({ success: true, message: 'Gemini API key cleared successfully.' }, { status: 200 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to clear key: ${message}` }, { status: 500 })
  }
}
