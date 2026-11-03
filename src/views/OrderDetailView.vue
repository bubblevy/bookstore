<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, session } from '@/lib/api'
import { subscribeOrderSSE } from '@/lib/sse'
import { useStore } from '@/composables/useStore'
import { formatFullAddress } from '@/lib/mappers'
import { assetUrl } from '@/lib/assets'
import FullScreenLoader from '@/components/FullScreenLoader.vue'
import PaymentInstructions from '@/components/PaymentInstructions.vue'

const route = useRoute()
const router = useRouter()
const { state, bootstrap, showToast } = useStore()

const invoiceNumber = computed(() => String(route.params.id || '').trim())

const historyOrder = window.history?.state?.initialOrder
const hasInitialData = Boolean(
  historyOrder &&
    (String(historyOrder.invoice_number || '') === invoiceNumber.value ||
      String(historyOrder.id || '') === invoiceNumber.value),
)

const loading = ref(true)
const error = ref('')
const order = ref(hasInitialData ? historyOrder : null)
const copiedInvoice = ref(false)
const copiedResi = ref(false)
const paymentExpired = ref(false)
const downloadingPdf = ref(false)
const sseConnected = ref(false)

let sseSubscription = null

function formatCurrency(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(num)
}

function formatDateTime(value) {
  if (!value) return '-'
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  } catch {
    return String(value)
  }
}

const isPaymentPending = computed(() => {
  const status = String(order.value?.status || '').toLowerCase()
  const paymentStatus = String(order.value?.payment?.status || '').toLowerCase()
  const isPaid =
    ['settlement', 'capture', 'paid', 'success', 'lunas'].includes(paymentStatus) ||
    ['paid', 'processing', 'shipped', 'delivered', 'completed'].includes(status)
  const isTerminal = ['cancelled', 'expired', 'failed'].includes(status)
  return !isPaid && !isTerminal && !paymentExpired.value
})

const orderStatusMeta = computed(() => {
  const status = String(order.value?.status || '').toLowerCase()
  const payStatus = String(order.value?.payment?.status || '').toLowerCase()

  if (['cancelled', 'expired', 'failed'].includes(status) || paymentExpired.value) {
    return {
      label: 'DIBATALKAN',
      bgClass: 'bg-red-100 text-red-800 border-red-500',
      dotClass: 'bg-red-500',
    }
  }
  if (['delivered', 'completed'].includes(status)) {
    return {
      label: 'PESANAN SELESAI',
      bgClass: 'bg-emerald-100 text-emerald-900 border-emerald-600',
      dotClass: 'bg-emerald-500',
    }
  }
  if (status === 'shipped') {
    return {
      label: 'DALAM PENGIRIMAN',
      bgClass: 'bg-blue-100 text-blue-900 border-blue-600',
      dotClass: 'bg-blue-500',
    }
  }
  if (['processing', 'paid'].includes(status) || ['settlement', 'capture', 'paid'].includes(payStatus)) {
    return {
      label: 'DIPROSES',
      bgClass: 'bg-teal-100 text-teal-900 border-teal-600',
      dotClass: 'bg-teal-500',
    }
  }
  return {
    label: 'MENUNGGU PEMBAYARAN',
    bgClass: 'bg-amber-100 text-amber-900 border-amber-500',
    dotClass: 'bg-amber-500 animate-pulse',
  }
})

const paymentDisplay = computed(() => {
  const p = order.value?.payment || {}
  return {
    ...p,
    bank: p.bank || '',
    vaNumber: p.va_number || p.vaNumber || '',
    qrUrl: p.qr_url || p.qrUrl || '',
    billKey: p.bill_key || p.billKey || '',
    billerCode: p.biller_code || p.billerCode || '',
    paymentCode: p.payment_code || p.paymentCode || '',
    store: p.store || '',
    deeplinkUrl: p.deeplink_url || p.deeplinkUrl || '',
    status: p.status || order.value?.status || '',
  }
})

const items = computed(() => order.value?.items || [])
const pricing = computed(() => order.value?.pricing || {})
const recipient = computed(() => order.value?.recipient || {})
const shipping = computed(() => order.value?.shipping || {})
const payment = computed(() => order.value?.payment || {})

const formattedRecipientAddress = computed(() => {
  return formatFullAddress(recipient.value) || 'Alamat pengiriman tercatat'
})

