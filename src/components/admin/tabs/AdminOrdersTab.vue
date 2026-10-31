<script setup>
import { ref, computed, watch } from 'vue'
import { api } from '@/lib/api'
import { assetUrl } from '@/lib/assets'
import { shippingLabel } from '@/lib/shipping'
import { localizeApiError } from '@/lib/errors'
import { useStore } from '@/composables/useStore'
import { useOrderStatusSSE } from '@/composables/useOrderStatusSSE'
import StatusBadge from '@/components/StatusBadge.vue'

const props = defineProps({
  orders: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  books: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['refresh'])
const { showToast } = useStore()

const busy = ref({})
const isBusy = (key) => Boolean(busy.value[key])
const setBusy = (key, value) => {
  busy.value = { ...busy.value, [key]: value }
}

function apiErrorText(error, fallback) {
  return localizeApiError(error?.message, error?.status) || fallback
}

function formatRupiah(val) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(val || 0)
}

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(date)
}

function maskEmail(email) {
  if (!email || typeof email !== 'string') return '—'
  const trimmed = email.trim()
  const parts = trimmed.split('@')
  if (parts.length !== 2) return trimmed
  const [name, domain] = parts
  if (name.length <= 2) {
    return `${name.charAt(0)}***@${domain}`
  }
  const maskedMiddle = '*'.repeat(Math.min(name.length - 2, 4))
  return `${name.charAt(0)}${maskedMiddle}${name.charAt(name.length - 1)}@${domain}`
}

function generatePagination(total, current) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total]
  }
  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  }
  return [1, '...', current - 1, current, current + 1, '...', total]
}

const orderSearch = ref('')
const orderStatusFilter = ref('all')
const orderSortFilter = ref('newest')
const adminOrderPage = ref(1)
const adminOrdersPerPage = ref(10)

const adminOrderDetail = ref(null)
const adminOrderDetailLoading = ref(false)
const showAdminOrderModal = ref(false)
const copiedKey = ref('')

async function copyValue(text, key = 'default') {
  if (!text) return
  try {
    await navigator.clipboard.writeText(String(text))
    copiedKey.value = key
    setTimeout(() => {
      if (copiedKey.value === key) {
        copiedKey.value = ''
      }
    }, 1800)
  } catch {
    copiedKey.value = ''
  }
}

const filteredAdminOrders = computed(() => {
  const query = orderSearch.value.trim().toLowerCase()
  const status = orderStatusFilter.value

  const list = props.orders.filter((order) => {
    if (status !== 'all' && order.rawStatus !== status) {
      return false
    }
    if (query) {
      const matchInvoice = String(order.invoice || order.id || '').toLowerCase().includes(query)
      const matchCustomer = String(order.customerName || '').toLowerCase().includes(query)
      const matchEmail = String(order.customerEmail || '').toLowerCase().includes(query)
      if (!matchInvoice && !matchCustomer && !matchEmail) {
        return false
      }
    }
    return true
  })

  return list.sort((a, b) => {
    if (orderSortFilter.value === 'total-high') {
      const diff = (Number(b.total) || 0) - (Number(a.total) || 0)
      if (diff !== 0) return diff
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return timeB - timeA
    }
    if (orderSortFilter.value === 'total-low') {
      const diff = (Number(a.total) || 0) - (Number(b.total) || 0)
      if (diff !== 0) return diff
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return timeB - timeA
    }
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
    if (timeB !== timeA) return timeB - timeA
    return String(b.invoice || b.id || '').localeCompare(String(a.invoice || a.id || ''))
  })
})

const totalAdminOrderPages = computed(() =>
  Math.max(1, Math.ceil(filteredAdminOrders.value.length / adminOrdersPerPage.value)),
)

const paginatedAdminOrders = computed(() => {
  const start = (adminOrderPage.value - 1) * adminOrdersPerPage.value
  return filteredAdminOrders.value.slice(start, start + adminOrdersPerPage.value)
})

const adminOrdersMeta = computed(() => ({
  current_page: adminOrderPage.value,
  per_page: adminOrdersPerPage.value,
  total_items: filteredAdminOrders.value.length,
  total_pages: totalAdminOrderPages.value,
}))

const visibleAdminOrderPages = computed(() =>
  generatePagination(adminOrdersMeta.value.total_pages, adminOrderPage.value),
)

function changeAdminOrderPage(delta) {
  const next = adminOrderPage.value + delta
  if (next < 1 || next > adminOrdersMeta.value.total_pages) return
  adminOrderPage.value = next
}

