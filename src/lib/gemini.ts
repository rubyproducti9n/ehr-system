import fs from 'fs'
import path from 'path'

export const SUPPORTED_GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
]

export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash'

export const MEDICAL_EXTRACTION_PROMPT = `You are a clinical document field extractor specializing in Indian medical prescriptions and OPD case papers.
Extract all medical information from this prescription image and return ONLY a valid JSON object. No explanation, no markdown fences, no preamble.

Rules:
Extract only what is explicitly visible in the image.
For missing or unclear fields set value to null.
Never invent or guess information not visible.
For drug names: extract exactly as written, add generic name in parentheses if known.
Decode Indian dosage notation: 1-0-1 = twice daily morning and night, TDS = three times daily, BD = twice daily, OD = once daily, HS = at bedtime, SOS = as needed, BBF = before breakfast, BL = before lunch, BD = before dinner, s/c = subcutaneous, f/b = followed by, IU = international units.
For confidence: high = clearly visible and unambiguous, medium = partially legible or abbreviated, low = unclear or inferred.

Return this exact JSON structure:
{
  "document_type": null,
  "patient_name": {"value": null, "source_text": null, "confidence": "high"},
  "patient_age": {"value": null, "source_text": null, "confidence": "high"},
  "patient_gender": {"value": null, "source_text": null, "confidence": "high"},
  "date": {"value": null, "source_text": null, "confidence": "high"},
  "doctor_name": {"value": null, "source_text": null, "confidence": "high"},
  "doctor_qualification": {"value": null, "source_text": null, "confidence": "high"},
  "facility_name": {"value": null, "source_text": null, "confidence": "high"},
  "vitals": {
    "bp": {"value": null, "source_text": null, "confidence": "high"},
    "spo2": {"value": null, "source_text": null, "confidence": "high"},
    "temperature": {"value": null, "source_text": null, "confidence": "high"},
    "pulse_rate": {"value": null, "source_text": null, "confidence": "high"},
    "weight": {"value": null, "source_text": null, "confidence": "high"}
  },
  "diagnosis": {"value": null, "source_text": null, "confidence": "high"},
  "medications": [
    {
      "name": null,
      "generic_name": null,
      "dosage": null,
      "frequency": null,
      "frequency_decoded": null,
      "route": null,
      "duration": null,
      "source_text": null,
      "confidence": "high"
    }
  ],
  "investigations_advised": {"value": null, "source_text": null, "confidence": "high"},
  "advice": {"value": null, "source_text": null, "confidence": "high"},
  "follow_up": {"value": null, "source_text": null, "confidence": "high"}
}`

function getEnvLocalPath(): string {
  return path.resolve(process.cwd(), '.env.local')
}

function getBackendEnvPath(): string {
  return path.resolve(process.cwd(), 'backend', '.env.backend')
}