function fullCoverUrl(item) {
  let url = item?.cover_image || item?.cover || ''
  if (!url) {
    const found = state.books.find((b) => String(b.id) === String(item?.book_id || item?.id))
    url = found?.coverImage || found?.cover || ''
  }
  if (!url) return ''
  return assetUrl(url)
}

async function fetchOrderDetail(silent = false) {
  if (!invoiceNumber.value) {
    error.value = 'Nomor invoice tidak valid.'
    loading.value = false
    return
  }

  if (!silent) {
    loading.value = true
    error.value = ''
  }

  try {
    const response = await api.order(invoiceNumber.value)
    order.value = response.data || null

    if (!order.value) {
      error.value = 'Data pesanan tidak ditemukan.'
      return
    }

    const payStatus = String(order.value.payment?.status || '').toLowerCase()
    const ordStatus = String(order.value.status || '').toLowerCase()
    if (
      ['settlement', 'capture', 'paid', 'success', 'lunas'].includes(payStatus) ||
      ['paid', 'processing', 'completed'].includes(ordStatus)
    ) {
          } else if (['cancelled', 'expired', 'failed'].includes(ordStatus)) {
      paymentExpired.value = true
    }
  } catch (err) {
    if (err?.status === 401) {
      router.replace({ name: 'login', query: { redirect: route.fullPath } })
      return
    }
    if (!silent) {
      error.value = err?.message || 'Gagal memuat invoice pesanan. Silakan coba beberapa saat lagi.'
    }
  } finally {
    if (!silent) loading.value = false
  }
}

async function copyText(text, type = 'invoice') {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    if (type === 'invoice') {
      copiedInvoice.value = true
      setTimeout(() => {
        copiedInvoice.value = false
      }, 2000)
    } else {
      copiedResi.value = true
      setTimeout(() => {
        copiedResi.value = false
      }, 2000)
    }
  } catch {
  }
}

