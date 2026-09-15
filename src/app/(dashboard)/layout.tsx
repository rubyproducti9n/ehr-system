"use client"

import React, { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@/components/ui/toaster"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { ErrorBoundary } from "@/components/error/ErrorBoundary"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
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

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        {/* Responsive Sidebar (desktop fixed 240px, mobile Sheet) */}
        <Sidebar
          mobileOpen={mobileOpen}
          onMobileOpenChange={setMobileOpen}
        />

        {/* Top Header */}
        <Header onMenuClick={() => setMobileOpen(true)} />

        {/* Main Content Area: offset 240px from left on desktop, 56px from top */}
        <main className="lg:pl-[240px] pt-14">
          <div className="p-4 sm:p-6">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>
      <Toaster />
    </QueryClientProvider>
  )
}
