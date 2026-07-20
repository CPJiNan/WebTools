import {defineStore} from 'pinia'
import {ref} from 'vue'

export interface ToastMessage {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

export const useToast = defineStore('toast', () => {
  const toasts = ref<ToastMessage[]>([])
  let nextId = 0

  function show(message: string, type: ToastMessage['type'] = 'success', duration = 2000) {
    const id = nextId++
    toasts.value.push({id, message, type})

    setTimeout(() => {
      remove(id)
    }, duration)
  }

  function remove(id: number) {
    const index = toasts.value.findIndex((t) => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  function success(message: string, duration?: number) {
    show(message, 'success', duration)
  }

  function error(message: string, duration?: number) {
    show(message, 'error', duration)
  }

  function info(message: string, duration?: number) {
    show(message, 'info', duration)
  }

  return {
    toasts,
    show,
    remove,
    success,
    error,
    info,
  }
})