<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/composables/useStore'
import { api } from '@/lib/api'
import { mapBook } from '@/lib/mappers'
import BookCover from './BookCover.vue'

const router = useRouter()
const { state, closeModal, addToCart, showToast } = useStore()
const query = ref('')
const searchResults = ref([])
const searching = ref(false)
const addingId = ref(null)
let debounceTimer = null
let requestId = 0

watch(query, (value) => {
  clearTimeout(debounceTimer)
  const keyword = value.trim()

  if (!keyword) {
    requestId += 1
    searchResults.value = []
    searching.value = false
    return
  }

  debounceTimer = setTimeout(async () => {
    const currentRequest = ++requestId
    searching.value = true
    try {
      const response = await api.books({ search: keyword, per_page: 20 })
      if (currentRequest !== requestId) return
      searchResults.value = (response.data || []).map(mapBook)
    } catch (error) {
      if (currentRequest !== requestId) return
      searchResults.value = []
      showToast(error?.message || 'Gagal mencari buku', { type: 'error' })
    } finally {
      if (currentRequest === requestId) searching.value = false
    }
  }, 300)
})

const popularChips = computed(() =>
  [...state.books]
    .sort(
      (a, b) =>
        (Number(b.sold) || 0) - (Number(a.sold) || 0) ||
        String(a.title).localeCompare(String(b.title)),
    )
    .slice(0, 4)
    .map((book) => book.title)
    .filter(Boolean),
)

function selectChip(chip) {
  if (query.value === chip) {
    query.value = ''
  } else {
    query.value = chip
  }
}

function selectBook(slug) {
  closeModal()
  router.push({ name: 'book-detail', params: { id: slug } })
}

async function quickAdd(book) {
  if (addingId.value !== null) return
  addingId.value = book.id
  try {
    await addToCart(book)
    closeModal()
  } finally {
    addingId.value = null
  }
}

