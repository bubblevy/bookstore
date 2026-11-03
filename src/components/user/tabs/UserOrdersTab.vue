<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useStore } from '@/composables/useStore'
import { api } from '@/lib/api'
import { assetUrl } from '@/lib/assets'
import StatusBadge from '@/components/StatusBadge.vue'
import PaymentInstructions from '@/components/PaymentInstructions.vue'
import BookCover from '@/components/BookCover.vue'
import { COMPANY_NAME, COMPANY_ADDRESS } from '@/lib/brand'
import { formatPaymentMethodName } from '@/lib/mappers'

const router = useRouter()
const { state, showToast, reorderBook, loadOrders, loadOrderDetail } = useStore()

const busy = ref({})
const isBusy = (key) => Boolean(busy.value[key])
const setBusy = (key, value) => {
  busy.value = { ...busy.value, [key]: value }
}

const orderFilter = ref('all') // 'all' | 'menunggu' | 'diproses' | 'dikirim' | 'selesai' | 'dibatalkan'
const downloadingInvoice = ref(false)
const checkingOrderPayment = ref(false)
const refreshingOrders = ref(false)
const failedOrderCovers = ref({})
const copiedKey = ref('')

const selectedOrder = ref(null)
const showTrackingModal = ref(false)
const showInvoiceModal = ref(false)
const trackingLoading = ref(false)
const trackingError = ref('')
const trackingData = ref(null)

const orderFilterTabs = computed(() => [
  { key: 'all', label: 'Semua', count: state.orders.length },
  {
    key: 'menunggu',
    label: 'Menunggu Bayar',
    count: state.orders.filter((o) => o.status === 'menunggu').length,
  },
  {
    key: 'diproses',
    label: 'Diproses',
    count: state.orders.filter((o) => o.status === 'diproses').length,
  },
  {
    key: 'dikirim',
    label: 'Dikirim',
    count: state.orders.filter((o) => o.status === 'dikirim').length,
  },
  {
    key: 'selesai',
    label: 'Selesai',
    count: state.orders.filter((o) => o.status === 'selesai').length,
  },
  {
    key: 'dibatalkan',
    label: 'Dibatalkan',
    count: state.orders.filter((o) => o.status === 'dibatalkan').length,
  },
])

const filteredOrders = computed(() => {
  if (orderFilter.value === 'all') return state.orders
  return state.orders.filter((o) => o.status === orderFilter.value)
})

const orderPage = ref(1)
const ordersPerPage = ref(5)

const totalOrderPages = computed(() => {
  return Math.max(1, Math.ceil(filteredOrders.value.length / ordersPerPage.value))
})

const paginatedOrders = computed(() => {
  const start = (orderPage.value - 1) * ordersPerPage.value
  return filteredOrders.value.slice(start, start + ordersPerPage.value)
})

const visibleOrderPages = computed(() => {
  const total = totalOrderPages.value
  const current = orderPage.value
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages = []
  if (current <= 4) {
    pages.push(1, 2, 3, 4, 5, '...', total)
  } else if (current >= total - 3) {
    pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total)
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total)
  }
  return pages
})

function changeOrderPage(newPage) {
  if (newPage < 1 || newPage > totalOrderPages.value) return
  orderPage.value = newPage
  const start = (newPage - 1) * ordersPerPage.value
  const currentOrders = filteredOrders.value.slice(start, start + ordersPerPage.value)
  for (const o of currentOrders) {
    if (o?.id && !o.hasFullDetail) {
      loadOrderDetail(o.id).catch(() => {})
    }
  }
  if (typeof window !== 'undefined') {
    const el = document.getElementById('orders-list-anchor')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

watch(orderFilter, () => {
  orderPage.value = 1
  const firstPage = filteredOrders.value.slice(0, ordersPerPage.value)
  for (const o of firstPage) {
    if (o?.id && !o.hasFullDetail) {
      loadOrderDetail(o.id).catch(() => {})
    }
  }
})

function orderItemCoverUrl(item) {
  const bookId = item?.book_id || item?.bookId || item?.id
  const matched =
    (bookId ? state.books.find((b) => String(b.id) === String(bookId)) : null) ||
    (item?.title
      ? state.books.find(
          (b) =>
            b.title &&
            b.title.trim().toLowerCase() === String(item.title).trim().toLowerCase(),
        )
      : null)

  if (matched?.coverImage || matched?.cover) {
    return assetUrl(matched.coverImage || matched.cover)
  }

  let url = item?.coverImage || item?.cover || ''
  if (url && url.includes('/static/covers/')) url = ''
  return url ? assetUrl(url) : ''
}

function formatRupiah(val) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(val || 0)
}

async function copyText(text, key, successMsg = '') {
  if (!text) return
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(String(text))
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = String(text)
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    copiedKey.value = key
    if (successMsg) {
      showToast(successMsg, { type: 'success' })
    }
    setTimeout(() => {
      if (copiedKey.value === key) copiedKey.value = ''
    }, 1800)
  } catch {
    showToast('Gagal menyalin teks', { type: 'error' })
  }
}


