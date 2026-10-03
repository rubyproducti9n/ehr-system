// Developer emails whitelist
export const DEVELOPER_EMAILS: readonly string[] = [
  'om.lokhande34@gmail.com',
  'chivater@gmail.com',
] as const

export function isDeveloper(
  userOrEmail: string | { email?: string | null; role?: string | null } | null | undefined,
  role?: string | null
): boolean {
  if (!userOrEmail) return false

  let email: string | null | undefined = null
  let userRole: string | null | undefined = role

  if (typeof userOrEmail === 'string') {
    email = userOrEmail
  } else {
    email = userOrEmail.email
    userRole = userRole || userOrEmail.role
  }

  // 1. Check if database role is 'dev' or 'developer'
  if (userRole) {
    const r = userRole.toLowerCase().trim()
    if (r === 'dev' || r === 'developer') {
      return true
    }
  }

  // 2. Check if email is in whitelist
  if (email && DEVELOPER_EMAILS.includes(email.toLowerCase().trim())) {
    return true
  }

  return false
}
