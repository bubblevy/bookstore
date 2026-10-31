<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/composables/useStore'
import { assetUrl } from '@/lib/assets'
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
  isCartPending,
} = useStore()

const selCount = computed(() => selectedCount())
const selTotal = computed(() => selectedTotal())

function formatPrice(val) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(Number(val) || 0)
}

const formattedSubtotal = computed(() => formatPrice(selTotal.value))

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

function goToBook(item) {
  const target = item.slug || item.bookId
  if (target) {
    closeCart()
    router.push({ name: 'book-detail', params: { id: target } })
  }
}

function startShopping() {
  closeCart()
  router.push({ name: 'catalog' })
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
        class="fixed inset-0 bg-black/50 z-50 backdrop-blur-xs"
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
        class="fixed top-0 right-0 bottom-0 w-full sm:max-w-md bg-white border-l-2 sm:border-l-3 border-black z-50 flex flex-col shadow-[-8px_0px_0px_0px_rgba(0,0,0,1)] select-none"
        aria-label="Keranjang Belanja"
      >
                <div class="px-5 py-4 bg-white border-b-2 border-black flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="w-9 h-9 bg-neo-yellow border-2 border-black rounded-[2px] flex items-center justify-center shadow-neo-xs shrink-0"
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
              <div class="flex items-center gap-2">
                <h2 class="font-outfit font-black text-lg text-neutral-900 leading-none tracking-tight">
                  KERANJANG BELANJA
                </h2>
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-[2px] bg-neutral-100 border border-black/15 font-outfit font-bold text-[11px] text-neutral-700 tabular-nums"
                >
                  {{ cartCount() }}
                </span>
              </div>
              <p class="font-sans text-xs font-semibold text-neutral-500 mt-0.5">
                {{ selCount }} buku dipilih untuk checkout
              </p>
            </div>
          </div>

          <button
            class="w-8 h-8 rounded-[2px] border-2 border-black bg-white hover:bg-neutral-100 flex items-center justify-center shadow-neo-xs hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
            aria-label="Tutup keranjang"
            @click="closeCart"
          >
            <svg
              class="w-4 h-4 text-neutral-800"
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
          class="bg-neutral-50 border-b border-black/15 px-5 py-2.5 flex items-center justify-between"
        >
          <button
            type="button"
            class="inline-flex items-center gap-2 text-left group cursor-pointer transition-colors"
            @click="selCount === state.cart.length ? deselectAllItems() : selectAllItems()"
          >
            <span
              class="w-4 h-4 rounded-[2px] border-2 border-black flex items-center justify-center transition-all"
              :class="
                selCount === state.cart.length
                  ? 'bg-neo-violet border-neo-violet text-white'
                  : selCount > 0
                    ? 'bg-neo-violet/20 border-black'
                    : 'bg-white group-hover:bg-neutral-100'
              "
            >
              <svg
                v-if="selCount === state.cart.length"
                class="w-3 h-3 text-white"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span v-else-if="selCount > 0" class="w-1.5 h-1.5 bg-neo-violet rounded-[1px]"></span>
            </span>
            <span class="font-outfit font-bold text-xs text-neutral-800 group-hover:text-black">
              Pilih Semua
              <span class="text-neutral-500 font-normal">({{ selCount }}/{{ state.cart.length }})</span>
            </span>
          </button>

          <button
            type="button"
            class="font-outfit font-bold text-xs text-neutral-500 hover:text-red-600 transition-colors inline-flex items-center gap-1 cursor-pointer"
            @click="isClearConfirmOpen = true"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
              />
            </svg>
            <span>Kosongkan</span>
          </button>
        </div>

                <div class="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-50/60">
                    <div
            v-if="state.cart.length === 0"
            class="py-14 sm:py-16 px-4 flex flex-col items-center justify-center text-center"
          >
            <div class="relative inline-block mb-5">
              <div
                class="w-20 h-20 bg-neo-yellow/20 border-2 border-black rounded-[2px] flex items-center justify-center shadow-neo-sm rotate-[-3deg]"
              >
                <svg
                  class="w-9 h-9 text-neutral-800"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
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
                class="absolute -bottom-1.5 -right-1.5 bg-neo-violet text-white border-2 border-black w-7 h-7 rounded-[2px] flex items-center justify-center shadow-neo-xs rotate-6"
              >
                <svg
                  class="w-3.5 h-3.5 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
            </div>

            <h3 class="font-outfit font-black text-xl text-neutral-900 tracking-tight">
              Keranjangmu Masih Kosong
            </h3>
            <p class="font-sans text-xs font-semibold text-neutral-500 mt-2 max-w-[260px] mx-auto leading-relaxed">
              Yuk temukan bacaan seru dan tambahkan buku favoritmu ke keranjang!
            </p>

            <button
              type="button"
              class="mt-6 neubrutal-btn bg-black text-white hover:bg-neutral-800 border-2 border-black px-5 py-2.5 font-outfit font-bold text-xs uppercase tracking-wider shadow-neo-xs hover:shadow-neo-sm inline-flex items-center gap-2 cursor-pointer transition-all"
              @click="startShopping"
            >
              <span>Mulai Belanja</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>

                    <article
            v-for="item in state.cart"
            :key="item.id"
            class="bg-white border-2 rounded-[2px] p-3.5 transition-all duration-150 flex gap-3 relative group"
            :class="
              item.selected
                ? 'border-black shadow-neo-xs hover:shadow-neo-sm'
                : 'border-neutral-200 bg-neutral-50/50 opacity-60'
            "
          >
                        <div class="flex items-start pt-1">
              <button
                type="button"
                class="w-5 h-5 rounded-[2px] border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer"
                :class="
                  item.selected
                    ? 'bg-neo-violet border-neo-violet text-white shadow-xs'
                    : 'bg-white border-neutral-400 hover:border-black'
                "
                :aria-label="item.selected ? 'Batalkan pilihan item' : 'Pilih item'"
                @click="toggleSelectItem(item.id)"
              >
                <svg
                  v-if="item.selected"
                  class="w-3 h-3 text-white"
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
              class="w-16 h-22 shrink-0 border-2 border-black rounded-[2px] overflow-hidden shadow-neo-xs bg-neutral-100 flex items-center justify-center cursor-pointer transition-transform group-hover:scale-[1.02]"
              @click="goToBook(item)"
            >
              <img
                v-if="item.coverImage"
                :src="assetUrl(item.coverImage)"
                :alt="item.title"
                class="w-full h-full object-cover"
                loading="lazy"
                @error="item.coverImage = ''"
              />
              <BookCover
                v-else
                :theme="item.theme || 'violet'"
                :title="item.title"
                :author="item.author"
                class="w-full h-full"
              />
            </div>

                        <div class="flex-1 flex flex-col justify-between min-w-0">
              <div>
                <div class="flex items-start justify-between gap-2">
                  <h4
                    class="font-outfit font-black text-sm text-neutral-900 leading-snug line-clamp-1 hover:text-neo-violet transition-colors cursor-pointer"
                    :title="item.title"
                    @click="goToBook(item)"
                  >
                    {{ item.title }}
                  </h4>
                  <button
                    type="button"
                    :disabled="isCartPending(item.id)"
                    class="text-neutral-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-[2px] transition-colors cursor-pointer disabled:opacity-40 shrink-0"
                    title="Hapus buku"
                    aria-label="Hapus buku"
                    @click="promptDelete(item)"
                  >
                    <svg
                      class="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.2"
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
                <p class="font-sans text-xs font-semibold text-neutral-500 truncate mt-0.5">
                  {{ item.author }}
                </p>
              </div>

                            <div class="flex items-center justify-between mt-3 pt-2.5 border-t border-neutral-100">
                <div>
                  <span class="font-outfit font-black text-sm text-neutral-900 leading-none">
                    {{ formatPrice(item.price * item.quantity) }}
                  </span>
                  <p v-if="item.quantity > 1" class="font-sans text-[10px] font-semibold text-neutral-400 mt-0.5">
                    @ {{ formatPrice(item.price) }}
                  </p>
                </div>

                <div class="inline-flex items-center border-2 border-black rounded-[2px] bg-white shadow-neo-xs overflow-hidden">
                  <button
                    type="button"
                    :disabled="isCartPending(item.id) || item.quantity <= 1"
                    class="w-7 h-7 flex items-center justify-center font-outfit font-black text-xs hover:bg-neutral-100 border-r border-black/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    aria-label="Kurangi jumlah"
                    @click="updateQuantity(item.id, item.quantity - 1)"
                  >
                    −
                  </button>
                  <span class="w-8 text-center font-outfit font-black text-xs tabular-nums select-none">
                    <span v-if="isCartPending(item.id)" class="inline-block animate-pulse text-neo-violet">…</span>
                    <span v-else>{{ item.quantity }}</span>
                  </span>
                  <button
                    type="button"
                    :disabled="isCartPending(item.id) || (item.stock > 0 && item.quantity >= item.stock)"
                    class="w-7 h-7 flex items-center justify-center font-outfit font-black text-xs hover:bg-neutral-100 border-l border-black/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    aria-label="Tambah jumlah"
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
          class="p-4 sm:p-5 bg-white border-t-2 border-black space-y-3.5 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]"
        >

                    <div class="flex items-baseline justify-between">
            <div>
              <div class="font-sans text-xs font-bold text-neutral-500 uppercase tracking-wider">
                Subtotal
              </div>
              <div class="font-sans text-[11px] text-neutral-400 font-semibold">
                {{ selCount }} dari {{ state.cart.length }} buku dipilih
              </div>
            </div>
            <div class="text-right">
              <span class="font-outfit font-black text-xl text-neo-violet tracking-tight">
                {{ formattedSubtotal }}
              </span>
            </div>
          </div>

                    <button
            type="button"
            class="w-full neubrutal-btn border-2 border-black py-3 sm:py-3.5 font-outfit font-black text-sm tracking-wide flex items-center justify-center gap-2 cursor-pointer transition-all"
            :class="
              selCount > 0
                ? 'bg-neo-yellow text-black hover:bg-yellow-300 shadow-neo-sm sm:shadow-neo'
                : 'bg-neutral-200 text-neutral-400 border-neutral-300 cursor-not-allowed shadow-none'
            "
            :disabled="selCount === 0"
            @click="goToCheckout"
          >
            <span>CHECKOUT ({{ selCount }})</span>
            <svg
              class="w-4 h-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
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
        class="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-xs"
        @click.self="cancelDelete"
      >
        <div
          class="w-full max-w-sm bg-white border-2 sm:border-3 border-black rounded-[2px] p-5 sm:p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] animate-hero-entrance"
          role="dialog"
          aria-modal="true"
        >
          <div class="flex items-center gap-3 mb-3">
            <div
              class="w-10 h-10 bg-neo-pink border-2 border-black rounded-[2px] flex items-center justify-center shadow-neo-xs shrink-0"
            >
              <svg
                class="w-5 h-5 text-black"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
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
              <h3 class="font-outfit font-black text-base sm:text-lg leading-tight text-neutral-900">
                Hapus dari Keranjang?
              </h3>
              <p class="font-sans text-xs font-semibold text-neutral-500 mt-0.5">
                Buku ini akan dikeluarkan dari daftar belanja.
              </p>
            </div>
          </div>

          <div
            v-if="itemToDelete"
            class="bg-neutral-50 border border-black/20 rounded-[2px] p-3 mb-4 flex items-center justify-between gap-3"
          >
            <div class="min-w-0 flex-1">
              <p class="font-outfit font-black text-xs truncate text-neutral-900">
                {{ itemToDelete.title }}
              </p>
              <p class="font-sans text-[11px] font-semibold text-neutral-500 truncate mt-0.5">
                {{ itemToDelete.author }}
              </p>
            </div>
            <span class="font-outfit font-black text-xs text-neo-violet shrink-0">
              {{ formatPrice(itemToDelete.price * itemToDelete.quantity) }}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              class="neubrutal-btn bg-white hover:bg-neutral-100 text-black border-2 border-black py-2.5 px-3 font-outfit font-bold text-xs sm:text-sm shadow-neo-xs text-center cursor-pointer"
              @click="cancelDelete"
            >
              Batal
            </button>
            <button
              type="button"
              class="neubrutal-btn bg-red-600 hover:bg-red-500 text-white border-2 border-black py-2.5 px-3 font-outfit font-bold text-xs sm:text-sm shadow-neo-xs text-center cursor-pointer"
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
        class="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-xs"
        @click.self="isClearConfirmOpen = false"
      >
        <div
          class="w-full max-w-sm bg-white border-2 sm:border-3 border-black rounded-[2px] p-5 sm:p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] animate-hero-entrance"
          role="dialog"
          aria-modal="true"
        >
          <div class="flex items-center gap-3 mb-3">
            <div
              class="w-10 h-10 bg-neo-pink border-2 border-black rounded-[2px] flex items-center justify-center shadow-neo-xs shrink-0"
            >
              <svg
                class="w-5 h-5 text-black"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
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
              <h3 class="font-outfit font-black text-base sm:text-lg leading-tight text-neutral-900">
                Kosongkan Keranjang?
              </h3>
              <p class="font-sans text-xs font-semibold text-neutral-500 mt-0.5">
                Semua {{ state.cart.length }} buku akan dihapus dari keranjang belanja.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2.5 mt-5">
            <button
              type="button"
              class="neubrutal-btn bg-white hover:bg-neutral-100 text-black border-2 border-black py-2.5 px-3 font-outfit font-bold text-xs sm:text-sm shadow-neo-xs text-center cursor-pointer"
              @click="isClearConfirmOpen = false"
            >
              Batal
            </button>
            <button
              type="button"
              :disabled="clearingCart"
              class="neubrutal-btn bg-red-600 hover:bg-red-500 text-white border-2 border-black py-2.5 px-3 font-outfit font-bold text-xs sm:text-sm shadow-neo-xs text-center disabled:opacity-60 cursor-pointer"
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
