<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/composables/useStore'
import { featuredBooks } from '@/data/catalog'

const router = useRouter()
const { state, closeModal, addToCart } = useStore()
const query = ref('')

const searchResults = computed(() => {
  if (!query.value.trim()) return []
  const q = query.value.toLowerCase().trim()
  return featuredBooks.filter(
    (b) =>
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      b.category.toLowerCase().includes(q),
  )
})

function selectBook(id) {
  closeModal()
  router.push({ name: 'book-detail', params: { id } })
}

function quickAdd(book) {
  addToCart(book)
  closeModal()
}
</script>

<template>
  <transition name="modal-fade">
    <div
      v-if="state.activeModal === 'search'"
      class="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 pt-16 md:pt-24"
      @click.self="closeModal"
    >
      <transition name="modal-pop" appear>
        <div class="w-full max-w-2xl bg-background border-4 border-black p-5 md:p-7 shadow-[10px_10px_0px_0px_#000]">
          <!-- Header -->
          <div class="flex items-center justify-between mb-4">
            <span class="inline-flex items-center gap-1.5 bg-neo-yellow border-2 border-black px-3 py-1 font-outfit font-black text-xs uppercase tracking-wide shadow-neo-sm">
              <svg class="w-3.5 h-3.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <span>Cari Judul & Penulis</span>
            </span>
            <button class="neubrutal-btn bg-white border-2 border-black p-1.5 shadow-neo-sm hover:bg-gray-100" @click="closeModal">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Input bar -->
          <div class="relative mb-5">
            <input
              v-model="query"
              type="text"
              autofocus
              placeholder="Ketik judul buku, nama penulis, atau genre..."
              class="w-full bg-white border-3 border-black px-4 py-3.5 pr-10 font-outfit font-bold text-base outline-none shadow-neo focus:shadow-neo-lg transition-shadow"
            />
            <button
              v-if="query"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black font-black"
              @click="query = ''"
            >
              ✕
            </button>
          </div>

          <!-- Quick chips -->
          <div v-if="!query" class="space-y-3">
            <p class="font-outfit font-black text-xs text-muted-foreground uppercase tracking-wider">
              Pencarian Populer
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="chip in ['Laskar Pelangi', 'Atomic Habits', 'Bumi Manusia', 'Self-Growth', 'Pramoedya']"
                :key="chip"
                class="neubrutal-btn bg-white border-2 border-black px-3 py-1.5 font-outfit font-bold text-xs shadow-neo-sm hover:bg-neo-yellow"
                @click="query = chip"
              >
                {{ chip }}
              </button>
            </div>
          </div>

          <!-- Results -->
          <div v-else class="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
            <div v-if="searchResults.length === 0" class="text-center py-10 bg-white border-2 border-black">
              <p class="font-outfit font-black text-base">Buku tidak ditemukan</p>
              <p class="font-sans text-xs text-muted-foreground mt-1">Coba kata kunci lain atau lihat kategori lengkap.</p>
            </div>

            <div
              v-for="book in searchResults"
              :key="book.id"
              class="bg-white border-2 border-black p-3 shadow-neo-sm flex items-center justify-between gap-3 hover:bg-yellow-50 cursor-pointer"
              @click="selectBook(book.id)"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-14 border border-black bg-neo-violet text-white flex items-center justify-center font-outfit font-black text-xs shrink-0">
                  <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                    <path d="M6 6h10" />
                    <path d="M6 10h10" />
                  </svg>
                </div>
                <div>
                  <h4 class="font-outfit font-black text-sm leading-tight">{{ book.title }}</h4>
                  <p class="font-sans text-xs text-muted-foreground">oleh {{ book.author }} · <span class="text-black font-bold">{{ book.category }}</span></p>
                  <span class="font-outfit font-black text-xs text-neo-violet">
                    {{ new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(book.price) }}
                  </span>
                </div>
              </div>

              <div class="flex items-center gap-2" @click.stop>
                <button
                  class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-3 py-1.5 font-outfit font-black text-xs shadow-neo-sm hover:bg-yellow-300"
                  @click="quickAdd(book)"
                >
                  + Keranjang
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>
