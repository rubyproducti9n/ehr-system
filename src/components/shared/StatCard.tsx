import React from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StatCardProps {
  label: string
  value: number | string
  color?: 'blue' | 'green' | 'yellow' | 'gray' | 'red'
  icon?: LucideIcon
}

const colorStyles: Record<NonNullable<StatCardProps['color']>, { text: string; bg: string; icon: string }> = {
  blue: {
    text: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  green: {
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    icon: 'text-emerald-600 dark:text-emerald-400',
  },
  yellow: {
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    icon: 'text-amber-600 dark:text-amber-400',
  },
  gray: {
    text: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-800/60',
    icon: 'text-slate-600 dark:text-slate-400',
  },
  red: {
    text: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    icon: 'text-rose-600 dark:text-rose-400',
  },
}

export function StatCard({ label, value, color = 'blue', icon: Icon }: StatCardProps) {
  const styles = colorStyles[color] || colorStyles.blue

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center justify-between">
      <div className="space-y-1">
        <p className={cn('text-2xl font-bold tracking-tight', styles.text)}>
          {value}
        </p>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      {Icon && (
        <div className={cn('p-2.5 rounded-lg', styles.bg)}>
          <Icon className={cn('h-5 w-5', styles.icon)} />
        </div>
      )}
    </div>
  )
}
