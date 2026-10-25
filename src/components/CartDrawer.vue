<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/composables/useStore'
import BookCover from './BookCover.vue'

const router = useRouter()
const {
  state,
  closeCart,
  removeFromCart,
  updateQuantity,
  showToast,
  selectedCount,
  selectedTotal,
  toggleSelectItem,
  selectAllItems,
  deselectAllItems,
  clearCart,
  cartCount,
} = useStore()

const selCount = computed(() => selectedCount())
const selTotal = computed(() => selectedTotal())

const formattedSubtotal = computed(() =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(selTotal.value),
)

const itemToDelete = ref(null)
const isConfirmOpen = ref(false)
const isClearConfirmOpen = ref(false)
const clearingCart = ref(false)

function promptDelete(item) {
  itemToDelete.value = item
  isConfirmOpen.value = true
}

function cancelDelete() {
  itemToDelete.value = null
  isConfirmOpen.value = false
}

function executeDelete() {
  if (itemToDelete.value) {
    removeFromCart(itemToDelete.value.id)
    cancelDelete()
  }
}

async function executeClearCart() {
  if (clearingCart.value) return
  clearingCart.value = true
  try {
    const cleared = await clearCart()
    if (cleared) isClearConfirmOpen.value = false
  } finally {
    clearingCart.value = false
  }
}

