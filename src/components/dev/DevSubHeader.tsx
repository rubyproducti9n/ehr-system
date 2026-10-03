'use client'

import React from 'react'
import { Wrench } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { Badge } from '@/components/ui/badge'

export function DevSubHeader() {
  const currentUser = useAppStore((state) => state.currentUser)

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-6 py-3 dark:border-amber-800 dark:bg-amber-950/30">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-amber-700 dark:text-amber-400" />
          <span className="text-sm font-semibold text-foreground">
            Developer Sandbox
          </span>
          <Badge className="border-amber-300 bg-amber-200/60 px-1.5 py-0 text-[10px] font-medium text-amber-900 hover:bg-amber-200/80 dark:border-amber-700 dark:bg-amber-900/60 dark:text-amber-200">
            BETA
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          Signed in as: <span className="font-medium text-foreground">{currentUser?.email || '—'}</span>
        </div>
      </div>
      <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
        Features on this page are under development and not visible to regular users.
      </p>
    </div>
  )
}
