"use client"

import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@/components/ui/toaster"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [queryClient] = React.useState(
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
        {/* Fixed Left Sidebar (240px) */}
        <Sidebar />

        {/* Top Header (fixed at top, offset by sidebar) */}
        <Header />

        {/* Main Content Area: offset 240px from left, 56px from top */}
        <main className="pl-[240px] pt-14">
          <div className="p-6">{children}</div>
        </main>
      </div>
      <Toaster />
    </QueryClientProvider>
  )
}
