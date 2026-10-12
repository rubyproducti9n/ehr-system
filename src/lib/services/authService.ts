import { db, auth } from '@/lib/firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { ref, set, get, update } from 'firebase/database'
import { generateUniqueCode } from '@/lib/hospitalCode'

export async function registerHospital(data: {
  hospitalName: string
  address: string
  phone: string
  hospitalEmail: string
  adminName: string
  adminEmail: string
  adminPassword: string
}): Promise<{ hospitalId: string; hospitalCode: string; adminUid: string }> {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    data.adminEmail,
    data.adminPassword
  )
  const uid = userCredential.user.uid

  try {
    const hospitalCode = await generateUniqueCode()
    const hospitalRef = ref(db, 'hospitals')
    const hospitalKey = ref(db, 'hospitals').parent // to get push key
    // Use push() without writing to get unique key
    const newHospitalRef = ref(db, `hospitals/${uid}`) // push key helper
    const snapKey = (await import('firebase/database')).push(hospitalRef).key
    const hospitalId = snapKey || uid
    const now = new Date().toISOString()

    await update(ref(db, `hospitals/${hospitalId}`), {
      [`profile/name`]: data.hospitalName,
      [`profile/address`]: data.address,
      [`profile/phone`]: data.phone,
      [`profile/email`]: data.hospitalEmail,
      [`profile/createdAt`]: now,
      [`profile/superAdminUid`]: uid,
      [`profile/hospitalCode`]: hospitalCode,
      [`staff/${uid}/uid`]: uid,
      [`staff/${uid}/email`]: data.adminEmail,
      [`staff/${uid}/displayName`]: data.adminName,
      [`staff/${uid}/role`]: 'super_admin',
      [`staff/${uid}/joinedAt`]: now,
      [`staff/${uid}/isActive`]: true,
      [`facilities/${hospitalId}_default/id`]: `${hospitalId}_default`,
      [`facilities/${hospitalId}_default/name`]: data.hospitalName,
      [`facilities/${hospitalId}_default/address`]: data.address,
      [`facilities/${hospitalId}_default/phone`]: data.phone,
      [`facilities/${hospitalId}_default/createdAt`]: now,
    })

    await update(ref(db, `users/${uid}`), {
      hospitalId,
      hospitalCode,
      role: 'super_admin',
      email: data.adminEmail,
      displayName: data.adminName,
      isActive: true,
    })

    await set(ref(db, `hospitalCodes/${hospitalCode}`), hospitalId)

    return { hospitalId, hospitalCode, adminUid: uid }
  } catch (error) {
    if (userCredential?.user) {
      try {
        await userCredential.user.delete()
      } catch (delErr) {
        console.error('Failed to cleanup auth user on DB error:', delErr)
      }
    }
    throw error
  }
}

export async function registerStaff(data: {
  hospitalCode: string
  fullName: string
  email: string
  password: string
  role: 'doctor' | 'receptionist'
}): Promise<{ hospitalId: string; uid: string }> {
  const code = data.hospitalCode.toUpperCase().trim()
  const snap = await get(ref(db, `hospitalCodes/${code}`))
  if (!snap.exists()) {
    throw new Error('Invalid hospital code. Please check with your administrator.')
  }
  const hospitalId = snap.val()

  const userCredential = await createUserWithEmailAndPassword(
    auth,
    data.email,
    data.password
  )
  const uid = userCredential.user.uid
  const now = new Date().toISOString()

  try {
    // 1. Write users/${uid} first so root.child('users').child(auth.uid).child('hospitalId') exists for hospital permission checks
    await update(ref(db, `users/${uid}`), {
      hospitalId,
      hospitalCode: code,
      role: data.role,
      email: data.email,
      displayName: data.fullName,
      isActive: true,
    })

    // 2. Write hospitals/${hospitalId}/staff/${uid}
    await update(ref(db, `hospitals/${hospitalId}/staff/${uid}`), {
      uid,
      email: data.email,
      displayName: data.fullName,
      role: data.role,
      joinedAt: now,
      isActive: true,
    })

    return { hospitalId, uid }
  } catch (error) {
    if (userCredential?.user) {
      try {
        await userCredential.user.delete()
      } catch (delErr) {
        console.error('Failed to cleanup auth user on DB error:', delErr)
      }
    }
    throw error
  }
}

