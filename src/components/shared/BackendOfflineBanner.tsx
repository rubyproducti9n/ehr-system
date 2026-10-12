'use client'

import React, { useState } from 'react'
import { AlertTriangle, Sparkles, ServerOff, ChevronRight, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/useAppStore'
import { useBackendHealth } from '@/hooks/useBackendHealth'
import { LearnMoreFeaturesDialog } from './LearnMoreFeaturesDialog'

export function BackendOfflineBanner() {
  const currentUser = useAppStore((state) => state.currentUser)
  const userRole = useAppStore((state) => state.userRole)
  const hospitalId = useAppStore((state) => state.hospitalId)

  const [learnMoreOpen, setLearnMoreOpen] = useState(false)

  const { status } = useBackendHealth(
    currentUser?.email || '',
    userRole,
    hospitalId
  )

  // Only render when status is confirmed offline and user is signed in
  if (status !== 'offline' || !currentUser) {
    return null
  }

  return (
    <>
      <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/20 p-4 shadow-sm transition-all duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
              <ServerOff className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Backend Service Offline — Enterprise Activation Required
                </h4>
                <span className="inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-800 dark:text-amber-300">
                  Demo / Preview Mode
                </span>
              </div>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 leading-relaxed max-w-2xl">
                Advanced features including Real-Time Medical Speech Transcription, Gemma-2 Semantic Clinical Search, GatorTron NER, and Document OCR are restricted. Contact support to rent or activate your dedicated hospital server.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 sm:self-center">
            <Button
              size="sm"
              onClick={() => setLearnMoreOpen(true)}
              className="w-full sm:w-auto text-xs font-semibold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Learn More & Activate
              <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
            </Button>
          </div>
        </div>
      </div>

      <LearnMoreFeaturesDialog
        open={learnMoreOpen}
        onOpenChange={setLearnMoreOpen}
      />
    </>
  )
}
