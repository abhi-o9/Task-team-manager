import { create } from 'zustand';

interface UiState {
  sidebarOpen: boolean;
  activeModal: string | null;
  modalData: any;
  
  toggleSidebar: () => void;
  openModal: (name: string, data?: any) => void;
  closeModal: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  activeModal: null,
  modalData: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  openModal: (name: string, data: any = null) => set({ activeModal: name, modalData: data }),
  
  closeModal: () => set({ activeModal: null, modalData: null })
}));
