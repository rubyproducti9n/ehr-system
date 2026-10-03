"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Bell, Search, Menu, TerminalSquare } from "lucide-react"
import { useAppStore } from "@/store/useAppStore"
import { useAuth } from "@/hooks/useAuth"
import { logoutUser } from "@/lib/services/authService"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GlobalSearch } from "@/components/search/GlobalSearch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/patients": "Patients",
  "/analyse": "Document Analysis",
  "/scheduling": "Scheduling",
  "/providers": "Providers",
  "/facilities": "Hospitals",
  "/staff": "Staff Management",
  "/settings": "Settings",
  "/console": "Developer Console",
  "/console/flags": "Feature Flags",
  "/console/db": "Database Explorer",
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  doctor: "Doctor",
  receptionist: "Receptionist",
}

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const currentUser = useAppStore((state) => state.currentUser)
  const hospitalName = useAppStore((state) => state.hospitalName)
  const userRole = useAppStore((state) => state.userRole)
  const clearSession = useAppStore((state) => state.clearSession)
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed)
  const [searchOpen, setSearchOpen] = useState(false)

  // Keyboard shortcut listener: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  // Match title or check prefix
  let pageTitle = PAGE_TITLES[pathname]
  if (!pageTitle) {
    if (pathname.startsWith('/patients/')) {
      pageTitle = 'Patient Profile'
    } else {
      const matchedPrefix = Object.keys(PAGE_TITLES).find(
        (path) => path !== "/" && pathname.startsWith(path)
      )
      pageTitle = matchedPrefix ? PAGE_TITLES[matchedPrefix] : "EHR Platform"
    }
  }

  const handleSignOut = async () => {
    try {
      await logoutUser()
      clearSession()
      router.push("/login")
    } catch {
      // Handled in auth hook
    }
  }

  const userInitials = (
    currentUser?.displayName ||
    currentUser?.email ||
    "U"
  )
    .slice(0, 2)
    .toUpperCase()

  const roleLabel = (userRole && ROLE_LABELS[userRole]) || (currentUser?.role && ROLE_LABELS[currentUser.role]) || "Doctor"

  return (
    <header
      className={cn(
        "fixed right-0 top-0 z-30 flex h-14 items-center justify-between border-b bg-card px-4 lg:px-6 transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "left-0 lg:left-16" : "left-0 lg:left-60"
      )}
    >
      {/* Left: Hamburger (below lg) + Page Title */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="h-9 w-9 text-muted-foreground lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-base lg:text-lg font-semibold text-foreground truncate max-w-[140px] sm:max-w-none">
          {pageTitle}
        </h1>
      </div>

      {/* Center: Universal Search Bar */}
      <div className="flex w-full max-w-xs sm:max-w-md items-center mx-2 sm:mx-4">
        <div
          onClick={() => setSearchOpen(true)}
          className="relative w-full cursor-pointer group"
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-hover:text-foreground transition-colors" />
          <div className="flex h-9 w-full select-none items-center rounded-md border border-input bg-muted/40 pl-9 pr-10 sm:pr-14 text-xs sm:text-sm text-muted-foreground group-hover:border-foreground/30 transition-colors truncate">
            Search patients, providers...
          </div>
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Global Command Palette */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Right: Notifications & Profile Dropdown */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground"
          title="Notifications (placeholder)"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-8 w-8 rounded-full"
              aria-label="User profile menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs font-medium">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-sm font-medium leading-none truncate">
                    {currentUser?.displayName || "Medical Staff"}
                  </p>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                    {roleLabel}
                  </Badge>
                </div>
                <p className="text-xs leading-none text-muted-foreground truncate">
                  {currentUser?.email || "user@ehr.local"}
                </p>
                <p className="text-[11px] leading-none text-muted-foreground font-medium pt-0.5 truncate">
                  {hospitalName || "Hospital"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {userRole === 'dev' && (
              <>
                <DropdownMenuItem asChild>
                  <Link
                    href="/console"
                    className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-200"
                  >
                    <TerminalSquare className="h-4 w-4 text-emerald-600" />
                    <span>Developer Console</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

