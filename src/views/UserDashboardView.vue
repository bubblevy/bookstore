<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useStore } from '@/composables/useStore'
import FullScreenLoader from '@/components/FullScreenLoader.vue'
import { useOrderStatusSSE } from '@/composables/useOrderStatusSSE'

import UserOrdersTab from '@/components/user/tabs/UserOrdersTab.vue'
import UserWishlistTab from '@/components/user/tabs/UserWishlistTab.vue'
import UserAddressesTab from '@/components/user/tabs/UserAddressesTab.vue'
import UserProfileTab from '@/components/user/tabs/UserProfileTab.vue'

const route = useRoute()
const router = useRouter()
const {
  state,
  loadOrders,
  applyOrderPaymentUpdate,
  applyOrderShippingUpdate,
  loadAddresses,
  loadWishlist,
  loadBooks,
} = useStore()

useOrderStatusSSE({
  onPaymentStatus(data) {
    if (!data?.invoice_number) return
    applyOrderPaymentUpdate(data)
    loadOrders('', { silent: true }).catch(() => {})
  },
  onShippingStatus(data) {
    if (!data?.invoice_number) return
    applyOrderShippingUpdate(data)
    loadOrders('', { silent: true }).catch(() => {})
  },
})

const isInitialLoading = ref(true)
const activeTab = ref('orders')

function maskEmail(email) {
  if (!email || !email.includes('@')) return email || ''
  const [user, domain] = email.split('@')
  if (user.length <= 2) return `${user[0] || ''}***@${domain}`
  return `${user.slice(0, 2)}***${user.slice(-1)}@${domain}`
}

const maskedEmail = computed(() => maskEmail(state.userProfile.email))

const activeOrdersCount = computed(() => {
  return state.orders.filter((order) =>
    ['menunggu', 'diproses', 'dikirim'].includes(order.status),
  ).length
})
const totalOrdersCount = computed(() => state.orders.length)
const wishlistCount = computed(() => state.wishlist.length)
const addressesCount = computed(() => state.userProfile.addresses.length)

function switchTab(tab) {
  activeTab.value = tab
  router.replace({ query: { ...route.query, tab } }).catch(() => {})
  if (tab === 'orders' && !state.orders.length) loadOrders()
  else if (tab === 'wishlist' && !state.wishlist.length) loadWishlist()
  else if (tab === 'addresses') {
    const hasIncomplete = state.userProfile.addresses.some(
      (a) => !a.address_line || (!a.province && !a.postalCode),
    )
    if (!state.userProfile.addresses.length || hasIncomplete) {
      loadAddresses(true)
    }
  }
}

watch(
  () => route.query.tab,
  (newTab) => {
    if (newTab && ['orders', 'wishlist', 'addresses', 'profile'].includes(newTab)) {
      activeTab.value = newTab
    }
  },
)

onMounted(async () => {
  if (route.query.tab) {
    const tab = String(route.query.tab)
    if (['orders', 'wishlist', 'addresses', 'profile'].includes(tab)) {
      activeTab.value = tab
    } else {
      activeTab.value = 'orders'
    }
  }

  // Load active tab data first to dismiss loader quickly.
  const primaryTask =
    activeTab.value === 'addresses'
      ? loadAddresses(true)
      : activeTab.value === 'wishlist'
        ? loadWishlist()
        : loadOrders()

  try {
    await primaryTask
  } finally {
    isInitialLoading.value = false
  }

  // Fetch remaining tab data in background without duplicate active tab fetch.
  const remainingTasks = []
  if (!state.books.length) remainingTasks.push(loadBooks({ per_page: 100 }))
  if (activeTab.value !== 'orders') remainingTasks.push(loadOrders())
  if (activeTab.value !== 'addresses') remainingTasks.push(loadAddresses(true))
  if (activeTab.value !== 'wishlist') remainingTasks.push(loadWishlist())
  if (remainingTasks.length) {
    Promise.allSettled(remainingTasks)
  }
})
</script>

