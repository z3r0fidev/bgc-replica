import { create } from "zustand";

interface AppState {
  isOnline: boolean;
  setOnline: (status: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isOnline: typeof window !== "undefined" ? window.navigator.onLine : true,
  setOnline: (status) => set({ isOnline: status }),
}));
