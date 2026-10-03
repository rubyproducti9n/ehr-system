'use client'

import React from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DbTreeNodeProps {
  label: string
  path: string
  count?: number
  isExpandable: boolean
  depth: number
  children?: React.ReactNode
  badge?: string
  valuePreview?: string
  nodeType?: 'root' | 'hospital' | 'subcollection' | 'keyvalue' | 'leaf'
  isExpanded?: boolean
  onToggle?: () => void
}

export function DbTreeNode({
  label,
  path,
  count,
  isExpandable,
  depth,
  children,
  badge,
  valuePreview,
  nodeType = 'subcollection',
  isExpanded = false,
  onToggle,
}: DbTreeNodeProps) {
  const getNodeColor = () => {
    switch (nodeType) {
      case 'root':
        return 'text-indigo-600 font-semibold'
      case 'hospital':
        return 'text-slate-900 font-mono text-xs font-semibold'
      case 'subcollection':
        return 'text-emerald-700 font-medium'
      case 'keyvalue':
        return 'text-slate-800 font-medium'
      case 'leaf':
      default:
        return 'text-slate-500'
    }
  }

  const renderBadge = () => {
    if (!badge) return null

    if (badge === 'tenant-scoped') {
      return (
        <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded font-mono">
          tenant-scoped
        </span>
      )
    }

    if (badge === 'dev-only') {
      return (
        <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded font-mono">
          dev-only
        </span>
      )
    }

    if (badge === 'privacy') {
      return (
        <span className="text-[10px] bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.2 rounded font-mono italic">
          values hidden
        </span>
      )
    }

    return (
      <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.2 rounded font-mono">
        {badge}
      </span>
    )
  }

  return (
    <div className="select-none font-mono text-xs">
      <div
        onClick={isExpandable ? onToggle : undefined}
        style={{ paddingLeft: `${depth * 16}px` }}
        className={cn(
          'flex items-center gap-2 py-1 px-2 rounded-md transition-colors group',
          isExpandable ? 'cursor-pointer hover:bg-slate-100/80' : 'cursor-default hover:bg-slate-50'
        )}
      >
        {/* Toggle Chevron */}
        <span className="w-4 h-4 flex items-center justify-center shrink-0 text-slate-400 group-hover:text-slate-700">
          {isExpandable ? (
            isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
          )}
        </span>

        {/* Node Label */}
        <span className={cn('truncate', getNodeColor())}>
          {label}
          {isExpandable && !label.endsWith('/') && '/'}
        </span>

        {/* Count Badge */}
        {count !== undefined && (
          <span className="text-[11px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.2 rounded font-mono">
            [{count}]
          </span>
        )}

        {/* Custom Tag Badge */}
        {renderBadge()}

        {/* Value Preview (for leaf/key-value nodes) */}
        {valuePreview !== undefined && (
          <span className="text-slate-500 text-xs font-mono truncate">
            {valuePreview}
          </span>
        )}
      </div>

      {/* Expanded Children */}
      {isExpandable && isExpanded && children && (
        <div className="flex flex-col">
          {children}
        </div>
      )}
    </div>
  )
}