function goToCheckout() {
  if (selCount.value === 0) {
    showToast('Pilih minimal 1 buku untuk checkout', { type: 'error' })
    return
  }
  closeCart()
  router.push({ name: 'checkout' })
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    if (isClearConfirmOpen.value) {
      isClearConfirmOpen.value = false
    } else if (isConfirmOpen.value) {
      cancelDelete()
    } else if (state.isCartOpen) {
      closeCart()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div>
    <transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="state.isCartOpen"
        class="fixed inset-0 bg-black/60 z-50 backdrop-blur-xs"
        @click="closeCart"
      ></div>
    </transition>

    <transition
      enter-active-class="transition-transform duration-300 ease-out"
      leave-active-class="transition-transform duration-200 ease-in"
      enter-from-class="translate-x-full"
      leave-to-class="translate-x-full"
    >
      <aside
        v-if="state.isCartOpen"
        class="fixed top-0 right-0 bottom-0 w-full sm:max-w-md bg-background border-l-3 sm:border-l-4 border-black z-50 flex flex-col shadow-[-6px_0px_0px_0px_#000] sm:shadow-[-8px_0px_0px_0px_#000]"
        aria-label="Keranjang Belanja"
      >
        <div
          class="p-4 sm:p-5 bg-white border-b-3 sm:border-b-4 border-black flex items-center justify-between"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 bg-neo-yellow border-2 border-black flex items-center justify-center shadow-neo-sm"
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
                <circle cx="8" cy="21" r="1.2" fill="currentColor" />
                <circle cx="19" cy="21" r="1.2" fill="currentColor" />
                <path
                  d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"
                />
              </svg>
            </div>
            <div>
              <h2 class="font-outfit font-black text-xl leading-none">KERANJANG SAYA</h2>
              <p class="font-sans text-xs font-bold text-muted-foreground mt-0.5">
                {{ cartCount() }} item · {{ selCount }} dipilih
              </p>
            </div>
          </div>
          <button
            class="neubrutal-btn bg-white border-2 border-black p-2 shadow-neo-sm hover:bg-gray-100"
            aria-label="Tutup keranjang"
            @click="closeCart"
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

        <div
          v-if="state.cart.length > 0"
          class="bg-neo-lime/50 border-b-2 border-black px-4 py-2.5 flex items-center justify-between"
        >
          <button
            class="font-outfit font-black text-xs hover:underline"
            @click="selCount === state.cart.length ? deselectAllItems() : selectAllItems()"
          >
            {{ selCount === state.cart.length ? '✗ Batalkan semua' : '✓ Pilih semua' }}
          </button>
          <span class="font-outfit font-black text-xs text-muted-foreground">
            {{ selCount }}/{{ state.cart.length }} dipilih
          </span>
          <button
            type="button"
            class="font-outfit font-black text-xs text-red-700 hover:underline"
            @click="isClearConfirmOpen = true"
          >
            Kosongkan
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-3">
          <div
            v-if="state.cart.length === 0"
            class="py-12 sm:py-16 px-4 flex flex-col items-center justify-center text-center"
          >
            <div class="relative inline-block mb-5">
              <div
                class="w-20 h-20 sm:w-22 sm:h-22 bg-neo-yellow border-3 border-black flex items-center justify-center shadow-neo rotate-[-3deg] transition-transform hover:rotate-0"
              >
                <svg
                  class="w-10 h-10 sm:w-11 sm:h-11 text-black"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="8" cy="21" r="1.2" fill="currentColor" />
                  <circle cx="19" cy="21" r="1.2" fill="currentColor" />
                  <path
                    d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"
                  />
                </svg>
              </div>

              <div
                class="absolute -bottom-2 -right-2 bg-neo-violet text-white border-2 border-black w-8 h-8 rounded-[2px] flex items-center justify-center shadow-neo-sm rotate-[12deg]"
              >
                <svg
                  class="w-4 h-4 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                  <path d="M6 6h10" />
                  <path d="M6 10h10" />
                </svg>
              </div>
            </div>

            <h3
              class="font-outfit font-black text-2xl sm:text-3xl text-black tracking-tight leading-tight"
            >
              Keranjangmu Kosong
            </h3>
            <p
              class="font-sans text-xs sm:text-sm font-semibold text-muted-foreground mt-2 max-w-[280px] mx-auto leading-relaxed"
            >
              Yuk jelajahi rak buku kami dan temukan bacaan seru berikutnya!
            </p>

            <button
              class="neubrutal-btn mt-6 bg-neo-yellow text-black border-3 border-black py-3 px-8 font-outfit font-black text-sm sm:text-base shadow-neo hover:bg-yellow-300 transition-all flex items-center justify-center gap-2 cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
              @click="closeCart"
            >
              <span>Mulai Belanja</span>
              <svg
                class="w-4 h-4 text-black shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          </div>

          <article
            v-for="item in state.cart"
            :key="item.id"
            class="bg-white border-2 sm:border-3 border-black p-3 sm:p-3.5 shadow-neo-sm sm:shadow-neo flex gap-3 relative group"
            :class="{ 'opacity-50': !item.selected }"
          >
            <div class="flex items-start pt-0.5">
              <button
                class="w-6 h-6 border-2 border-black flex items-center justify-center shrink-0 transition-all"
                :class="item.selected ? 'bg-neo-violet border-neo-violet' : 'bg-white'"
                @click="toggleSelectItem(item.id)"
              >
                <svg
                  v-if="item.selected"
                  class="w-3.5 h-3.5 text-white"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>

            <div
              class="w-16 h-22 shrink-0 border-2 border-black overflow-hidden shadow-neo-sm bg-background"
            >
              <BookCover
                :theme="item.theme || 'violet'"
                :title="item.title"
                :author="item.author"
                class="w-full h-full"
              />
            </div>

            <div class="flex-1 flex flex-col justify-between">
              <div>
                <div class="flex items-start justify-between gap-1">
                  <h4 class="font-outfit font-black text-sm leading-snug line-clamp-1">
                    {{ item.title }}
                  </h4>
                  <button
                    class="text-gray-400 hover:text-red-600 transition-colors p-0.5"
                    title="Hapus"
                    @click="promptDelete(item)"
                  >
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
                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                      />
                    </svg>
                  </button>
                </div>
                <p class="font-sans text-[11px] font-bold text-muted-foreground truncate">
                  {{ item.author }}
                </p>
              </div>

              <div class="flex items-center justify-between mt-2 pt-2 border-t border-black/10">
                <span class="font-outfit font-black text-sm">
                  {{
                    new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0,
                    }).format(item.price * item.quantity)
                  }}
                </span>
                <div class="flex items-center border-2 border-black bg-white shadow-neo-sm">
                  <button
                    class="w-7 h-7 flex items-center justify-center font-outfit font-black text-xs hover:bg-gray-100 border-r border-black"
                    @click="updateQuantity(item.id, item.quantity - 1)"
                  >
                    −
                  </button>
                  <span class="w-8 text-center font-outfit font-black text-xs">{{
                    item.quantity
                  }}</span>
                  <button
                    class="w-7 h-7 flex items-center justify-center font-outfit font-black text-xs hover:bg-gray-100 border-l border-black"
                    @click="updateQuantity(item.id, item.quantity + 1)"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </article>
        </div>

        <div
          v-if="state.cart.length > 0"
          class="p-4 bg-white border-t-3 sm:border-t-4 border-black space-y-3.5"
        >
          <div class="flex items-center justify-between text-sm font-sans font-bold">
            <span class="text-muted-foreground">Subtotal ({{ selCount }} item)</span>
            <span class="font-outfit font-black text-base text-neo-violet">{{
              formattedSubtotal
            }}</span>
          </div>

          <button
            class="w-full neubrutal-btn bg-neo-yellow text-black border-3 border-black py-3 sm:py-3.5 font-outfit font-black text-sm sm:text-base shadow-neo-sm sm:shadow-neo flex items-center justify-center gap-2 hover:bg-yellow-300"
            @click="goToCheckout"
          >
            <span>CHECKOUT</span>
            <span
              ><svg
                class="w-4 h-4 text-black shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M5 12h14"></path>
                <path d="m12 5 7 7-7 7"></path></svg
            ></span>
          </button>
        </div>
      </aside>
    </transition>

    <transition
      enter-active-class="transition-opacity duration-150"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isConfirmOpen"
        class="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4 backdrop-blur-xs"
        @click.self="cancelDelete"
      >
        <div
          class="w-full max-w-sm bg-white border-3 sm:border-4 border-black p-5 sm:p-6 shadow-[6px_6px_0px_0px_#000] sm:shadow-[8px_8px_0px_0px_#000]"
          role="dialog"
          aria-modal="true"
        >
          <div class="flex items-center gap-3 mb-3">
            <div
              class="w-10 h-10 bg-neo-pink border-2 border-black flex items-center justify-center shadow-neo-sm shrink-0"
            >
              <svg
                class="w-5 h-5 text-black"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                />
              </svg>
            </div>
            <div>
              <h3 class="font-outfit font-black text-base sm:text-lg leading-tight text-black">
                Hapus dari Keranjang?
              </h3>
              <p class="font-sans text-xs font-bold text-muted-foreground mt-0.5">
                Buku ini akan dihapus dari keranjang belanja.
              </p>
            </div>
          </div>

          <div
            v-if="itemToDelete"
            class="bg-neutral-100 border-2 border-black p-3 mb-4 flex items-center justify-between gap-3"
          >
            <div class="min-w-0 flex-1">
              <p class="font-outfit font-black text-xs truncate text-black">
                {{ itemToDelete.title }}
              </p>
              <p class="font-sans text-[11px] font-bold text-muted-foreground truncate">
                {{ itemToDelete.author }}
              </p>
            </div>
            <span class="font-outfit font-black text-xs text-neo-violet shrink-0">
              {{
                new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0,
                }).format(itemToDelete.price * itemToDelete.quantity)
              }}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              class="neubrutal-btn bg-white hover:bg-gray-100 text-black border-2 border-black py-2.5 px-3 font-outfit font-black text-xs sm:text-sm shadow-neo-sm text-center"
              @click="cancelDelete"
            >
              Batal
            </button>
            <button
              type="button"
              class="neubrutal-btn bg-red-600 hover:bg-red-500 text-white border-2 border-black py-2.5 px-3 font-outfit font-black text-xs sm:text-sm shadow-neo-sm text-center"
              @click="executeDelete"
            >
              Ya, Hapus
            </button>
          </div>
        </div>
      </div>
    </transition>

    <transition
      enter-active-class="transition-opacity duration-150"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isClearConfirmOpen"
        class="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4 backdrop-blur-xs"
        @click.self="isClearConfirmOpen = false"
      >
        <div
          class="w-full max-w-sm bg-white border-3 sm:border-4 border-black p-5 sm:p-6 shadow-[6px_6px_0px_0px_#000] sm:shadow-[8px_8px_0px_0px_#000]"
          role="dialog"
          aria-modal="true"
        >
          <div class="flex items-center gap-3 mb-3">
            <div
              class="w-10 h-10 bg-neo-pink border-2 border-black flex items-center justify-center shadow-neo-sm shrink-0"
            >
              <svg
                class="w-5 h-5 text-black"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                />
              </svg>
            </div>
            <div>
              <h3 class="font-outfit font-black text-base sm:text-lg leading-tight text-black">
                Kosongkan Keranjang?
              </h3>
              <p class="font-sans text-xs font-bold text-muted-foreground mt-0.5">
                Semua {{ state.cart.length }} buku akan dihapus dari keranjang.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              class="neubrutal-btn bg-white hover:bg-gray-100 text-black border-2 border-black py-2.5 px-3 font-outfit font-black text-xs sm:text-sm shadow-neo-sm text-center"
              @click="isClearConfirmOpen = false"
            >
              Batal
            </button>
            <button
              type="button"
              :disabled="clearingCart"
              class="neubrutal-btn bg-red-600 hover:bg-red-500 text-white border-2 border-black py-2.5 px-3 font-outfit font-black text-xs sm:text-sm shadow-neo-sm text-center disabled:opacity-60"
              @click="executeClearCart"
            >
              {{ clearingCart ? 'Menghapus...' : 'Ya, Kosongkan' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>
