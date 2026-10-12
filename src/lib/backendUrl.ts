// Returns the correct backend base URL for API calls.
// Priority: Zustand store backendUrl → fallback to localhost
// Used by all Next.js API proxy routes.

export function getBackendBaseUrl(backendUrl: string | null): string {
  if (backendUrl && backendUrl.startsWith('http')) {
    return backendUrl.replace(/\/$/, '')
  }
  return 'http://127.0.0.1:8765'
}

export function getTranscriptionWsUrl(transcriptionUrl: string | null): string {
  if (transcriptionUrl && (transcriptionUrl.startsWith('wss://') || transcriptionUrl.startsWith('ws://'))) {
    return transcriptionUrl.replace(/\/$/, '')
  }
  return 'ws://127.0.0.1:8000'
}
