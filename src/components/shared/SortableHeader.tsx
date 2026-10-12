import React from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SortDirection = 'asc' | 'desc' | null

interface SortableHeaderProps {
  label: string
  field: string
  currentField: string | null
  direction: SortDirection
  onSort: (field: string) => void
  className?: string
  align?: 'left' | 'center' | 'right'
}

export function SortableHeader({
  label,
  field,
  currentField,
  direction,
  onSort,
  className,
  align = 'left',
}: SortableHeaderProps) {
  const isActive = currentField === field

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn(
        'group inline-flex items-center gap-1.5 font-semibold text-xs tracking-tight transition-colors focus:outline-none select-none py-1 rounded hover:text-foreground text-muted-foreground',
        isActive ? 'text-foreground font-bold' : '',
        align === 'right' && 'ml-auto justify-end',
        align === 'center' && 'mx-auto justify-center',
        className
      )}
      title={`Sort by ${label}`}
    >
      <span>{label}</span>
      <span className={cn(
        'inline-flex items-center justify-center h-4 w-4 rounded transition-colors',
        isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground/60 group-hover:text-foreground group-hover:bg-muted'
      )}>
        {isActive && direction === 'asc' ? (
          <ArrowUp className="h-3 w-3" />
        ) : isActive && direction === 'desc' ? (
          <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-60 group-hover:opacity-100" />
        )}
      </span>
    </button>
  )
}
