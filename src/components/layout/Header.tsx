"use client"

import { usePathname, useRouter } from "next/navigation"
import { Bell, Search } from "lucide-react"
import { useAppStore } from "@/store/useAppStore"
import { useAuth } from "@/hooks/useAuth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/patients": "Patients",
  "/scheduling": "Scheduling",
  "/providers": "Providers",
  "/facilities": "Facilities",
}

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const currentUser = useAppStore((state) => state.currentUser)
  const { signOut } = useAuth()

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
      await signOut()
      router.push("/login")
    } catch (err) {
      console.error("Sign out error:", err)
    }
  }

  const userInitials = (
    currentUser?.displayName ||
    currentUser?.email ||
    "U"
  )
    .slice(0, 2)
    .toUpperCase()

  return (
    <header className="fixed left-[240px] right-0 top-0 z-30 flex h-14 items-center justify-between border-b bg-card px-6">
      {/* Left: Page Title */}
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-foreground">{pageTitle}</h1>
      </div>

      {/* Center: Universal Search Bar */}
      <div className="flex w-full max-w-md items-center">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            readOnly
            placeholder="Search patients, providers, facilities..."
            className="flex h-9 w-full rounded-md border border-input bg-muted/40 pl-9 pr-14 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Right: Notifications & Profile Dropdown */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground"
          title="Notifications (placeholder)"
        >
          <Bell className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-8 w-8 rounded-full"
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
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {currentUser?.displayName || "Medical Staff"}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {currentUser?.email || "user@ehr.local"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
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
