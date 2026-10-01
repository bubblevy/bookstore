<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/composables/useStore'
import BookCover from '@/components/BookCover.vue'

const router = useRouter()
const { state, updateQuantity, removeFromCart, clearCart, showToast } = useStore()

const items = computed(() => state.cart.filter((item) => item.selected))
const subtotal = computed(() =>
  items.value.reduce((sum, item) => sum + item.price * item.quantity, 0),
)
const freeShippingThreshold = 150000
const shippingCost = computed(() => (subtotal.value >= freeShippingThreshold || subtotal.value === 0 ? 0 : 15000))
const finalTotal = computed(() => subtotal.value - discountAmount.value + shippingCost.value)

const promoCode = ref('')
const discountApplied = ref(false)
const discountAmount = computed(() => (discountApplied.value ? Math.round(subtotal.value * 0.1) : 0))

const formattedSubtotal = computed(() =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(subtotal.value),
)
const formattedShipping = computed(() =>
  shippingCost.value === 0
    ? 'GRATIS'
    : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(shippingCost.value),
)
const formattedDiscount = computed(() =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(discountAmount.value),
)
const formattedTotal = computed(() =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(finalTotal.value),
)

// Form fields
const form = ref({
  name: '',
  phone: '',
  address: '',
  city: '',
  postalCode: '',
  courier: 'jne',
  payment: 'cod',
})

const orderSuccess = ref(false)

function applyPromo() {
  if (promoCode.value.toUpperCase() === 'NEOBOOK' || promoCode.value.toUpperCase() === 'DISKON10') {
    discountApplied.value = true
    showToast('Kupon diskon 10% berhasil dipasang!', { type: 'success' })
  } else {
    showToast('Kode kupon tidak valid. Coba kode: "NEOBOOK"', { type: 'error' })
  }
}

function placeOrder() {
  if (!form.value.name || !form.value.phone || !form.value.address || !form.value.city) {
    showToast('Lengkapi semua data pengiriman terlebih dahulu', { type: 'error' })
    return
  }
  if (items.value.length === 0) {
    showToast('Tidak ada item yang dipilih', { type: 'error' })
    return
  }
  orderSuccess.value = true
  showToast('Pesanan berhasil dibuat! Terima kasih telah berbelanja di BookStore.', { type: 'success' })
  clearCart()
}

function goBack() {
  router.push({ name: 'home' })
}

