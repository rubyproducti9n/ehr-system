import { useEffect, useRef } from 'react'

interface WaveformVisualizerProps {
  analyserRef: React.RefObject<AnalyserNode | null>
  isActive: boolean
  width?: number
  height?: number
}

export function WaveformVisualizer({
  analyserRef,
  isActive,
  width = 120,
  height = 32,
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (!isActive) {
      ctx.clearRect(0, 0, width, height)
      cancelAnimationFrame(rafRef.current)
      return
    }

    const draw = () => {
      if (!analyserRef.current || !isActive) return

      const bufferLength = analyserRef.current.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      analyserRef.current.getByteTimeDomainData(dataArray)

      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = 'transparent'

      const barWidth = width / 32
      const step = Math.floor(bufferLength / 32)

      for (let i = 0; i < 32; i++) {
        const value = dataArray[i * step] / 128.0
        const barHeight = Math.abs(value - 1.0) * height * 2
        const x = i * barWidth
        const y = (height - barHeight) / 2

        ctx.fillStyle = `rgba(34, 197, 94, ${0.4 + Math.abs(value - 1.0) * 0.6})`
        ctx.fillRect(x + 1, y, barWidth - 2, Math.max(2, barHeight))
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isActive, analyserRef, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={isActive ? 'block' : 'hidden'}
      aria-hidden="true"
    />
  )
}
