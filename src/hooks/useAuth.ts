"use client"

import { useEffect, useState } from "react"
import { User } from "firebase/auth"
import { onAuthStateChange, signInWithEmail, signOutUser } from "@/lib/auth"
import { useAppStore } from "@/store/useAppStore"
import { AppUser } from "@/types"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const setCurrentUser = useAppStore((state) => state.setCurrentUser)

  useEffect(() => {
    const unsubscribe = onAuthStateChange((firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        const appUser: AppUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
          role: "doctor", // Default fallback until set in DB/Claims in subsequent chunks
        }
        setCurrentUser(appUser)
      } else {
        setCurrentUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [setCurrentUser])

  const signIn = async (email: string, password: string) => {
    const credential = await signInWithEmail(email, password)
    const firebaseUser = credential.user
    const appUser: AppUser = {
      uid: firebaseUser.uid,
      email: firebaseUser.email || "",
      displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
      role: "doctor",
    }
    setCurrentUser(appUser)
    return credential
  }

  const signOut = async () => {
    await signOutUser()
    setCurrentUser(null)
  }

  return {
    user,
    loading,
    signIn,
    signOut,
  }
}
