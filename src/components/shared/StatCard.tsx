import React from 'react'
import Link from 'next/link'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StatCardProps {
  label: string
  value: number | string
  color?: 'blue' | 'green' | 'yellow' | 'gray' | 'red'
  icon?: LucideIcon
  href?: string
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

export function StatCard({ label, value, color = 'blue', icon: Icon, href }: StatCardProps) {
  const styles = colorStyles[color] || colorStyles.blue

  const cardContent = (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-5 min-h-[92px] shadow-sm flex items-center justify-between',
        href && 'cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all duration-150'
      )}
      title={href ? `View ${label}` : undefined}
    >
      <div className="space-y-1.5">
        <p className={cn('text-2xl sm:text-3xl font-bold tracking-tight', styles.text)}>
          {value}
        </p>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      {Icon && (
        <div className={cn('p-3 rounded-lg', styles.bg)}>
          <Icon className={cn('h-5 w-5', styles.icon)} />
        </div>
      )}
    </div>
  )

  if (href) {
    return <Link href={href}>{cardContent}</Link>
  }

  return cardContent
}
