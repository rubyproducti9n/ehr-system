'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/useAppStore'
import { isDeveloper } from '@/lib/devAccess'
import { DevSubHeader } from '@/components/dev/DevSubHeader'

export default function DevLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, userRole } = useAppStore()
  const router = useRouter()

  useEffect(() => {
    if (currentUser && !isDeveloper(currentUser.email, userRole)) {
      router.replace('/')
    }
  }, [currentUser, userRole, router])

  // While currentUser is null (loading) or unauthorized, render nothing — avoids flash
  if (!currentUser) return null
  if (!isDeveloper(currentUser.email, userRole)) return null

  return (
    <div className="-m-4 sm:-m-6 flex flex-col min-h-[calc(100vh-3.5rem)]">
      <DevSubHeader />
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