function canPay(order) {
  const payment = String(order?.paymentStatus || '').toLowerCase()
  const deadline = order?.paymentDeadlineAt ? new Date(order.paymentDeadlineAt).getTime() : null
  const withinWindow = !Number.isFinite(deadline) || deadline === null || Date.now() < deadline
  return (
    order?.status === 'menunggu' &&
    withinWindow &&
    ![
      'settlement',
      'capture',
      'paid',
      'expire',
      'expired',
      'deny',
      'denied',
      'cancel',
      'cancelled',
      'failure',
      'failed',
    ].includes(payment)
  )
}

function paymentStatusLabel(order) {
  const value = String(order?.paymentStatus || '').toLowerCase()
  const deadline = order?.paymentDeadlineAt ? new Date(order.paymentDeadlineAt).getTime() : null
  const expired =
    Number.isFinite(deadline) &&
    deadline !== null &&
    Date.now() >= deadline &&
    !['settlement', 'capture', 'paid'].includes(value)

  if (expired) return 'Dibatalkan'
  if (canPay(order)) return 'Menunggu Pembayaran'
  if (['expire', 'expired'].includes(value)) return 'Dibatalkan'
  if (['deny', 'denied', 'failure', 'failed'].includes(value)) return 'Gagal'
  if (['pending'].includes(value)) return 'Menunggu Pembayaran'
  if (['settlement', 'capture', 'paid'].includes(value)) return 'Lunas'
  if (value === 'cancel' || value === 'cancelled') return 'Dibatalkan'
  return value || '—'
}

function paymentMethodLabel(order) {
  const label = formatPaymentMethodName(order?.paymentMethod, order)
  if (label && label !== '—' && label !== '-') return label
  if (order && !order.hasFullDetail) return 'Memuat...'
  return '—'
}

function orderCourierLabel(order) {
  if (order?.courier && order.courier !== 'Reguler') return order.courier
  if (order?.courier && order.hasFullDetail) return order.courier
  if (order && !order.hasFullDetail) return 'Memuat...'
  return order?.courier || 'Reguler'
}


