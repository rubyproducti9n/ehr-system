import { create } from "zustand"
import { AppUser } from "@/types"

interface AppStore {
  currentUser: AppUser | null
  setCurrentUser: (user: AppUser | null) => void
  selectedPatientId: string | null
  setSelectedPatientId: (id: string | null) => void
  globalSearchQuery: string
  setGlobalSearchQuery: (q: string) => void
}

export const useAppStore = create<AppStore>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  selectedPatientId: null,
  setSelectedPatientId: (id) => set({ selectedPatientId: id }),
  globalSearchQuery: "",
  setGlobalSearchQuery: (q) => set({ globalSearchQuery: q }),
}))