<template>
  <div class="min-h-screen bg-background py-5 sm:py-8 lg:py-10">
        <FullScreenLoader :show="isInitialLoading" />

        <div class="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
            <nav
        aria-label="Breadcrumb"
        class="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-6"
      >
        <div
          class="flex items-center gap-2 text-xs sm:text-sm font-outfit font-extrabold text-muted-foreground"
        >
          <RouterLink to="/" class="hover:text-black transition-colors flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            Beranda
          </RouterLink>
          <span>/</span>
          <span class="text-black tracking-wide">Dashboard</span>
        </div>
      </nav>

            <section
        class="bg-white border-2 sm:border-3 border-black p-4 sm:p-6 lg:p-7 rounded-[2px] shadow-neo-sm mb-6 sm:mb-8"
      >
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
                    <div class="flex items-start sm:items-center gap-3.5 sm:gap-5 min-w-0">
            <div
              class="w-14 h-14 sm:w-18 sm:h-18 lg:w-20 lg:h-20 bg-neo-violet text-white border-2 border-black rounded-[2px] shadow-neo-sm flex items-center justify-center font-outfit font-black text-xl sm:text-2xl lg:text-3xl shrink-0 select-none"
            >
              {{ state.userProfile.name ? state.userProfile.name.slice(0, 2).toUpperCase() : 'US' }}
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h1
                  class="font-outfit font-black text-xl sm:text-2xl lg:text-3xl tracking-tight text-black truncate"
                >
                  {{ state.userProfile.name || 'Pengguna BookStore' }}
                </h1>
                <span
                  v-if="state.userRole === 'admin'"
                  class="bg-neo-violet text-white border-2 border-black px-2 py-0.5 rounded-[2px] font-outfit font-black text-[10px] sm:text-xs uppercase tracking-wide shadow-neo-xs"
                >
                  Admin
                </span>
              </div>

              <div class="flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-xs sm:text-sm font-semibold text-muted-foreground mt-1">
                <span class="truncate max-w-[220px] sm:max-w-none">{{ maskedEmail }}</span>
                <span v-if="state.userProfile.memberSince" class="hidden sm:inline">•</span>
                <span v-if="state.userProfile.memberSince" class="text-neutral-500">
                  Member sejak {{ state.userProfile.memberSince }}
                </span>
              </div>
            </div>
          </div>

                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 lg:gap-4 shrink-0 w-full lg:w-auto">
                        <div
              class="bg-background border-2 border-black p-2.5 sm:p-3 rounded-[2px] shadow-neo-sm text-left select-none"
            >
              <span class="font-outfit font-black text-xl sm:text-2xl text-black block mb-1">
                {{ activeOrdersCount }}
              </span>
              <span class="font-outfit font-black text-[10px] sm:text-xs uppercase text-muted-foreground block truncate">
                Pesanan Aktif
              </span>
            </div>

                        <div
              class="bg-background border-2 border-black p-2.5 sm:p-3 rounded-[2px] shadow-neo-sm text-left select-none"
            >
              <span class="font-outfit font-black text-xl sm:text-2xl text-black block mb-1">
                {{ totalOrdersCount }}
              </span>
              <span class="font-outfit font-black text-[10px] sm:text-xs uppercase text-muted-foreground block truncate">
                Total Belanja
              </span>
            </div>

                        <div
              class="bg-background border-2 border-black p-2.5 sm:p-3 rounded-[2px] shadow-neo-sm text-left select-none"
            >
              <span class="font-outfit font-black text-xl sm:text-2xl text-black block mb-1">
                {{ wishlistCount }}
              </span>
              <span class="font-outfit font-black text-[10px] sm:text-xs uppercase text-muted-foreground block truncate">
                Wishlist
              </span>
            </div>

                        <div
              class="bg-background border-2 border-black p-2.5 sm:p-3 rounded-[2px] shadow-neo-sm text-left select-none"
            >
              <span class="font-outfit font-black text-xl sm:text-2xl text-black block mb-1">
                {{ addressesCount }}
              </span>
              <span class="font-outfit font-black text-[10px] sm:text-xs uppercase text-muted-foreground block truncate">
                Alamat Kirim
              </span>
            </div>
          </div>
        </div>
      </section>

            <div class="relative mb-6">
        <div class="flex items-center gap-2 overflow-x-auto pb-2 -mb-2 pt-1 pr-2 scrollbar-none">
                    <button
            type="button"
            class="neubrutal-btn px-3.5 sm:px-5 py-2.5 rounded-[2px] font-outfit font-black text-xs sm:text-sm whitespace-nowrap transition-all border-2 sm:border-3 border-black shrink-0 cursor-pointer"
            :class="
              activeTab === 'orders'
                ? 'bg-neo-yellow text-black shadow-neo-sm -translate-y-0.5'
                : 'bg-white text-muted-foreground hover:bg-gray-100 shadow-neo-sm'
            "
            @click="switchTab('orders')"
          >
            Pesanan Saya
          </button>

                    <button
            type="button"
            class="neubrutal-btn px-3.5 sm:px-5 py-2.5 rounded-[2px] font-outfit font-black text-xs sm:text-sm whitespace-nowrap transition-all border-2 sm:border-3 border-black shrink-0 cursor-pointer"
            :class="
              activeTab === 'wishlist'
                ? 'bg-neo-yellow text-black shadow-neo-sm -translate-y-0.5'
                : 'bg-white text-muted-foreground hover:bg-gray-100 shadow-neo-sm'
            "
            @click="switchTab('wishlist')"
          >
            Wishlist
          </button>

                    <button
            type="button"
            class="neubrutal-btn px-3.5 sm:px-5 py-2.5 rounded-[2px] font-outfit font-black text-xs sm:text-sm whitespace-nowrap transition-all border-2 sm:border-3 border-black shrink-0 cursor-pointer"
            :class="
              activeTab === 'addresses'
                ? 'bg-neo-yellow text-black shadow-neo-sm -translate-y-0.5'
                : 'bg-white text-muted-foreground hover:bg-gray-100 shadow-neo-sm'
            "
            @click="switchTab('addresses')"
          >
            Alamat Pengiriman
          </button>

                    <button
            type="button"
            class="neubrutal-btn px-3.5 sm:px-5 py-2.5 rounded-[2px] font-outfit font-black text-xs sm:text-sm whitespace-nowrap transition-all border-2 sm:border-3 border-black shrink-0 cursor-pointer"
            :class="
              activeTab === 'profile'
                ? 'bg-neo-yellow text-black shadow-neo-sm -translate-y-0.5'
                : 'bg-white text-muted-foreground hover:bg-gray-100 shadow-neo-sm'
            "
            @click="switchTab('profile')"
          >
            Pengaturan Akun
          </button>
        </div>
      </div>

            <UserOrdersTab v-if="activeTab === 'orders'" />
      <UserWishlistTab v-if="activeTab === 'wishlist'" />
      <UserAddressesTab v-if="activeTab === 'addresses'" />
      <UserProfileTab v-if="activeTab === 'profile'" :masked-email="maskedEmail" />
    </div>
  </div>
</template>
