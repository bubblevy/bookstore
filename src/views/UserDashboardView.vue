<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useStore } from '@/composables/useStore'
import BookCover from '@/components/BookCover.vue'

const router = useRouter()
const route = useRoute()
const {
  state,
  addToCart,
  showToast,
  toggleWishlist,
  reorderBook,
  cancelOrder,
  updateUserProfile,
  addAddress,
  removeAddress,
  setDefaultAddress,
  setUserRole,
} = useStore()

// Tab Navigation
const activeTab = ref('orders') // 'orders' | 'wishlist' | 'library' | 'addresses' | 'profile'
const orderFilter = ref('all') // 'all' | 'diproses' | 'dikirim' | 'selesai' | 'dibatalkan'

onMounted(() => {
  if (route.query.tab) {
    activeTab.value = String(route.query.tab)
  }
})

// Orders
const filteredOrders = computed(() => {
  if (orderFilter.value === 'all') return state.orders
  return state.orders.filter((o) => o.status === orderFilter.value)
})

const activeOrdersCount = computed(() => {
  return state.orders.filter((o) => o.status === 'diproses' || o.status === 'dikirim').length
})

// Wishlist
const wishlistBooks = computed(() => {
  return state.books.filter((b) => state.wishlist.includes(b.id))
})

// My Library Books
const myLibraryBooks = computed(() => {
  const map = new Map()
  state.orders
    .filter((o) => o.status !== 'dibatalkan')
    .forEach((order) => {
      order.items.forEach((item) => {
        if (!map.has(item.id)) {
          const bookDetail = state.books.find((b) => b.id === item.id) || item
          map.set(item.id, {
            ...bookDetail,
            format: item.format,
            purchaseDate: order.date,
            orderId: order.id,
          })
        }
      })
    })
  return Array.from(map.values())
})

// Currency Formatter
function formatRupiah(val) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(val || 0)
}

// Modals
const selectedOrder = ref(null)
const showTrackingModal = ref(false)
const showInvoiceModal = ref(false)
const showReadingModal = ref(false)
const readingBook = ref(null)
const showAddAddressModal = ref(false)

function openTracking(order) {
  selectedOrder.value = order
  showTrackingModal.value = true
}

function openInvoice(order) {
  selectedOrder.value = order
  showInvoiceModal.value = true
}

function openReading(book) {
  readingBook.value = book
  showReadingModal.value = true
}

// Profile edit form
const profileForm = ref({
  name: state.userProfile.name,
  email: state.userProfile.email,
  phone: state.userProfile.phone,
  bio: state.userProfile.bio,
  favoriteGenres: [...state.userProfile.favoriteGenres],
})

const availableGenres = [
  'Fiksi Populer',
  'Self-Growth',
  'Sci-Fi & Fantasy',
  'Sejarah & Biografi',
  'Seni & Desain',
  'Graphic Novels',
  'Bisnis & Finansial',
  'Filsafat',
]

function toggleGenre(genre) {
  const idx = profileForm.value.favoriteGenres.indexOf(genre)
  if (idx >= 0) {
    profileForm.value.favoriteGenres.splice(idx, 1)
  } else {
    profileForm.value.favoriteGenres.push(genre)
  }
}

function handleSaveProfile() {
  updateUserProfile({
    name: profileForm.value.name,
    email: profileForm.value.email,
    phone: profileForm.value.phone,
    bio: profileForm.value.bio,
    favoriteGenres: profileForm.value.favoriteGenres,
  })
}

// Password Form
const passwordForm = ref({
  current: '',
  newPass: '',
  confirmPass: '',
})

function handleChangePassword() {
  if (!passwordForm.value.current || !passwordForm.value.newPass) {
    showToast('Harap isi password saat ini dan password baru.', { type: 'error' })
    return
  }
  if (passwordForm.value.newPass !== passwordForm.value.confirmPass) {
    showToast('Konfirmasi password tidak cocok.', { type: 'error' })
    return
  }
  if (passwordForm.value.newPass.length < 6) {
    showToast('Password baru minimal 6 karakter.', { type: 'error' })
    return
  }
  passwordForm.value = { current: '', newPass: '', confirmPass: '' }
  showToast('Password berhasil diperbarui.', { type: 'success' })
}

// Add Address Form
const newAddressForm = ref({
  title: '',
  recipient: state.userProfile.name,
  phone: state.userProfile.phone,
  fullAddress: '',
  city: '',
  postalCode: '',
  isDefault: false,
})

function handleAddAddress() {
  if (
    !newAddressForm.value.title ||
    !newAddressForm.value.recipient ||
    !newAddressForm.value.fullAddress ||
    !newAddressForm.value.city
  ) {
    showToast('Harap lengkapi semua kolom alamat wajib.', { type: 'error' })
    return
  }
  addAddress({ ...newAddressForm.value })
  showAddAddressModal.value = false
  newAddressForm.value = {
    title: '',
    recipient: state.userProfile.name,
    phone: state.userProfile.phone,
    fullAddress: '',
    city: '',
    postalCode: '',
    isDefault: false,
  }
}

function printInvoice() {
  window.print()
}

function switchRoleToAdmin() {
  setUserRole('admin')
  router.push('/admin')
}
</script>

