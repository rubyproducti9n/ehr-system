'use client'

import React from 'react'
import Link from 'next/link'
import { Inbox, LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick?: () => void
    href?: string
  }
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[260px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-5">
          {action.href ? (
            <Button asChild size="sm">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : action.onClick ? (
            <Button size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  )
}
