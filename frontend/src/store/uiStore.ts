import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  sidebarCollapsed: boolean;
  activeModal: string | null;
  notificationBadgeCount: number;
  theme: 'light';
  toggleSidebar: () => void;
  setSidebarCollapsed: (value: boolean) => void;
  setNotificationBadgeCount: (value: number) => void;
  openModal: (name: string) => void;
  closeModal: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      activeModal: null,
      notificationBadgeCount: 0,
      theme: 'light',
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
      setNotificationBadgeCount: (value) => set({ notificationBadgeCount: value }),
      openModal: (name) => set({ activeModal: name }),
      closeModal: () => set({ activeModal: null }),
    }),
    {
      name: 'eduova-ui-store',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        notificationBadgeCount: state.notificationBadgeCount,
        theme: state.theme,
      }),
    }
  )
);
