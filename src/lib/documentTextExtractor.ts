export interface ExtractionResult {
  text: string
  pageCount: number
  method: 'pdf-text' | 'image-ocr' | 'image-placeholder'
  warning?: string
  ocrResult?: {
    avg_confidence: number
    preprocessing_applied: string[]
    lines: Array<{ text: string; confidence: number; bbox?: number[][] }>
  }
}

export async function extractTextFromFile(
  file: File,
  userEmail: string,
  userRole?: string | null
): Promise<ExtractionResult> {
  // Handle PDF files
  if (file.type === 'application/pdf') {
    try {
      const pdfjsLib = await import('pdfjs-dist')
      if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
      }
      const arrayBuffer = await file.arrayBuffer()
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) })
      const pdf = await loadingTask.promise
      const pageCount = pdf.numPages
      const pageTexts: string[] = []

      for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const textItems = textContent.items
          .map((item) => ('str' in item ? item.str : ''))
          .filter(Boolean)
        pageTexts.push(textItems.join(' '))
      }

      const fullText = pageTexts.join('\n\n---PAGE BREAK---\n\n').trim()

      if (!fullText) {
        return {
          text: '',
          pageCount,
          method: 'pdf-text',
          warning:
            'This PDF appears to be scanned. Text extraction returned empty. OCR support coming in a future update.',
        }
      }

      return {
        text: fullText,
        pageCount,
        method: 'pdf-text',
      }
    } catch (err) {
      return {
        text: '',
        pageCount: 1,
        method: 'pdf-text',
        warning: `Failed to read PDF text: ${err instanceof Error ? err.message : 'Unknown error'}`,
      }
    }
  }

  // Handle image files — call OCR endpoint instead of returning placeholder
  if (file.type.startsWith('image/')) {
    try {
      // Read file as base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file) // produces "data:image/jpeg;base64,..."
      })

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-email': userEmail,
      }
      if (userRole) {
        headers['x-user-role'] = userRole
      }

      const response = await fetch('/api/dev/ocr', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          image_base64: base64,
          filename: file.name,
        }),
      })

      if (!response.ok) {
        return {
          text: '',
          pageCount: 1,
          method: 'image-placeholder',
          warning: 'OCR backend unavailable. Paste document text manually below.',
        }
      }

      const result = await response.json()

      if (!result.success || !result.text) {
        return {
          text: '',
          pageCount: 1,
          method: 'image-placeholder',
          warning: result.error ?? 'OCR returned no text. Try pasting the text manually.',
        }
      }

      return {
        text: result.text,
        pageCount: 1,
        method: 'image-ocr',
        warning: result.low_confidence_warning
          ? `Low OCR confidence (${Math.round(result.avg_confidence * 100)}%). Review extracted text carefully before running extraction.`
          : undefined,
        ocrResult: {
          avg_confidence: typeof result.avg_confidence === 'number' ? result.avg_confidence : 0,
          preprocessing_applied: Array.isArray(result.preprocessing_applied) ? result.preprocessing_applied : [],
          lines: Array.isArray(result.lines) ? result.lines : [],
        },
      }
    } catch (err) {
      return {
        text: '',
        pageCount: 1,
        method: 'image-placeholder',
        warning: `OCR error: ${err instanceof Error ? err.message : 'Failed to process image'}. Paste document text manually below.`,
      }
    }
  }

  // Fallback for plain text or unknown file types
  try {
    const text = await file.text()
    return {
      text,
      pageCount: 1,
      method: 'pdf-text',
    }
  } catch {
    return {
      text: '',
      pageCount: 1,
      method: 'image-placeholder',
      warning: 'Unsupported document format. Please paste or type document text manually below.',
    }
  }
}