<template>
  <div class="min-h-screen bg-background py-6 sm:py-10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Breadcrumb & Mode Switcher Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div class="flex items-center gap-2 text-xs sm:text-sm font-outfit font-extrabold text-muted-foreground">
          <RouterLink to="/" class="hover:text-black">Beranda</RouterLink>
          <span>/</span>
          <span class="text-black uppercase">Dashboard Pengguna</span>
        </div>

        <div class="flex items-center gap-2">
          <button
            class="neubrutal-btn bg-white border-2 border-black px-3.5 py-1.5 font-outfit font-black text-xs shadow-neo-sm hover:bg-neo-yellow flex items-center gap-2"
            @click="switchRoleToAdmin"
          >
            <svg class="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
            <span>Masuk ke Panel Admin</span>
          </button>
        </div>
      </div>

      <!-- User Profile Banner (No Tiers) -->
      <section class="bg-white border-3 sm:border-4 border-black p-5 sm:p-7 rounded-[2px] shadow-neo-md sm:shadow-neo-lg mb-8">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div class="flex items-start sm:items-center gap-4 sm:gap-5">
            <div
              class="w-16 h-16 sm:w-20 sm:h-20 bg-neo-violet text-white border-3 border-black rounded-[2px] shadow-neo flex items-center justify-center font-outfit font-black text-2xl sm:text-3xl shrink-0"
            >
              {{ state.userProfile.name.slice(0, 2).toUpperCase() }}
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="font-outfit font-black text-2xl sm:text-3xl tracking-tight text-black">
                  {{ state.userProfile.name }}
                </h1>
                <span class="bg-black text-white px-2.5 py-0.5 rounded-[2px] font-outfit font-black text-[11px] uppercase tracking-wide">
                  Akun Pembeli
                </span>
              </div>
              <p class="font-sans text-xs sm:text-sm font-bold text-muted-foreground mt-0.5">
                {{ state.userProfile.email }} | Terdaftar sejak {{ state.userProfile.memberSince }}
              </p>
              <p class="font-sans text-xs text-gray-700 italic mt-1 max-w-xl">
                "{{ state.userProfile.bio }}"
              </p>
            </div>
          </div>

          <!-- Quick Stats Cards (No Tiers) -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4 shrink-0">
            <div class="bg-background border-2 border-black p-3 rounded-[2px] shadow-neo-sm text-center">
              <span class="block font-outfit font-black text-xl sm:text-2xl text-neo-violet">
                {{ activeOrdersCount }}
              </span>
              <span class="font-outfit font-bold text-[10px] sm:text-xs uppercase text-muted-foreground">
                Pesanan Aktif
              </span>
            </div>

            <div class="bg-background border-2 border-black p-3 rounded-[2px] shadow-neo-sm text-center">
              <span class="block font-outfit font-black text-xl sm:text-2xl text-black">
                {{ myLibraryBooks.length }}
              </span>
              <span class="font-outfit font-bold text-[10px] sm:text-xs uppercase text-muted-foreground">
                Buku Dimiliki
              </span>
            </div>

            <div class="bg-background border-2 border-black p-3 rounded-[2px] shadow-neo-sm text-center">
              <span class="block font-outfit font-black text-xl sm:text-2xl text-neo-orange">
                {{ wishlistBooks.length }}
              </span>
              <span class="font-outfit font-bold text-[10px] sm:text-xs uppercase text-muted-foreground">
                Wishlist
              </span>
            </div>

            <div class="bg-background border-2 border-black p-3 rounded-[2px] shadow-neo-sm text-center">
              <span class="block font-outfit font-black text-xl sm:text-2xl text-black">
                {{ state.userProfile.addresses.length }}
              </span>
              <span class="font-outfit font-bold text-[10px] sm:text-xs uppercase text-muted-foreground">
                Alamat Kirim
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Dashboard Tabs Navigation (No Emojis) -->
      <div class="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
        <button
          class="neubrutal-btn px-4 sm:px-5 py-2.5 rounded-[2px] font-outfit font-black text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 border-2 sm:border-3 border-black"
          :class="
            activeTab === 'orders'
              ? 'bg-neo-yellow text-black shadow-neo -translate-y-0.5'
              : 'bg-white text-muted-foreground hover:bg-gray-100 shadow-neo-sm'
          "
          @click="activeTab = 'orders'"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
          </svg>
          <span>Pesanan Saya</span>
          <span
            v-if="state.orders.length > 0"
            class="px-1.5 py-0.2 bg-black text-white text-[10px] rounded-full"
          >
            {{ state.orders.length }}
          </span>
        </button>

        <button
          class="neubrutal-btn px-4 sm:px-5 py-2.5 rounded-[2px] font-outfit font-black text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 border-2 sm:border-3 border-black"
          :class="
            activeTab === 'wishlist'
              ? 'bg-neo-yellow text-black shadow-neo -translate-y-0.5'
              : 'bg-white text-muted-foreground hover:bg-gray-100 shadow-neo-sm'
          "
          @click="activeTab = 'wishlist'"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
          </svg>
          <span>Wishlist Buku</span>
          <span
            v-if="wishlistBooks.length > 0"
            class="px-1.5 py-0.2 bg-black text-white text-[10px] rounded-full"
          >
            {{ wishlistBooks.length }}
          </span>
        </button>

        <button
          class="neubrutal-btn px-4 sm:px-5 py-2.5 rounded-[2px] font-outfit font-black text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 border-2 sm:border-3 border-black"
          :class="
            activeTab === 'library'
              ? 'bg-neo-yellow text-black shadow-neo -translate-y-0.5'
              : 'bg-white text-muted-foreground hover:bg-gray-100 shadow-neo-sm'
          "
          @click="activeTab = 'library'"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
          </svg>
          <span>Rak Buku Saya</span>
          <span
            v-if="myLibraryBooks.length > 0"
            class="px-1.5 py-0.2 bg-black text-white text-[10px] rounded-full"
          >
            {{ myLibraryBooks.length }}
          </span>
        </button>

        <button
          class="neubrutal-btn px-4 sm:px-5 py-2.5 rounded-[2px] font-outfit font-black text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 border-2 sm:border-3 border-black"
          :class="
            activeTab === 'addresses'
              ? 'bg-neo-yellow text-black shadow-neo -translate-y-0.5'
              : 'bg-white text-muted-foreground hover:bg-gray-100 shadow-neo-sm'
          "
          @click="activeTab = 'addresses'"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
          </svg>
          <span>Alamat Pengiriman</span>
        </button>

        <button
          class="neubrutal-btn px-4 sm:px-5 py-2.5 rounded-[2px] font-outfit font-black text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 border-2 sm:border-3 border-black"
          :class="
            activeTab === 'profile'
              ? 'bg-neo-yellow text-black shadow-neo -translate-y-0.5'
              : 'bg-white text-muted-foreground hover:bg-gray-100 shadow-neo-sm'
          "
          @click="activeTab = 'profile'"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
          <span>Pengaturan Akun</span>
        </button>
      </div>

      <!-- ================= TAB 1: ORDERS ================= -->
      <div v-if="activeTab === 'orders'" class="space-y-6">
        <div class="bg-white border-3 border-black p-3.5 rounded-[2px] shadow-neo-sm flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2 overflow-x-auto">
            <span class="font-outfit font-black text-xs uppercase text-muted-foreground mr-1">Status:</span>
            <button
              v-for="flt in [
                { key: 'all', label: 'Semua' },
                { key: 'diproses', label: 'Diproses' },
                { key: 'dikirim', label: 'Dikirim' },
                { key: 'selesai', label: 'Selesai' },
                { key: 'dibatalkan', label: 'Dibatalkan' },
              ]"
              :key="flt.key"
              class="neubrutal-btn px-3 py-1 font-outfit font-black text-xs border-2 border-black rounded-[2px]"
              :class="
                orderFilter === flt.key
                  ? 'bg-black text-white shadow-neo-sm'
                  : 'bg-background hover:bg-gray-200 text-black'
              "
              @click="orderFilter = flt.key"
            >
              {{ flt.label }}
            </button>
          </div>

          <div class="font-outfit font-bold text-xs text-muted-foreground">
            Total <strong class="text-black">{{ filteredOrders.length }}</strong> transaksi
          </div>
        </div>

        <!-- Orders Empty State -->
        <div
          v-if="filteredOrders.length === 0"
          class="bg-white border-3 border-black p-12 text-center rounded-[2px] shadow-neo"
        >
          <div class="w-16 h-16 mx-auto mb-4 bg-neo-yellow border-3 border-black flex items-center justify-center shadow-neo">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
          </div>
          <h3 class="font-outfit font-black text-lg">Tidak Ada Pesanan Ditemukan</h3>
          <p class="font-sans text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Belum ada transaksi pada kategori status ini.
          </p>
          <RouterLink
            to="/#katalog"
            class="mt-4 inline-block neubrutal-btn bg-neo-yellow text-black border-3 border-black px-6 py-2.5 font-outfit font-black text-sm shadow-neo hover:bg-yellow-300"
          >
            Mulai Belanja Buku
          </RouterLink>
        </div>

        <!-- Order Cards List -->
        <div v-else class="space-y-5">
          <div
            v-for="order in filteredOrders"
            :key="order.id"
            class="bg-white border-3 border-black rounded-[2px] shadow-neo overflow-hidden transition-all hover:shadow-neo-md"
          >
            <!-- Header -->
            <div class="bg-[#F8F8F6] border-b-3 border-black px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <span class="font-outfit font-black text-sm sm:text-base text-black tracking-tight">
                  #{{ order.id }}
                </span>
                <span class="text-xs font-sans font-bold text-muted-foreground">
                  | {{ order.date }}
                </span>
              </div>

              <div class="flex items-center gap-2">
                <span
                  class="border-2 border-black px-2.5 py-0.5 rounded-[2px] font-outfit font-black text-xs uppercase shadow-neo-sm"
                  :class="{
                    'bg-neo-yellow text-black': order.status === 'diproses',
                    'bg-[#6EC6FF] text-black': order.status === 'dikirim',
                    'bg-neo-lime text-black': order.status === 'selesai',
                    'bg-red-400 text-white': order.status === 'dibatalkan',
                    'bg-gray-200 text-black': order.status === 'menunggu',
                  }"
                >
                  {{ order.status }}
                </span>
              </div>
            </div>

            <!-- Body Items -->
            <div class="p-4 sm:p-6 space-y-4">
              <div
                v-for="item in order.items"
                :key="item.id + (item.format || '')"
                class="flex items-center justify-between gap-4 border-b border-black/10 pb-4 last:border-b-0 last:pb-0"
              >
                <div class="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div class="w-14 h-18 sm:w-16 sm:h-20 bg-background border-2 border-black shrink-0 overflow-hidden shadow-neo-sm p-1">
                    <BookCover
                      :theme="item.theme || 'violet'"
                      :title="item.title"
                      :author="item.author"
                    />
                  </div>
                  <div class="min-w-0">
                    <h4 class="font-outfit font-black text-sm sm:text-base text-black truncate">
                      {{ item.title }}
                    </h4>
                    <p class="font-sans text-xs text-muted-foreground truncate">
                      {{ item.author }}
                    </p>
                    <span
                      class="inline-block mt-1 bg-neutral-100 border border-black px-2 py-0.5 text-[10px] font-outfit font-black rounded-[2px]"
                    >
                      {{ item.format || 'Soft Cover' }} x {{ item.quantity }}
                    </span>
                  </div>
                </div>

                <div class="text-right shrink-0">
                  <span class="font-outfit font-black text-sm sm:text-base text-black block">
                    {{ formatRupiah(item.price * item.quantity) }}
                  </span>
                  <span class="font-sans text-[11px] text-muted-foreground">
                    @ {{ formatRupiah(item.price) }}
                  </span>
                </div>
              </div>

              <!-- Shipping (RajaOngkir) & Payment (Gateway) Info -->
              <div class="bg-background border-2 border-black p-3 rounded-[2px] flex flex-wrap items-center justify-between gap-3 text-xs font-sans">
                <div class="space-y-0.5">
                  <div class="flex items-center gap-1.5">
                    <span class="font-outfit font-black text-muted-foreground uppercase text-[10px]">Kurir (RajaOngkir):</span>
                    <span class="font-bold text-black">{{ order.courier }}</span>
                  </div>
                  <div v-if="order.trackingNumber" class="text-muted-foreground">
                    Resi: <span class="font-mono font-bold text-black">{{ order.trackingNumber }}</span>
                  </div>
                </div>

                <div class="space-y-0.5 text-right">
                  <div class="flex items-center gap-1.5 justify-end">
                    <span class="font-outfit font-black text-muted-foreground uppercase text-[10px]">Payment Gateway:</span>
                    <span class="font-bold text-black">{{ order.paymentMethod }}</span>
                  </div>
                  <div class="text-muted-foreground text-[10px]">
                    Status: <span class="font-bold text-green-700 uppercase">{{ order.paymentStatus || 'LUNAS' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer: Total & Actions -->
            <div class="bg-white border-t-3 border-black px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span class="font-sans text-xs font-bold text-muted-foreground block">
                  Total Transaksi
                </span>
                <span class="font-outfit font-black text-lg sm:text-xl text-neo-violet">
                  {{ formatRupiah(order.total) }}
                </span>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <button
                  class="neubrutal-btn bg-white border-2 border-black px-3.5 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100 flex items-center gap-1.5"
                  @click="openTracking(order)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.948c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75" />
                  </svg>
                  <span>Lacak Pengiriman</span>
                </button>

                <button
                  class="neubrutal-btn bg-white border-2 border-black px-3.5 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100 flex items-center gap-1.5"
                  @click="openInvoice(order)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                  <span>Lihat Faktur</span>
                </button>

                <button
                  class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-yellow-300"
                  @click="reorderBook(order)"
                >
                  Beli Lagi
                </button>

                <button
                  v-if="order.status === 'diproses'"
                  class="neubrutal-btn bg-red-100 text-red-700 border-2 border-black px-3 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-red-200"
                  @click="cancelOrder(order.id)"
                >
                  Batalkan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ================= TAB 2: WISHLIST ================= -->
      <div v-if="activeTab === 'wishlist'" class="space-y-6">
        <div class="flex items-center justify-between bg-white border-3 border-black p-4 rounded-[2px] shadow-neo-sm">
          <div>
            <h2 class="font-outfit font-black text-lg text-black">Wishlist Buku Tersimpan</h2>
            <p class="font-sans text-xs text-muted-foreground font-semibold">
              Koleksi buku favorit yang Anda simpan untuk dibeli selanjutnya.
            </p>
          </div>
          <span class="bg-neo-yellow border-2 border-black px-3 py-1 font-outfit font-black text-xs shadow-neo-sm">
            {{ wishlistBooks.length }} Judul Tersimpan
          </span>
        </div>

        <div v-if="wishlistBooks.length === 0" class="bg-white border-3 border-black p-12 text-center rounded-[2px] shadow-neo">
          <h3 class="font-outfit font-black text-lg">Daftar Wishlist Anda Masih Kosong</h3>
          <p class="font-sans text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Jelajahi katalog dan simpan buku favorit Anda di sini.
          </p>
          <RouterLink
            to="/#katalog"
            class="mt-4 inline-block neubrutal-btn bg-neo-yellow text-black border-3 border-black px-6 py-2.5 font-outfit font-black text-sm shadow-neo hover:bg-yellow-300"
          >
            Buka Katalog Buku
          </RouterLink>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <div
            v-for="book in wishlistBooks"
            :key="book.id"
            class="bg-white border-3 border-black rounded-[2px] shadow-neo flex flex-col justify-between overflow-hidden"
          >
            <div class="p-4 bg-background border-b-3 border-black flex items-center justify-center relative">
              <div class="w-32 h-44 shadow-neo-sm">
                <BookCover :theme="book.theme" :title="book.title" :author="book.author" />
              </div>
              <button
                class="absolute top-2 right-2 w-8 h-8 rounded-[2px] bg-white border-2 border-black flex items-center justify-center shadow-neo-sm hover:bg-red-50 text-red-600 font-bold"
                title="Hapus dari Wishlist"
                @click="toggleWishlist(book.id)"
              >
                X
              </button>
            </div>

            <div class="p-4 flex-1 flex flex-col justify-between">
              <div>
                <span class="bg-black text-white text-[9px] font-outfit font-black uppercase px-2 py-0.5 rounded-[2px]">
                  {{ book.category }}
                </span>
                <h3 class="font-outfit font-black text-base mt-2 line-clamp-1 text-black">
                  {{ book.title }}
                </h3>
                <p class="font-sans text-xs text-muted-foreground font-semibold">
                  {{ book.author }}
                </p>
              </div>

              <div class="mt-4 pt-3 border-t border-black/10 flex items-center justify-between">
                <div>
                  <span class="font-outfit font-black text-base text-black block">
                    {{ formatRupiah(book.price) }}
                  </span>
                  <span v-if="book.originalPrice" class="line-through text-xs text-muted-foreground font-sans">
                    {{ formatRupiah(book.originalPrice) }}
                  </span>
                </div>

                <button
                  class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-3.5 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-yellow-300"
                  @click="addToCart(book)"
                >
                  + Keranjang
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ================= TAB 3: LIBRARY (RAK BUKU) ================= -->
      <div v-if="activeTab === 'library'" class="space-y-6">
        <div class="flex items-center justify-between bg-white border-3 border-black p-4 rounded-[2px] shadow-neo-sm">
          <div>
            <h2 class="font-outfit font-black text-lg text-black">Rak Koleksi Buku Pribadi</h2>
            <p class="font-sans text-xs text-muted-foreground font-semibold">
              Koleksi buku resmi yang telah berhasil Anda beli. Akses cuplikan e-reader kapan saja.
            </p>
          </div>
          <span class="bg-neo-lime border-2 border-black px-3 py-1 font-outfit font-black text-xs shadow-neo-sm">
            {{ myLibraryBooks.length }} Koleksi Buku
          </span>
        </div>

        <div v-if="myLibraryBooks.length === 0" class="bg-white border-3 border-black p-12 text-center rounded-[2px] shadow-neo">
          <h3 class="font-outfit font-black text-lg">Belum Ada Buku di Rak Anda</h3>
          <p class="font-sans text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Setiap buku dari transaksi berhasil akan otomatis diarsipkan di halaman ini.
          </p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div
            v-for="book in myLibraryBooks"
            :key="book.id"
            class="bg-white border-3 border-black rounded-[2px] shadow-neo p-4 flex gap-4 items-start"
          >
            <div class="w-20 h-28 bg-background border-2 border-black shrink-0 overflow-hidden shadow-neo-sm p-1">
              <BookCover :theme="book.theme" :title="book.title" :author="book.author" />
            </div>

            <div class="flex-1 flex flex-col justify-between min-h-[112px]">
              <div>
                <span class="bg-neo-yellow border border-black text-[9px] font-outfit font-black px-1.5 py-0.5 rounded-[2px]">
                  TERDAFTAR RESMI
                </span>
                <h4 class="font-outfit font-black text-sm text-black mt-1 line-clamp-1">
                  {{ book.title }}
                </h4>
                <p class="font-sans text-xs text-muted-foreground">
                  {{ book.author }}
                </p>
                <p class="font-sans text-[11px] text-gray-500 mt-1">
                  Format: <strong>{{ book.format || 'Fisik' }}</strong>
                </p>
              </div>

              <div class="flex items-center gap-2 mt-3">
                <button
                  class="neubrutal-btn bg-black text-white border-2 border-black px-3 py-1.5 font-outfit font-black text-xs shadow-neo-sm hover:bg-neutral-800"
                  @click="openReading(book)"
                >
                  Baca Sampel
                </button>
                <RouterLink
                  :to="`/book/${book.id}`"
                  class="neubrutal-btn bg-white text-black border-2 border-black px-3 py-1.5 font-outfit font-bold text-xs shadow-neo-sm hover:bg-gray-100"
                >
                  Detail
                </RouterLink>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ================= TAB 4: ADDRESSES ================= -->
      <div v-if="activeTab === 'addresses'" class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border-3 border-black p-4 rounded-[2px] shadow-neo-sm">
          <div>
            <h2 class="font-outfit font-black text-lg text-black">Alamat Pengiriman Tersimpan</h2>
            <p class="font-sans text-xs text-muted-foreground font-semibold">
              Kelola alamat pengiriman terhubung dengan tarif otomatis kurir RajaOngkir.
            </p>
          </div>
          <button
            class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-yellow-300 shrink-0"
            @click="showAddAddressModal = true"
          >
            + Tambah Alamat Baru
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div
            v-for="addr in state.userProfile.addresses"
            :key="addr.id"
            class="bg-white border-3 border-black p-5 rounded-[2px] shadow-neo relative flex flex-col justify-between"
            :class="addr.isDefault ? 'border-neo-violet' : ''"
          >
            <div>
              <div class="flex items-center justify-between gap-2 mb-2">
                <div class="flex items-center gap-2">
                  <h3 class="font-outfit font-black text-base text-black">{{ addr.title }}</h3>
                  <span
                    v-if="addr.isDefault"
                    class="bg-neo-lime border-2 border-black px-2 py-0.5 rounded-[2px] font-outfit font-black text-[10px] uppercase shadow-neo-sm"
                  >
                    UTAMA
                  </span>
                </div>

                <button
                  v-if="!addr.isDefault"
                  class="text-xs font-outfit font-bold text-red-600 hover:underline"
                  @click="removeAddress(addr.id)"
                >
                  Hapus
                </button>
              </div>

              <p class="font-outfit font-black text-sm text-black">{{ addr.recipient }}</p>
              <p class="font-sans text-xs text-muted-foreground font-semibold">{{ addr.phone }}</p>
              <p class="font-sans text-xs text-gray-700 mt-2 bg-background p-2.5 border-2 border-black rounded-[2px]">
                {{ addr.fullAddress }}, {{ addr.city }} ({{ addr.postalCode }})
              </p>
            </div>

            <div class="mt-4 pt-3 border-t border-black/10 flex items-center justify-between">
              <button
                v-if="!addr.isDefault"
                class="neubrutal-btn bg-white border-2 border-black px-3 py-1 font-outfit font-black text-xs shadow-neo-sm hover:bg-neo-yellow"
                @click="setDefaultAddress(addr.id)"
              >
                Jadikan Alamat Utama
              </button>
              <span v-else class="text-xs font-sans font-bold text-green-700">
                Alamat pengiriman aktif utama
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- ================= TAB 5: PROFILE ================= -->
      <div v-if="activeTab === 'profile'" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div class="lg:col-span-7 bg-white border-3 border-black p-6 rounded-[2px] shadow-neo space-y-5">
          <div class="border-b-2 border-black pb-3">
            <h2 class="font-outfit font-black text-xl text-black">Informasi Profil Akun</h2>
            <p class="font-sans text-xs text-muted-foreground">
              Perbarui identitas dan data kontak akun Anda.
            </p>
          </div>

          <form class="space-y-4" @submit.prevent="handleSaveProfile">
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Nama Lengkap</label>
              <input
                v-model="profileForm.name"
                type="text"
                required
                class="w-full bg-background border-2 border-black p-3 font-outfit font-bold text-sm outline-none shadow-neo-sm"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block font-outfit font-black text-xs uppercase mb-1">Alamat Email</label>
                <input
                  v-model="profileForm.email"
                  type="email"
                  required
                  class="w-full bg-background border-2 border-black p-3 font-outfit font-bold text-sm outline-none shadow-neo-sm"
                />
              </div>

              <div>
                <label class="block font-outfit font-black text-xs uppercase mb-1">Nomor Telepon / WhatsApp</label>
                <input
                  v-model="profileForm.phone"
                  type="tel"
                  required
                  class="w-full bg-background border-2 border-black p-3 font-outfit font-bold text-sm outline-none shadow-neo-sm"
                />
              </div>
            </div>

            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Bio Singkat</label>
              <textarea
                v-model="profileForm.bio"
                rows="2"
                class="w-full bg-background border-2 border-black p-3 font-sans text-sm outline-none shadow-neo-sm"
              ></textarea>
            </div>

            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-2">Genre Minat Baca</label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="genre in availableGenres"
                  :key="genre"
                  type="button"
                  class="neubrutal-btn px-3 py-1 font-outfit font-bold text-xs border-2 border-black rounded-[2px]"
                  :class="
                    profileForm.favoriteGenres.includes(genre)
                      ? 'bg-neo-yellow text-black shadow-neo-sm'
                      : 'bg-white text-muted-foreground'
                  "
                  @click="toggleGenre(genre)"
                >
                  {{ profileForm.favoriteGenres.includes(genre) ? '[v] ' : '[+] ' }}{{ genre }}
                </button>
              </div>
            </div>

            <button
              type="submit"
              class="w-full neubrutal-btn bg-neo-yellow text-black border-3 border-black py-3 font-outfit font-black text-base shadow-neo hover:bg-yellow-300 mt-2"
            >
              Simpan Perubahan Profil
            </button>
          </form>
        </div>

        <div class="lg:col-span-5 bg-white border-3 border-black p-6 rounded-[2px] shadow-neo space-y-4">
          <div class="border-b-2 border-black pb-2">
            <h3 class="font-outfit font-black text-lg text-black">Keamanan Akun</h3>
            <p class="font-sans text-xs text-muted-foreground">Perbarui password akun secara berkala.</p>
          </div>

          <form class="space-y-3" @submit.prevent="handleChangePassword">
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Password Saat Ini</label>
              <input
                v-model="passwordForm.current"
                type="password"
                placeholder="Password lama"
                class="w-full bg-background border-2 border-black p-2.5 font-sans text-sm outline-none shadow-neo-sm"
              />
            </div>

            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Password Baru</label>
              <input
                v-model="passwordForm.newPass"
                type="password"
                placeholder="Minimal 6 karakter"
                class="w-full bg-background border-2 border-black p-2.5 font-sans text-sm outline-none shadow-neo-sm"
              />
            </div>

            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Konfirmasi Password Baru</label>
              <input
                v-model="passwordForm.confirmPass"
                type="password"
                placeholder="Ulangi password baru"
                class="w-full bg-background border-2 border-black p-2.5 font-sans text-sm outline-none shadow-neo-sm"
              />
            </div>

            <button
              type="submit"
              class="w-full neubrutal-btn bg-white text-black border-2 border-black py-2.5 font-outfit font-black text-xs shadow-neo hover:bg-gray-100"
            >
              Ubah Password
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- ================= MODAL: TRACKING (NO EMOJIS) ================= -->
    <div
      v-if="showTrackingModal && selectedOrder"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="showTrackingModal = false"
    >
      <div class="bg-white border-4 border-black max-w-lg w-full rounded-[2px] shadow-neo-xl overflow-hidden animate-hero-entrance">
        <div class="bg-neo-yellow border-b-3 border-black p-4 flex items-center justify-between">
          <h3 class="font-outfit font-black text-base text-black uppercase">LACAK PENGIRIMAN RAJAONGKIR</h3>
          <button
            class="w-8 h-8 rounded-[2px] bg-white border-2 border-black flex items-center justify-center font-outfit font-black text-sm hover:bg-black hover:text-white"
            @click="showTrackingModal = false"
          >
            X
          </button>
        </div>

        <div class="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div class="bg-background border-2 border-black p-3 rounded-[2px]">
            <div class="flex justify-between text-xs font-sans mb-1">
              <span class="text-muted-foreground">Invoice:</span>
              <span class="font-outfit font-black">#{{ selectedOrder.id }}</span>
            </div>
            <div class="flex justify-between text-xs font-sans mb-1">
              <span class="text-muted-foreground">Kurir Ekspedisi:</span>
              <span class="font-outfit font-black">{{ selectedOrder.courier }}</span>
            </div>
            <div class="flex justify-between text-xs font-sans">
              <span class="text-muted-foreground">Nomor Resi:</span>
              <span class="font-mono font-bold text-neo-violet">{{ selectedOrder.trackingNumber || 'Sedang Diproses' }}</span>
            </div>
          </div>

          <div class="relative pl-6 space-y-5 border-l-3 border-black ml-3 my-4">
            <div
              v-for="(step, idx) in selectedOrder.timeline"
              :key="idx"
              class="relative"
            >
              <div
                class="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 border-black"
                :class="step.current ? 'bg-neo-yellow ring-3 ring-black/20' : (step.done ? 'bg-neo-lime' : 'bg-white')"
              ></div>

              <div>
                <h4
                  class="font-outfit font-black text-xs sm:text-sm"
                  :class="step.current ? 'text-black' : (step.done ? 'text-neutral-800' : 'text-neutral-400')"
                >
                  {{ step.title }}
                </h4>
                <p class="font-sans text-[11px] text-muted-foreground mt-0.5">
                  {{ step.time }}
                </p>
              </div>
            </div>
          </div>

          <div class="border-t-2 border-black pt-3">
            <span class="font-outfit font-black text-xs uppercase text-muted-foreground block mb-1">Alamat Pengiriman Tujuan:</span>
            <p class="font-sans text-xs text-black font-semibold">{{ selectedOrder.address }}</p>
          </div>
        </div>

        <div class="bg-background border-t-3 border-black p-3 text-right">
          <button
            class="neubrutal-btn bg-black text-white border-2 border-black px-5 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-neutral-800"
            @click="showTrackingModal = false"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>

    <!-- ================= MODAL: INVOICE (NO EMOJIS) ================= -->
    <div
      v-if="showInvoiceModal && selectedOrder"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="showInvoiceModal = false"
    >
      <div class="bg-white border-4 border-black max-w-xl w-full rounded-[2px] shadow-neo-xl overflow-hidden max-h-[90vh] flex flex-col animate-hero-entrance">
        <div class="bg-white border-b-3 border-black p-5 flex items-center justify-between">
          <div>
            <h3 class="font-outfit font-black text-2xl tracking-tight text-black">BOOKSTORE INVOICE</h3>
            <p class="font-sans text-xs font-bold text-muted-foreground">Kuitansi Transaksi Resmi</p>
          </div>
          <button
            class="w-8 h-8 rounded-[2px] bg-white border-2 border-black flex items-center justify-center font-outfit font-black text-sm hover:bg-black hover:text-white"
            @click="showInvoiceModal = false"
          >
            X
          </button>
        </div>

        <div class="p-6 overflow-y-auto space-y-5 print:p-0">
          <div class="flex justify-between items-start border-b-2 border-black/15 pb-4">
            <div>
              <span class="font-outfit font-black text-xs text-muted-foreground block">DIBAYAR KEPADA:</span>
              <p class="font-outfit font-black text-sm text-black">PT BOOKSTORE INDONESIA DIGITAL</p>
              <p class="font-sans text-xs text-muted-foreground">Jakarta Pusat, Indonesia</p>
              <p class="font-mono text-xs text-muted-foreground mt-1">Ref Gateway: {{ selectedOrder.paymentGatewayTxId || 'MID-TX-2026' }}</p>
            </div>

            <div class="text-right">
              <span class="inline-block bg-neo-lime border-2 border-black px-2.5 py-0.5 rounded-[2px] font-outfit font-black text-xs uppercase shadow-neo-sm mb-1">
                {{ selectedOrder.paymentStatus || 'SETTLEMENT' }}
              </span>
              <p class="font-outfit font-black text-sm">#{{ selectedOrder.id }}</p>
              <p class="font-sans text-xs text-muted-foreground">{{ selectedOrder.date }}</p>
            </div>
          </div>

          <div class="bg-[#F8F8F6] border-2 border-black p-3.5 rounded-[2px] text-xs font-sans space-y-1">
            <span class="font-outfit font-black text-xs uppercase block text-muted-foreground">PEMBELI:</span>
            <p class="font-outfit font-black text-black">{{ selectedOrder.customerName }}</p>
            <p class="text-gray-700">{{ selectedOrder.customerPhone }} | {{ selectedOrder.customerEmail }}</p>
            <p class="text-gray-700">{{ selectedOrder.address }}</p>
            <p class="text-gray-700 pt-1 font-bold">Kurir: {{ selectedOrder.courier }}</p>
          </div>

          <table class="w-full text-xs font-sans border-collapse">
            <thead>
              <tr class="bg-black text-white font-outfit font-black">
                <th class="p-2 text-left">JUDUL BUKU</th>
                <th class="p-2 text-center">QTY</th>
                <th class="p-2 text-right">HARGA</th>
                <th class="p-2 text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in selectedOrder.items"
                :key="item.id"
                class="border-b border-black/10"
              >
                <td class="p-2 font-bold text-black">
                  {{ item.title }}
                  <span class="block text-[10px] text-muted-foreground font-normal">
                    {{ item.author }} ({{ item.format || 'Soft Cover' }})
                  </span>
                </td>
                <td class="p-2 text-center font-bold">{{ item.quantity }}</td>
                <td class="p-2 text-right">{{ formatRupiah(item.price) }}</td>
                <td class="p-2 text-right font-bold">{{ formatRupiah(item.price * item.quantity) }}</td>
              </tr>
            </tbody>
          </table>

          <div class="space-y-1.5 pt-2 border-t-2 border-black text-xs font-sans">
            <div class="flex justify-between">
              <span class="text-muted-foreground">Subtotal Buku:</span>
              <span class="font-bold">{{ formatRupiah(selectedOrder.subtotal) }}</span>
            </div>
            <div v-if="selectedOrder.discount" class="flex justify-between text-green-700">
              <span>Diskon Voucher:</span>
              <span class="font-bold">-{{ formatRupiah(selectedOrder.discount) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Biaya Pengiriman ({{ selectedOrder.courier }}):</span>
              <span class="font-bold">{{ formatRupiah(selectedOrder.shipping) }}</span>
            </div>
            <div class="flex justify-between text-base font-outfit font-black pt-2 border-t-2 border-black">
              <span>TOTAL DIBAYAR:</span>
              <span class="text-neo-violet">{{ formatRupiah(selectedOrder.total) }}</span>
            </div>
          </div>
        </div>

        <div class="bg-background border-t-3 border-black p-4 flex items-center justify-between">
          <span class="font-sans text-[11px] text-muted-foreground">Dokumen digital sah BookStore Payment Gateway.</span>
          <div class="flex items-center gap-2">
            <button
              class="neubrutal-btn bg-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100"
              @click="printInvoice"
            >
              Cetak Faktur
            </button>
            <button
              class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-yellow-300"
              @click="showInvoiceModal = false"
            >
              Selesai
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= MODAL: SAMPLE READER ================= -->
    <div
      v-if="showReadingModal && readingBook"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
      @click.self="showReadingModal = false"
    >
      <div class="bg-[#FBF9F5] border-4 border-black max-w-2xl w-full rounded-[2px] shadow-neo-xl overflow-hidden max-h-[85vh] flex flex-col">
        <div class="bg-white border-b-3 border-black p-4 flex items-center justify-between">
          <div>
            <span class="bg-neo-yellow border border-black text-[9px] font-outfit font-black px-1.5 py-0.2 rounded-[2px]">
              CUPLIKAN DIGITAL RESMI
            </span>
            <h3 class="font-outfit font-black text-base text-black mt-0.5">
              {{ readingBook.title }}
            </h3>
            <p class="font-sans text-xs text-muted-foreground">Karya {{ readingBook.author }}</p>
          </div>
          <button
            class="w-8 h-8 rounded-[2px] bg-white border-2 border-black flex items-center justify-center font-outfit font-black text-sm hover:bg-black hover:text-white"
            @click="showReadingModal = false"
          >
            X
          </button>
        </div>

        <div class="p-6 overflow-y-auto space-y-4 font-serif text-sm leading-relaxed text-gray-800">
          <h4 class="font-outfit font-black text-base text-center border-b border-black/10 pb-2 text-black">
            BAGIAN PERTAMA
          </h4>
          <p>
            Matahari baru saja merekah di ufuk timur, membiaskan sinar keemasan yang menembus sela-sela jendela kayu tua. Udara pagi terasa sejuk menggigit, namun di dalam dada tersimpan kehangatan yang tak mampu dipadamkan oleh angin manapun: harapan.
          </p>
          <p>
            {{ readingBook.description || 'Setiap halaman buku ini dirancang untuk membimbing pikiran kita menemukan makna baru dalam rutinitas keseharian, menyadarkan bahwa perubahan besar tidak pernah datang sekaligus, melainkan ditumpuk dari keberanian-keberanian kecil yang kita ambil setiap fajar.' }}
          </p>
          <div class="bg-neo-yellow/30 border-2 border-black p-4 text-center rounded-[2px] my-6 font-sans">
            <span class="font-outfit font-black text-xs uppercase block text-black">
              Akhir dari Cuplikan Bacaan
            </span>
            <p class="text-xs text-muted-foreground mt-1">
              Buku fisik pesanan Anda sedang dalam proses pengiriman kurir menuju alamat tujuan.
            </p>
          </div>
        </div>

        <div class="bg-white border-t-3 border-black p-3 text-right">
          <button
            class="neubrutal-btn bg-black text-white border-2 border-black px-5 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-neutral-800"
            @click="showReadingModal = false"
          >
            Tutup Pembaca
          </button>
        </div>
      </div>
    </div>

    <!-- ================= MODAL: ADD ADDRESS ================= -->
    <div
      v-if="showAddAddressModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="showAddAddressModal = false"
    >
      <div class="bg-white border-4 border-black max-w-md w-full rounded-[2px] shadow-neo-xl overflow-hidden animate-hero-entrance">
        <div class="bg-neo-yellow border-b-3 border-black p-4 flex items-center justify-between">
          <h3 class="font-outfit font-black text-base text-black uppercase">TAMBAH ALAMAT PENGIRIMAN</h3>
          <button
            class="w-8 h-8 rounded-[2px] bg-white border-2 border-black flex items-center justify-center font-outfit font-black text-sm hover:bg-black hover:text-white"
            @click="showAddAddressModal = false"
          >
            X
          </button>
        </div>

        <form class="p-5 space-y-3.5" @submit.prevent="handleAddAddress">
          <div>
            <label class="block font-outfit font-black text-xs uppercase mb-1">Label Alamat (Contoh: Rumah, Kantor)</label>
            <input
              v-model="newAddressForm.title"
              type="text"
              required
              placeholder="Rumah Utama"
              class="w-full bg-background border-2 border-black p-2.5 font-outfit font-bold text-xs outline-none shadow-neo-sm"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Nama Penerima</label>
              <input
                v-model="newAddressForm.recipient"
                type="text"
                required
                class="w-full bg-background border-2 border-black p-2.5 font-outfit font-bold text-xs outline-none shadow-neo-sm"
              />
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Nomor Telepon</label>
              <input
                v-model="newAddressForm.phone"
                type="tel"
                required
                class="w-full bg-background border-2 border-black p-2.5 font-outfit font-bold text-xs outline-none shadow-neo-sm"
              />
            </div>
          </div>

          <div>
            <label class="block font-outfit font-black text-xs uppercase mb-1">Alamat Lengkap</label>
            <textarea
              v-model="newAddressForm.fullAddress"
              rows="2"
              required
              placeholder="Jl. Merdeka Barat No. 42"
              class="w-full bg-background border-2 border-black p-2.5 font-sans text-xs outline-none shadow-neo-sm"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Kota / Kabupaten (RajaOngkir)</label>
              <input
                v-model="newAddressForm.city"
                type="text"
                required
                placeholder="Jakarta Pusat"
                class="w-full bg-background border-2 border-black p-2.5 font-outfit font-bold text-xs outline-none shadow-neo-sm"
              />
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Kode Pos</label>
              <input
                v-model="newAddressForm.postalCode"
                type="text"
                placeholder="10110"
                class="w-full bg-background border-2 border-black p-2.5 font-outfit font-bold text-xs outline-none shadow-neo-sm"
              />
            </div>
          </div>

          <label class="flex items-center gap-2 pt-1 cursor-pointer">
            <input
              v-model="newAddressForm.isDefault"
              type="checkbox"
              class="w-4 h-4 border-2 border-black accent-black rounded-[2px]"
            />
            <span class="font-sans text-xs font-bold">Jadikan sebagai alamat pengiriman utama</span>
          </label>

          <button
            type="submit"
            class="w-full neubrutal-btn bg-neo-yellow text-black border-3 border-black py-3 font-outfit font-black text-sm shadow-neo hover:bg-yellow-300 mt-2"
          >
            Simpan Alamat
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
