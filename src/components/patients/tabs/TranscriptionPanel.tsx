import { useCallback, useEffect, useState, useRef } from 'react'
import { Mic, MicOff, Loader2, AlertCircle, CheckCircle2, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAudioTranscription } from '@/hooks/useAudioTranscription'
import { useTranscriptionStatus } from '@/hooks/useTranscriptionStatus'
import { WaveformVisualizer } from './WaveformVisualizer'
import { NerAnnotatedText } from '@/components/shared/NerAnnotatedText'
import { isTranscriptionSupported } from '@/lib/utils'

interface TranscriptionPanelProps {
  onTranscriptUpdate: (text: string) => void
  disabled?: boolean
  patientId?: string
}

export function TranscriptionPanel({
  onTranscriptUpdate,
  disabled = false,
  patientId,
}: TranscriptionPanelProps) {
  const serverStatus = useTranscriptionStatus()
  const {
    status,
    statusMessage,
    segments,
    fullTranscript,
    currentChunk,
    error,
    start,
    stop,
    reset,
    analyserRef,
  } = useAudioTranscription()

  const [nerEntities, setNerEntities] = useState<any[]>([])
  const [isRunningNer, setIsRunningNer] = useState(false)
  const [userHasManuallyEdited, setUserHasManuallyEdited] = useState(false)
  const lastAutoText = useRef('')

  const isRecording = status === 'recording' || status === 'processing'
  const isLoading = status === 'connecting' || status === 'requesting-permission'
  const isStopping = status === 'stopping'
  const canStart = serverStatus === 'online' && !disabled && isTranscriptionSupported() &&
    (status === 'idle' || status === 'stopped' || status === 'error')
  const canStop = isRecording || isStopping

  // Auto-update parent transcript field when new segments arrive
  useEffect(() => {
    if (isRecording && fullTranscript && !userHasManuallyEdited) {
      lastAutoText.current = fullTranscript
      onTranscriptUpdate(fullTranscript)
    }
  }, [fullTranscript, isRecording, userHasManuallyEdited, onTranscriptUpdate])

  // Run NER on final transcript when stopped
  useEffect(() => {
    if (status === 'stopped' && fullTranscript && fullTranscript.length > 10) {
      runNerOnTranscript(fullTranscript)
    }
  }, [status, fullTranscript])

  const runNerOnTranscript = async (text: string) => {
    setIsRunningNer(true)
    try {
      const res = await fetch('/api/ner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (res.ok) {
        const data = await res.json()
        setNerEntities(data.entities ?? [])
      }
    } catch {
      // NER is optional — fail silently
    } finally {
      setIsRunningNer(false)
    }
  }

  if (!isTranscriptionSupported()) {
    return (
      <div className="text-xs text-muted-foreground italic py-2">
        Live transcription requires a modern browser with microphone support.
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-muted/20">

      {/* Status + controls row */}
      <div className="flex items-center gap-3">

        {/* Status indicator */}
        <div className="flex items-center gap-1.5 flex-1">
          {serverStatus === 'checking' && (
            <>
              <span className="h-2 w-2 rounded-full bg-gray-400 animate-pulse" />
              <span className="text-xs text-muted-foreground">Checking server...</span>
            </>
          )}
          {serverStatus === 'offline' && (
            <>
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-xs text-red-600">Transcription server offline</span>
            </>
          )}
          {serverStatus === 'online' && status === 'idle' && (
            <>
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs text-muted-foreground">Ready</span>
            </>
          )}
          {serverStatus === 'online' && isLoading && (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
              <span className="text-xs text-amber-600">{statusMessage}</span>
            </>
          )}
          {serverStatus === 'online' && isRecording && (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="text-xs text-red-600 font-medium">
                {status === 'processing' ? `Processing chunk ${currentChunk}...` : 'Recording'}
              </span>
            </>
          )}
          {status === 'stopping' && (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Finalising...</span>
            </>
          )}
          {status === 'stopped' && (
            <>
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              <span className="text-xs text-green-600">Complete</span>
            </>
          )}
          {status === 'permission-denied' && (
            <>
              <AlertCircle className="h-3 w-3 text-red-500" />
              <span className="text-xs text-red-600">Microphone access denied</span>
            </>
          )}
          {status === 'error' && (
            <>
              <AlertCircle className="h-3 w-3 text-red-500" />
              <span className="text-xs text-red-600">{error ?? 'Error'}</span>
            </>
          )}
        </div>

        {/* Waveform */}
        <WaveformVisualizer
          analyserRef={analyserRef}
          isActive={isRecording}
          width={80}
          height={24}
        />

        {/* Buttons */}
        {!isRecording && !isStopping && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            disabled={!canStart}
            onClick={status === 'stopped' || status === 'error' ? reset : start}
          >
            {isLoading
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Mic className="h-3 w-3" />
            }
            {status === 'stopped' ? 'Record Again' : status === 'error' ? 'Retry' : 'Record'}
          </Button>
        )}

        {(isRecording || isStopping) && (
          <Button
            size="sm"
            variant="destructive"
            className="h-7 text-xs gap-1"
            disabled={isStopping}
            onClick={stop}
          >
            {isStopping
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <MicOff className="h-3 w-3" />
            }
            Stop
          </Button>
        )}
      </div>

      {/* Server offline banner */}
      {serverStatus === 'offline' && (
        <div className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded p-2">
          Voice transcription is currently unavailable. Please contact your administrator if you need this feature.
        </div>
      )}

      {/* Permission denied banner */}
      {status === 'permission-denied' && (
        <div className="text-xs text-red-700 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded p-2">
          Click the lock icon in your browser address bar to allow microphone access, then try again.
        </div>
      )}

      {/* Live partial transcript — shows while recording */}
      {isRecording && segments.length > 0 && (
        <div className="text-xs text-muted-foreground italic bg-background rounded p-2 max-h-16 overflow-y-auto">
          <span className="text-xs text-muted-foreground mr-1">Hearing:</span>
          {segments.map(s => s.text).filter(Boolean).join(' ')}
          <span className="animate-pulse ml-0.5">▋</span>
        </div>
      )}

      {/* NER annotated transcript — shows after stopping */}
      {status === 'stopped' && fullTranscript && (
        <div className="rounded border bg-background p-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Transcript
            </span>
            {isRunningNer && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Analysing entities...
              </span>
            )}
          </div>
          <div className="text-sm leading-relaxed">
            {nerEntities.length > 0
              ? <NerAnnotatedText text={fullTranscript} entities={nerEntities} />
              : <span>{fullTranscript}</span>
            }
          </div>
          {nerEntities.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1 border-t">
              {Object.entries(
                nerEntities.reduce((acc: Record<string, number>, e: any) => {
                  acc[e.type] = (acc[e.type] ?? 0) + 1
                  return acc
                }, {})
              ).map(([type, count]) => (
                <span key={type} className="text-xs text-muted-foreground">
                  {count} {type.toLowerCase()}{count !== 1 ? 's' : ''}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual edit notice */}
      {userHasManuallyEdited && isRecording && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Auto-fill paused — you edited the transcript</span>
          <button
            className="text-primary underline"
            onClick={() => setUserHasManuallyEdited(false)}
          >
            Resume auto-fill
          </button>
        </div>
      )}
    </div>
  )
}
