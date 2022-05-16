import type { User } from 'firebase/auth'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { useToast } from 'vue-toastification'
import { loginAdmin, logoutAdmin } from '~/api'

interface AdminState {
  admin: User | null
}

export const useAdminStore = defineStore('admin', {
  state: (): AdminState => {
    return {
      admin: null,
    }
  },

  actions: {
    async login(payload: { email: string; password: string }) {
      this.admin = await loginAdmin(payload)
    },

    async logout() {
      const toast = useToast()
      try {
        await logoutAdmin()
        this.admin = null
      } catch (error) {
        toast.error((error as Error).message)
      }
    },
  },
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useAdminStore, import.meta.hot))