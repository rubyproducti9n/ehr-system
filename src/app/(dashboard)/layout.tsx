"use client"

import React, { useState, useEffect } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@/components/ui/toaster"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { ErrorBoundary } from "@/components/error/ErrorBoundary"
import { useAppStore } from "@/store/useAppStore"
import { useAuth } from "@/hooks/useAuth"
import { subscribeToSettings } from "@/lib/services/settingsService"
import { subscribeToFlags } from "@/lib/services/featureFlagService"
import { cn } from "@/lib/utils"
import { ref, get } from "firebase/database"
import { db, auth } from "@/lib/firebase"
import { signOut } from "firebase/auth"
import { Loader2 } from "lucide-react"
import { migrateUserStructureIfNeeded } from "@/lib/services/authService"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isRehydrating, setIsRehydrating] = useState(false)
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed)
  const setAppSettings = useAppStore((state) => state.setAppSettings)
  const setBackendUrl = useAppStore((state) => state.setBackendUrl)
  const setTranscriptionUrl = useAppStore((state) => state.setTranscriptionUrl)
  const setFeatureFlags = useAppStore((state) => state.setFeatureFlags)
  const currentUser = useAppStore((state) => state.currentUser)
  const hospitalId = useAppStore((state) => state.hospitalId)
  const setHospitalId = useAppStore((state) => state.setHospitalId)
  const setHospitalCode = useAppStore((state) => state.setHospitalCode)
  const setHospitalName = useAppStore((state) => state.setHospitalName)
  const setUserRole = useAppStore((state) => state.setUserRole)
  const setAvailableHospitals = useAppStore((state) => state.setAvailableHospitals)
  const isHospitalSwitching = useAppStore((state) => state.isHospitalSwitching)

  const hospitalName = useAppStore((state) => state.hospitalName)

  useEffect(() => {
    if (!hospitalId) return

    const unsub = subscribeToFlags((flags) => {
      const flagMap: Record<string, any> = {}
      for (const flag of flags) flagMap[flag.key] = flag
      setFeatureFlags(flagMap)
    })

    return () => unsub()
  }, [hospitalId, setFeatureFlags])

  useEffect(() => {
    if (currentUser) {
      const rehydrateSession = async () => {
        try {
          if (!hospitalId) {
            setIsRehydrating(true)
          }
          const snap = await get(ref(db, `users/${currentUser.uid}`))
          if (!snap.exists()) {
            await signOut(auth)
            return
          }
          const userData = snap.val()

          // Run migration if user has old structure
          if (!userData.activeHospitalId && userData.hospitalId) {
            await migrateUserStructureIfNeeded(currentUser.uid, userData)
            // Re-read after migration
            const migrated = await get(ref(db, `users/${currentUser.uid}`))
            Object.assign(userData, migrated.val())
          }

          const activeHospitalId = userData.activeHospitalId
          if (!activeHospitalId) {
            await signOut(auth)
            return
          }

          const hospitalEntry = userData.hospitals?.[activeHospitalId]
          const role = hospitalEntry?.role ?? userData.role ?? 'doctor'

          setHospitalId(activeHospitalId)
          setHospitalCode(userData.activeHospitalCode ?? '')
          setUserRole(role)

          // Build available hospitals list
          const availableHospitals = Object.entries(userData.hospitals ?? {}).map(
            ([hid, hdata]: [string, any]) => ({
              hospitalId: hid,
              hospitalCode: hdata.hospitalCode ?? '',
              role: hdata.role ?? 'doctor',
            })
          )
          setAvailableHospitals(availableHospitals)

          // Fetch hospital name
          const profileSnap = await get(ref(db, `hospitals/${activeHospitalId}/profile/name`))
          if (profileSnap.exists()) {
            setHospitalName(profileSnap.val())
          }
        } catch (err) {
          console.error("Failed to rehydrate session:", err)
        } finally {
          setIsRehydrating(false)
        }
      }
      rehydrateSession()
    }
  }, [currentUser?.uid, hospitalId, setHospitalId, setHospitalCode, setUserRole, setAvailableHospitals, setHospitalName])

  useEffect(() => {
    if (!hospitalId) return
    const unsubscribe = subscribeToSettings(hospitalId, (settings) => {
      setAppSettings(settings)
      setBackendUrl(settings.backendUrl ?? null)
      setTranscriptionUrl(settings.transcriptionUrl ?? null)
    })
    return () => unsubscribe()
  }, [hospitalId, setAppSettings, setBackendUrl, setTranscriptionUrl])

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  if (loading || isRehydrating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Loading session...</p>
        </div>
      </div>
    )
  }


  // If user is not authenticated and not loading, render clean full-screen wrapper for landing page
  if (!loading && !user) {
    return (
      <QueryClientProvider client={queryClient}>
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
        <Toaster />
      </QueryClientProvider>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background relative">
        {isHospitalSwitching && (
          <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card px-4 py-3 rounded-lg shadow-lg border">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Switching hospital...
            </div>
          </div>
        )}

        {/* Responsive Sidebar (desktop fixed 240px or 64px, mobile Sheet) */}
        <Sidebar
          mobileOpen={mobileOpen}
          onMobileOpenChange={setMobileOpen}
        />

        {/* Top Header */}
        <Header onMenuClick={() => setMobileOpen(true)} />

        {/* Main Content Area: offset 240px/64px from left on desktop, 56px from top */}
        <main
          className={cn(
            "pt-14 transition-all duration-300 ease-in-out",
            sidebarCollapsed ? "lg:pl-16" : "lg:pl-60"
          )}
        >
          <div className="p-4 sm:p-6">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>
      <Toaster />
    </QueryClientProvider>
  )
}

