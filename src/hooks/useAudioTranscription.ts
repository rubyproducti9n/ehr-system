import { useEffect, useRef, useState, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { getTranscriptionWsUrl } from '@/lib/backendUrl'

export type TranscriptionStatus =
  | 'idle'
  | 'requesting-permission'
  | 'permission-denied'
  | 'connecting'
  | 'ready'
  | 'recording'
  | 'processing'
  | 'stopping'
  | 'stopped'
  | 'error'

export interface TranscriptionSegment {
  text: string
  confidence: number
  chunkIndex: number
  isFinal: boolean
  timestamp: number
}

export interface UseAudioTranscriptionReturn {
  status: TranscriptionStatus
  statusMessage: string
  segments: TranscriptionSegment[]
  fullTranscript: string
  currentChunk: number
  error: string | null
  start: () => Promise<void>
  stop: () => Promise<void>
  reset: () => void
  analyserRef: React.RefObject<AnalyserNode | null>
}

const SAMPLE_RATE = 16000
const CHUNK_SECONDS = 2.0
const CHUNK_BYTES = SAMPLE_RATE * CHUNK_SECONDS * 2  // 16-bit = 2 bytes per sample

const WORKLET_CODE = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channelData = input[0];
    if (!channelData) return true;

    for (let i = 0; i < channelData.length; i++) {
      this.buffer[this.bufferIndex++] = channelData[i];
      if (this.bufferIndex >= this.bufferSize) {
        const int16 = new Int16Array(this.bufferSize);
        for (let j = 0; j < this.bufferSize; j++) {
          const clamped = Math.max(-1, Math.min(1, this.buffer[j]));
          int16[j] = clamped < 0 ? clamped * 32768 : clamped * 32767;
        }
        this.port.postMessage(int16.buffer, [int16.buffer]);
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
      }
    }
    return true;
  }
}
registerProcessor('pcm-capture-processor', PcmCaptureProcessor);
`

export function useAudioTranscription(): UseAudioTranscriptionReturn {
  const { transcriptionUrl } = useAppStore()

  const [status, setStatus] = useState<TranscriptionStatus>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [segments, setSegments] = useState<TranscriptionSegment[]>([])
  const [currentChunk, setCurrentChunk] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioBufferRef = useRef<Int16Array[]>([])
  const bufferBytesRef = useRef(0)
  const isRecordingRef = useRef(false)
  const stopResolveRef = useRef<(() => void) | null>(null)

  const fullTranscript = segments
    .filter(s => s.text.trim())
    .map(s => s.text.trim())
    .join(' ')

  const cleanup = useCallback(() => {
    isRecordingRef.current = false
    audioBufferRef.current = []
    bufferBytesRef.current = 0

    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect()
      workletNodeRef.current = null
    }
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect()
      analyserRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  const connectWebSocket = useCallback((): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      const wsUrl = getTranscriptionWsUrl(transcriptionUrl)
      setStatusMessage('Connecting to transcription server...')

      let ws: WebSocket
      try {
        ws = new WebSocket(wsUrl)
        ws.binaryType = 'arraybuffer'
      } catch (e) {
        reject(new Error(`WebSocket creation failed: ${e}`))
        return
      }

      const timeout = setTimeout(() => {
        ws.close()
        reject(new Error('Connection timeout — transcription server not responding'))
      }, 8000)

      ws.onopen = () => {
        clearTimeout(timeout)
        wsRef.current = ws
        setStatusMessage('Connected — waiting for server...')
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string)

          switch (msg.type) {
            case 'ready':
              setStatus('recording')
              setStatusMessage('Recording — speak now')
              resolve(ws)
              break

            case 'processing':
              setStatus('processing')
              setCurrentChunk(msg.chunk ?? 0)
              setStatusMessage(`Processing chunk ${msg.chunk}...`)
              break

            case 'transcript':
              setStatus('recording')
              setStatusMessage('Recording — speak now')
              setSegments(prev => {
                const existing = prev.findIndex(s => s.chunkIndex === msg.chunk)
                const newSegment: TranscriptionSegment = {
                  text: msg.text,
                  confidence: msg.confidence ?? 1.0,
                  chunkIndex: msg.chunk,
                  isFinal: msg.is_final ?? false,
                  timestamp: Date.now(),
                }
                if (existing >= 0) {
                  const updated = [...prev]
                  updated[existing] = newSegment
                  return updated
                }
                return [...prev, newSegment]
              })
              break

            case 'silence':
              if (status !== 'stopping') {
                setStatus('recording')
                setStatusMessage('Recording — speak now')
              }
              break

            case 'stopped':
              setStatus('stopped')
              setStatusMessage(`Transcription complete — ${msg.total_chunks} chunks processed`)
              if (stopResolveRef.current) {
                stopResolveRef.current()
                stopResolveRef.current = null
              }
              break

            case 'chunk_error':
              console.warn(`Chunk ${msg.chunk} error: ${msg.error}`)
              setStatus('recording')
              setStatusMessage('Recording — speak now')
              break

            case 'fatal_error':
              setStatus('error')
              setError(msg.message ?? msg.error ?? 'Fatal transcription error')
              setStatusMessage('Transcription error')
              cleanup()
              break

            case 'pong':
              break
          }
        } catch {
          // Non-JSON message — ignore
        }
      }

      ws.onerror = () => {
        clearTimeout(timeout)
        setError('WebSocket connection error')
        setStatus('error')
        setStatusMessage('Connection failed')
        cleanup()
        reject(new Error('WebSocket error'))
      }

      ws.onclose = (event) => {
        if (isRecordingRef.current && !event.wasClean) {
          setError('Connection lost during recording')
          setStatus('error')
          setStatusMessage('Connection lost')
          cleanup()
        }
      }
    })
  }, [transcriptionUrl, cleanup, status])

  const handlePcmBuffer = useCallback((int16Array: Int16Array, ws: WebSocket) => {
    if (!isRecordingRef.current || ws.readyState !== WebSocket.OPEN) return

    audioBufferRef.current.push(int16Array)
    bufferBytesRef.current += int16Array.byteLength

    if (bufferBytesRef.current >= CHUNK_BYTES) {
      const totalSamples = bufferBytesRef.current / 2
      const combined = new Int16Array(totalSamples)
      let offset = 0
      for (const chunk of audioBufferRef.current) {
        combined.set(chunk, offset)
        offset += chunk.length
      }

      ws.send(combined.buffer)
      audioBufferRef.current = []
      bufferBytesRef.current = 0
    }
  }, [])

  const start = useCallback(async () => {
    try {
      setError(null)
      setStatus('requesting-permission')
      setStatusMessage('Requesting microphone permission...')

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      streamRef.current = stream
      setStatus('connecting')

      const ws = await connectWebSocket()

      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const audioContext = new AudioContextClass({ sampleRate: SAMPLE_RATE })
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)

      // Analyser for waveform visualizer
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser
      source.connect(analyser)

      // Use AudioWorkletNode (standard) with fallback to ScriptProcessorNode
      if (audioContext.audioWorklet) {
        try {
          const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' })
          const workletUrl = URL.createObjectURL(blob)
          await audioContext.audioWorklet.addModule(workletUrl)
          URL.revokeObjectURL(workletUrl)

          const workletNode = new AudioWorkletNode(audioContext, 'pcm-capture-processor')
          workletNodeRef.current = workletNode

          workletNode.port.onmessage = (event) => {
            const int16Array = new Int16Array(event.data)
            handlePcmBuffer(int16Array, ws)
          }

          analyser.connect(workletNode)
          workletNode.connect(audioContext.destination)
        } catch (workletErr) {
          console.warn('AudioWorklet module load failed, falling back to ScriptProcessor:', workletErr)
          const processor = audioContext.createScriptProcessor(4096, 1, 1)
          processorRef.current = processor

          processor.onaudioprocess = (event) => {
            const float32 = event.inputBuffer.getChannelData(0)
            const int16 = new Int16Array(float32.length)
            for (let i = 0; i < float32.length; i++) {
              int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32767))
            }
            handlePcmBuffer(int16, ws)
          }

          analyser.connect(processor)
          processor.connect(audioContext.destination)
        }
      } else {
        const processor = audioContext.createScriptProcessor(4096, 1, 1)
        processorRef.current = processor

        processor.onaudioprocess = (event) => {
          const float32 = event.inputBuffer.getChannelData(0)
          const int16 = new Int16Array(float32.length)
          for (let i = 0; i < float32.length; i++) {
            int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32767))
          }
          handlePcmBuffer(int16, ws)
        }

        analyser.connect(processor)
        processor.connect(audioContext.destination)
      }

      isRecordingRef.current = true
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setStatus('permission-denied')
          setError('Microphone access denied')
          setStatusMessage('Allow microphone access to use transcription')
        } else {
          setStatus('error')
          setError(err.message)
          setStatusMessage(err.message)
        }
      }
      cleanup()
    }
  }, [connectWebSocket, cleanup, handlePcmBuffer])

  const stop = useCallback(async () => {
    setStatus('stopping')
    setStatusMessage('Finalising transcript...')
    isRecordingRef.current = false

    // Flush remaining audio buffer
    if (
      wsRef.current &&
      wsRef.current.readyState === WebSocket.OPEN &&
      bufferBytesRef.current > 512
    ) {
      const totalSamples = bufferBytesRef.current / 2
      const combined = new Int16Array(totalSamples)
      let offset = 0
      for (const chunk of audioBufferRef.current) {
        combined.set(chunk, offset)
        offset += chunk.length
      }
      wsRef.current.send(combined.buffer)
    }

    await new Promise<void>((resolve) => {
      stopResolveRef.current = resolve
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'stop' }))
      }
      // Timeout fallback — if server doesn't respond in 2.5s, resolve anyway
      setTimeout(() => {
        if (stopResolveRef.current) {
          stopResolveRef.current()
          stopResolveRef.current = null
        }
      }, 2500)
    })

    cleanup()
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setStatus('stopped')
    setStatusMessage('Transcription complete')
  }, [cleanup])

  const reset = useCallback(() => {
    setSegments([])
    setError(null)
    setCurrentChunk(0)
    setStatusMessage('')
    if (status === 'stopped' || status === 'error' || status === 'permission-denied') {
      setStatus('idle')
    }
  }, [status])

  useEffect(() => {
    return () => {
      isRecordingRef.current = false
      cleanup()
      wsRef.current?.close()
    }
  }, [cleanup])

  return {
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
  }
}