function decrement(item) {
  if (item.quantity > 1) {
    updateQuantity(item.id, item.quantity - 1, item.format)
  }
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Header -->
    <header class="bg-white border-b-4 border-black sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center gap-4">
        <button
          class="neubrutal-btn bg-white border-2 border-black w-10 h-10 flex items-center justify-center shadow-neo-sm hover:bg-gray-100"
          @click="goBack"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h1 class="font-outfit font-black text-xl">CHECKOUT</h1>
          <p class="font-sans text-xs font-bold text-muted-foreground">Lengkapi data & buat pesanan</p>
        </div>
      </div>
    </header>

    <!-- Success state -->
    <div v-if="orderSuccess" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
      <div class="w-24 h-24 mx-auto mb-6 bg-neo-lime border-4 border-black flex items-center justify-center shadow-neo-lg">
        <svg class="w-14 h-14 text-black" fill="none" stroke="currentColor" stroke-width="4" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 class="font-outfit font-black text-3xl mb-3">PESANAN BERHASIL!</h2>
      <p class="font-sans text-muted-foreground mb-8 max-w-md mx-auto">
        Terima kasih telah berbelanja di BookStore. Pesananmu akan segera diproses dan dikirimkan ke alamat yang tertera.
      </p>
      <button
        class="neubrutal-btn bg-neo-yellow text-black border-3 border-black py-3.5 px-10 font-outfit font-black text-base shadow-neo"
        @click="router.push({ name: 'home' })"
      >
        Lanjut Belanja →
      </button>
    </div>

    <!-- Main checkout form -->
    <div v-else class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div v-if="items.length === 0" class="text-center py-20">
        <div class="w-20 h-20 mx-auto mb-4 bg-white border-3 border-black flex items-center justify-center shadow-neo">
          <svg class="w-10 h-10 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="8" cy="21" r="1.2" fill="currentColor" />
            <circle cx="19" cy="21" r="1.2" fill="currentColor" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
          </svg>
        </div>
        <h3 class="font-outfit font-black text-xl">Tidak Ada Item Dipilih</h3>
        <p class="font-sans text-xs font-bold text-muted-foreground mt-1">
          Yuk jelajahi rak buku kami dan temukan bacaan seru berikutnya!
        </p>
        <button
          class="mt-5 neubrutal-btn bg-neo-yellow text-black border-3 border-black py-2.5 px-6 font-outfit font-black text-sm shadow-neo"
          @click="goBack"
        >
          Mulai Belanja →
        </button>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        <!-- Left: Form -->
        <div class="lg:col-span-7 space-y-6">
          <!-- Data Pengiriman -->
          <div class="bg-white border-3 border-black shadow-neo p-6 space-y-4">
            <div class="flex items-center gap-2 border-b-2 border-black pb-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
              <h2 class="font-outfit font-black text-lg">DATA PENGIRIMAN</h2>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="sm:col-span-2">
                <label class="block font-outfit font-black text-xs uppercase mb-1">Nama Lengkap *</label>
                <input
                  v-model="form.name"
                  type="text"
                  placeholder="Masukkan nama lengkap"
                  class="w-full bg-background border-2 border-black px-3.5 py-2.5 font-sans font-semibold text-sm outline-none shadow-neo-sm focus:shadow-neo"
                />
              </div>
              <div class="sm:col-span-2">
                <label class="block font-outfit font-black text-xs uppercase mb-1">No. Telepon *</label>
                <input
                  v-model="form.phone"
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  class="w-full bg-background border-2 border-black px-3.5 py-2.5 font-sans font-semibold text-sm outline-none shadow-neo-sm focus:shadow-neo"
                />
              </div>
              <div class="sm:col-span-2">
                <label class="block font-outfit font-black text-xs uppercase mb-1">Alamat Lengkap *</label>
                <textarea
                  v-model="form.address"
                  rows="3"
                  placeholder="Jl. Nama Jalan No. RT/RW, Kelurahan, Kecamatan"
                  class="w-full bg-background border-2 border-black px-3.5 py-2.5 font-sans font-semibold text-sm outline-none shadow-neo-sm focus:shadow-neo resize-none"
                ></textarea>
              </div>
              <div>
                <label class="block font-outfit font-black text-xs uppercase mb-1">Kota/Kabupaten *</label>
                <input
                  v-model="form.city"
                  type="text"
                  placeholder="Jakarta Selatan"
                  class="w-full bg-background border-2 border-black px-3.5 py-2.5 font-sans font-semibold text-sm outline-none shadow-neo-sm focus:shadow-neo"
                />
              </div>
              <div>
                <label class="block font-outfit font-black text-xs uppercase mb-1">Kode Pos</label>
                <input
                  v-model="form.postalCode"
                  type="text"
                  placeholder="12190"
                  class="w-full bg-background border-2 border-black px-3.5 py-2.5 font-sans font-semibold text-sm outline-none shadow-neo-sm focus:shadow-neo"
                />
              </div>
            </div>
          </div>

          <!-- Kurir -->
          <div class="bg-white border-3 border-black shadow-neo p-6 space-y-4">
            <div class="flex items-center gap-2 border-b-2 border-black pb-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
              <h2 class="font-outfit font-black text-lg">PILIH KURIR</h2>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label
                v-for="c in [{ val: 'jne', label: 'JNE', desc: '2-4 hari' }, { val: 'jnt', label: 'J&T', desc: '1-3 hari' }, { val: 'sicepat', label: 'SiCepat', desc: '1-2 hari' }]"
                :key="c.val"
                class="cursor-pointer"
              >
                <input type="radio" v-model="form.courier" :value="c.val" class="sr-only" />
                <div
                  class="border-2 border-black p-3.5 font-outfit font-black text-sm transition-all"
                  :class="form.courier === c.val ? 'bg-neo-yellow shadow-neo' : 'bg-background shadow-neo-sm hover:bg-gray-50'"
                >
                  {{ c.label }}
                  <span class="block font-sans font-bold text-xs text-muted-foreground mt-0.5">{{ c.desc }}</span>
                </div>
              </label>
            </div>
          </div>

          <!-- Pembayaran -->
          <div class="bg-white border-3 border-black shadow-neo p-6 space-y-4">
            <div class="flex items-center gap-2 border-b-2 border-black pb-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
              </svg>
              <h2 class="font-outfit font-black text-lg">METODE PEMBAYARAN</h2>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                v-for="p in [{ val: 'cod', label: 'Bayar di Tempat (COD)' }, { val: 'transfer', label: 'Transfer Bank' }, { val: 'ewallet', label: 'E-Wallet (OVO/GoPay)' }, { val: 'qris', label: 'QRIS' }]"
                :key="p.val"
                class="cursor-pointer"
              >
                <input type="radio" v-model="form.payment" :value="p.val" class="sr-only" />
                <div
                  class="border-2 border-black p-3.5 font-outfit font-black text-sm transition-all"
                  :class="form.payment === p.val ? 'bg-neo-yellow shadow-neo' : 'bg-background shadow-neo-sm hover:bg-gray-50'"
                >
                  {{ p.label }}
                </div>
              </label>
            </div>
          </div>
        </div>

        <!-- Right: Order Summary -->
        <div class="lg:col-span-5">
          <div class="bg-white border-3 border-black shadow-neo p-6 space-y-5 sticky top-24">
            <div class="flex items-center gap-2 border-b-2 border-black pb-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              <h2 class="font-outfit font-black text-lg">RINGKASAN PESANAN</h2>
            </div>

            <!-- Items -->
            <div class="space-y-3">
              <div
                v-for="item in items"
                :key="`${item.id}-${item.format}`"
                class="flex gap-3 pb-3 border-b border-black/10 last:border-b-0 last:pb-0"
              >
                <div class="w-20 h-28 shrink-0 border-2 border-black overflow-hidden shadow-neo-sm bg-background">
                  <BookCover
                    :theme="item.theme || 'violet'"
                    :title="item.title"
                    :author="item.author"
                    class="w-full h-full"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="font-outfit font-black text-sm leading-snug line-clamp-1">{{ item.title }}</h4>
                  <p class="font-sans text-[11px] font-bold text-muted-foreground truncate">{{ item.author }}</p>
                  <p class="font-sans text-[10px] font-bold text-muted-foreground mt-0.5">{{ item.format }}</p>
                  <div class="flex items-center justify-between mt-1.5">
                    <div class="flex items-center border-2 border-black bg-white shadow-neo-sm">
                      <button
                        class="w-6 h-6 flex items-center justify-center font-outfit font-black text-[11px] border-r border-black"
                        :class="item.quantity <= 1 ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100'"
                        :aria-disabled="item.quantity <= 1"
                        @click="decrement(item)"
                      >
                        −
                      </button>
                      <span class="w-7 text-center font-outfit font-black text-[11px]">{{ item.quantity }}</span>
                      <button
                        class="w-6 h-6 flex items-center justify-center font-outfit font-black text-[11px] hover:bg-gray-100 border-l border-black"
                        @click="updateQuantity(item.id, item.quantity + 1, item.format)"
                      >
                        +
                      </button>
                    </div>
                    <span class="font-outfit font-black text-sm">
                      {{ new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.price * item.quantity) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Summary -->
            <div class="border-t-2 border-black pt-4 space-y-3 text-sm font-sans font-bold">
              <div class="flex justify-between">
                <span class="text-muted-foreground">Subtotal ({{ items.length }} item)</span>
                <span class="font-outfit font-black">{{ formattedSubtotal }}</span>
              </div>

              <!-- Promo code input -->
              <div v-if="!discountApplied" class="flex gap-2">
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

              <div v-if="discountApplied" class="flex justify-between text-green-700">
                <span class="font-outfit font-black text-xs">Diskon Kupon (10%)</span>
                <span class="font-outfit font-black">-{{ formattedDiscount }}</span>
              </div>

              <div class="flex justify-between">
                <span class="text-muted-foreground">Ongkos Kirim</span>
                <span class="font-outfit font-black">{{ formattedShipping }}</span>
              </div>
              <div class="flex justify-between text-base font-outfit font-black pt-2 border-t-2 border-black">
                <span>TOTAL</span>
                <span class="text-neo-violet text-xl">{{ formattedTotal }}</span>
              </div>
            </div>

            <!-- CTA -->
            <button
              class="w-full neubrutal-btn bg-neo-yellow text-black border-3 border-black py-3.5 font-outfit font-black text-base shadow-neo hover:bg-yellow-300"
              @click="placeOrder"
            >
              BUAT PESANAN
            </button>

            <p class="font-sans text-[11px] font-bold text-muted-foreground text-center">
              Dengan membuat pesanan, kamu menyetujui Syarat & Ketentuan serta Kebijakan Privasi BookStore.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>