async function downloadInvoicePdf() {
  const inv = order.value?.invoice_number || invoiceNumber.value
  if (!inv || downloadingPdf.value) return

  downloadingPdf.value = true
  try {
    const result = await api.orderPdf(inv)
    const blobUrl = window.URL.createObjectURL(result.blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = result.filename || `Invoice-${inv}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(blobUrl)
    showToast('Invoice PDF berhasil diunduh.', { type: 'success' })
  } catch (err) {
    showToast(err?.message || 'Gagal mengunduh invoice PDF.', { type: 'error' })
  } finally {
    downloadingPdf.value = false
  }
}

function initSSE() {
  const inv = invoiceNumber.value
  if (!inv) return

  if (sseSubscription) {
    sseSubscription.close()
    sseSubscription = null
  }

  sseSubscription = subscribeOrderSSE({
    invoice: inv,
    onConnected: () => {
      sseConnected.value = true
    },
    onPaymentStatus: (payload) => {
      if (payload?.invoice_number && payload.invoice_number !== inv) return

      if (order.value) {
        if (!order.value.payment) order.value.payment = {}
        if (payload.payment_status) order.value.payment.status = payload.payment_status
        if (payload.order_status) order.value.status = payload.order_status
        if (payload.paid_at) order.value.payment.paid_at = payload.paid_at
      }

      const pStatus = String(payload.payment_status || '').toLowerCase()
      const oStatus = String(payload.order_status || '').toLowerCase()

      if (
        ['settlement', 'capture', 'paid', 'success', 'lunas'].includes(pStatus) ||
        ['paid', 'processing', 'completed'].includes(oStatus)
      ) {
        fetchOrderDetail(true)
      } else if (['cancelled', 'expired', 'failed', 'expire', 'cancel', 'deny'].includes(pStatus) || ['cancelled', 'expired', 'failed'].includes(oStatus)) {
        paymentExpired.value = true
        fetchOrderDetail(true)
      }
    },
    onShippingStatus: (payload) => {
      if (payload?.invoice_number && payload.invoice_number !== inv) return

      if (order.value) {
        if (!order.value.shipping) order.value.shipping = {}
        if (payload.shipping_status) order.value.shipping.status = payload.shipping_status
        const waybill = payload.waybill_number || payload.tracking_number
        if (waybill) {
          order.value.shipping.tracking_number = waybill
          order.value.shipping.waybill_number = waybill
        }
        if (payload.order_status) order.value.status = payload.order_status
      }
      fetchOrderDetail(true)
    },
    onError: () => {
      sseConnected.value = false
    },
  })
}

watch(invoiceNumber, (newInv) => {
  if (newInv) {
    fetchOrderDetail()
    initSSE()
  }
})

onMounted(async () => {
  await bootstrap()
  if (!session.isAuthenticated) {
    try {
      const res = await api.refreshWithCookie()
      if (res?.data?.access_token) {
        session.set(res.data)
      }
    } catch {
          }
  }

    await fetchOrderDetail()

  // Subscribe to real-time order status updates via SSE.
  initSSE()
})

onUnmounted(() => {
  if (sseSubscription) {
    sseSubscription.close()
    sseSubscription = null
  }
})
</script>

<template>
  <div class="min-h-screen bg-background py-5 sm:py-7">
    <FullScreenLoader :show="loading" />

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav
        v-if="order"
        class="flex items-center gap-2 text-xs font-sans font-bold text-neutral-500 mb-5 overflow-x-auto whitespace-nowrap scrollbar-hide select-none"
        aria-label="Breadcrumb"
      >
        <router-link
          to="/"
          class="hover:text-black transition-colors flex items-center gap-1.5 shrink-0"
        >
          <svg
            class="w-3.5 h-3.5 text-neutral-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Beranda</span>
        </router-link>
        <span class="text-neutral-400 shrink-0">/</span>
        <router-link to="/dashboard" class="hover:text-black transition-colors shrink-0">
          Dashboard
        </router-link>
        <span class="text-neutral-400 shrink-0">/</span>
        <span class="text-neutral-900 font-black shrink-0">
          Detail Pesanan
        </span>
      </nav>

            <div
        v-if="!loading && !order"
        class="py-16 sm:py-24 text-center max-w-lg mx-auto px-4 space-y-3"
      >
        <h1 class="font-outfit font-black text-2xl sm:text-3xl text-black tracking-tight">
          Invoice Tidak Ditemukan
        </h1>
        <p class="font-sans text-sm sm:text-base text-neutral-600 font-medium leading-relaxed">
          Invoice atau pesanan yang Anda cari mungkin sedang tidak tersedia dalam sistem kami.
        </p>
        <div class="pt-3 flex flex-wrap justify-center gap-3">
          <router-link
            to="/dashboard"
            class="inline-block neubrutal-btn bg-neo-yellow text-black border-2 border-black py-2.5 px-6 rounded-[2px] font-outfit font-black text-sm shadow-neo-sm hover:bg-yellow-300 cursor-pointer transition-all"
          >
            Ke Dashboard Pesanan
          </router-link>
          <router-link
            to="/"
            class="inline-block neubrutal-btn bg-white text-black border-2 border-black py-2.5 px-6 rounded-[2px] font-outfit font-black text-sm shadow-neo-sm hover:bg-gray-100 cursor-pointer transition-all"
          >
            Kembali ke Beranda
          </router-link>
        </div>
      </div>

            <div v-else-if="order" class="space-y-6">
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
          
                    <div class="lg:col-span-7 space-y-5">
                        <div class="bg-white border-2 sm:border-3 border-black rounded-[2px] p-5 sm:p-6 shadow-neo-sm sm:shadow-neo space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-black pb-4">
                <div>
                  <div class="flex items-center gap-2">
                    <h1 class="font-outfit font-black text-xl sm:text-2xl text-black tracking-tight">
                      BOOKSTORE
                    </h1>
                  </div>
                  <p class="font-sans text-xs text-neutral-500 mt-0.5">
                    Invoice Resmi Pembelian Buku
                  </p>
                </div>

                <div class="text-left sm:text-right space-y-1">
                  <div class="inline-flex items-center sm:justify-end gap-1.5 bg-neutral-100 border border-black px-2 py-0.5">
                    <span class="font-mono font-black text-sm sm:text-base text-black select-all">
                      #{{ order.invoice_number || invoiceNumber }}
                    </span>
                    <button
                      type="button"
                      class="p-1 hover:bg-neutral-200 transition-colors rounded-[2px]"
                      :title="copiedInvoice ? 'Nomor Disalin!' : 'Salin Nomor Invoice'"
                      @click="copyText(order.invoice_number || invoiceNumber, 'invoice')"
                    >
                      <svg v-if="copiedInvoice" class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <svg v-else class="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <rect width="13" height="13" x="9" y="9" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>
                  </div>
                  <p class="font-sans text-[11px] text-neutral-500">
                    {{ formatDateTime(order.created_at) }}
                  </p>
                </div>
              </div>

                            <div class="flex items-center pt-1">
                <span
                  class="border-2 border-black px-2.5 py-1 font-outfit font-black text-[11px] tracking-wide uppercase inline-flex items-center shadow-neo-sm"
                  :class="orderStatusMeta.bgClass"
                >
                  {{ orderStatusMeta.label }}
                </span>
              </div>
            </div>

                        <div v-if="isPaymentPending">
              <PaymentInstructions
                :payment="paymentDisplay"
                :amount="pricing.total_amount"
                :deadline="formatDateTime(order.payment_deadline)"
                :deadline-at="order.payment_deadline"
                :started-at="order.created_at"
                :status="order.status"
                @expired="paymentExpired = true"
              />
            </div>

                        <div class="bg-white border-2 sm:border-3 border-black rounded-[2px] p-5 sm:p-6 shadow-neo-sm sm:shadow-neo space-y-4">
              <div class="flex items-center justify-between border-b-2 border-black pb-3">
                <h2 class="font-outfit font-black text-base text-black uppercase tracking-wider">
                  Daftar Buku ({{ items.length }})
                </h2>
                <span class="font-sans text-xs font-bold text-neutral-500">
                  {{ items.reduce((acc, it) => acc + Number(it.quantity || 1), 0) }} total eksemplar
                </span>
              </div>

                            <div class="border-2 border-black overflow-x-auto table-scrollbar bg-white">
                <table class="w-full text-left border-collapse min-w-[460px]">
                  <thead>
                    <tr class="bg-neutral-100 border-b-2 border-black font-outfit font-black text-[11px] uppercase tracking-wider text-black">
                      <th class="py-2.5 px-3 whitespace-nowrap min-w-[180px]">BUKU</th>
                      <th class="py-2.5 px-3 text-right whitespace-nowrap min-w-[90px]">HARGA</th>
                      <th class="py-2.5 px-3 text-center whitespace-nowrap min-w-[60px]">QTY</th>
                      <th class="py-2.5 px-3 text-right whitespace-nowrap min-w-[100px]">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-black/10">
                    <tr
                      v-for="item in items"
                      :key="item.id || item.book_id"
                      class="hover:bg-neutral-50 transition-colors"
                    >
                      <td class="py-3 px-3">
                        <div class="flex items-center gap-3">
                          <div class="w-10 h-14 shrink-0 border border-black rounded-[2px] bg-white overflow-hidden flex items-center justify-center shadow-neo-xs sm:shadow-neo-sm">
                            <img
                              v-if="fullCoverUrl(item)"
                              :src="fullCoverUrl(item)"
                              :alt="item.title"
                              class="w-full h-full object-cover"
                              loading="lazy"
                            />
                            <span v-else class="font-outfit font-bold text-[8px] text-neutral-400 p-1 text-center">
                              Buku
                            </span>
                          </div>
                          <div class="min-w-0">
                            <h3 class="font-outfit font-black text-xs sm:text-sm text-black leading-snug line-clamp-2">
                              {{ item.title }}
                            </h3>
                            <p v-if="item.author" class="font-sans text-[11px] text-neutral-500 mt-0.5 truncate">
                              {{ item.author }}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td class="py-3 px-3 text-right font-sans text-xs font-semibold text-neutral-800 whitespace-nowrap">
                        {{ formatCurrency(item.price) }}
                      </td>
                      <td class="py-3 px-3 text-center font-mono font-bold text-xs text-black">
                        {{ item.quantity }}
                      </td>
                      <td class="py-3 px-3 text-right font-outfit font-black text-xs sm:text-sm text-black whitespace-nowrap">
                        {{ formatCurrency(item.subtotal || (Number(item.price) * Number(item.quantity))) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

                            <div class="p-3 bg-neutral-50 border border-black text-[11px] text-neutral-600 space-y-1">
                <p class="font-outfit font-black uppercase text-black tracking-wide">Jaminan Toko:</p>
                <p>• Seluruh buku diproses langsung dari distributor resmi dan dijamin 100% orisinal.</p>
                <p>• Simpan nomor invoice ini sebagai bukti pembayaran dan klaim garansi pengiriman.</p>
              </div>
            </div>
          </div>

                    <div class="lg:col-span-5 space-y-5">
                        <div class="bg-white border-2 sm:border-3 border-black rounded-[2px] p-5 sm:p-6 shadow-neo-sm sm:shadow-neo space-y-4">
              <div class="border-b-2 border-black pb-3">
                <p class="font-outfit font-black text-sm uppercase tracking-wider text-black">
                  Ringkasan Pembayaran
                </p>
              </div>

              <div class="space-y-2 text-xs sm:text-sm">
                <div class="flex justify-between">
                  <span class="text-neutral-600">Subtotal Produk</span>
                  <span class="font-outfit font-bold text-black">{{ formatCurrency(pricing.items_subtotal) }}</span>
                </div>

                <div v-if="Number(pricing.discount_amount) > 0" class="flex justify-between text-emerald-700">
                  <span class="font-semibold">Potongan Diskon</span>
                  <span class="font-outfit font-bold">- {{ formatCurrency(pricing.discount_amount) }}</span>
                </div>

                <div class="flex justify-between">
                  <span class="text-neutral-600">Ongkos Kirim</span>
                  <span class="font-outfit font-bold text-black">{{ formatCurrency(pricing.shipping_cost) }}</span>
                </div>

                <div v-if="Number(pricing.admin_fee) > 0" class="flex justify-between">
                  <span class="text-neutral-600">Biaya Layanan</span>
                  <span class="font-outfit font-bold text-black">{{ formatCurrency(pricing.admin_fee) }}</span>
                </div>

                                <div class="pt-3 border-t-2 border-black flex justify-between items-baseline mt-2">
                  <span class="font-outfit font-black text-xs sm:text-sm uppercase tracking-wide text-black">
                    TOTAL PEMBAYARAN
                  </span>
                  <span class="font-outfit font-black text-base sm:text-lg text-black whitespace-nowrap">
                    {{ formatCurrency(pricing.total_amount) }}
                  </span>
                </div>
              </div>
            </div>

                        <div class="bg-white border-2 sm:border-3 border-black rounded-[2px] p-5 sm:p-6 shadow-neo-sm sm:shadow-neo space-y-3.5">
              <div class="flex items-center justify-between border-b-2 border-black pb-3">
                <p class="font-outfit font-black text-sm uppercase tracking-wider text-black">
                  Tujuan Pengiriman
                </p>
                <span class="font-mono font-bold text-xs uppercase px-2 py-0.5 border border-black bg-neutral-100">
                  {{ (shipping.courier_name || shipping.courier || 'JNE').toUpperCase() }}
                </span>
              </div>

              <div>
                <p class="font-outfit font-black text-sm text-black">
                  {{ recipient.name || state.userName || 'Penerima' }}
                </p>
                <p v-if="recipient.phone" class="font-sans text-xs text-neutral-600 mt-0.5">
                  {{ recipient.phone }}
                </p>
                <p class="font-sans text-xs text-neutral-600 mt-1 leading-relaxed">
                  {{ formattedRecipientAddress }}
                </p>
              </div>

                            <div class="pt-2 border-t border-black/10 text-xs space-y-2">
                <div class="flex justify-between items-center">
                  <span class="text-neutral-500">Layanan:</span>
                  <span class="font-outfit font-black text-black uppercase">
                    {{ (shipping.courier_service_name || shipping.courier_service || 'REG').toUpperCase() }}
                  </span>
                </div>

                                <div v-if="shipping.tracking_number" class="flex justify-between items-center bg-neutral-100 border border-black px-2.5 py-1.5">
                  <div class="flex items-center gap-1.5">
                    <span class="font-sans text-[10px] font-bold text-neutral-500 uppercase">Resi:</span>
                    <span class="font-mono font-black text-xs text-black select-all">{{ shipping.tracking_number }}</span>
                  </div>
                  <button
                    type="button"
                    class="p-1 hover:bg-neutral-200 transition-colors cursor-pointer"
                    :title="copiedResi ? 'Resi Disalin!' : 'Salin Resi'"
                    @click="copyText(shipping.tracking_number, 'resi')"
                  >
                    <svg v-if="copiedResi" class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <svg v-else class="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <rect width="13" height="13" x="9" y="9" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>


          </div>
        </div>
      </div>
    </div>
  </div>
</template>
