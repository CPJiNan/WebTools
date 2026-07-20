import {ref} from 'vue'

const searchKeyword = ref('')

export function useSearch() {
  return {
    searchKeyword,
  }
}