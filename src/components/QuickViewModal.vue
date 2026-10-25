<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/composables/useStore'
import BookCover from './BookCover.vue'

const router = useRouter()
const { state, closeModal, addToCart, openCart } = useStore()

const book = computed(() => state.modalPayload)
const adding = ref(false)

const formattedPrice = computed(() => {
  if (!book.value) return ''
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(book.value.price)
})

const formattedOriginalPrice = computed(() => {
  if (!book.value?.originalPrice) return ''
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(book.value.originalPrice)
})

async function handleAddToCart() {
  if (!book.value || adding.value) return
  adding.value = true
  try {
    await addToCart(book.value)
    closeModal()
  } finally {
    adding.value = false
  }
}

function handleGoToDetail() {
  if (book.value) {
    const id = book.value.id
    closeModal()
    router.push({ name: 'book-detail', params: { id } })
  }
}
</script>

<template>
  <transition name="modal-fade">
    <div
      v-if="state.activeModal === 'quickview' && book"
      class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs select-none"
      @click.self="closeModal"
    >
      <transition name="modal-pop" appear>
        <div
          class="w-full max-w-[680px] max-h-[90vh] overflow-y-auto bg-background border-4 border-black rounded-[2px] p-6 md:p-8 shadow-[10px_10px_0px_0px_var(--color-black)]"
        >
          <div class="flex items-center justify-between mb-5">
            <span
              class="inline-block bg-neo-yellow border-2 border-black px-3 py-1 rounded-[2px] font-outfit font-black text-xs uppercase shadow-neo-sm"
            >
              PRATINJAU BUKU
            </span>
            <button
              class="neubrutal-btn border-2 border-black p-1.5 rounded-[2px] bg-white shadow-neo-sm hover:bg-gray-100"
              aria-label="Tutup"
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

          <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div class="md:col-span-5 flex items-center justify-center">
              <div
                class="w-full max-w-[220px] aspect-[3/4] border-3 border-black rounded-[2px] overflow-hidden shadow-neo bg-white p-3"
              >
                <BookCover
                  :theme="book.theme"
                  :title="book.title"
                  :author="book.author"
                  :badge="book.badge"
                  :accent="book.accentColor"
                />
              </div>
            </div>

            <div class="md:col-span-7 space-y-4">
              <div>
                <span
                  class="inline-block bg-neo-violet text-white border-2 border-black px-2.5 py-0.5 rounded-[2px] font-outfit font-black text-[10px] uppercase"
                >
                  {{ book.category }}
                </span>
                <h3 class="font-outfit font-black text-2xl md:text-3xl mt-1.5 leading-tight">
                  {{ book.title }}
                </h3>
                <p class="font-sans text-xs font-bold text-muted-foreground mt-0.5">
                  oleh <span class="text-black underline">{{ book.author }}</span>
                </p>
              </div>

              <p
                class="font-sans text-xs sm:text-sm font-semibold text-muted-foreground leading-relaxed line-clamp-3"
              >
                {{ book.description }}
              </p>

              <div class="flex items-baseline gap-3 pt-1">
                <span class="font-outfit font-black text-2xl md:text-3xl text-black">{{
                  formattedPrice
                }}</span>
                <span
                  v-if="formattedOriginalPrice"
                  class="font-sans text-sm font-bold text-muted-foreground line-through"
                >
                  {{ formattedOriginalPrice }}
                </span>
              </div>

              <div class="grid grid-cols-2 gap-3 pt-2">
                <button
                  class="neubrutal-btn bg-white text-black border-3 border-black py-2.5 rounded-[2px] font-outfit font-black text-xs md:text-sm shadow-neo-sm hover:bg-gray-100"
                  @click="handleGoToDetail"
                >
                  Detail Lengkap →
                </button>
                <button
                  :disabled="adding"
                  class="neubrutal-btn bg-neo-yellow text-black border-3 border-black py-2.5 rounded-[2px] font-outfit font-black text-xs md:text-sm shadow-neo-sm hover:bg-yellow-300 disabled:opacity-60"
                  @click="handleAddToCart"
                >
                  {{ adding ? 'Memproses...' : '+ Keranjang' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>
