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
  Wrench,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Users2,
  ScanSearch,
  TerminalSquare,
} from "lucide-react"
import { useAppStore } from "@/store/useAppStore"
import { useAuth } from "@/hooks/useAuth"
import { isDeveloper } from "@/lib/devAccess"
import { hasPermission } from "@/lib/roles"
import { logoutUser } from "@/lib/services/authService"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Tooltip } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Patients", href: "/patients", icon: Users },
  { label: "Analyse Document", href: "/analyse", icon: ScanSearch },
  { label: "Scheduling", href: "/scheduling", icon: Calendar },
]

const ADMIN_NAV_ITEMS = [
  { label: "Providers", href: "/providers", icon: UserCheck },
  { label: "Hospitals", href: "/facilities", icon: Building2 },
]

interface SidebarProps {
  mobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
}

export function Sidebar({ mobileOpen = false, onMobileOpenChange }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const currentUser = useAppStore((state) => state.currentUser)
  const userRole = useAppStore((state) => state.userRole)
  const hospitalName = useAppStore((state) => state.hospitalName)
  const clearSession = useAppStore((state) => state.clearSession)
  const isFeatureVisible = useAppStore((state) => state.isFeatureVisible)
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useAppStore((state) => state.toggleSidebar)

  // Close mobile drawer on route change
  useEffect(() => {
    if (onMobileOpenChange) {
      onMobileOpenChange(false)
    }
  }, [pathname, onMobileOpenChange])

  const handleSignOut = async () => {
    try {
      await logoutUser()
      clearSession()
      router.push("/login")
    } catch {
      // Handled in auth hook
    }
  }


  const renderContent = (isMobile = false) => {
    const collapsed = isMobile ? false : sidebarCollapsed

    return (
      <div className="flex h-full flex-col bg-card relative">
        {/* App Header / Brand */}
        <div
          className={cn(
            "flex h-14 items-center border-b transition-all duration-300",
            collapsed ? "justify-center px-2" : "gap-2 px-6"
          )}
        >
          {collapsed ? (
            <LayoutDashboard className="h-5 w-5 text-primary shrink-0" />
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <Activity className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-sm font-bold text-foreground truncate block leading-tight">
                  EHR Platform
                </span>
                <span
                  className="text-[11px] text-muted-foreground truncate block leading-tight"
                  title={hospitalName || 'Hospital'}
                >
                  {hospitalName || 'Hospital'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            if (item.href === "/scheduling" && !isFeatureVisible("scheduling_module")) {
              return null
            }
            if (item.href === "/analyse" && !isFeatureVisible("ai_document_analysis")) {
              return null
            }

            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href)
            const Icon = item.icon

            const linkContent = (
              <Link
                href={item.href}
                onClick={() => {
                  if (onMobileOpenChange) onMobileOpenChange(false)
                }}
                className={cn(
                  "flex items-center rounded-md text-sm font-medium transition-colors cursor-pointer",
                  collapsed
                    ? "h-10 w-10 justify-center mx-auto"
                    : "gap-3 px-3 py-2",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )

            if (collapsed) {
              return (
                <div key={item.href} className="flex justify-center">
                  <Tooltip content={item.label} side="right">
                    {linkContent}
                  </Tooltip>
                </div>
              )
            }

            return <React.Fragment key={item.href}>{linkContent}</React.Fragment>
          })}

          {/* Providers & Hospitals - Super Admin / Dev only */}
          {(userRole === 'super_admin' || userRole === 'dev') &&
            ADMIN_NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href)
              const Icon = item.icon

              const linkContent = (
                <Link
                  href={item.href}
                  onClick={() => {
                    if (onMobileOpenChange) onMobileOpenChange(false)
                  }}
                  className={cn(
                    "flex items-center rounded-md text-sm font-medium transition-colors cursor-pointer",
                    collapsed
                      ? "h-10 w-10 justify-center mx-auto"
                      : "gap-3 px-3 py-2",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              )

              if (collapsed) {
                return (
                  <div key={item.href} className="flex justify-center">
                    <Tooltip content={item.label} side="right">
                      {linkContent}
                    </Tooltip>
                  </div>
                )
              }

              return <React.Fragment key={item.href}>{linkContent}</React.Fragment>
            })}

          {/* Staff link - visible to all authenticated users to view team members */}
          {(() => {
            const isActive = pathname === "/staff" || pathname.startsWith("/staff")
            const linkContent = (
              <Link
                href="/staff"
                onClick={() => {
                  if (onMobileOpenChange) onMobileOpenChange(false)
                }}
                className={cn(
                  "flex items-center rounded-md text-sm font-medium transition-colors cursor-pointer",
                  collapsed
                    ? "h-10 w-10 justify-center mx-auto"
                    : "gap-3 px-3 py-2",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Users2 className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Staff</span>}
              </Link>
            )

            if (collapsed) {
              return (
                <div key="/staff" className="flex justify-center">
                  <Tooltip content="Staff" side="right">
                    {linkContent}
                  </Tooltip>
                </div>
              )
            }
            return <React.Fragment key="/staff">{linkContent}</React.Fragment>
          })()}

          {/* Developer links */}
          {isDeveloper(currentUser?.email, userRole) && (
            <>
              <Separator className="my-2" />
              {collapsed ? (
                <>
                  <div className="flex justify-center">
                    <Tooltip content="Dev Sandbox" side="right">
                      <Link
                        href="/dev"
                        onClick={() => {
                          if (onMobileOpenChange) onMobileOpenChange(false)
                        }}
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-md text-sm font-medium transition-colors mx-auto cursor-pointer",
                          "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40",
                          (pathname === "/dev" || pathname === "/dev/ai-docs") &&
                            "bg-amber-100 dark:bg-amber-900/40"
                        )}
                      >
                        <Wrench className="h-4 w-4 shrink-0" />
                      </Link>
                    </Tooltip>
                  </div>
                  <div className="flex justify-center mt-1">
                    <Tooltip content="Corrections" side="right">
                      <Link
                        href="/dev/corrections"
                        onClick={() => {
                          if (onMobileOpenChange) onMobileOpenChange(false)
                        }}
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-md text-sm font-medium transition-colors mx-auto cursor-pointer",
                          "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40",
                          pathname === "/dev/corrections" &&
                            "bg-amber-100 dark:bg-amber-900/40"
                        )}
                      >
                        <Activity className="h-4 w-4 shrink-0" />
                      </Link>
                    </Tooltip>
                  </div>
                  <div className="flex justify-center mt-1">
                    <Tooltip content="Gemini Extract" side="right">
                      <Link
                        href="/dev/gemini"
                        onClick={() => {
                          if (onMobileOpenChange) onMobileOpenChange(false)
                        }}
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-md text-sm font-medium transition-colors mx-auto cursor-pointer",
                          "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40",
                          pathname === "/dev/gemini" &&
                            "bg-amber-100 dark:bg-amber-900/40"
                        )}
                      >
                        <Sparkles className="h-4 w-4 shrink-0" />
                      </Link>
                    </Tooltip>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/dev"
                    onClick={() => {
                      if (onMobileOpenChange) onMobileOpenChange(false)
                    }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                      "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40",
                      (pathname === "/dev" || pathname === "/dev/ai-docs") &&
                        "bg-amber-100 dark:bg-amber-900/40"
                    )}
                  >
                    <Wrench className="h-4 w-4 shrink-0" />
                    <span>Dev Sandbox</span>
                  </Link>
                  <Link
                    href="/dev/corrections"
                    onClick={() => {
                      if (onMobileOpenChange) onMobileOpenChange(false)
                    }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                      "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40",
                      pathname === "/dev/corrections" &&
                        "bg-amber-100 dark:bg-amber-900/40"
                    )}
                  >
                    <Activity className="h-4 w-4 shrink-0" />
                    <span>Corrections</span>
                  </Link>
                  <Link
                    href="/dev/gemini"
                    onClick={() => {
                      if (onMobileOpenChange) onMobileOpenChange(false)
                    }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                      "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40",
                      pathname === "/dev/gemini" &&
                        "bg-amber-100 dark:bg-amber-900/40"
                    )}
                  >
                    <Sparkles className="h-4 w-4 shrink-0" />
                    <span>Gemini Extract</span>
                  </Link>
                </>
              )}
            </>
          )}

          {/* Settings Link - restricted to canManageSettings */}
          {hasPermission(userRole, "canManageSettings") && (
            <>
              <Separator className="my-2" />
              {collapsed ? (
                <div className="flex justify-center">
                  <Tooltip content="Settings" side="right">
                    <Link
                      href="/settings"
                      onClick={() => {
                        if (onMobileOpenChange) onMobileOpenChange(false)
                      }}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-md text-sm font-medium transition-colors mx-auto cursor-pointer",
                        pathname === "/settings"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Settings className="h-4 w-4 shrink-0" />
                    </Link>
                  </Tooltip>
                </div>
              ) : (
                <Link
                  href="/settings"
                  onClick={() => {
                    if (onMobileOpenChange) onMobileOpenChange(false)
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                    pathname === "/settings"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  <span>Settings</span>
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Bottom Profile & Sign Out */}
        <div className="border-t p-3">
          {collapsed ? (
            <div className="flex justify-center">
              <Tooltip content="Sign Out" side="right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  title="Sign out"
                  aria-label="Sign out"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </Tooltip>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {currentUser?.displayName || currentUser?.email || "Staff User"}
                  </p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1 py-0 h-4 uppercase font-semibold border-none shrink-0",
                      (userRole === "dev" || currentUser?.role === "dev") && "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                      (userRole === "super_admin" || currentUser?.role === "super_admin") && "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
                      (userRole === "admin" || currentUser?.role === "admin") && "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
                      (userRole === "doctor" || currentUser?.role === "doctor") && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
                      (userRole === "receptionist" || currentUser?.role === "receptionist") && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    )}
                  >
                    {userRole || currentUser?.role || "doctor"}
                  </Badge>
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  {currentUser?.email}
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
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Desktop Sidebar (lg and above) */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-screen flex-col border-r bg-card transition-all duration-300 ease-in-out lg:flex",
          sidebarCollapsed ? "w-16" : "w-60"
        )}
      >
        {/* Collapse toggle button on desktop */}
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-4 z-50 hidden h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors lg:flex"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>

        {renderContent(false)}
      </aside>

      {/* Mobile Drawer Sidebar (below lg) - only mounted when opened */}
      {mobileOpen && (
        <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
          <SheetContent side="left" className="p-0 w-[240px]">
            {renderContent(true)}
          </SheetContent>
        </Sheet>
      )}
    </>
  )
}
