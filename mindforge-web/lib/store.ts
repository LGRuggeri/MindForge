import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Perfil } from '@/types/api';

interface AppState {
  perfilSelecionado: Perfil | null;
  selecionarPerfil: (perfil: Perfil | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      perfilSelecionado: null,
      selecionarPerfil: (perfil) => set({ perfilSelecionado: perfil }),
    }),
    {
      name: 'mindforge-storage',
    },
  ),
);
