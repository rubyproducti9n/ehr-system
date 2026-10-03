import { useEffect, useState } from "react"
import { User } from "firebase/auth"
import { onAuthStateChange, signInWithEmail, signOutUser } from "@/lib/auth"
import { useAppStore } from "@/store/useAppStore"
import { AppUser } from "@/types"
import { ref, get } from "firebase/database"
import { db } from "@/lib/firebase"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const setCurrentUser = useAppStore((state) => state.setCurrentUser)
  const setHospitalId = useAppStore((state) => state.setHospitalId)
  const setHospitalCode = useAppStore((state) => state.setHospitalCode)
  const setHospitalName = useAppStore((state) => state.setHospitalName)
  const setUserRole = useAppStore((state) => state.setUserRole)
  const clearSession = useAppStore((state) => state.clearSession)

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        try {
          const userSnap = await get(ref(db, `users/${firebaseUser.uid}`))
          if (userSnap.exists()) {
            const userData = userSnap.val()
            const appUser: AppUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              displayName: userData.displayName || firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
              role: userData.role || "doctor",
              hospitalId: userData.hospitalId || "",
              hospitalCode: userData.hospitalCode || "",
            }
            setCurrentUser(appUser)
            setHospitalId(userData.hospitalId || null)
            setHospitalCode(userData.hospitalCode || null)
            setUserRole(userData.role || null)

            if (userData.hospitalId) {
              const profileSnap = await get(ref(db, `hospitals/${userData.hospitalId}/profile/name`))
              if (profileSnap.exists()) {
                setHospitalName(profileSnap.val())
              }
            }
          } else {
            const appUser: AppUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
              role: "doctor",
              hospitalId: "",
              hospitalCode: "",
            }
            setCurrentUser(appUser)
          }
        } catch (err) {
          console.error("Failed to fetch user data in useAuth", err)
        }
      } else {
        clearSession()
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [setCurrentUser, setHospitalId, setHospitalCode, setHospitalName, setUserRole, clearSession])

  const signIn = async (email: string, password: string) => {
    const credential = await signInWithEmail(email, password)
    return credential
  }

  const signOut = async () => {
    await signOutUser()
    clearSession()
  }

  return {
    user,
    loading,
    signIn,
    signOut,
  }
}
