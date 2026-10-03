import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format ISO date string to "14 Sep 2026"
export function formatDate(isoString: string | null): string {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// Calculates age in years from ISO date string
export function calculateAge(dob: string): number {
  if (!dob) return 0
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age >= 0 ? age : 0
}

// Format ISO datetime string to "14 Sep 2026, 10:30 AM"
export function formatDateTime(isoString: string | null): string {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

// Returns Tailwind bg class based on gender
export function getAvatarColor(gender: 'male' | 'female' | 'other' | string): string {
  switch (gender) {
    case 'male':
      return 'bg-blue-500'
    case 'female':
      return 'bg-pink-500'
    default:
      return 'bg-gray-500'
  }
}

// Returns initials from full name (first + last word)
export function getInitials(name: string): string {
  if (!name) return 'P'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || 'P'
  return ((parts[0][0] || '') + (parts[parts.length - 1][0] || '')).toUpperCase()
}

// Validates phone number (7-15 digits after stripping formatting)
export function validatePhone(phone: string): string | null {
  const stripped = phone.replace(/[\s\-()+]/g, '')
  if (!/^\d{7,15}$/.test(stripped)) {
    return 'Enter a valid phone number (7–15 digits)'
  }
  return null
}

// Validates email address format
export function validateEmail(email: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.trim())) {
    return 'Enter a valid email address'
  }
  return null
}

// Smart Dr. prefix detection and title-casing for provider names
export function addDrPrefix(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return ''

  const prefixRegex = /^(dr\.|dr\s+|doctor\s+)/i
  let rest = trimmed
  if (prefixRegex.test(trimmed)) {
    rest = trimmed.replace(prefixRegex, '').trim()
  }

  const titleCased = rest
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')

  return `Dr. ${titleCased}`
}

