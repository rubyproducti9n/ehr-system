import React from 'react'
import { getEntityStyle } from '@/lib/nerColors'

// Renders text with NER entity spans highlighted inline
// Used in transcript display and OCR result preview

export interface NerEntity {
  type: string
  text: string
  start: number
  end: number
  confidence: number
}

interface NerAnnotatedTextProps {
  text: string
  entities: NerEntity[]
  className?: string
}

export function NerAnnotatedText({ text, entities, className }: NerAnnotatedTextProps) {
  if (!entities || entities.length === 0) {
    return <span className={className}>{text}</span>
  }

  // Build segments: plain text and entity spans interleaved
  const segments: { text: string; entity?: NerEntity }[] = []
  let cursor = 0

  for (const entity of [...entities].sort((a, b) => a.start - b.start)) {
    if (entity.start > cursor) {
      segments.push({ text: text.slice(cursor, entity.start) })
    }
    segments.push({ text: text.slice(entity.start, entity.end), entity })
    cursor = entity.end
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) })
  }

  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (!seg.entity) return <span key={i}>{seg.text}</span>
        const style = getEntityStyle(seg.entity.type)
        return (
          <span
            key={i}
            className={`inline-flex items-center rounded px-0.5 mx-0.5 text-xs border ${style.bg} ${style.text} ${style.border}`}
            title={`${style.label} (${Math.round(seg.entity.confidence * 100)}%)`}
          >
            {seg.text}
          </span>
        )
      })}
    </span>
  )
}
