"use client"

import React, { useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Calendar,
  UserCheck,
  Building2,
  LogOut,
  Activity,
} from "lucide-react"
import { useAppStore } from "@/store/useAppStore"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Patients", href: "/patients", icon: Users },
  { label: "Scheduling", href: "/scheduling", icon: Calendar },
  { label: "Providers", href: "/providers", icon: UserCheck },
  { label: "Facilities", href: "/facilities", icon: Building2 },
]

interface SidebarProps {
  mobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
}

export function Sidebar({ mobileOpen = false, onMobileOpenChange }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const currentUser = useAppStore((state) => state.currentUser)
  const { signOut } = useAuth()

  // Close mobile drawer on route change
  useEffect(() => {
    if (onMobileOpenChange) {
      onMobileOpenChange(false)
    }
  }, [pathname, onMobileOpenChange])

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/login")
    } catch {
      // Handled in auth hook
    }
  }

  const content = (
    <div className="flex h-full flex-col bg-card">
      {/* App Header / Brand */}
      <div className="flex h-14 items-center gap-2 border-b px-6">
        <Activity className="h-5 w-5 text-primary" />
        <span className="text-base font-semibold text-foreground">
          EHR Platform
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom Profile & Sign Out */}
      <div className="border-t p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">
              {currentUser?.displayName || currentUser?.email || "Staff User"}
            </p>
            <p className="truncate text-[11px] text-muted-foreground capitalize">
              {currentUser?.role || "Doctor"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            title="Sign out"
            aria-label="Sign out"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar (lg and above) */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[240px] flex-col border-r bg-card lg:flex">
        {content}
      </aside>

      {/* Mobile Drawer Sidebar (below lg) */}
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="p-0 w-[240px]">
          {content}
        </SheetContent>
      </Sheet>
    </>
  )
}