export async function loginUser(data: {
  hospitalCode: string
  email: string
  password: string
  confirmPassword?: string  // only required for first-time imported providers
}): Promise<{
  hospitalId: string
  hospitalCode: string
  role: import('@/types').AppUser['role']
  displayName: string
  isFirstTimeImportedProvider?: boolean
}> {
  const code = data.hospitalCode.toUpperCase().trim()
  const snap = await get(ref(db, `hospitalCodes/${code}`))
  if (!snap.exists()) throw new Error('Invalid hospital code.')
  const hospitalId = snap.val()

  let uid: string
  let isFirstTimeImportedProvider = false

  try {
    // Attempt normal login first
    const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password)
    uid = userCredential.user.uid
  } catch (authError: any) {
    // If user not found in Auth — check if they are an imported provider
    if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
      let checkData: { found?: boolean; providerName?: string; providerId?: string; isActive?: boolean } = {}
      try {
        const checkRes = await fetch('/api/auth/check-imported-provider', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hospital_id: hospitalId, email: data.email }),
        })
        checkData = await checkRes.json()
      } catch (checkErr) {
        console.error('Error checking imported provider:', checkErr)
        throw new Error('Invalid email or password.')
      }

      if (!checkData.found) {
        throw new Error('Invalid email or password.')
      }

      if (checkData.isActive === false) {
        throw new Error('Your account has been deactivated before activation. Contact your hospital administrator.')
      }

      // Imported provider found — require password confirmation
      if (!data.confirmPassword) {
        // Signal to UI that confirmation is needed
        throw { code: 'IMPORTED_PROVIDER_NEEDS_CONFIRMATION', providerName: checkData.providerName }
      }

      if (data.password !== data.confirmPassword) {
        throw new Error('Passwords do not match.')
      }

      if (data.password.length < 8) {
        throw new Error('Password must be at least 8 characters.')
      }

      // Create Auth account
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password)
      uid = userCredential.user.uid
      isFirstTimeImportedProvider = true

      const now = new Date().toISOString()
      const providerDisplayName = checkData.providerName || data.email.split('@')[0]

      // Write users node and staff node
      await update(ref(db, `users/${uid}`), {
        hospitalId,
        hospitalCode: code,
        role: 'doctor',
        email: data.email,
        displayName: providerDisplayName,
        isActive: true,
      })

      await update(ref(db, `hospitals/${hospitalId}/staff/${uid}`), {
        uid,
        email: data.email,
        displayName: providerDisplayName,
        role: 'doctor',
        joinedAt: now,
        isActive: true,
      })

      // Mark provider as provisioned
      if (checkData.providerId) {
        await update(ref(db, `hospitals/${hospitalId}/providers/${checkData.providerId}`), {
          authProvisioned: true,
          authUid: uid,
        })
      }
    } else {
      // Different auth error — rethrow as generic message
      throw new Error('Invalid email or password.')
    }
  }

  // Normal flow continues — read user data
  const userSnap = await get(ref(db, `users/${uid}`))
  if (!userSnap.exists()) {
    await signOut(auth)
    throw new Error('Account not found.')
  }
  const userData = userSnap.val()

  if (userData.hospitalId !== hospitalId) {
    await signOut(auth)
    throw new Error('This account does not belong to this hospital.')
  }

  if (userData.isActive === false) {
    await signOut(auth)
    throw new Error('Your account has been deactivated. Contact your hospital administrator.')
  }

  return {
    hospitalId,
    hospitalCode: code,
    role: userData.role,
    displayName: userData.displayName || data.email.split('@')[0],
    isFirstTimeImportedProvider,
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth)
}

export async function getHospitalStaff(hospitalId: string): Promise<import('@/types').StaffMember[]> {
  const snap = await get(ref(db, `hospitals/${hospitalId}/staff`))
  if (!snap.exists()) return []
  const data = snap.val()
  const list: import('@/types').StaffMember[] = Object.values(data)
  return list.sort((a, b) => {
    const timeA = a.joinedAt ? new Date(a.joinedAt).getTime() : 0
    const timeB = b.joinedAt ? new Date(b.joinedAt).getTime() : 0
    return timeB - timeA
  })
}

export async function updateStaffRole(
  hospitalId: string,
  userId: string,
  role: import('@/types').StaffMember['role']
): Promise<void> {
  if (role === 'super_admin') {
    throw new Error('Cannot assign super_admin role after registration')
  }
  await update(ref(db, `hospitals/${hospitalId}/staff/${userId}`), { role })
  await update(ref(db, `users/${userId}`), { role })
}

export async function deactivateStaffMember(hospitalId: string, userId: string): Promise<void> {
  const staffSnap = await get(ref(db, `hospitals/${hospitalId}/staff/${userId}`))
  if (staffSnap.exists()) {
    const staff = staffSnap.val()
    if (staff.role === 'super_admin') {
      throw new Error('Cannot deactivate super admin')
    }
  }
  await update(ref(db, `hospitals/${hospitalId}/staff/${userId}`), {
    isActive: false,
  })
  await update(ref(db, `users/${userId}`), {
    isActive: false,
  })
}

export async function reactivateStaffMember(hospitalId: string, userId: string): Promise<void> {
  await update(ref(db, `hospitals/${hospitalId}/staff/${userId}`), {
    isActive: true,
  })
  await update(ref(db, `users/${userId}`), {
    isActive: true,
  })
}
