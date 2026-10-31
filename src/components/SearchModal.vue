<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/composables/useStore'

const router = useRouter()
const { state, closeModal } = useStore()
const query = ref('')
const searchInputRef = ref(null)

function submitSearch() {
  const keyword = query.value.trim()
  closeModal()
  router.push({ path: '/catalog', query: keyword ? { q: keyword } : {} })
}

function onKeydown(e) {
  if (e.key === 'Escape' && state.activeModal === 'search') {
    closeModal()
  }
}

watch(
  () => state.activeModal,
  (modal) => {
    if (modal === 'search') {
      nextTick(() => {
        searchInputRef.value?.focus()
        searchInputRef.value?.select?.()
      })
    } else {
      query.value = ''
    }
  },
)

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <transition name="modal-fade">
    <div
      v-if="state.activeModal === 'search'"
      class="fixed inset-0 bg-black/60 z-[70] flex items-start justify-center p-3.5 sm:p-4 pt-16 sm:pt-24 md:pt-28 backdrop-blur-xs"
      @click.self="closeModal"
    >
      <transition name="modal-pop" appear>
        <div
          class="w-full max-w-lg bg-background border-3 sm:border-4 border-black p-4 sm:p-5 shadow-neo sm:shadow-[8px_8px_0px_0px_var(--color-black)] flex flex-col gap-3"
        >
                    <div class="flex items-center justify-between">
            <span
              class="inline-flex items-center gap-1.5 bg-neo-yellow border-2 border-black px-2.5 sm:px-3 py-1 font-outfit font-black text-xs uppercase tracking-wide shadow-neo-xs"
            >
              <svg
                class="w-3.5 h-3.5 text-black shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <span>Cari Buku</span>
            </span>

            <button
              class="neubrutal-btn bg-white border-2 border-black w-8 h-8 rounded-[2px] shadow-neo-xs hover:bg-gray-100 flex items-center justify-center cursor-pointer shrink-0"
              aria-label="Tutup pencarian"
              @click="closeModal"
            >
              <svg
                class="w-4 h-4 text-black"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

                    <form @submit.prevent="submitSearch">
            <div class="flex items-center gap-2">
              <div class="relative flex-1 min-w-0">
                <div class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-black">
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                    />
                  </svg>
                </div>
                <input
                  ref="searchInputRef"
                  v-model="query"
                  type="text"
                  placeholder="Ketik judul buku atau penulis..."
                  class="w-full h-11 bg-white border-2 border-black pl-9 pr-8 font-outfit font-bold text-sm sm:text-base outline-none shadow-neo-xs focus:shadow-neo transition-shadow rounded-[2px]"
                />
                <button
                  v-if="query"
                  type="button"
                  class="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 border border-black/40 rounded-[2px] text-[10px] font-black cursor-pointer"
                  aria-label="Hapus kata kunci"
                  @click="query = ''"
                >
                  ✕
                </button>
              </div>

              <button
                type="submit"
                class="neubrutal-btn bg-neo-yellow text-black border-2 border-black h-11 px-4 sm:px-5 rounded-[2px] font-outfit font-black text-sm shadow-neo-xs hover:bg-yellow-300 flex items-center justify-center gap-1 cursor-pointer shrink-0"
              >
                <span>Cari</span>
              </button>
            </div>
          </form>
        </div>
      </transition>
    </div>
  </transition>
</template>
