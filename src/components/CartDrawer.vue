<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/composables/useStore'
import BookCover from './BookCover.vue'

const router = useRouter()
const { state, closeCart, removeFromCart, updateQuantity, showToast, selectedCount, selectedTotal, toggleSelectItem, selectAllItems, deselectAllItems, cartCount } = useStore()

const selCount = computed(() => selectedCount())
const selTotal = computed(() => selectedTotal())

const formattedSubtotal = computed(() =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(selTotal.value),
)

function goToCheckout() {
  if (selCount.value === 0) {
    showToast('Pilih minimal 1 buku untuk checkout', { type: 'error' })
    return
  }
  closeCart()
  router.push({ name: 'checkout' })
}
</script>

<template>
  <div>
    <!-- Backdrop -->
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

    <!-- Slide-over Drawer -->
    <transition
      enter-active-class="transition-transform duration-300 ease-out"
      leave-active-class="transition-transform duration-200 ease-in"
      enter-from-class="translate-x-full"
      leave-to-class="translate-x-full"
    >
      <aside
        v-if="state.isCartOpen"
        class="fixed top-0 right-0 bottom-0 w-full max-w-md bg-background border-l-4 border-black z-50 flex flex-col shadow-[-8px_0px_0px_0px_#000]"
        aria-label="Keranjang Belanja"
      >
        <!-- Header -->
        <div class="p-4 sm:p-5 bg-white border-b-4 border-black flex items-center justify-between">
          <div class="flex items-center gap-3">
            <!-- Cart icon matching header style -->
            <div class="w-10 h-10 bg-neo-yellow border-2 border-black flex items-center justify-center shadow-neo-sm">
              <svg class="w-5 h-5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="8" cy="21" r="1.2" fill="currentColor" />
                <circle cx="19" cy="21" r="1.2" fill="currentColor" />
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
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
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Select all / deselect all -->
        <div v-if="state.cart.length > 0" class="bg-neo-lime/50 border-b-2 border-black px-4 py-2.5 flex items-center justify-between">
          <button
            class="font-outfit font-black text-xs hover:underline"
            @click="selCount === state.cart.length ? deselectAllItems() : selectAllItems()"
          >
            {{ selCount === state.cart.length ? '✗ Batalkan semua' : '✓ Pilih semua' }}
          </button>
          <span class="font-outfit font-black text-xs text-muted-foreground">
            {{ selCount }}/{{ state.cart.length }} dipilih
          </span>
        </div>

        <!-- Item list -->
        <div class="flex-1 overflow-y-auto p-4 space-y-3">
          <div v-if="state.cart.length === 0" class="py-16 text-center">
            <div class="w-20 h-20 mx-auto mb-4 bg-white border-3 border-black flex items-center justify-center shadow-neo">
              <svg class="w-10 h-10 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="8" cy="21" r="1.2" fill="currentColor" />
                <circle cx="19" cy="21" r="1.2" fill="currentColor" />
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
              </svg>
            </div>
            <h3 class="font-outfit font-black text-xl">Keranjangmu Kosong</h3>
            <p class="font-sans text-xs font-bold text-muted-foreground mt-1 max-w-xs mx-auto">
              Yuk jelajahi rak buku kami dan temukan bacaan seru berikutnya!
            </p>
            <button
              class="neubrutal-btn mt-5 bg-neo-yellow text-black border-3 border-black py-2.5 px-6 font-outfit font-black text-sm shadow-neo"
              @click="closeCart"
            >
              Mulai Belanja →
            </button>
          </div>

          <article
            v-for="item in state.cart"
            :key="`${item.id}-${item.format}`"
            class="bg-white border-3 border-black p-3.5 shadow-neo flex gap-3 relative group"
            :class="{ 'opacity-50': !item.selected }"
          >
            <!-- Checkbox -->
            <div class="flex items-start pt-0.5">
              <button
                class="w-6 h-6 border-2 border-black flex items-center justify-center shrink-0 transition-all"
                :class="item.selected ? 'bg-neo-violet border-neo-violet' : 'bg-white'"
                @click="toggleSelectItem(item.id, item.format)"
              >
                <svg v-if="item.selected" class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>

            <!-- Thumbnail cover -->
            <div class="w-16 h-22 shrink-0 border-2 border-black overflow-hidden shadow-neo-sm bg-background">
              <BookCover
                :theme="item.theme || 'violet'"
                :title="item.title"
                :author="item.author"
                class="w-full h-full"
              />
            </div>

            <!-- Meta & controls -->
            <div class="flex-1 flex flex-col justify-between">
              <div>
                <div class="flex items-start justify-between gap-1">
                  <h4 class="font-outfit font-black text-sm leading-snug line-clamp-1">{{ item.title }}</h4>
                  <button
                    class="text-gray-400 hover:text-red-600 transition-colors p-0.5"
                    title="Hapus"
                    @click="removeFromCart(item.id, item.format)"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
                <p class="font-sans text-[11px] font-bold text-muted-foreground truncate">{{ item.author }}</p>
                <span class="inline-block mt-1 bg-neo-yellow/50 border border-black px-1.5 py-0.2 font-outfit font-black text-[9px] uppercase">
                  {{ item.format || 'Soft Cover' }}
                </span>
              </div>

              <!-- Price & Stepper -->
              <div class="flex items-center justify-between mt-2 pt-2 border-t border-black/10">
                <span class="font-outfit font-black text-sm">
                  {{ new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.price * item.quantity) }}
                </span>
                <div class="flex items-center border-2 border-black bg-white shadow-neo-sm">
                  <button
                    class="w-7 h-7 flex items-center justify-center font-outfit font-black text-xs hover:bg-gray-100 border-r border-black"
                    @click="updateQuantity(item.id, item.quantity - 1, item.format)"
                  >
                    −
                  </button>
                  <span class="w-8 text-center font-outfit font-black text-xs">{{ item.quantity }}</span>
                  <button
                    class="w-7 h-7 flex items-center justify-center font-outfit font-black text-xs hover:bg-gray-100 border-l border-black"
                    @click="updateQuantity(item.id, item.quantity + 1, item.format)"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </article>
        </div>

        <!-- Footer / Checkout -->
        <div v-if="state.cart.length > 0" class="p-4 bg-white border-t-4 border-black space-y-3.5">
          <div class="flex items-center justify-between text-sm font-sans font-bold">
            <span class="text-muted-foreground">Subtotal ({{ selCount }} item)</span>
            <span class="font-outfit font-black text-base text-neo-violet">{{ formattedSubtotal }}</span>
          </div>

          <!-- Checkout CTA -->
          <button
            class="w-full neubrutal-btn bg-neo-yellow text-black border-3 border-black py-3.5 font-outfit font-black text-base shadow-neo flex items-center justify-center gap-2 hover:bg-yellow-300"
            @click="goToCheckout"
          >
            <span>CHECKOUT ({{ selCount }} ITEM)</span>
            <span>→</span>
          </button>
        </div>
      </aside>
    </transition>
  </div>
</template>