function formatTrackingTime(value) {
  if (!value) return ''
  const date = new Date(String(value).replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

const trackingSteps = computed(() => {
  const history = trackingData.value?.history
  if (Array.isArray(history) && history.length) {
    return history.map((item) => ({
      title: item.note || item.status || 'Pembaruan pengiriman',
      time: formatTrackingTime(item.updated_at),
      done: true,
      current: false,
    }))
  }
  return selectedOrder.value?.timeline || []
})

async function openTracking(order) {
  selectedOrder.value = order
  showTrackingModal.value = true
  trackingData.value = null
  trackingError.value = ''
  if (!order?.id) return

  trackingLoading.value = true
  const detailPromise = loadOrderDetail(order.id).catch(() => null)
  try {
    const response = await api.orderTracking(order.id)
    trackingData.value = response.data || null
  } catch (error) {
    const status = Number(error?.status)
    trackingError.value = [400, 404, 409].includes(status)
      ? 'Nomor resi belum diterbitkan. Coba lagi setelah pesanan dikirim.'
      : error?.message || 'Gagal memuat status pengiriman'
  } finally {
    const detail = await detailPromise
    if (detail) selectedOrder.value = detail
    trackingLoading.value = false
  }
}

function openInvoice(order) {
  if (order?.id) {
    router.push(`/orders/${encodeURIComponent(order.id)}`)
  } else {
    selectedOrder.value = order
    showInvoiceModal.value = true
  }
}

async function handleReorder(order) {
  if (!order?.id) return
  const key = `reorder-${order.id}`
  if (isBusy(key)) return
  setBusy(key, true)
  try {
    await reorderBook(order)
  } finally {
    setBusy(key, false)
  }
}

async function downloadInvoice(order) {
  if (!order?.id) return
  const key = `invoice-${order.id}`
  if (isBusy(key) || downloadingInvoice.value) return
  setBusy(key, true)
  downloadingInvoice.value = true
  try {
    const { blob, filename } = await api.orderPdf(order.id)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || `invoice-${order.id}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    showToast('Invoice berhasil diunduh.', { type: 'success' })
  } catch (error) {
    showToast(error?.message || 'Gagal mengunduh invoice', { type: 'error' })
  } finally {
    setBusy(key, false)
    downloadingInvoice.value = false
  }
}

async function refreshOrders() {
  if (refreshingOrders.value) return
  refreshingOrders.value = true
  try {
    await loadOrders()
    if (selectedOrder.value) {
      selectedOrder.value =
        state.orders.find((order) => order.id === selectedOrder.value.id) || selectedOrder.value
    }
  } finally {
    refreshingOrders.value = false
  }
}

async function checkSelectedPayment() {
  if (checkingOrderPayment.value) return
  checkingOrderPayment.value = true
  try {
    await refreshOrders()
  } finally {
    checkingOrderPayment.value = false
  }
}
</script>

<template>
  <div class="space-y-5 sm:space-y-6">
        <div
      class="bg-white border-2 sm:border-3 border-black p-3 sm:p-4 rounded-[2px] shadow-neo-sm flex flex-col md:flex-row md:items-center justify-between gap-3"
    >
            <div class="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-none flex-1 min-w-0">
        <button
          v-for="flt in orderFilterTabs"
          :key="flt.key"
          type="button"
          class="neubrutal-btn px-3 py-1.5 font-outfit font-black text-xs border-2 border-black rounded-[2px] whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
          :class="
            orderFilter === flt.key
              ? 'bg-black text-white shadow-neo-sm'
              : 'bg-background hover:bg-gray-200 text-black'
          "
          @click="orderFilter = flt.key"
        >
          <span>{{ flt.label }}</span>
          <span
            v-if="flt.count > 0"
            class="px-1.5 py-0.2 text-[9px] rounded-[2px] font-outfit font-black border border-black"
            :class="orderFilter === flt.key ? 'bg-white text-black' : 'bg-black text-white'"
          >
            {{ flt.count }}
          </span>
        </button>
      </div>
    </div>

        <div v-if="state.ordersLoading" class="space-y-4 sm:space-y-5">
      <div
        v-for="n in 3"
        :key="`order-skeleton-${n}`"
        class="h-44 bg-gray-100 border-2 sm:border-3 border-black rounded-[2px] animate-pulse"
      ></div>
    </div>

        <div
      v-else-if="filteredOrders.length === 0"
      class="bg-white border-2 sm:border-3 border-black p-8 sm:p-12 text-center rounded-[2px] shadow-neo-sm"
    >
      <h3 class="font-outfit font-black text-lg sm:text-xl text-black">Tidak Ada Pesanan Ditemukan</h3>
      <p class="font-sans text-xs sm:text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
        Belum ada transaksi pada filter ini. Jelajahi katalog buku pilihan kami dan temukan bacaan terbaikmu!
      </p>
      <RouterLink
        to="/catalog"
        class="mt-5 inline-block neubrutal-btn bg-neo-yellow text-black border-2 border-black px-6 py-2.5 font-outfit font-black text-xs sm:text-sm shadow-neo-sm hover:bg-yellow-300"
      >
        Mulai Belanja Buku
      </RouterLink>
    </div>

        <div id="orders-list-anchor" v-else class="space-y-4 sm:space-y-5">
      <article
        v-for="order in paginatedOrders"
        :key="order.id"
        class="bg-white border-2 sm:border-3 border-black rounded-[2px] shadow-neo-sm overflow-hidden transition-all hover:bg-neutral-50/50"
      >
                <div
          class="bg-surface border-b-2 sm:border-b-3 border-black px-4 sm:px-6 py-2.5 sm:py-3 flex items-start sm:items-center justify-between gap-2.5"
        >
          <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0">
            <button
              type="button"
              title="Klik untuk salin invoice"
              class="font-mono font-black text-xs sm:text-sm text-black tracking-tight flex items-center gap-1.5 hover:text-neo-violet cursor-pointer text-left"
              @click="copyText(order.id, `copy-ord-${order.id}`)"
            >
              <span class="break-all sm:break-normal">#{{ order.id }}</span>
              <svg
                class="w-3.5 h-3.5 text-muted-foreground shrink-0"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <path
                  v-if="copiedKey === `copy-ord-${order.id}`"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m4.5 12.75 6 6 9-13.5"
                />
                <path
                  v-else
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"
                />
              </svg>
            </button>
            <span class="text-[11px] sm:text-xs font-sans font-bold text-muted-foreground flex items-center gap-1">
              <span class="hidden sm:inline">|</span>
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
              <span>{{ order.date }}</span>
            </span>
          </div>

          <div class="shrink-0 flex items-center justify-end self-start sm:self-center">
            <StatusBadge :status="order.rawStatus" size="xs" />
          </div>
        </div>

                <div class="p-4 sm:p-6 space-y-3.5 sm:space-y-4">
          <div
            v-for="item in order.items"
            :key="item.id"
            class="flex items-center justify-between gap-3 sm:gap-4 border-b border-black/10 pb-3.5 last:border-b-0 last:pb-0"
          >
            <div class="flex items-center gap-3 sm:gap-4 min-w-0">
              <div
                v-if="orderItemCoverUrl(item) && !failedOrderCovers[`${item.id}-${item.title}`]"
                class="w-14 h-18 sm:w-16 sm:h-20 bg-background border-2 border-black shrink-0 overflow-hidden shadow-neo-xs sm:shadow-neo-sm p-0.5 flex items-center justify-center relative"
              >
                <img
                  :src="orderItemCoverUrl(item)"
                  :alt="item.title"
                  class="w-full h-full object-cover"
                  loading="lazy"
                  @error="failedOrderCovers[`${item.id}-${item.title}`] = true"
                />
              </div>
              <div class="min-w-0">
                <h4 class="font-outfit font-black text-xs sm:text-base text-black line-clamp-2">
                  {{ item.title }}
                </h4>
                <p class="font-sans text-[11px] sm:text-xs text-muted-foreground truncate mt-0.5">
                  {{ item.author }}
                </p>
                <div class="flex items-center gap-2 mt-1">
                  <span
                    class="bg-neutral-100 border border-black px-1.5 sm:px-2 py-0.2 text-[9px] sm:text-[10px] font-outfit font-black rounded-[2px]"
                  >
                    x {{ item.quantity }}
                  </span>
                  <span class="font-sans text-[10px] text-muted-foreground sm:hidden">
                    @ {{ formatRupiah(item.price) }}
                  </span>
                </div>
              </div>
            </div>

            <div class="text-right shrink-0">
              <span class="font-outfit font-black text-xs sm:text-base text-black block">
                {{ formatRupiah(item.price * item.quantity) }}
              </span>
              <span class="hidden sm:inline font-sans text-[11px] text-muted-foreground">
                @ {{ formatRupiah(item.price) }}
              </span>
            </div>
          </div>

                    <div
            class="bg-background border-2 border-black p-3 sm:p-3.5 rounded-[2px] grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 text-xs font-sans"
          >
            <div class="space-y-1">
              <div class="flex items-center gap-1.5">
                <span class="font-outfit font-black text-muted-foreground uppercase text-[10px]">
                  Kurir:
                </span>
                <span class="font-bold text-black flex items-center gap-1.5">
                  <span>{{ orderCourierLabel(order) }}</span>
                  <span
                    v-if="!order.hasFullDetail && orderCourierLabel(order) === 'Memuat...'"
                    class="inline-block w-1.5 h-1.5 rounded-full bg-neo-violet animate-pulse"
                  ></span>
                </span>
              </div>
              <div class="flex items-center gap-1.5 text-muted-foreground">
                <span class="font-outfit font-black uppercase text-[10px]">Resi:</span>
                <button
                  v-if="order.trackingNumber"
                  type="button"
                  class="font-mono font-bold text-neo-violet hover:underline flex items-center gap-1 cursor-pointer"
                  title="Klik untuk salin no resi"
                  @click="copyText(order.trackingNumber, `resi-${order.id}`)"
                >
                  <span>{{ order.trackingNumber }}</span>
                  <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      v-if="copiedKey === `resi-${order.id}`"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2.5"
                      class="text-emerald-600"
                      d="M5 13l4 4L19 7"
                    />
                    <g v-else stroke-width="2" class="text-neutral-500 hover:text-black">
                      <rect width="13" height="13" x="9" y="9" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </g>
                  </svg>
                </button>
                <span v-else class="italic text-neutral-400">Sedang diproses</span>
              </div>
            </div>

            <div class="space-y-1 sm:text-right">
              <div class="flex items-center gap-1.5 sm:justify-end">
                <span class="font-outfit font-black text-muted-foreground uppercase text-[10px]">
                  Metode:
                </span>
                <span class="font-bold text-black flex items-center gap-1.5 sm:justify-end">
                  <span>{{ paymentMethodLabel(order) }}</span>
                  <span
                    v-if="!order.hasFullDetail && paymentMethodLabel(order) === 'Memuat...'"
                    class="inline-block w-1.5 h-1.5 rounded-full bg-neo-violet animate-pulse"
                  ></span>
                </span>
              </div>
              <div class="flex items-center gap-1.5 sm:justify-end text-[11px]">
                <span class="font-outfit font-black text-muted-foreground uppercase text-[10px]">Status:</span>
                <span
                  class="font-bold capitalize tracking-tight"
                  :class="order.paymentStatus === 'settlement' || order.paymentStatus === 'paid' ? 'text-green-700' : 'text-amber-700'"
                >
                  {{ paymentStatusLabel(order) }}
                </span>
              </div>
            </div>
          </div>
        </div>

                <div
          class="bg-white border-t-2 sm:border-t-3 border-black px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
        >
          <div>
            <span class="font-sans text-[11px] font-bold text-muted-foreground uppercase block">
              Total Transaksi
            </span>
            <span class="font-outfit font-black text-lg sm:text-xl text-neo-violet">
              {{ formatRupiah(order.total) }}
            </span>
          </div>

                    <div class="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              v-if="canPay(order)"
              type="button"
              class="col-span-2 sm:col-span-1 neubrutal-btn bg-neo-violet text-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-purple-700 flex items-center justify-center cursor-pointer"
              @click="openInvoice(order)"
            >
              <span>Bayar Sekarang</span>
            </button>

            <button
              type="button"
              class="neubrutal-btn bg-white border-2 border-black px-3 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100 flex items-center justify-center cursor-pointer"
              @click="openTracking(order)"
            >
              <span>Lacak Pesanan</span>
            </button>

            <button
              type="button"
              :disabled="isBusy(`invoice-${order.id}`)"
              class="neubrutal-btn bg-white border-2 border-black px-3 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100 disabled:opacity-60 flex items-center justify-center cursor-pointer"
              @click="downloadInvoice(order)"
            >
              <span>{{ isBusy(`invoice-${order.id}`) ? 'Mengunduh...' : 'Unduh Invoice' }}</span>
            </button>

            <button
              type="button"
              :disabled="isBusy(`reorder-${order.id}`)"
              class="col-span-2 sm:col-span-1 w-full sm:w-auto neubrutal-btn bg-neo-yellow text-black border-2 border-black px-3.5 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-yellow-300 disabled:opacity-60 flex items-center justify-center cursor-pointer"
              @click="handleReorder(order)"
            >
              <span>{{ isBusy(`reorder-${order.id}`) ? 'Memproses...' : 'Beli Lagi' }}</span>
            </button>
          </div>
        </div>
      </article>
    </div>

        <div
      v-if="filteredOrders.length > 0"
      class="bg-white border-2 sm:border-3 border-black p-3 sm:p-4 rounded-[2px] shadow-neo-sm flex flex-col sm:flex-row items-center justify-between gap-3 select-none"
    >
            <div class="font-outfit font-bold text-xs sm:text-sm text-neutral-700 text-center sm:text-left">
        Menampilkan
        <span class="font-black text-black">
          {{ (orderPage - 1) * ordersPerPage + 1 }} - {{ Math.min(orderPage * ordersPerPage, filteredOrders.length) }}
        </span>
        dari
        <span class="font-black text-black">{{ filteredOrders.length }}</span>
        pesanan
      </div>

            <div v-if="totalOrderPages > 1" class="flex items-center gap-1.5 flex-wrap justify-center">
                <button
          type="button"
          :disabled="orderPage <= 1"
          class="neubrutal-btn px-2.5 sm:px-3 py-1.5 rounded-[2px] border-2 border-black font-outfit font-black text-xs transition-all flex items-center gap-1 cursor-pointer"
          :class="[
            orderPage <= 1
              ? 'bg-neutral-100 text-neutral-400 border-neutral-300 cursor-not-allowed shadow-none'
              : 'bg-white text-black hover:bg-neo-yellow shadow-neo-xs hover:shadow-neo-sm',
          ]"
          @click="changeOrderPage(orderPage - 1)"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          <span>Prev</span>
        </button>

                <button
          v-for="p in visibleOrderPages"
          :key="`order-page-${p}`"
          type="button"
          :disabled="p === '...'"
          class="w-8 h-8 rounded-[2px] border-2 border-black font-outfit font-black text-xs transition-all flex items-center justify-center cursor-pointer"
          :class="[
            p === orderPage
              ? 'bg-black text-white shadow-neo-xs'
              : p === '...'
                ? 'border-transparent text-neutral-400 cursor-default shadow-none'
                : 'bg-white text-black hover:bg-neutral-100 shadow-neo-xs hover:shadow-neo-sm',
          ]"
          @click="p !== '...' && changeOrderPage(p)"
        >
          {{ p }}
        </button>

                <button
          type="button"
          :disabled="orderPage >= totalOrderPages"
          class="neubrutal-btn px-2.5 sm:px-3 py-1.5 rounded-[2px] border-2 border-black font-outfit font-black text-xs transition-all flex items-center gap-1 cursor-pointer"
          :class="[
            orderPage >= totalOrderPages
              ? 'bg-neutral-100 text-neutral-400 border-neutral-300 cursor-not-allowed shadow-none'
              : 'bg-white text-black hover:bg-neo-yellow shadow-neo-xs hover:shadow-neo-sm',
          ]"
          @click="changeOrderPage(orderPage + 1)"
        >
          <span>Next</span>
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
    </div>
  </div>

    <div
    v-if="showTrackingModal && selectedOrder"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs"
    @click.self="showTrackingModal = false"
  >
    <div
      class="bg-white border-2 sm:border-3 border-black max-w-lg w-full rounded-[2px] shadow-neo-sm sm:shadow-neo overflow-hidden animate-hero-entrance flex flex-col max-h-[88vh]"
    >
      <div class="bg-neo-yellow border-b-2 sm:border-b-3 border-black p-3.5 sm:p-4 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-black" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.948c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75" />
          </svg>
          <h3 class="font-outfit font-black text-sm sm:text-base text-black uppercase tracking-tight">
            Lacak Pengiriman
          </h3>
        </div>

        <button
          type="button"
          class="w-8 h-8 rounded-[2px] bg-white border-2 border-black flex items-center justify-center font-outfit font-black text-sm hover:bg-black hover:text-white transition-colors cursor-pointer"
          aria-label="Tutup modal"
          @click="showTrackingModal = false"
        >
          ✕
        </button>
      </div>

      <div class="p-4 sm:p-5 space-y-4 overflow-y-auto overscroll-contain">
                <div class="bg-background border-2 border-black p-3 sm:p-3.5 rounded-[2px] space-y-1.5">
          <div class="flex justify-between items-center text-xs font-sans">
            <span class="text-muted-foreground font-semibold">Nomor Invoice:</span>
            <span class="font-mono font-black text-black">#{{ selectedOrder.id }}</span>
          </div>

          <div class="flex justify-between items-center text-xs font-sans">
            <span class="text-muted-foreground font-semibold">Kurir Ekspedisi:</span>
            <span class="font-outfit font-black text-black">
              {{ selectedOrder.courier || trackingData?.courier_name }}
            </span>
          </div>

          <div class="flex justify-between items-center text-xs font-sans">
            <span class="text-muted-foreground font-semibold">Nomor Resi:</span>
            <div class="flex items-center gap-1.5">
              <span
                class="font-mono font-bold text-neo-violet"
                :class="{ 'cursor-pointer hover:underline': trackingData?.waybill_id || selectedOrder.trackingNumber }"
                :title="trackingData?.waybill_id || selectedOrder.trackingNumber ? 'Klik untuk salin nomor resi' : ''"
                @click="trackingData?.waybill_id || selectedOrder.trackingNumber ? copyText(trackingData?.waybill_id || selectedOrder.trackingNumber, 'modal-resi') : null"
              >
                {{ trackingData?.waybill_id || selectedOrder.trackingNumber || 'Sedang Diproses' }}
              </span>
              <button
                v-if="trackingData?.waybill_id || selectedOrder.trackingNumber"
                type="button"
                class="p-0.5 text-muted-foreground hover:text-black transition-colors cursor-pointer inline-flex items-center justify-center shrink-0"
                :title="copiedKey === 'modal-resi' ? 'Resi Disalin' : 'Salin Nomor Resi'"
                @click="copyText(trackingData?.waybill_id || selectedOrder.trackingNumber, 'modal-resi')"
              >
                <svg
                  v-if="copiedKey === 'modal-resi'"
                  class="w-3.5 h-3.5 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <svg
                  v-else
                  class="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  viewBox="0 0 24 24"
                >
                  <rect width="13" height="13" x="9" y="9" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </div>
          </div>

          <div v-if="trackingData?.status" class="flex justify-between items-center text-xs font-sans pt-1 border-t border-black/10">
            <span class="text-muted-foreground font-semibold">Status Kurir:</span>
            <span class="font-outfit font-black uppercase text-emerald-700">{{ trackingData.status }}</span>
          </div>

          <a
            v-if="trackingData?.courier?.link"
            :href="trackingData.courier.link"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-block mt-2 font-outfit font-black text-xs text-neo-violet underline hover:text-black"
          >
            Kunjungi Portal Resmi Kurir →
          </a>
        </div>

                <div
          v-if="trackingLoading"
          class="flex items-center justify-center gap-2.5 font-sans text-xs font-bold text-muted-foreground py-6"
        >
          <span class="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin"></span>
          <span>Memuat rincian pelacakan langsung...</span>
        </div>

        <p
          v-else-if="trackingError"
          class="border-2 border-black bg-red-50 p-3 font-sans text-xs font-semibold text-red-700 rounded-[2px]"
        >
          {{ trackingError }}
        </p>

                <div
          v-if="!trackingLoading && trackingSteps.length"
          class="relative pl-6 space-y-4 border-l-2 sm:border-l-3 border-black ml-3 my-2"
        >
          <div v-for="(step, idx) in trackingSteps" :key="idx" class="relative">
            <div
              class="absolute -left-[31px] top-0.5 w-4 h-4 border-2 border-black rounded-[2px] flex items-center justify-center font-mono font-bold text-[9px] shadow-neo-xs"
              :class="
                step.current
                  ? 'bg-black text-white'
                  : step.done
                    ? 'bg-black text-white'
                    : 'bg-white text-neutral-400'
              "
            >
              <svg v-if="step.done || step.current" class="w-2.5 h-2.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>

            <div>
              <h4
                class="font-outfit font-black text-xs sm:text-sm"
                :class="step.current ? 'text-black' : step.done ? 'text-neutral-900' : 'text-neutral-400'"
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
          <span class="font-outfit font-black text-[11px] uppercase text-muted-foreground block mb-1">
            Alamat Pengiriman Tujuan:
          </span>
          <p class="font-sans text-xs text-black font-semibold leading-relaxed">
            {{ selectedOrder.address }}
          </p>
        </div>
      </div>
    </div>
  </div>

    <div
    v-if="showInvoiceModal && selectedOrder"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs"
    @click.self="showInvoiceModal = false"
  >
    <div
      class="bg-white border-2 sm:border-3 border-black max-w-xl w-full rounded-[2px] shadow-neo-sm sm:shadow-neo overflow-hidden max-h-[90vh] flex flex-col animate-hero-entrance"
    >
      <div class="bg-white border-b-2 sm:border-b-3 border-black p-4 sm:p-5 flex items-center justify-between shrink-0">
        <div>
          <h3 class="font-outfit font-black text-xl sm:text-2xl tracking-tight text-black">
            BOOKSTORE INVOICE
          </h3>
          <p class="font-sans text-xs font-bold text-muted-foreground">
            Bukti Transaksi Sah & Instruksi Pembayaran
          </p>
        </div>
        <button
          type="button"
          class="w-8 h-8 rounded-[2px] bg-white border-2 border-black flex items-center justify-center font-outfit font-black text-sm hover:bg-black hover:text-white transition-colors cursor-pointer"
          aria-label="Tutup modal"
          @click="showInvoiceModal = false"
        >
          ✕
        </button>
      </div>

      <div class="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 print:p-0 overscroll-contain">
                <PaymentInstructions
          v-if="selectedOrder"
          :payment="selectedOrder"
          :amount="selectedOrder.total"
          :deadline="selectedOrder.paymentDeadline || ''"
          :deadline-at="selectedOrder.paymentDeadlineAt || ''"
          :started-at="selectedOrder.createdAt || ''"
          :status="selectedOrder.rawStatus"
        />

                <div
          v-if="canPay(selectedOrder)"
          class="flex flex-col sm:flex-row sm:items-center gap-2.5 bg-background p-3 border-2 border-black rounded-[2px]"
        >
          <button
            type="button"
            :disabled="checkingOrderPayment"
            class="neubrutal-btn bg-white border-2 border-black px-3.5 py-2 font-outfit font-black text-xs shadow-neo-xs hover:bg-neo-yellow disabled:opacity-60 flex items-center justify-center gap-1.5 cursor-pointer"
            @click="checkSelectedPayment"
          >
            <svg
              class="w-3.5 h-3.5"
              :class="checkingOrderPayment ? 'animate-spin' : ''"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span>{{ checkingOrderPayment ? 'Mengecek...' : 'Cek Status Pembayaran' }}</span>
          </button>
          <span class="font-sans text-[11px] font-semibold text-muted-foreground">
            Tekan untuk menyinkronkan status mutasi dari Payment Gateway.
          </span>
        </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 border-b-2 border-black/15 pb-4">
          <div>
            <span class="font-outfit font-black text-[10px] uppercase text-muted-foreground block">
              DIBAYAR KEPADA:
            </span>
            <p class="font-outfit font-black text-sm text-black">{{ COMPANY_NAME }}</p>
            <p class="font-sans text-xs text-muted-foreground">{{ COMPANY_ADDRESS }}</p>
            <p class="font-mono text-xs text-muted-foreground mt-1">
              Ref Gateway: {{ selectedOrder.paymentGatewayTxId || '—' }}
            </p>
          </div>

          <div class="sm:text-right">
            <span
              class="inline-block bg-neo-lime border-2 border-black px-2.5 py-0.5 rounded-[2px] font-outfit font-black text-xs capitalize shadow-neo-xs mb-1"
            >
              {{ paymentStatusLabel(selectedOrder) }}
            </span>
            <p class="font-mono font-black text-sm">#{{ selectedOrder.id }}</p>
            <p class="font-sans text-xs text-muted-foreground">{{ selectedOrder.date }}</p>
          </div>
        </div>

                <div class="bg-surface border-2 border-black p-3.5 rounded-[2px] text-xs font-sans space-y-1">
          <span class="font-outfit font-black text-[10px] uppercase block text-muted-foreground">
            DATA PEMBELI:
          </span>
          <p class="font-outfit font-black text-black">{{ selectedOrder.customerName }}</p>
          <p class="text-neutral-700">
            {{ selectedOrder.customerPhone }} | {{ selectedOrder.customerEmail }}
          </p>
          <p class="text-neutral-700">{{ selectedOrder.address }}</p>
          <p class="text-neutral-900 pt-1 font-bold">Kurir Pengiriman: {{ selectedOrder.courier }}</p>
        </div>

                <div class="overflow-x-auto table-scrollbar border-2 border-black rounded-[2px]">
          <table class="w-full text-xs font-sans border-collapse min-w-[420px]">
            <thead>
              <tr class="bg-black text-white font-outfit font-black">
                <th class="p-2.5 text-left whitespace-nowrap min-w-[150px]">JUDUL BUKU</th>
                <th class="p-2.5 text-center whitespace-nowrap min-w-[50px]">QTY</th>
                <th class="p-2.5 text-right whitespace-nowrap min-w-[90px]">HARGA</th>
                <th class="p-2.5 text-right whitespace-nowrap min-w-[100px]">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in selectedOrder.items"
                :key="item.id"
                class="border-b border-black/10 last:border-b-0"
              >
                <td class="p-2.5 font-bold text-black min-w-[150px]">
                  <div class="flex items-center gap-2.5">
                    <div class="w-9 h-12 shrink-0 border border-black bg-neutral-100 overflow-hidden flex items-center justify-center shadow-neo-xs relative">
                      <img
                        v-if="orderItemCoverUrl(item) && !failedOrderCovers[`inv-${item.id}-${item.title}`]"
                        :src="orderItemCoverUrl(item)"
                        :alt="item.title"
                        class="w-full h-full object-cover"
                        loading="lazy"
                        @error="failedOrderCovers[`inv-${item.id}-${item.title}`] = true"
                      />
                      <BookCover
                        v-else
                        :theme="item.theme || 'violet'"
                        :title="item.title"
                        :author="item.author"
                        class="w-full h-full"
                      />
                    </div>
                    <div class="min-w-0">
                      <span class="line-clamp-2">{{ item.title }}</span>
                      <span class="block text-[10px] text-muted-foreground font-normal truncate mt-0.5">
                        {{ item.author }}
                      </span>
                    </div>
                  </div>
                </td>
                <td class="p-2.5 text-center font-bold whitespace-nowrap">{{ item.quantity }}</td>
                <td class="p-2.5 text-right whitespace-nowrap">{{ formatRupiah(item.price) }}</td>
                <td class="p-2.5 text-right font-bold whitespace-nowrap">
                  {{ formatRupiah(item.price * item.quantity) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

                <div class="space-y-1.5 pt-2 border-t-2 border-black text-xs font-sans">
          <div class="flex justify-between">
            <span class="text-muted-foreground">Subtotal Buku:</span>
            <span class="font-bold">{{ formatRupiah(selectedOrder.subtotal) }}</span>
          </div>
          <div v-if="selectedOrder.discount" class="flex justify-between text-emerald-700">
            <span>Diskon Voucher:</span>
            <span class="font-bold">-{{ formatRupiah(selectedOrder.discount) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Biaya Pengiriman ({{ selectedOrder.courier }}):</span>
            <span class="font-bold">{{ formatRupiah(selectedOrder.shipping) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Biaya Admin:</span>
            <span class="font-bold">{{ formatRupiah(selectedOrder.adminFee) }}</span>
          </div>
          <div
            class="flex justify-between text-base font-outfit font-black pt-2 border-t-2 border-black"
          >
            <span>TOTAL DIBAYAR:</span>
            <span class="text-neo-violet">{{ formatRupiah(selectedOrder.total) }}</span>
          </div>
        </div>
      </div>

      <div class="bg-background border-t-2 sm:border-t-3 border-black p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <span class="font-sans text-[11px] text-muted-foreground text-center sm:text-left">
          Dokumen digital sah BookStore Payment Gateway.
        </span>
        <div class="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            :disabled="downloadingInvoice"
            class="flex-1 sm:flex-initial neubrutal-btn bg-white border-2 border-black px-3.5 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100 disabled:opacity-60 flex items-center justify-center gap-1.5 cursor-pointer"
            @click="downloadInvoice(selectedOrder)"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span>{{ downloadingInvoice ? 'Mengunduh...' : 'Unduh Invoice' }}</span>
          </button>
          <button
            type="button"
            class="flex-1 sm:flex-initial neubrutal-btn bg-neo-yellow text-black border-2 border-black px-5 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-yellow-300 cursor-pointer"
            @click="showInvoiceModal = false"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
