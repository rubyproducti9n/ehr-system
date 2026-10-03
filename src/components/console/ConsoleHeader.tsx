'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Terminal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const CONSOLE_NAV_ITEMS = [
  { label: 'Overview', href: '/console' },
  { label: 'Feature Flags', href: '/console/flags' },
  { label: 'Database', href: '/console/db' },
]

export function ConsoleHeader() {
  const pathname = usePathname()
  const [utcTime, setUtcTime] = useState<string>('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setUtcTime(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC')
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="bg-white border-b border-slate-200 text-slate-900 px-4 sm:px-6 pt-5 pb-0 shadow-xs">
      {/* Top row: Title + Restricted Badge + Live UTC Clock */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600">
            <Terminal className="h-4 w-4 shrink-0" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold tracking-tight text-slate-900">
                Developer Console
              </span>
              <Badge
                variant="outline"
                className="border-amber-200 bg-amber-50 text-amber-800 text-[10px] font-medium uppercase tracking-wider px-2 py-0.5"
              >
                Restricted
              </Badge>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-mono bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/80 w-fit">
          <span className="text-slate-400 font-sans mr-1">Time:</span>
          {utcTime || '—'}
        </div>
      </div>

      {/* Subtitle Warning */}
      <p className="text-xs text-slate-500 pb-4 leading-relaxed">
        Authorized access only. System-wide configuration and telemetry controls across all hospital tenants.
      </p>

      {/* Sub-nav row */}
      <div className="flex items-center gap-6 border-t border-slate-100 pt-2">
        {CONSOLE_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'text-xs font-medium pb-2.5 transition-all border-b-2',
                isActive
                  ? 'text-indigo-600 border-indigo-600 font-semibold'
                  : 'text-slate-500 hover:text-slate-800 border-transparent hover:border-slate-300'
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
