import { create } from "zustand"
import { persist } from "zustand/middleware"
import { AppUser, AppSettings, FeatureFlag } from "@/types"

interface AppStore {
  currentUser: AppUser | null
  setCurrentUser: (user: AppUser | null) => void
  hospitalId: string | null
  setHospitalId: (id: string | null) => void
  hospitalCode: string | null
  setHospitalCode: (code: string | null) => void
  hospitalName: string | null
  setHospitalName: (name: string | null) => void
  userRole: AppUser['role'] | null
  setUserRole: (role: AppUser['role'] | null) => void
  selectedPatientId: string | null
  setSelectedPatientId: (id: string | null) => void
  globalSearchQuery: string
  setGlobalSearchQuery: (q: string) => void
  appSettings: AppSettings | null
  setAppSettings: (settings: AppSettings | null) => void
  featureFlags: Record<string, FeatureFlag> | null
  setFeatureFlags: (flags: Record<string, FeatureFlag> | FeatureFlag[]) => void
  isFeatureEnabled: (key: string) => boolean
  isFeatureVisible: (key: string) => boolean
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  clearSession: () => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),
      hospitalId: null,
      setHospitalId: (id) => set({ hospitalId: id }),
      hospitalCode: null,
      setHospitalCode: (code) => set({ hospitalCode: code }),
      hospitalName: null,
      setHospitalName: (name) => set({ hospitalName: name }),
      userRole: null,
      setUserRole: (role) => set({ userRole: role }),
      selectedPatientId: null,
      setSelectedPatientId: (id) => set({ selectedPatientId: id }),
      globalSearchQuery: "",
      setGlobalSearchQuery: (q) => set({ globalSearchQuery: q }),
      appSettings: null,
      setAppSettings: (settings) => set({ appSettings: settings }),
      featureFlags: null,
      setFeatureFlags: (flags) => {
        if (Array.isArray(flags)) {
          const map: Record<string, FeatureFlag> = {}
          flags.forEach((f) => {
            if (f && f.key) map[f.key] = f
          })
          set({ featureFlags: map })
        } else {
          set({ featureFlags: flags })
        }
      },
      isFeatureEnabled: (key: string) => {
        const flags = get().featureFlags
        if (!flags || !flags[key]) return true
        return flags[key].enabled !== false
      },
      isFeatureVisible: (key: string) => {
        const flags = get().featureFlags
        if (!flags || !flags[key]) return true
        return flags[key].visible !== false
      },
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      clearSession: () =>
        set({
          currentUser: null,
          hospitalId: null,
          hospitalCode: null,
          hospitalName: null,
          userRole: null,
          selectedPatientId: null,
          globalSearchQuery: '',
          appSettings: null,
          featureFlags: null,
        }),
    }),
    {
      name: "ehr-sidebar-collapsed",
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    }
  )
)
