import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  UserCredential,
  Unsubscribe,
} from 'firebase/auth'
import { auth } from './firebase'

export function setSessionCookie(token: string | null) {
  if (typeof document === 'undefined') return
  if (token) {
    // 14 days session cookie
    document.cookie = '__session=' + token + '; path=/; max-age=' + (14 * 24 * 60 * 60) + '; SameSite=Lax'
  } else {
    document.cookie = '__session=; path=/; max-age=0; SameSite=Lax'
  }
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password)
  const token = await userCredential.user.getIdToken()
  setSessionCookie(token)
  return userCredential
}

export async function signOutUser(): Promise<void> {
  await signOut(auth)
  setSessionCookie(null)
}

export function onAuthStateChange(
  callback: (user: User | null) => void
): Unsubscribe {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const token = await user.getIdToken()
      setSessionCookie(token)
    } else {
      setSessionCookie(null)
    }
    callback(user)
  })
}
