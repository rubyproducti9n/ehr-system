'use client'

import React, { useState } from 'react'
import {
  Users2,
  Copy,
  Check,
  Lock,
  MoreHorizontal,
  UserPlus,
  Shield,
  Stethoscope,
  Headphones,
  UserCheck,
  UserX,
} from 'lucide-react'
import { StaffMember } from '@/types'
import { useHospitalStaff } from '@/hooks/useHospitalStaff'
import { useAppStore } from '@/store/useAppStore'
import { hasPermission } from '@/lib/roles'
import { updateStaffRole, deactivateStaffMember, reactivateStaffMember } from '@/lib/services/authService'
import { formatDate, cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/EmptyState'

export default function StaffManagementPage() {
  const { staff, loading, error, refresh } = useHospitalStaff()
  const hospitalName = useAppStore((state) => state.hospitalName)
  const hospitalCode = useAppStore((state) => state.hospitalCode)
  const hospitalId = useAppStore((state) => state.hospitalId)
  const userRole = useAppStore((state) => state.userRole)
  const currentUser = useAppStore((state) => state.currentUser)
  const { toast } = useToast()

  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedDialogCode, setCopiedDialogCode] = useState(false)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)

  // Action states
  const [deactivatingUid, setDeactivatingUid] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  const handleCopyCode = (isDialog = false) => {
    if (!hospitalCode) return
    navigator.clipboard.writeText(hospitalCode)
    if (isDialog) {
      setCopiedDialogCode(true)
      setTimeout(() => setCopiedDialogCode(false), 2000)
    } else {
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
    toast({
      title: 'Copied to clipboard',
      description: `Hospital code ${hospitalCode} copied.`,
    })
  }

  const handleRoleChange = async (member: StaffMember, newRole: StaffMember['role']) => {
    if (!hospitalId) return
    if (member.role === newRole) return
    setActionInProgress(member.uid)
    try {
      await updateStaffRole(hospitalId, member.uid, newRole)
      toast({
        title: 'Role updated',
        description: `${member.displayName}'s role updated to ${newRole.replace('_', ' ')}.`,
      })
      await refresh()
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error updating role',
        description: err instanceof Error ? err.message : 'Failed to update role.',
      })
    } finally {
      setActionInProgress(null)
    }
  }

  const handleDeactivate = async (member: StaffMember) => {
    if (!hospitalId) return
    if (member.uid === currentUser?.uid) {
      toast({
        variant: 'destructive',
        title: 'Action not allowed',
        description: 'You cannot deactivate your own account.',
      })
      return
    }
    setActionInProgress(member.uid)
    try {
      await deactivateStaffMember(hospitalId, member.uid)
      toast({
        title: 'Staff member deactivated',
        description: `${member.displayName} has been deactivated.`,
      })
      setDeactivatingUid(null)
      await refresh()
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error deactivating staff',
        description: err instanceof Error ? err.message : 'Failed to deactivate staff member.',
      })
    } finally {
      setActionInProgress(null)
    }
  }

  const handleReactivate = async (member: StaffMember) => {
    if (!hospitalId) return
    setActionInProgress(member.uid)
    try {
      await reactivateStaffMember(hospitalId, member.uid)
      toast({
        title: 'Staff member reactivated',
        description: `${member.displayName} has been reactivated.`,
      })
      await refresh()
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error reactivating staff',
        description: err instanceof Error ? err.message : 'Failed to reactivate staff member.',
      })
    } finally {
      setActionInProgress(null)
    }
  }

  // Determine which roles the caller can assign
  const getAssignableRoles = (member: StaffMember): StaffMember['role'][] => {
    if (userRole === 'super_admin' || userRole === 'dev') {
      // Super admin / Dev can assign admin, doctor, receptionist, dev (cannot assign super_admin)
      return (['admin', 'doctor', 'receptionist', 'dev'] as StaffMember['role'][]).filter(
        (r) => r !== member.role
      )
    }
    if (userRole === 'admin') {
      // Admin can only change roles between doctor and receptionist
      if (member.role === 'admin' || member.role === 'super_admin' || member.role === 'dev') {
        return []
      }
      return (['doctor', 'receptionist'] as StaffMember['role'][]).filter(
        (r) => r !== member.role
      )
    }
    return []
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'dev':
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-none font-medium text-xs">
            <Shield className="w-3 h-3 mr-1" /> Developer
          </Badge>
        )
      case 'super_admin':
        return (
          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-none font-medium text-xs">
            <Shield className="w-3 h-3 mr-1" /> Super Admin
          </Badge>
        )
      case 'admin':
        return (
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-none font-medium text-xs">
            <Shield className="w-3 h-3 mr-1" /> Admin
          </Badge>
        )
      case 'doctor':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-none font-medium text-xs">
            <Stethoscope className="w-3 h-3 mr-1" /> Doctor
          </Badge>
        )
      case 'receptionist':
        return (
          <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-none font-medium text-xs">
            <Headphones className="w-3 h-3 mr-1" /> Receptionist
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-xs capitalize">
            {role}
          </Badge>
        )
    }
  }

  const isSuperAdminOrDev = userRole === 'super_admin' || userRole === 'dev'

  return (
    <div className="space-y-6">
      {/* Top Subheader Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Staff Management
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">
              {hospitalName || 'Hospital'}
            </span>
            {isSuperAdminOrDev && hospitalCode && (
              <>
                <span className="text-sm text-muted-foreground">· Code:</span>
                <span className="font-mono text-sm font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded border">
                  {hospitalCode}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopyCode(false)}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  title="Copy hospital code"
                  aria-label="Copy hospital code"
                >
                  {copiedCode ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {isSuperAdminOrDev && (
          <Button
            onClick={() => setInviteDialogOpen(true)}
            className="gap-2 self-start sm:self-auto"
          >
            <UserPlus className="h-4 w-4" />
            Invite Staff
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Staff Table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Role</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              {isSuperAdminOrDev && (
                <>
                  <TableHead className="font-semibold">Joined</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-36" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-44" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  {isSuperAdminOrDev && (
                    <>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-8 w-16 ml-auto" />
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))
            ) : staff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isSuperAdminOrDev ? 6 : 4} className="p-0 border-none">
                  <EmptyState
                    icon={Users2}
                    title="No staff members yet"
                    description={isSuperAdminOrDev ? "Share your hospital code to invite staff." : "No staff members found."}
                  />
                </TableCell>
              </TableRow>
            ) : (
              staff.map((member) => {
                const isSuperAdmin = member.role === 'super_admin'
                const isSelf = member.uid === currentUser?.uid
                const isDeactivating = deactivatingUid === member.uid
                const isBusy = actionInProgress === member.uid
                const assignableRoles = getAssignableRoles(member)
                const canModifyRole = assignableRoles.length > 0 && !isSuperAdmin && !isSelf
                const canDeactivate =
                  !isSuperAdmin &&
                  !isSelf &&
                  (userRole === 'super_admin' || (userRole === 'admin' && member.role !== 'admin'))

                return (
                  <TableRow
                    key={member.uid}
                    className={cn(
                      !member.isActive && 'opacity-60 bg-muted/20'
                    )}
                  >
                    {/* Name */}
                    <TableCell className="font-semibold text-foreground">
                      {member.displayName || 'Unnamed Staff'}
                    </TableCell>

                    {/* Email */}
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {member.email}
                    </TableCell>

                    {/* Role */}
                    <TableCell>
                      {getRoleBadge(member.role)}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      {member.isActive ? (
                        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none text-[11px] font-medium">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium border-none">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>

                    {/* Joined - Super Admin / Dev only */}
                    {isSuperAdminOrDev && (
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(member.joinedAt)}
                      </TableCell>
                    )}

                    {/* Actions - Super Admin / Dev only */}
                    {isSuperAdminOrDev && (
                      <TableCell className="text-right">
                        {isSuperAdmin ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground italic font-normal">
                            <Lock className="h-3 w-3" /> Cannot modify
                          </span>
                        ) : isSelf ? (
                          <Badge variant="outline" className="text-xs font-semibold">
                            You
                          </Badge>
                        ) : isDeactivating ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-xs font-medium text-destructive mr-1">
                              Deactivate?
                            </span>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeactivate(member)}
                              disabled={isBusy}
                              className="h-7 px-2 text-xs"
                              autoFocus
                            >
                              Yes
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeactivatingUid(null)}
                              disabled={isBusy}
                              className="h-7 px-2 text-xs"
                            >
                              No
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            {/* Role Change Dropdown */}
                            {canModifyRole && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isBusy}
                                    className="h-7 px-2 text-xs gap-1"
                                  >
                                    Change Role
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Assign Role</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {assignableRoles.map((r) => (
                                    <DropdownMenuItem
                                      key={r}
                                      onClick={() => handleRoleChange(member, r)}
                                      className="cursor-pointer capitalize text-xs"
                                    >
                                      {r.replace('_', ' ')}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}

                            {/* Deactivate / Reactivate Action */}
                            {canDeactivate && (
                              member.isActive ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeactivatingUid(member.uid)}
                                  disabled={isBusy}
                                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive gap-1"
                                  title="Deactivate staff member"
                                >
                                  <UserX className="h-3.5 w-3.5" />
                                  Deactivate
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReactivate(member)}
                                  disabled={isBusy}
                                  className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 gap-1 font-medium"
                                  title="Reactivate staff member"
                                >
                                  <UserCheck className="h-3.5 w-3.5" />
                                  Reactivate
                                </Button>
                              )
                            )}
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Invite Staff Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Invite Staff Members</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Share your unique hospital code with doctors and receptionists to join {hospitalName || 'your hospital'}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-center">
              <span className="text-xs font-medium text-muted-foreground">
                Your Hospital Registration Code
              </span>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-2xl font-bold tracking-wider text-primary">
                  {hospitalCode || '—'}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyCode(true)}
                  className="gap-1 text-xs"
                >
                  {copiedDialogCode ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-3 space-y-2 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Instructions for new staff:</p>
              <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
                <li>
                  Direct staff to visit <strong>/register/staff</strong> on your domain.
                </li>
                <li>
                  Have them enter the hospital code above, their full name, work email, and chosen password.
                </li>
                <li>
                  Once registered, they will appear in this Staff Management table.
                </li>
              </ol>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