export function getGeminiApiKey(): string {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
    return process.env.GEMINI_API_KEY.trim()
  }
  if (process.env.NEXT_PUBLIC_GEMINI_API_KEY && process.env.NEXT_PUBLIC_GEMINI_API_KEY.trim()) {
    return process.env.NEXT_PUBLIC_GEMINI_API_KEY.trim()
  }

  // Fallback to read directly from .env.local
  try {
    const envLocalPath = getEnvLocalPath()
    if (fs.existsSync(envLocalPath)) {
      const content = fs.readFileSync(envLocalPath, 'utf8')
      const match = content.match(/^GEMINI_API_KEY=(.*)$/m)
      if (match && match[1]?.trim()) {
        const key = match[1].trim().replace(/^['"]|['"]$/g, '')
        process.env.GEMINI_API_KEY = key
        return key
      }
    }
  } catch (e) {
    console.error('Error reading .env.local:', e)
  }

  // Fallback to read from backend/.env.backend
  try {
    const backendEnvPath = getBackendEnvPath()
    if (fs.existsSync(backendEnvPath)) {
      const content = fs.readFileSync(backendEnvPath, 'utf8')
      const match = content.match(/^GEMINI_API_KEY=(.*)$/m)
      if (match && match[1]?.trim()) {
        const key = match[1].trim().replace(/^['"]|['"]$/g, '')
        process.env.GEMINI_API_KEY = key
        return key
      }
    }
  } catch (e) {
    console.error('Error reading .env.backend:', e)
  }

  return ''
}

export function setGeminiApiKey(key: string): void {
  const trimmed = key.trim()
  process.env.GEMINI_API_KEY = trimmed

  // Write to .env.local
  try {
    const envLocalPath = getEnvLocalPath()
    let content = fs.existsSync(envLocalPath) ? fs.readFileSync(envLocalPath, 'utf8') : ''
    if (/^GEMINI_API_KEY=.*$/m.test(content)) {
      content = content.replace(/^GEMINI_API_KEY=.*$/m, `GEMINI_API_KEY=${trimmed}`)
    } else {
      content = (content.trim() + '\n' + `GEMINI_API_KEY=${trimmed}`).trim() + '\n'
    }
    fs.writeFileSync(envLocalPath, content, 'utf8')
  } catch (e) {
    console.error('Error writing to .env.local:', e)
  }

  // Also sync to backend/.env.backend if exists
  try {
    const backendEnvPath = getBackendEnvPath()
    if (fs.existsSync(backendEnvPath)) {
      let content = fs.readFileSync(backendEnvPath, 'utf8')
      if (/^GEMINI_API_KEY=.*$/m.test(content)) {
        content = content.replace(/^GEMINI_API_KEY=.*$/m, `GEMINI_API_KEY=${trimmed}`)
      } else {
        content = (content.trim() + '\n' + `GEMINI_API_KEY=${trimmed}`).trim() + '\n'
      }
      fs.writeFileSync(backendEnvPath, content, 'utf8')
    }
  } catch (e) {
    console.error('Error writing to .env.backend:', e)
  }
}

export function clearGeminiApiKey(): void {
  process.env.GEMINI_API_KEY = ''

  try {
    const envLocalPath = getEnvLocalPath()
    if (fs.existsSync(envLocalPath)) {
      let content = fs.readFileSync(envLocalPath, 'utf8')
      content = content.replace(/^GEMINI_API_KEY=.*$/m, 'GEMINI_API_KEY=')
      fs.writeFileSync(envLocalPath, content, 'utf8')
    }
  } catch (e) {
    console.error('Error clearing in .env.local:', e)
  }

  try {
    const backendEnvPath = getBackendEnvPath()
    if (fs.existsSync(backendEnvPath)) {
      let content = fs.readFileSync(backendEnvPath, 'utf8')
      content = content.replace(/^GEMINI_API_KEY=.*$/m, 'GEMINI_API_KEY=')
      fs.writeFileSync(backendEnvPath, content, 'utf8')
    }
  } catch (e) {
    console.error('Error clearing in .env.backend:', e)
  }
}

function extractJsonFromText(text: string): Record<string, unknown> {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) {
    throw new Error('No JSON object found in Gemini response')
  }
  return JSON.parse(cleaned.substring(start, end + 1))
}

export interface GeminiExtractionResult {
  success: boolean
  data?: Record<string, unknown> | null
  document_type?: string | null
  raw_response?: string | null
  token_usage?: {
    input: number
    output: number
    total: number
  }
  model_used: string
  error?: string | null
}

export async function extractGeminiClinicalData(
  imageBase64: string,
  mimeType: string = 'image/jpeg',
  model: string = DEFAULT_GEMINI_MODEL
): Promise<GeminiExtractionResult> {
  const selectedModel = SUPPORTED_GEMINI_MODELS.includes(model) ? model : DEFAULT_GEMINI_MODEL
  const apiKey = getGeminiApiKey()

  if (!apiKey) {
    return {
      success: false,
      model_used: selectedModel,
      error: 'Gemini API key not configured. Please configure your key in Settings.',
    }
  }

  let cleanBase64 = imageBase64
  if (imageBase64.includes(',')) {
    cleanBase64 = imageBase64.split(',', 2)[1]
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`

  const payload = {
    contents: [
      {
        parts: [
          { text: MEDICAL_EXTRACTION_PROMPT },
          {
            inline_data: {
              mime_type: mimeType || 'image/jpeg',
              data: cleanBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60_000),
  })

  const resJson = await res.json()

  if (!res.ok) {
    const errorMsg = resJson?.error?.message || `Gemini API returned status ${res.status}`
    return {
      success: false,
      model_used: selectedModel,
      error: `Gemini API error: ${errorMsg}`,
    }
  }

  const candidate = resJson?.candidates?.[0]
  if (!candidate) {
    return {
      success: false,
      model_used: selectedModel,
      error: 'Gemini returned no response candidates.',
    }
  }

  const rawText = candidate?.content?.parts?.[0]?.text || ''
  const usageMetadata = resJson?.usageMetadata || {}

  try {
    const extractedData = extractJsonFromText(rawText)
    return {
      success: true,
      data: extractedData,
      document_type: (extractedData.document_type as string) || 'unknown',
      raw_response: rawText,
      token_usage: {
        input: usageMetadata.promptTokenCount || 0,
        output: usageMetadata.candidatesTokenCount || 0,
        total: usageMetadata.totalTokenCount || 0,
      },
      model_used: selectedModel,
      error: null,
    }
  } catch (err: unknown) {
    return {
      success: false,
      raw_response: rawText,
      model_used: selectedModel,
      error: err instanceof Error ? err.message : 'Failed to parse JSON from AI model response.',
    }
  }
}
