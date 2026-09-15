'use client'

import React from 'react'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface PageErrorProps {
  title?: string
  message?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
}

export function PageError({
  title = 'Something went wrong',
  message = 'An unexpected error occurred',
  action,
}: PageErrorProps) {
  return (
    <div className="flex min-h-[320px] w-full items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center justify-center rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        {action && (
          <div className="mt-6">
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
    </div>
  )
}
