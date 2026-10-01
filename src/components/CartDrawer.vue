<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/composables/useStore'
import BookCover from './BookCover.vue'

const router = useRouter()
const { state, closeCart, removeFromCart, updateQuantity, clearCart, showToast, cartTotal, cartCount } = useStore()

const promoCode = ref('')
const discountApplied = ref(false)

const subtotal = computed(() => cartTotal())
const freeShippingThreshold = 150000
const progressToFreeShipping = computed(() => Math.min(100, (subtotal.value / freeShippingThreshold) * 100))
const remainingForFreeShipping = computed(() => Math.max(0, freeShippingThreshold - subtotal.value))

const discountAmount = computed(() => (discountApplied.value ? Math.round(subtotal.value * 0.1) : 0))
const shippingCost = computed(() => (subtotal.value >= freeShippingThreshold || subtotal.value === 0 ? 0 : 15000))
const finalTotal = computed(() => subtotal.value - discountAmount.value + shippingCost.value)

const formattedSubtotal = computed(() =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(subtotal.value),
)
const formattedFinalTotal = computed(() =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(finalTotal.value),
)
const formattedRemaining = computed(() =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(remainingForFreeShipping.value),
)

function applyPromo() {
  if (promoCode.value.toUpperCase() === 'NEOBOOK' || promoCode.value.toUpperCase() === 'DISKON10') {
    discountApplied.value = true
    showToast('Kupon diskon 10% berhasil dipasang! 🎉', { type: 'success' })
  } else {
    showToast('Kode kupon tidak valid. Coba kode: "NEOBOOK"', { type: 'error' })
  }
}

function handleCheckout() {
  showToast('Simulasi checkout berhasil! Terima kasih telah berbelanja di BookStore.', { type: 'success' })
  clearCart()
  closeCart()
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
            <div class="w-10 h-10 bg-neo-yellow border-2 border-black flex items-center justify-center shadow-neo-sm font-outfit font-black text-lg">
              🛒
            </div>
            <div>
              <h2 class="font-outfit font-black text-xl leading-none">KERANJANG SAYA</h2>
              <p class="font-sans text-xs font-bold text-muted-foreground mt-0.5">
                {{ cartCount() }} item terpilih
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

        <!-- Free shipping progress bar -->
        <div class="bg-neo-yellow/30 p-3.5 border-b-2 border-black">
          <div class="flex items-center justify-between text-xs font-outfit font-black mb-1.5">
            <span v-if="remainingForFreeShipping > 0">
              Tambah {{ formattedRemaining }} lagi untuk <span class="bg-neo-yellow px-1 py-0.2 border border-black">GRATIS ONGKIR</span>
            </span>
            <span v-else class="text-green-700 flex items-center gap-1">
              🎉 Selamat! Kamu dapat GRATIS ONGKIR!
            </span>
            <span>{{ Math.round(progressToFreeShipping) }}%</span>
          </div>
          <div class="w-full h-3 bg-white border-2 border-black overflow-hidden p-0.5">
            <div
              class="h-full bg-neo-violet transition-all duration-300"
              :style="{ width: `${progressToFreeShipping}%` }"
            ></div>
          </div>
        </div>

        <!-- Item list -->
        <div class="flex-1 overflow-y-auto p-4 space-y-3">
          <div v-if="state.cart.length === 0" class="py-16 text-center">
            <div class="w-20 h-20 mx-auto mb-4 bg-white border-3 border-black flex items-center justify-center text-3xl shadow-neo">
              📚
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
          >
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
                      <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
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
          <!-- Promo code input -->
          <div class="flex gap-2">
            <input
              v-model="promoCode"
              type="text"
              placeholder="Kode Kupon (e.g. NEOBOOK)"
              class="flex-1 bg-background border-2 border-black px-3 py-2 font-outfit font-bold text-xs uppercase outline-none shadow-neo-sm"
            />
            <button
              class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-yellow-300"
              @click="applyPromo"
            >
              Pasang
            </button>
          </div>

          <!-- Price summary -->
          <div class="space-y-1.5 text-xs font-sans font-bold">
            <div class="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span class="font-outfit text-black font-black">{{ formattedSubtotal }}</span>
            </div>
            <div v-if="discountApplied" class="flex justify-between text-green-600">
              <span>Diskon Kupon (10%)</span>
              <span class="font-outfit font-black">-{{ new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(discountAmount) }}</span>
            </div>
            <div class="flex justify-between text-muted-foreground">
              <span>Estimasi Ongkir</span>
              <span class="font-outfit text-black font-black">
                {{ shippingCost === 0 ? 'GRATIS' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(shippingCost) }}
              </span>
            </div>
            <div class="flex justify-between text-base font-outfit font-black pt-2 border-t-2 border-black">
              <span>TOTAL</span>
              <span class="text-neo-violet text-lg">{{ formattedFinalTotal }}</span>
            </div>
          </div>

          <!-- Checkout CTA -->
          <button
            class="w-full neubrutal-btn bg-neo-yellow text-black border-3 border-black py-3.5 font-outfit font-black text-base shadow-neo flex items-center justify-center gap-2 hover:bg-yellow-300"
            @click="handleCheckout"
          >
            <span>CHECKOUT SEKARANG</span>
            <span>→</span>
          </button>
        </div>
      </aside>
    </transition>
  </div>
</template>
