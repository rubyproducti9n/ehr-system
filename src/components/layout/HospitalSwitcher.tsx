'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronsUpDown, Check, Building2, Loader2, Plus } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useAvailableHospitals } from '@/hooks/useAvailableHospitals'
import { switchHospital } from '@/lib/services/authService'
import { get, ref } from 'firebase/database'
import { db } from '@/lib/firebase'
import { isDeveloper } from '@/lib/devAccess'
import { AppUser } from '@/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface HospitalSwitcherProps {
  collapsed?: boolean
}

export function HospitalSwitcher({ collapsed = false }: HospitalSwitcherProps) {
  const router = useRouter()
  const {
    hospitalId,
    hospitalName,
    hospitalCode,
    currentUser,
    userRole,
    setHospitalId,
    setHospitalCode,
    setHospitalName,
    setUserRole,
    setAppSettings,
    availableHospitals,
    setIsHospitalSwitching,
  } = useAppStore()

  const { hospitals, loading } = useAvailableHospitals()
  const [isSwitching, setIsSwitching] = useState(false)

  const canAddHospital = userRole === 'super_admin' || isDeveloper(currentUser, userRole)

  const handleSwitch = async (targetHospitalId: string) => {
    if (targetHospitalId === hospitalId || isSwitching) return

    setIsSwitching(true)
    setIsHospitalSwitching(true)

    try {
      // Find the role for this hospital
      const targetHospital = availableHospitals.find((h) => h.hospitalId === targetHospitalId)
      const targetRole = (targetHospital?.role as AppUser['role']) ?? 'doctor'
      const targetCode = targetHospital?.hospitalCode ?? ''

      // Update Firebase activeHospitalId
      if (currentUser?.uid) {
        await switchHospital(currentUser.uid, targetHospitalId, targetCode)
      }

      // Fetch new hospital name
      const nameSnap = await get(ref(db, `hospitals/${targetHospitalId}/profile/name`))
      const newName = nameSnap.val() ?? 'Hospital'

      // Update Zustand — all hooks re-subscribe automatically
      setHospitalId(targetHospitalId)
      setHospitalCode(targetCode)
      setHospitalName(newName)
      setUserRole(targetRole)

      // Clear app settings so they reload for new hospital
      setAppSettings(null)
    } catch (err) {
      console.error('Failed to switch hospital:', err)
    } finally {
      setIsSwitching(false)
      setTimeout(() => setIsHospitalSwitching(false), 500)
    }
  }

  if (collapsed) {
    // Collapsed sidebar — show just the building icon with tooltip
    return (
      <div className="flex justify-center py-2">
        <Tooltip content={hospitalName ?? 'Hospital'} side="right">
          <div className="flex items-center justify-center cursor-default">
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </div>
        </Tooltip>
      </div>
    )
  }

  // Only show switcher when user has multiple hospitals
  if (!availableHospitals || availableHospitals.length <= 1) {
    // Show hospital name only — no dropdown trigger
    return (
      <div className="px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-xs text-muted-foreground truncate font-medium">
            {hospitalName ?? 'Loading...'}
          </span>
        </div>
        {canAddHospital && (
          <button
            onClick={() => router.push('/hospitals/new')}
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Add another hospital"
            type="button"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left",
            "hover:bg-muted transition-colors",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          )}
          disabled={isSwitching}
          type="button"
        >
          <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate text-foreground">
              {hospitalName ?? 'Loading...'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {hospitalCode}
            </p>
          </div>
          {isSwitching ? (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronsUpDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Your hospitals
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          hospitals.map((hospital) => (
            <DropdownMenuItem
              key={hospital.hospitalId}
              onClick={() => handleSwitch(hospital.hospitalId)}
              className="flex items-center gap-2 cursor-pointer"
              disabled={isSwitching}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{hospital.name}</p>
                <p className="text-xs text-muted-foreground">{hospital.hospitalCode}</p>
              </div>
              {hospital.hospitalId === hospitalId && (
                <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              )}
            </DropdownMenuItem>
          ))
        )}
        {canAddHospital && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push('/hospitals/new')}
              className="text-xs text-muted-foreground gap-2 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Add another hospital
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
