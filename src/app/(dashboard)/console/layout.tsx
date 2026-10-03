'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/useAppStore'
import { ConsoleHeader } from '@/components/console/ConsoleHeader'

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const userRole = useAppStore((state) => state.userRole)
  const router = useRouter()

  useEffect(() => {
    if (userRole && userRole !== 'dev') {
      router.replace('/')
    }
  }, [userRole, router])

  if (!userRole || userRole !== 'dev') return null

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900 min-h-screen -m-4 lg:-m-6 border-l border-slate-200/80">
      <ConsoleHeader />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