function setAdminOrderPage(p) {
  if (p === '...' || p === adminOrderPage.value) return
  if (p < 1 || p > adminOrdersMeta.value.total_pages) return
  adminOrderPage.value = p
}

watch([orderSearch, orderStatusFilter, orderSortFilter], () => {
  adminOrderPage.value = 1
})

function adminOrderItemCover(item) {
  let url = item?.cover_image || item?.coverImage || item?.cover || ''
  if (!url && props.books?.length) {
    const found =
      props.books.find((b) => String(b.id) === String(item?.book_id || item?.id)) ||
      props.books.find((b) => b.title === item?.title)
    url = found?.coverImage || found?.cover || ''
  }
  return url ? assetUrl(url) : ''
}

async function openAdminOrder(order) {
  if (!order?.invoice) return
  showAdminOrderModal.value = true
  adminOrderDetail.value = null
  adminOrderDetailLoading.value = true
  try {
    const response = await api.adminOrder(order.invoice)
    adminOrderDetail.value = response.data || null
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal memuat detail pesanan'), { type: 'error' })
    showAdminOrderModal.value = false
  } finally {
    adminOrderDetailLoading.value = false
  }
}

const showDispatchConfirm = ref(false)
const orderToDispatch = ref(null)

function confirmDispatch(order) {
  orderToDispatch.value = order
  showDispatchConfirm.value = true
}

async function executeDispatch() {
  if (!orderToDispatch.value) return
  const order = orderToDispatch.value
  const invoice = order.invoice || order.id
  const key = `dispatch-${invoice}`
  if (isBusy(key)) return
  setBusy(key, true)
  try {
    await api.fulfillOrder(invoice, 'Diproses dari dashboard admin')
    emit('refresh')
    if (adminOrderDetail.value && (adminOrderDetail.value.invoice_number === invoice || adminOrderDetail.value.id === invoice)) {
      adminOrderDetail.value.status = 'processing'
    }
    showToast(`Pesanan #${invoice} berhasil diproses untuk pengiriman.`, { type: 'success' })
    showDispatchConfirm.value = false
    orderToDispatch.value = null
  } catch (error) {
    const message = String(error?.message || '')
    showToast(
      /already (processed|fulfilled)/i.test(message)
        ? 'Pesanan ini sudah pernah diproses untuk pengiriman.'
        : message || 'Gagal memproses pengiriman pesanan',
      { type: 'error' },
    )
  } finally {
    setBusy(key, false)
  }
}

const showReturnConfirm = ref(false)
const orderToReturn = ref(null)

function confirmReturn(order) {
  orderToReturn.value = order
  showReturnConfirm.value = true
}

async function executeReturn() {
  if (!orderToReturn.value) return
  const order = orderToReturn.value
  const invoice = order.invoice || order.id
  const key = `return-${invoice}`
  if (isBusy(key)) return
  setBusy(key, true)
  try {
    await api.returnOrder(invoice, 'Retur dari dashboard admin')
    emit('refresh')
    if (adminOrderDetail.value && (adminOrderDetail.value.invoice_number === invoice || adminOrderDetail.value.id === invoice)) {
      adminOrderDetail.value.status = 'returned'
    }
    showToast(`Pesanan #${invoice} berhasil diretur.`, { type: 'success' })
    showReturnConfirm.value = false
    orderToReturn.value = null
  } catch (error) {
    const message = String(error?.message || '')
    showToast(
      /invalid return state|not shipped|already returned/i.test(message)
        ? 'Retur hanya bisa untuk pesanan yang sudah dikirim atau selesai.'
        : message || 'Gagal memproses retur',
      { type: 'error' },
    )
  } finally {
    setBusy(key, false)
  }
}

useOrderStatusSSE({
  onPaymentStatus: (data) => {
    if (!data?.invoice_number) return
    const inv = data.invoice_number
    if (adminOrderDetail.value && (adminOrderDetail.value.invoice_number === inv || adminOrderDetail.value.id === inv)) {
      if (data.order_status) adminOrderDetail.value.status = data.order_status
      if (!adminOrderDetail.value.payment) adminOrderDetail.value.payment = {}
      if (data.payment_status) adminOrderDetail.value.payment.status = data.payment_status
      if (data.paid_at) adminOrderDetail.value.payment.paid_at = data.paid_at
    }
  },
  onShippingStatus: (data) => {
    if (!data?.invoice_number) return
    const inv = data.invoice_number
    if (adminOrderDetail.value && (adminOrderDetail.value.invoice_number === inv || adminOrderDetail.value.id === inv)) {
      if (data.order_status) adminOrderDetail.value.status = data.order_status
      if (!adminOrderDetail.value.shipping) adminOrderDetail.value.shipping = {}
      if (data.waybill_number) adminOrderDetail.value.shipping.tracking_number = data.waybill_number
      if (data.shipping_status) adminOrderDetail.value.shipping.shipping_status = data.shipping_status
    }
  },
})
</script>