function onKeydown(e) {
  if (e.key === 'Escape' && state.activeModal === 'search') {
    closeModal()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  clearTimeout(debounceTimer)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <transition name="modal-fade">
    <div
      v-if="state.activeModal === 'search'"
      class="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-3.5 sm:p-4 pt-10 sm:pt-16 md:pt-20 backdrop-blur-xs"
      @click.self="closeModal"
    >
      <transition name="modal-pop" appear>
        <div
          class="w-full max-w-2xl bg-background border-3 sm:border-4 border-black p-4 sm:p-6 shadow-neo sm:shadow-[8px_8px_0px_0px_var(--color-black)] md:shadow-[10px_10px_0px_0px_var(--color-black)] flex flex-col min-h-[390px] sm:min-h-[430px] max-h-[85vh]"
        >
          <div class="flex items-center justify-between mb-3.5 sm:mb-4">
            <span
              class="inline-flex items-center gap-1.5 bg-neo-yellow border-2 border-black px-2.5 sm:px-3 py-1 font-outfit font-black text-xs uppercase tracking-wide shadow-neo-sm"
            >
              <svg
                class="w-3.5 h-3.5 text-black shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <span>Cari Judul & Penulis</span>
            </span>
            <button
              class="neubrutal-btn bg-white border-2 border-black p-1.5 shadow-neo-sm hover:bg-gray-100 flex items-center justify-center cursor-pointer"
              aria-label="Tutup pencarian"
              @click="closeModal"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="relative mb-3.5 sm:mb-4">
            <div class="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-black">
              <svg
                class="w-4 h-4 sm:w-5 sm:h-5"
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
              v-model="query"
              type="text"
              autofocus
              placeholder="Ketik judul buku, nama penulis, genre..."
              class="w-full bg-white border-2 sm:border-3 border-black pl-10 sm:pl-11 pr-10 py-2.5 sm:py-3 font-outfit font-bold text-sm sm:text-base outline-none shadow-neo-sm sm:shadow-neo focus:shadow-neo sm:focus:shadow-neo-lg transition-shadow"
            />
            <button
              v-if="query"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 border border-black/40 rounded-[2px] text-xs font-black cursor-pointer"
              aria-label="Hapus kata kunci"
              @click="query = ''"
            >
              ✕
            </button>
          </div>

          <div v-if="popularChips.length" class="mb-3.5 sm:mb-4">
            <div class="flex items-center gap-1.5 mb-2">
              <svg
                class="w-4 h-4 text-black shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              <p class="font-outfit font-black text-xs uppercase tracking-wider text-black">
                Pencarian Populer
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="chip in popularChips"
                :key="chip"
                type="button"
                class="border-2 border-black px-2.5 sm:px-3 py-1 font-outfit font-black text-xs transition-all cursor-pointer rounded-[2px]"
                :class="
                  query === chip
                    ? 'bg-neo-yellow text-black shadow-none translate-x-0.5 translate-y-0.5'
                    : 'bg-white text-black shadow-neo-sm hover:bg-gray-100 active:translate-x-0.5 active:translate-y-0.5'
                "
                @click="selectChip(chip)"
              >
                {{ chip }}
              </button>
            </div>
          </div>

          <div class="overflow-y-auto space-y-2.5 pr-0.5 scrollbar-hide flex-1">
            <div
              v-if="!query"
              class="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-black/20 rounded-[2px] p-4 bg-white/40"
            >
              <div
                class="w-10 h-10 bg-neo-yellow border-2 border-black flex items-center justify-center shadow-neo-sm mb-2 rotate-[-2deg]"
              >
                <svg
                  class="w-5 h-5 text-black"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <p class="font-outfit font-black text-sm text-black">Cari Buku Favoritmu</p>
              <p class="font-sans text-xs text-muted-foreground mt-0.5 max-w-[240px]">
                Ketik kata kunci di atas untuk mulai mencari buku favoritmu.
              </p>
            </div>

            <div
              v-else-if="!searching && searchResults.length === 0"
              class="text-center py-8 sm:py-10 bg-white border-2 sm:border-3 border-black p-4 shadow-neo-sm"
            >
              <div
                class="w-12 h-12 bg-neo-yellow border-2 border-black flex items-center justify-center shadow-neo-sm mx-auto mb-2.5 rotate-[-3deg]"
              >
                <svg
                  class="w-6 h-6 text-black"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                  <path d="m14 8-6 6" />
                </svg>
              </div>
              <p class="font-outfit font-black text-base text-black">Buku tidak ditemukan</p>
              <p class="font-sans text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Coba gunakan kata kunci lain, nama penulis, atau periksa ejaan.
              </p>
              <button
                class="neubrutal-btn mt-3.5 bg-neo-yellow text-black border-2 border-black px-3.5 py-1.5 font-outfit font-black text-xs shadow-neo-sm hover:bg-yellow-300 cursor-pointer"
                @click="query = ''"
              >
                Reset Pencarian
              </button>
            </div>

            <article
              v-else
              v-for="book in searchResults"
              :key="book.id"
              class="bg-white border-2 border-black p-2.5 sm:p-3 shadow-neo-sm hover:shadow-neo transition-all flex items-center gap-3 sm:gap-3.5 hover:bg-gray-100 cursor-pointer rounded-[2px]"
              @click="selectBook(book.slug)"
            >
              <div
                class="w-12 h-16 sm:w-14 sm:h-18 shrink-0 border-2 border-black shadow-neo-sm overflow-hidden bg-background"
              >
                <BookCover
                  :theme="book.theme || 'violet'"
                  :title="book.title"
                  :author="book.author"
                  class="w-full h-full"
                />
              </div>

              <div class="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div>
                  <div class="flex items-center gap-2 mb-0.5">
                    <span
                      class="bg-black text-white px-1.5 py-0.2 font-outfit font-black text-[9px] uppercase tracking-wider rounded-[1px]"
                    >
                      {{ book.category }}
                    </span>
                  </div>

                  <h4
                    class="font-outfit font-black text-xs sm:text-sm text-black leading-snug line-clamp-1"
                  >
                    {{ book.title }}
                  </h4>
                  <p class="font-sans text-[11px] font-bold text-muted-foreground truncate">
                    oleh {{ book.author }}
                  </p>
                </div>

                <div
                  class="flex items-center justify-between gap-2 mt-1.5 pt-1.5 border-t border-black/10"
                >
                  <span class="font-outfit font-black text-xs sm:text-sm text-neo-violet">
                    {{
                      new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        minimumFractionDigits: 0,
                      }).format(book.price)
                    }}
                  </span>
                  <button
                    :disabled="addingId === book.id"
                    class="neubrutal-btn bg-neo-yellow hover:bg-yellow-300 text-black border-2 border-black py-1 px-2.5 font-outfit font-black text-[10px] sm:text-xs shadow-neo-sm flex items-center gap-1 shrink-0 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-60"
                    @click.stop="quickAdd(book)"
                  >
                    <svg
                      class="w-3 h-3 text-black"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <circle cx="8" cy="21" r="1" />
                      <circle cx="19" cy="21" r="1" />
                      <path
                        d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"
                      />
                    </svg>
                    <span>{{ addingId === book.id ? '...' : '+ Keranjang' }}</span>
                  </button>
                </div>
              </div>
            </article>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>