<template>
  <div class="space-y-6">
        <div
          class="bg-white border-2 sm:border-3 border-black p-3 sm:p-4 rounded-[2px] shadow-neo-sm flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4"
        >
          <div class="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
            <div class="relative w-full sm:flex-1 sm:max-w-md">
              <input
                v-model="orderSearch"
                type="text"
                placeholder="Cari Invoice, Pelanggan, atau Email..."
                class="w-full bg-background border-2 border-black p-2 pl-3 rounded-[2px] font-outfit font-bold text-xs outline-none shadow-neo-sm focus:border-black"
              />
            </div>

                        <div class="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-2">
              <div class="relative w-full sm:w-auto">
                <select
                  v-model="orderStatusFilter"
                  class="w-full appearance-none bg-white border-2 border-black rounded-[2px] pl-3 pr-8 py-2 font-outfit font-bold text-xs shadow-neo-sm hover:bg-neutral-50 focus:outline-none focus:border-black cursor-pointer transition-all"
                >
                  <option value="all" class="bg-white text-black">Semua Status</option>
                  <option value="waiting_payment" class="bg-white text-black">
                    Menunggu Pembayaran
                  </option>
                  <option value="paid" class="bg-white text-black">Dibayar</option>
                  <option value="processing" class="bg-white text-black">Diproses</option>
                  <option value="shipped" class="bg-white text-black">Dikirim</option>
                  <option value="completed" class="bg-white text-black">Selesai</option>
                  <option value="cancelled" class="bg-white text-black">Dibatalkan</option>
                  <option value="returned" class="bg-white text-black">Diretur</option>
                </select>
                <div class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-black">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </div>

                            <div class="relative w-full sm:w-auto">
                <select
                  v-model="orderSortFilter"
                  class="w-full appearance-none bg-white border-2 border-black rounded-[2px] pl-3 pr-8 py-2 font-outfit font-bold text-xs shadow-neo-sm hover:bg-neutral-50 focus:outline-none focus:border-black cursor-pointer transition-all"
                >
                  <option value="newest">Pesanan Terbaru</option>
                  <option value="total-high">Total: Terbesar</option>
                  <option value="total-low">Total: Terkecil</option>
                </select>
                <div class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-black">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white border-2 sm:border-3 border-black rounded-[2px] shadow-neo-sm overflow-hidden">
          <div class="overflow-x-auto table-scrollbar">
            <table class="w-full min-w-[880px] text-xs font-sans border-collapse">
              <thead>
                <tr class="bg-black text-white font-outfit font-black text-left">
                  <th class="p-3 whitespace-nowrap min-w-[140px]">INVOICE & TANGGAL</th>
                  <th class="p-3 whitespace-nowrap min-w-[160px]">PELANGGAN</th>
                  <th class="p-3 whitespace-nowrap min-w-[130px]">PEMBAYARAN</th>
                  <th class="p-3 whitespace-nowrap min-w-[80px]">BUKU</th>
                  <th class="p-3 whitespace-nowrap min-w-[110px]">TOTAL</th>
                  <th class="p-3 whitespace-nowrap min-w-[120px]">STATUS PESANAN</th>
                  <th class="p-3 text-right whitespace-nowrap shrink-0">AKSI</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="7" class="p-8 text-center bg-gray-50/50">
                    <div class="inline-flex items-center justify-center gap-2.5">
                      <span
                        class="inline-block w-4 h-4 rounded-[2px] border-2 border-black border-t-transparent animate-spin shrink-0"
                      ></span>
                      <span class="font-outfit font-black text-sm text-black">
                        Memuat data pesanan...
                      </span>
                    </div>
                  </td>
                </tr>
                <tr v-else-if="!filteredAdminOrders.length">
                  <td colspan="7" class="p-8 text-center bg-gray-50/50">
                    <p class="font-outfit font-black text-sm text-black">Tidak Ada Pesanan</p>
                    <p class="font-sans text-xs text-muted-foreground mt-1">
                      Tidak ditemukan pesanan dengan status atau kriteria filter yang dipilih.
                    </p>
                  </td>
                </tr>
                <template v-else>
                  <tr
                    v-for="order in paginatedAdminOrders"
                    :key="order.id"
                    class="border-b border-black/10 hover:bg-gray-50"
                  >
                    <td class="p-3 whitespace-nowrap">
                      <span class="font-outfit font-black text-black block">#{{ order.id }}</span>
                      <span class="text-muted-foreground text-[10px]">{{ order.date }}</span>
                    </td>
                    <td class="p-3 min-w-[160px]">
                      <span class="font-outfit font-black text-black block">{{
                        order.customerName
                      }}</span>
                      <span class="text-muted-foreground text-[10px]">{{ maskEmail(order.customerEmail) }}</span>
                    </td>
                    <td class="p-3 max-w-xs whitespace-nowrap">
                      <span class="font-bold text-black block">{{ order.paymentMethod }}</span>
                    </td>
                    <td class="p-3 whitespace-nowrap">
                      <span class="text-neutral-800 font-semibold">
                        {{ order.totalQuantity }} item
                      </span>
                    </td>
                    <td class="p-3 whitespace-nowrap">
                      <span class="font-outfit font-black text-neo-violet text-sm block">
                        {{ formatRupiah(order.total) }}
                      </span>
                    </td>
                    <td class="p-3 whitespace-nowrap">
                      <StatusBadge :status="order.rawStatus" size="xs" />
                    </td>
                    <td class="p-3 text-right whitespace-nowrap shrink-0">
                      <div class="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <button
                          class="neubrutal-btn bg-white border border-black px-2 py-1 font-outfit font-black text-[10px] shadow-neo-sm hover:bg-gray-100 cursor-pointer"
                          @click="openAdminOrder(order)"
                        >
                          Detail
                        </button>
                        <button
                          v-if="order.rawStatus === 'paid'"
                          :disabled="isBusy(`dispatch-${order.invoice || order.id}`)"
                          class="neubrutal-btn bg-neo-yellow border border-black px-2 py-1 font-outfit font-black text-[10px] shadow-neo-sm hover:bg-yellow-300 disabled:opacity-50 cursor-pointer"
                          @click="confirmDispatch(order)"
                        >
                          {{ isBusy(`dispatch-${order.invoice || order.id}`) ? '...' : 'Proses Pengiriman' }}
                        </button>
                        <button
                          v-if="['shipped', 'completed'].includes(order.rawStatus)"
                          :disabled="isBusy(`return-${order.invoice || order.id}`)"
                          class="neubrutal-btn bg-white border border-black px-2 py-1 font-outfit font-black text-[10px] shadow-neo-sm hover:bg-red-50 disabled:opacity-50 cursor-pointer"
                          @click="confirmReturn(order)"
                        >
                          {{ isBusy(`return-${order.invoice || order.id}`) ? '...' : 'Retur' }}
                        </button>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>

                    <div
            v-if="adminOrdersMeta.total_pages > 1 || adminOrdersMeta.total_items > 0"
            class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 border-t-2 border-black bg-neutral-50"
          >
            <div class="text-xs font-sans font-bold text-neutral-600 text-center sm:text-left">
              Halaman <span class="font-outfit font-black text-black">{{ adminOrdersMeta.current_page }}</span> dari
              <span class="font-outfit font-black text-black">{{ adminOrdersMeta.total_pages }}</span>
              <span class="text-neutral-400 mx-1">·</span>
              Total {{ adminOrdersMeta.total_items }} pesanan
            </div>

            <div v-if="adminOrdersMeta.total_pages > 1" class="flex flex-wrap items-center justify-center sm:justify-end gap-1.5">
              <button
                type="button"
                :disabled="adminOrdersMeta.current_page <= 1 || loading"
                class="neubrutal-btn px-2.5 sm:px-3 py-1.5 rounded-[2px] border-2 border-black font-outfit font-black text-xs transition-all flex items-center gap-1 cursor-pointer"
                :class="[
                  adminOrdersMeta.current_page <= 1 || loading
                    ? 'bg-neutral-100 text-neutral-400 border-neutral-300 cursor-not-allowed shadow-none'
                    : 'bg-white text-black hover:bg-neo-yellow shadow-neo-xs hover:shadow-neo-sm',
                ]"
                @click="changeAdminOrderPage(-1)"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
                <span>Prev</span>
              </button>

              <button
                v-for="p in visibleAdminOrderPages"
                :key="`admin-order-page-${p}`"
                type="button"
                :disabled="p === '...' || loading"
                class="w-8 h-8 rounded-[2px] border-2 border-black font-outfit font-black text-xs transition-all flex items-center justify-center cursor-pointer"
                :class="[
                  p === adminOrdersMeta.current_page
                    ? 'bg-black text-white shadow-neo-xs'
                    : p === '...'
                      ? 'border-transparent text-neutral-400 cursor-default shadow-none'
                      : 'bg-white text-black hover:bg-neutral-100 shadow-neo-xs hover:shadow-neo-sm',
                ]"
                @click="p !== '...' && setAdminOrderPage(p)"
              >
                {{ p }}
              </button>

              <button
                type="button"
                :disabled="
                  adminOrdersMeta.current_page >= adminOrdersMeta.total_pages || loading
                "
                class="neubrutal-btn px-2.5 sm:px-3 py-1.5 rounded-[2px] border-2 border-black font-outfit font-black text-xs transition-all flex items-center gap-1 cursor-pointer"
                :class="[
                  adminOrdersMeta.current_page >= adminOrdersMeta.total_pages || loading
                    ? 'bg-neutral-100 text-neutral-400 border-neutral-300 cursor-not-allowed shadow-none'
                    : 'bg-white text-black hover:bg-neo-yellow shadow-neo-xs hover:shadow-neo-sm',
                ]"
                @click="changeAdminOrderPage(1)"
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
      v-if="showDispatchConfirm && orderToDispatch"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="showDispatchConfirm = false"
    >
      <div
        class="bg-white border-2 sm:border-3 border-black max-w-sm w-full rounded-[2px] shadow-neo-sm overflow-hidden animate-hero-entrance p-5 space-y-4 text-center"
      >
        <div class="w-12 h-12 bg-neo-yellow border-2 border-black rounded-[2px] mx-auto flex items-center justify-center shadow-neo-xs">
          <svg class="w-6 h-6 text-black" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25V3.75a1.125 1.125 0 0 0-1.125-1.125H5.625A1.125 1.125 0 0 0 4.5 3.75v10.5" />
          </svg>
        </div>

        <div>
          <h3 class="font-outfit font-black text-base text-black">Proses Pengiriman?</h3>
          <p class="font-sans text-xs text-muted-foreground mt-1">
            Pesanan <span class="font-outfit font-black text-black">#{{ orderToDispatch.invoice || orderToDispatch.id }}</span>
            milik <span class="font-semibold text-black">{{ orderToDispatch.customerName || 'Pelanggan' }}</span> akan diproses dan diteruskan ke kurir pengiriman.
          </p>
        </div>

        <div class="flex items-center justify-center gap-2 pt-1">
          <button
            type="button"
            class="neubrutal-btn bg-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100 cursor-pointer"
            @click="showDispatchConfirm = false"
          >
            Batal
          </button>
          <button
            type="button"
            :disabled="isBusy(`dispatch-${orderToDispatch.invoice || orderToDispatch.id}`)"
            class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-yellow-300 disabled:opacity-60 cursor-pointer"
            @click="executeDispatch"
          >
            {{ isBusy(`dispatch-${orderToDispatch.invoice || orderToDispatch.id}`) ? 'Memproses...' : 'Ya, Proses Pengiriman' }}
          </button>
        </div>
      </div>
    </div>

        <div

      v-if="showReturnConfirm && orderToReturn"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="showReturnConfirm = false"
    >
      <div
        class="bg-white border-2 sm:border-3 border-black max-w-sm w-full rounded-[2px] shadow-neo-sm overflow-hidden animate-hero-entrance p-5 space-y-4 text-center"
      >
        <div class="w-12 h-12 bg-red-100 border-2 border-black rounded-[2px] mx-auto flex items-center justify-center shadow-neo-xs">
          <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
          </svg>
        </div>

        <div>
          <h3 class="font-outfit font-black text-base text-black">Konfirmasi Retur Pesanan?</h3>
          <p class="font-sans text-xs text-muted-foreground mt-1">
            Pesanan <span class="font-outfit font-black text-black">#{{ orderToReturn.invoice || orderToReturn.id }}</span>
            milik <span class="font-semibold text-black">{{ orderToReturn.customerName || 'Pelanggan' }}</span> akan ditandai sebagai diretur dan status pesanan akan diperbarui.
          </p>
        </div>

        <div class="flex items-center justify-center gap-2 pt-1">
          <button
            type="button"
            class="neubrutal-btn bg-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100 cursor-pointer"
            @click="showReturnConfirm = false"
          >
            Batal
          </button>
          <button
            type="button"
            :disabled="isBusy(`return-${orderToReturn.invoice || orderToReturn.id}`)"
            class="neubrutal-btn bg-red-500 text-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-red-600 disabled:opacity-60 cursor-pointer"
            @click="executeReturn"
          >
            {{ isBusy(`return-${orderToReturn.invoice || orderToReturn.id}`) ? 'Memproses...' : 'Ya, Retur Pesanan' }}
          </button>
        </div>
      </div>
    </div>

    <div

      v-if="showAdminOrderModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="showAdminOrderModal = false"
    >
      <div
        class="bg-white border-2 sm:border-3 border-black max-w-2xl w-full rounded-[2px] shadow-neo-sm overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div class="bg-neo-yellow border-b-2 sm:border-b-3 border-black p-3.5 sm:p-4 flex items-center justify-between shrink-0">
          <div>
            <h3 class="font-outfit font-black text-sm sm:text-base text-black uppercase tracking-wide">
              DETAIL PESANAN
            </h3>
            <p class="font-sans text-[11px] text-black/70 mt-0.5">
              Rincian item buku, informasi pelanggan, alamat pengiriman, dan status pembayaran.
            </p>
          </div>
          <button
            type="button"
            class="w-8 h-8 rounded-[2px] bg-white border-2 border-black flex items-center justify-center font-outfit font-black text-sm hover:bg-black hover:text-white transition-colors cursor-pointer"
            @click="showAdminOrderModal = false"
          >
            ✕
          </button>
        </div>

        <div class="p-5 overflow-y-auto space-y-4">
          <div
            v-if="adminOrderDetailLoading"
            class="py-16 flex flex-col items-center justify-center gap-3 text-center"
          >
            <div
              class="w-9 h-9 rounded-[2px] border-3 border-black border-t-transparent animate-spin"
            ></div>
            <p class="font-outfit font-black text-sm text-black">
              Memuat detail pesanan...
            </p>
            <p class="font-sans text-xs text-muted-foreground">
              Mengambil rincian transaksi dari server...
            </p>
          </div>

          <template v-else-if="adminOrderDetail">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-1.5">
                <span class="font-outfit font-black text-lg">#{{ adminOrderDetail.invoice_number }}</span>
                <button
                  type="button"
                  class="p-1 hover:bg-neutral-100 rounded transition-colors cursor-pointer inline-flex items-center justify-center"
                  :title="copiedKey === 'invoice' ? 'Nomor Invoice Disalin' : 'Salin Nomor Invoice'"
                  @click="copyValue(adminOrderDetail.invoice_number, 'invoice')"
                >
                  <svg v-if="copiedKey === 'invoice'" class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <svg v-else class="w-4 h-4 text-neutral-600 hover:text-black" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <rect width="13" height="13" x="9" y="9" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </div>
              <StatusBadge :status="adminOrderDetail.status" size="xs" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="bg-background border-2 border-black p-3">
                <p class="font-outfit font-black text-[10px] uppercase text-muted-foreground mb-1">
                  Akun Pembeli
                </p>
                <p class="font-outfit font-black text-sm">
                  {{ adminOrderDetail.customer?.name || '—' }}
                </p>
                <p class="font-sans text-xs text-muted-foreground break-all">
                  {{ maskEmail(adminOrderDetail.customer?.email) }}
                </p>
                <p class="font-sans text-xs text-muted-foreground">
                  {{ adminOrderDetail.customer?.phone || '' }}
                </p>
              </div>

              <div class="bg-background border-2 border-black p-3">
                <p class="font-outfit font-black text-[10px] uppercase text-muted-foreground mb-1">
                  Penerima
                </p>
                <p class="font-outfit font-black text-sm">
                  {{ adminOrderDetail.recipient?.name || '—' }}
                </p>
                <p class="font-sans text-xs">{{ adminOrderDetail.recipient?.phone || '' }}</p>
                <p class="font-sans text-xs text-muted-foreground mt-1">
                  {{ adminOrderDetail.recipient?.address }}, {{ adminOrderDetail.recipient?.city }}
                  {{ adminOrderDetail.recipient?.postal_code }}
                </p>
              </div>
            </div>

            <div class="border-2 border-black p-3 font-sans text-xs space-y-1">
              <p class="font-outfit font-black text-[10px] uppercase text-muted-foreground">
                Pengiriman
              </p>
              <p>
                <span class="text-muted-foreground">Kurir:</span>
                {{
                  shippingLabel(
                    adminOrderDetail.shipping?.courier,
                    adminOrderDetail.shipping?.courier_service,
                  ) || '-'
                }}
              </p>
              <p class="flex items-center gap-1.5">
                <span class="text-muted-foreground">Resi:</span>
                <span class="font-mono">
                  {{ adminOrderDetail.shipping?.tracking_number || 'Belum diterbitkan' }}
                </span>
                <button
                  v-if="adminOrderDetail.shipping?.tracking_number"
                  type="button"
                  class="p-0.5 hover:bg-neutral-100 rounded transition-colors cursor-pointer inline-flex items-center justify-center"
                  :title="copiedKey === 'resi' ? 'Resi Disalin' : 'Salin Resi'"
                  @click="copyValue(adminOrderDetail.shipping?.tracking_number, 'resi')"
                >
                  <svg v-if="copiedKey === 'resi'" class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <svg v-else class="w-3.5 h-3.5 text-neutral-600 hover:text-black" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <rect width="13" height="13" x="9" y="9" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </p>
              <p>
                <span class="text-muted-foreground">Status kurir:</span>
                {{ adminOrderDetail.shipping?.status || '—' }}
              </p>
            </div>

            <div class="border-2 border-black p-3 font-sans text-xs space-y-1">
              <p class="font-outfit font-black text-[10px] uppercase text-muted-foreground">
                Pembayaran
              </p>
              <p>
                <span class="text-muted-foreground">Metode:</span>
                {{
                  adminOrderDetail.payment?.payment_method_name ||
                  adminOrderDetail.payment?.payment_method ||
                  '—'
                }}
              </p>
              <p>
                <span class="text-muted-foreground">Status:</span>
                {{ adminOrderDetail.payment?.status || '—' }}
              </p>
              <p v-if="adminOrderDetail.payment?.va_number || adminOrderDetail.payment?.vaNumber" class="flex items-center gap-1.5">
                <span class="text-muted-foreground">No. VA:</span>
                <span class="font-mono">{{ adminOrderDetail.payment.va_number || adminOrderDetail.payment.vaNumber }}</span>
                <button
                  type="button"
                  class="p-0.5 hover:bg-neutral-100 rounded transition-colors cursor-pointer inline-flex items-center justify-center"
                  :title="copiedKey === 'va' ? 'Nomor VA Disalin' : 'Salin Nomor VA'"
                  @click="copyValue(adminOrderDetail.payment.va_number || adminOrderDetail.payment.vaNumber, 'va')"
                >
                  <svg v-if="copiedKey === 'va'" class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <svg v-else class="w-3.5 h-3.5 text-neutral-600 hover:text-black" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <rect width="13" height="13" x="9" y="9" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </p>
              <p v-if="adminOrderDetail.payment?.biller_code || adminOrderDetail.payment?.billerCode" class="flex items-center gap-1.5">
                <span class="text-muted-foreground">Biller Code:</span>
                <span class="font-mono">{{ adminOrderDetail.payment.biller_code || adminOrderDetail.payment.billerCode }}</span>
                <button
                  type="button"
                  class="p-0.5 hover:bg-neutral-100 rounded transition-colors cursor-pointer inline-flex items-center justify-center"
                  :title="copiedKey === 'billerCode' ? 'Biller Code Disalin' : 'Salin Biller Code'"
                  @click="copyValue(adminOrderDetail.payment.biller_code || adminOrderDetail.payment.billerCode, 'billerCode')"
                >
                  <svg v-if="copiedKey === 'billerCode'" class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <svg v-else class="w-3.5 h-3.5 text-neutral-600 hover:text-black" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <rect width="13" height="13" x="9" y="9" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </p>
              <p v-if="adminOrderDetail.payment?.bill_key || adminOrderDetail.payment?.billKey" class="flex items-center gap-1.5">
                <span class="text-muted-foreground">Bill Key:</span>
                <span class="font-mono">{{ adminOrderDetail.payment.bill_key || adminOrderDetail.payment.billKey }}</span>
                <button
                  type="button"
                  class="p-0.5 hover:bg-neutral-100 rounded transition-colors cursor-pointer inline-flex items-center justify-center"
                  :title="copiedKey === 'billKey' ? 'Bill Key Disalin' : 'Salin Bill Key'"
                  @click="copyValue(adminOrderDetail.payment.bill_key || adminOrderDetail.payment.billKey, 'billKey')"
                >
                  <svg v-if="copiedKey === 'billKey'" class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <svg v-else class="w-3.5 h-3.5 text-neutral-600 hover:text-black" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <rect width="13" height="13" x="9" y="9" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </p>
              <p v-if="adminOrderDetail.payment?.payment_code || adminOrderDetail.payment?.paymentCode" class="flex items-center gap-1.5">
                <span class="text-muted-foreground">Kode Pembayaran:</span>
                <span class="font-mono">{{ adminOrderDetail.payment.payment_code || adminOrderDetail.payment.paymentCode }}</span>
                <button
                  type="button"
                  class="p-0.5 hover:bg-neutral-100 rounded transition-colors cursor-pointer inline-flex items-center justify-center"
                  :title="copiedKey === 'paymentCode' ? 'Kode Pembayaran Disalin' : 'Salin Kode Pembayaran'"
                  @click="copyValue(adminOrderDetail.payment.payment_code || adminOrderDetail.payment.paymentCode, 'paymentCode')"
                >
                  <svg v-if="copiedKey === 'paymentCode'" class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <svg v-else class="w-3.5 h-3.5 text-neutral-600 hover:text-black" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <rect width="13" height="13" x="9" y="9" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </p>
              <p v-if="adminOrderDetail.paid_at">
                <span class="text-muted-foreground">Dibayar:</span>
                {{ formatDateTime(adminOrderDetail.paid_at) }}
              </p>
              <p v-else-if="adminOrderDetail.payment_deadline">
                <span class="text-muted-foreground">Batas bayar:</span>
                {{ formatDateTime(adminOrderDetail.payment_deadline) }}
              </p>
            </div>

            <div class="overflow-x-auto table-scrollbar">
              <table class="w-full min-w-[420px] text-xs font-sans border-collapse">
                <thead>
                  <tr class="bg-black text-white font-outfit font-black text-left">
                    <th class="p-2 whitespace-nowrap min-w-[150px]">BUKU</th>
                    <th class="p-2 text-center whitespace-nowrap min-w-[50px]">QTY</th>
                    <th class="p-2 text-right whitespace-nowrap min-w-[100px]">HARGA</th>
                    <th class="p-2 text-right whitespace-nowrap min-w-[110px]">SUBTOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in adminOrderDetail.items || []"
                    :key="item.book_id"
                    class="border-b border-black/10"
                  >
                    <td class="p-2 font-bold min-w-[150px]">
                      <div class="flex items-center gap-2">
                        <div class="w-8 h-11 shrink-0 border border-black bg-neutral-100 overflow-hidden flex items-center justify-center shadow-neo-xs relative">
                          <img
                            v-if="adminOrderItemCover(item)"
                            :src="adminOrderItemCover(item)"
                            :alt="item.title"
                            class="w-full h-full object-cover"
                            @error="(e) => (e.target.style.display = 'none')"
                          />
                          <span v-else class="text-[8px] font-bold text-neutral-400">📖</span>
                        </div>
                        <span class="line-clamp-2">{{ item.title }}</span>
                      </div>
                    </td>
                    <td class="p-2 text-center whitespace-nowrap">{{ item.quantity }}</td>
                    <td class="p-2 text-right whitespace-nowrap">{{ formatRupiah(item.price) }}</td>
                    <td class="p-2 text-right font-bold whitespace-nowrap">
                      {{ formatRupiah(item.price * item.quantity) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="border-t-2 border-black pt-3 font-sans text-xs space-y-1">
              <div class="flex justify-between">
                <span class="text-muted-foreground">Subtotal buku</span>
                <span class="font-bold">
                  {{ formatRupiah(adminOrderDetail.pricing?.items_subtotal) }}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted-foreground">Diskon</span>
                <span class="font-bold">
                  -{{ formatRupiah(adminOrderDetail.pricing?.discount_amount) }}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted-foreground">Ongkir</span>
                <span class="font-bold">{{
                  formatRupiah(adminOrderDetail.pricing?.shipping_cost)
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted-foreground">Biaya admin</span>
                <span class="font-bold">{{
                  formatRupiah(adminOrderDetail.pricing?.admin_fee)
                }}</span>
              </div>
              <div
                class="flex justify-between text-sm font-outfit font-black pt-1 border-t border-black/20"
              >
                <span>Total</span>
                <span class="text-neo-violet">
                  {{ formatRupiah(adminOrderDetail.pricing?.total_amount) }}
                </span>
              </div>
            </div>
          </template>

          <p v-else class="font-sans text-xs font-semibold text-muted-foreground">
            Detail pesanan tidak tersedia.
          </p>
        </div>
      </div>
    </div>


  </div>
</template>
