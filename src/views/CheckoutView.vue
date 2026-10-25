<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/composables/useStore'
import { api } from '@/lib/api'
import { assetUrl } from '@/lib/assets'
import BookCover from '@/components/BookCover.vue'
import PaymentInstructions from '@/components/PaymentInstructions.vue'

const router = useRouter()
const { state, bootstrap, refreshCart, updateQuantity, showToast } = useStore()

const form = ref({
  courier: '',
  courierService: '',
  payment: '',
})

const items = computed(() => state.cart.filter((item) => item.selected))
const subtotal = computed(() =>
  items.value.reduce((sum, item) => sum + item.price * item.quantity, 0),
)

const rates = ref([])
const ratesAddressId = ref(null)
const ratesLoading = ref(false)
const selectedRateKey = ref('')
const adminFee = ref(0)
const previewLoading = ref(false)
const courierCatalog = ref([])
const courierFilter = ref('all')

const shippingRate = computed(() => {
  if (!selectedRateKey.value) return null
  return (
    rates.value.find(
      (rate) => `${rate.courier_code}|${rate.courier_service_code}` === selectedRateKey.value,
    ) || null
  )
})

const shippingCost = computed(() => {
  const price = Number(shippingRate.value?.price)
  return Number.isFinite(price) && price > 0 ? price : 0
})

const promoCode = ref('')
const discountApplied = ref(false)
const discountAmount = ref(0)

const finalTotal = computed(
  () => subtotal.value - discountAmount.value + shippingCost.value + adminFee.value,
)

function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

const formattedSubtotal = computed(() => formatCurrency(subtotal.value))
const formattedShipping = computed(() =>
  shippingRate.value ? formatCurrency(shippingCost.value) : 'Pilih kurir',
)
const formattedAdminFee = computed(() => formatCurrency(adminFee.value))
const formattedDiscount = computed(() => formatCurrency(discountAmount.value))
const formattedTotal = computed(() => formatCurrency(finalTotal.value))

const address = ref(null)
const addressId = computed(() => address.value?.id || null)
const savedAddresses = ref([])
const addressesLoading = ref(true)

const orderSuccess = ref(false)
const successInfo = ref(null)
const isSubmitting = ref(false)

const formattedPaid = computed(() => formatCurrency(Number(successInfo.value?.total_amount) || 0))
const orderStartedAt = ref(0)
const paymentExpired = ref(false)
const checkingPayment = ref(false)
const paymentDeadlineAt = computed(() => successInfo.value?.payment_deadline || '')
const formattedDeadline = computed(() => {
  const value = paymentDeadlineAt.value
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
})
const paymentInfo = computed(() => successInfo.value?.payment_info || {})
const paymentDisplay = computed(() => {
  const info = paymentInfo.value || {}
  const method = paymentMethods.value.find((item) => item.code === info.payment_method)
  return { ...info, methodName: method?.name || '' }
})
const successStatusLabel = computed(() => {
  if (paymentPaid.value) return 'Lunas'
  if (paymentExpired.value) return 'Kedaluwarsa'
  return paymentInfo.value.va_number ||
    paymentInfo.value.qr_url ||
    paymentInfo.value.payment_code ||
    paymentInfo.value.deeplink_url
    ? 'Menunggu Pembayaran'
    : 'Diproses'
})
const paymentPaid = ref(false)

async function checkSuccessPayment() {
  const invoice = successInfo.value?.invoice_number
  if (!invoice || checkingPayment.value) return

  checkingPayment.value = true
  try {
    const response = await api.order(invoice)
    const detail = response.data
    if (!detail) return

    const payment = detail.payment || {}
    const paid =
      ['settlement', 'capture', 'paid'].includes(String(payment.status || '').toLowerCase()) ||
      ['paid', 'processing', 'shipped', 'completed'].includes(detail.status)
    const terminal = ['cancelled', 'canceled', 'expired', 'failed', 'deny', 'expire'].includes(
      String(detail.status || '').toLowerCase(),
    )

    successInfo.value = {
      ...successInfo.value,
      status: detail.status || successInfo.value.status,
      payment_info: { ...(successInfo.value.payment_info || {}), ...payment },
      payment_deadline: detail.payment_deadline || successInfo.value.payment_deadline,
      total_amount: detail.pricing?.total_amount || successInfo.value.total_amount,
    }

    if (paid) {
      if (!paymentPaid.value) {
        paymentPaid.value = true
        showToast('Pembayaran berhasil diterima!', { type: 'success' })
      }
    } else if (terminal) {
      paymentExpired.value = true
    }
  } catch (error) {
    showToast(error?.message || 'Gagal mengecek status pembayaran', { type: 'error' })
  } finally {
    checkingPayment.value = false
  }
}

function handlePaymentExpired() {
  paymentExpired.value = true
}

const paymentGroups = ref([])
const paymentMethodsLoading = ref(true)
const paymentMethodsError = ref('')

const paymentMethods = computed(() =>
  paymentGroups.value.flatMap((group) =>
    (group.methods || []).map((method) => ({
      ...method,
      groupName: group.name,
    })),
  ),
)

function paymentFeeLabel(method) {
  if (method.fee_type === 'percentage') {
    const percent = Number(method.fee_percent) * 100
    return `Biaya admin ${new Intl.NumberFormat('id-ID', {
      maximumFractionDigits: 2,
    }).format(percent)}%`
  }
  const fee = Number(method.fee_amount) || 0
  return fee > 0 ? `Biaya admin ${formatCurrency(fee)}` : 'Tanpa biaya admin'
}

async function loadPaymentMethods() {
  paymentMethodsLoading.value = true
  paymentMethodsError.value = ''
  try {
    const response = await api.checkoutPaymentMethods(subtotal.value)
    paymentGroups.value = (response.data?.groups || [])
      .map((group) => ({
        category: group.category,
        name: group.name || group.category,
        methods: (group.methods || []).filter((method) => method.is_active !== false),
      }))
      .filter((group) => group.methods.length)

    if (!paymentMethods.value.some((method) => method.code === form.value.payment)) {
      form.value.payment = paymentMethods.value[0]?.code || ''
    }
  } catch (error) {
    paymentGroups.value = []
    paymentMethodsError.value = error?.message || 'Gagal memuat metode pembayaran'
  } finally {
    paymentMethodsLoading.value = false
  }
}

const courierNames = computed(
  () => new Map(courierCatalog.value.map((item) => [item.courier_code, item.courier_name])),
)

const courierOptions = computed(() => {
  const map = new Map()
  for (const rate of rates.value) {
    if (!rate.courier_code || map.has(rate.courier_code)) continue
    map.set(
      rate.courier_code,
      courierNames.value.get(rate.courier_code) || rate.courier_name || rate.courier_code,
    )
  }
  return Array.from(map, ([code, name]) => ({ code, name }))
})

const visibleRates = computed(() =>
  courierFilter.value === 'all'
    ? rates.value
    : rates.value.filter((rate) => rate.courier_code === courierFilter.value),
)

async function loadCouriers() {
  try {
    const response = await api.couriers()
    courierCatalog.value = response.data || []
  } catch {
    courierCatalog.value = []
  }
}

function paymentMethod() {
  return form.value.payment || ''
}

function buildPayload(rate) {
  return {
    cart_item_ids: items.value.map((item) => item.id),
    address_id: addressId.value,
    courier: rate.courier_code,
    courier_service: rate.courier_service_code,
    payment_method: paymentMethod(),
    ...(discountApplied.value ? { discount_code: promoCode.value.trim().toUpperCase() } : {}),
  }
}

let previewRequestId = 0

async function refreshPreview() {
  const rate = shippingRate.value
  if (!rate || !addressId.value || !paymentMethod() || items.value.length === 0) {
    adminFee.value = 0
    previewLoading.value = false
    return
  }

  const requestId = ++previewRequestId
  previewLoading.value = true
  try {
    const response = await api.preview(buildPayload(rate))
    if (requestId === previewRequestId) {
      adminFee.value = Number(response.data?.admin_fee) || 0
    }
  } catch {
    if (requestId === previewRequestId) adminFee.value = 0
  } finally {
    if (requestId === previewRequestId) previewLoading.value = false
  }
}

async function loadRates(targetAddressId) {
  if (!targetAddressId || items.value.length === 0) {
    rates.value = []
    ratesAddressId.value = null
    selectedRateKey.value = ''
    return
  }

  ratesLoading.value = true
  try {
    const response = await api.rates(
      items.value.map((item) => item.id),
      targetAddressId,
    )
    rates.value = response.data?.options || []
    ratesAddressId.value = targetAddressId
    if (
      courierFilter.value !== 'all' &&
      !rates.value.some((rate) => rate.courier_code === courierFilter.value)
    ) {
      courierFilter.value = 'all'
    }
    const current = selectedRateKey.value
    const exists = rates.value.some(
      (rate) => `${rate.courier_code}|${rate.courier_service_code}` === current,
    )
    if (!exists) {
      const cheapest = rates.value.reduce((best, rate) => {
        if (!best) return rate
        return Number(rate.price) < Number(best.price) ? rate : best
      }, null)
      selectedRateKey.value = cheapest
        ? `${cheapest.courier_code}|${cheapest.courier_service_code}`
        : ''
    }
  } catch (error) {
    rates.value = []
    ratesAddressId.value = null
    selectedRateKey.value = ''
    showToast(error?.message || 'Gagal memuat ongkos kirim', { type: 'error' })
  } finally {
    ratesLoading.value = false
  }
}

async function ensureRate(targetAddressId) {
  if (!rates.value.length || ratesAddressId.value !== targetAddressId) {
    await loadRates(targetAddressId)
  }

  if (!shippingRate.value) {
    showToast('Pilih layanan kurir terlebih dahulu.', { type: 'error' })
    return null
  }

  return shippingRate.value
}

const showAddressModal = ref(false)
const addressSaving = ref(false)
const addressForm = ref({
  recipient: '',
  phone: '',
  fullAddress: '',
  city: '',
  postalCode: '',
  isDefault: false,
})

async function selectAddress(addr) {
  address.value = addr || null
  if (!addr?.id) {
    rates.value = []
    ratesAddressId.value = null
    selectedRateKey.value = ''
    adminFee.value = 0
    return
  }

  try {
    const response = await api.address(addr.id)
    if (response.data) address.value = response.data
  } catch (error) {
    showToast(error?.message || 'Gagal memuat detail alamat', { type: 'error' })
  }

  await loadRates(addressId.value)
  await refreshPreview()
}

function openAddressModal() {
  addressForm.value = {
    recipient: state.userName || '',
    phone: state.userProfile.phone || '',
    fullAddress: '',
    city: '',
    postalCode: '',
    isDefault: savedAddresses.value.length === 0,
  }
  showAddressModal.value = true
}

async function saveNewAddress() {
  if (addressSaving.value) return
  const payloadForm = addressForm.value
  if (
    !payloadForm.recipient.trim() ||
    !payloadForm.phone.trim() ||
    !payloadForm.fullAddress.trim() ||
    !payloadForm.city.trim()
  ) {
    showToast('Lengkapi nama penerima, telepon, alamat, dan kota.', { type: 'error' })
    return
  }

  addressSaving.value = true
  try {
    const keyword = payloadForm.city.trim()
    const areasResponse = await api.areas(keyword)
    const areas = areasResponse.data || []
    const postalCode = payloadForm.postalCode.trim()
    const area =
      (postalCode && areas.find((item) => String(item.postal_code) === postalCode)) ||
      areas.find(
        (item) => normalize(item.administrative_division_level_2_name) === normalize(keyword),
      ) ||
      areas[0] ||
      null

    if (!area) {
      showToast(`Area "${keyword}" tidak ditemukan. Periksa kota/kabupaten.`, { type: 'error' })
      return
    }

    const finalPostalCode = postalCode || String(area.postal_code || '')
    if (!/^\d{5}$/.test(finalPostalCode)) {
      showToast('Kode pos harus 5 digit.', { type: 'error' })
      return
    }

    const response = await api.createAddress({
      receiver_name: payloadForm.recipient.trim(),
      phone: payloadForm.phone.trim(),
      address_line: payloadForm.fullAddress.trim(),
      biteship_area_id: area.id,
      province_name: area.administrative_division_level_1_name || '',
      city_name: area.administrative_division_level_2_name || keyword,
      district_name: area.administrative_division_level_3_name || keyword,
      subdistrict_name: area.administrative_division_level_4_name || '',
      postal_code: finalPostalCode,
      is_primary: Boolean(payloadForm.isDefault),
    })
    let saved = response.data
    try {
      const detail = await api.address(saved.id)
      saved = detail.data || saved
    } catch {
      // keep the create response
    }
    savedAddresses.value = [...savedAddresses.value.filter((item) => item.id !== saved.id), saved]
    if (saved.is_primary) {
      savedAddresses.value.forEach((item) => {
        if (item.id !== saved.id) item.is_primary = false
      })
    }
    showAddressModal.value = false
    showToast('Alamat pengiriman disimpan.', { type: 'success' })
    await selectAddress(saved)
  } catch (error) {
    showToast(error?.message || 'Gagal menyimpan alamat pengiriman', { type: 'error' })
  } finally {
    addressSaving.value = false
  }
}

async function applyPromo() {
  const code = promoCode.value.trim().toUpperCase()
  if (!code) {
    showToast('Masukkan kode kupon terlebih dahulu', { type: 'error' })
    return
  }
  if (items.value.length === 0) {
    showToast('Tidak ada item yang dipilih', { type: 'error' })
    return
  }

  try {
    const response = await api.checkDiscount(
      code,
      items.value.map((item) => ({ book_id: item.bookId, quantity: item.quantity })),
    )
    promoCode.value = code
    discountApplied.value = true
    discountAmount.value = Number(response.data?.discount_amount) || 0
    showToast(`Kupon "${response.data?.code || code}" berhasil dipasang!`, { type: 'success' })
    await refreshPreview()
  } catch (error) {
    discountApplied.value = false
    discountAmount.value = 0
    showToast(
      error?.status === 404
        ? 'Kode kupon tidak valid atau sudah tidak berlaku.'
        : error?.message || 'Kode kupon tidak valid',
      { type: 'error' },
    )
  }
}

async function placeOrder() {
  if (isSubmitting.value) return

  if (items.value.length === 0) {
    showToast('Tidak ada item yang dipilih', { type: 'error' })
    return
  }
  if (!addressId.value) {
    showToast('Pilih atau tambahkan alamat pengiriman terlebih dahulu.', { type: 'error' })
    return
  }
  if (!shippingRate.value) {
    showToast('Pilih layanan kurir terlebih dahulu.', { type: 'error' })
    return
  }
  if (!paymentMethod()) {
    showToast('Pilih metode pembayaran terlebih dahulu.', { type: 'error' })
    return
  }

  isSubmitting.value = true
  try {
    const rate = shippingRate.value
    const payload = {
      ...buildPayload(rate),
      address_id: addressId.value,
    }

    const preview = await api.preview(payload)
    adminFee.value = Number(preview.data?.admin_fee) || 0
    discountAmount.value = Number(preview.data?.discount_amount) || 0

    const order = await api.createOrder(payload)
    orderStartedAt.value = Date.now()
    paymentExpired.value = false
    paymentPaid.value = false
    successInfo.value = order.data
    orderSuccess.value = true
    await refreshCart()
    showToast('Pesanan berhasil dibuat!', { type: 'success' })
  } catch (error) {
    showToast(error?.message || 'Gagal membuat pesanan', { type: 'error' })
  } finally {
    isSubmitting.value = false
  }
}

function goBack() {
  router.push({ name: 'home' })
}

function decrement(item) {
  if (item.quantity > 1) {
    updateQuantity(item.id, item.quantity - 1)
  }
}

onMounted(async () => {
  await bootstrap()
  if (!state.isLoggedIn) {
    addressesLoading.value = false
    router.replace({ name: 'login', query: { redirect: '/checkout' } })
    return
  }

  const addressesTask = (async () => {
    const response = await api.addresses()
    const list = response.data || []
    savedAddresses.value = await Promise.all(
      list.map(async (address) => {
        try {
          const detail = await api.address(address.id)
          return detail.data || address
        } catch {
          return address
        }
      }),
    )
    addressesLoading.value = false
    return savedAddresses.value
  })()

  await Promise.all([loadPaymentMethods(), loadCouriers(), addressesTask.catch(() => null)])

  try {
    const list = await addressesTask

    let primary = null
    try {
      const primaryResponse = await api.primaryAddress()
      primary = primaryResponse.data || null
    } catch (error) {
      if (error?.status !== 404) throw error
    }

    const resolved =
      list.find((item) => item.id === primary?.id) ||
      list.find((item) => item.is_primary) ||
      list[0] ||
      null
    if (resolved) await selectAddress(resolved)
  } catch (error) {
    if (error?.status !== 401) {
      showToast(error?.message || 'Gagal memuat alamat pengiriman', { type: 'error' })
    }
  } finally {
    addressesLoading.value = false
  }
})

watch(courierFilter, () => {
  const keyOf = (rate) => `${rate.courier_code}|${rate.courier_service_code}`
  if (!visibleRates.value.some((rate) => keyOf(rate) === selectedRateKey.value)) {
    const first = visibleRates.value[0]
    selectedRateKey.value = first ? keyOf(first) : ''
  }
})

watch(
  () => [selectedRateKey.value, form.value.payment],
  () => {
    refreshPreview()
  },
)

watch(orderSuccess, (value) => {
  if (value) {
    paymentPaid.value = false
    paymentExpired.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-background">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex items-center gap-4">
      <button
        class="neubrutal-btn bg-white border-2 border-black w-10 h-10 flex items-center justify-center shadow-neo-sm hover:bg-gray-100"
        @click="goBack"
      >
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
          />
        </svg>
      </button>
      <div>
        <h1 class="font-outfit font-black text-xl">CHECKOUT</h1>
        <p class="font-sans text-xs font-bold text-muted-foreground">
          Lengkapi data & buat pesanan
        </p>
      </div>
    </div>

    <div v-if="orderSuccess" class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
      <div class="bg-white border-3 sm:border-4 border-black p-5 sm:p-8 shadow-neo">
        <div class="flex items-start gap-3 sm:gap-4 border-b-2 border-black pb-4">
          <div
            class="w-11 h-11 sm:w-12 sm:h-12 shrink-0 bg-neo-lime border-2 border-black flex items-center justify-center"
          >
            <svg
              class="w-6 h-6 text-black"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div class="min-w-0">
            <p
              class="font-sans text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground"
            >
              Checkout selesai
            </p>
            <h2 class="font-outfit font-black text-xl sm:text-2xl leading-tight">
              {{ paymentPaid ? 'Pembayaran Diterima' : 'Pesanan Berhasil Dibuat' }}
            </h2>
            <p
              class="font-sans text-xs sm:text-sm font-semibold text-muted-foreground mt-0.5 break-all"
            >
              Invoice {{ successInfo?.invoice_number || '—' }}
            </p>
          </div>
        </div>

        <PaymentInstructions
          v-if="
            paymentInfo.va_number ||
            paymentInfo.qr_url ||
            paymentInfo.payment_code ||
            paymentInfo.deeplink_url ||
            successInfo?.status === 'waiting_payment'
          "
          class="mt-5"
          :payment="paymentDisplay"
          :amount="successInfo?.total_amount"
          :deadline="formattedDeadline"
          :deadline-at="paymentDeadlineAt"
          :started-at="orderStartedAt || successInfo?.created_at || ''"
          :status="successInfo?.status"
          @expired="handlePaymentExpired"
        />

        <div
          v-if="paymentPaid"
          class="mt-3 flex items-center gap-2 font-sans text-xs font-semibold text-muted-foreground"
        >
          <span class="w-2 h-2 shrink-0 rounded-full border border-black bg-neo-lime"></span>
          Pesanan akan segera diproses dan dikirim ke alamat yang tertera.
        </div>
        <div
          v-else-if="
            !paymentExpired &&
            (paymentInfo.va_number ||
              paymentInfo.qr_url ||
              paymentInfo.payment_code ||
              paymentInfo.deeplink_url)
          "
          class="mt-3 flex flex-wrap items-center gap-3"
        >
          <span class="font-sans text-xs font-bold text-muted-foreground">
            Menunggu pembayaran.
          </span>
          <button
            type="button"
            :disabled="checkingPayment"
            class="neubrutal-btn bg-white text-black border-2 border-black px-3 py-1.5 font-outfit font-black text-[11px] shadow-neo-sm hover:bg-neo-yellow disabled:opacity-60"
            @click="checkSuccessPayment"
          >
            {{ checkingPayment ? 'Mengecek...' : 'Cek Status Pembayaran' }}
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          <div class="bg-background border-2 border-black p-3">
            <p class="font-sans text-[10px] font-extrabold uppercase text-muted-foreground">
              Invoice
            </p>
            <p class="font-outfit font-black text-sm mt-1 break-all">
              {{ successInfo?.invoice_number || '—' }}
            </p>
          </div>
          <div class="bg-background border-2 border-black p-3">
            <p class="font-sans text-[10px] font-extrabold uppercase text-muted-foreground">
              Total
            </p>
            <p class="font-outfit font-black text-sm mt-1">{{ formattedPaid }}</p>
          </div>
          <div class="bg-background border-2 border-black p-3">
            <p class="font-sans text-[10px] font-extrabold uppercase text-muted-foreground">
              Status
            </p>
            <p class="font-outfit font-black text-sm mt-1">
              {{ successStatusLabel }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap gap-2.5 mt-5">
          <button
            class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-4 py-2.5 font-outfit font-black text-sm shadow-neo-sm hover:bg-yellow-300"
            @click="router.push('/dashboard')"
          >
            Lihat Pesanan
          </button>
          <button
            class="neubrutal-btn bg-white text-black border-2 border-black px-4 py-2.5 font-outfit font-black text-sm shadow-neo-sm hover:bg-gray-100"
            @click="router.push('/')"
          >
            Lanjut Belanja
          </button>
        </div>
      </div>
    </div>

    <div v-else class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div v-if="!state.cartLoading && items.length === 0" class="text-center py-20">
        <div
          class="w-20 h-20 mx-auto mb-4 bg-white border-3 border-black flex items-center justify-center shadow-neo"
        >
          <svg
            class="w-10 h-10 text-black"
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
        <div class="lg:col-span-7 space-y-6">
          <div class="bg-white border-3 border-black shadow-neo p-6 space-y-4">
            <div class="flex items-center gap-2 border-b-2 border-black pb-2">
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                />
              </svg>
              <h2 class="font-outfit font-black text-lg">DATA PENGIRIMAN</h2>
            </div>
            <div class="space-y-3">
              <div class="flex items-center justify-between gap-3">
                <label class="block font-outfit font-black text-xs uppercase">
                  Alamat Pengiriman
                </label>
                <button
                  type="button"
                  class="neubrutal-btn bg-white text-black border-2 border-black px-2.5 py-1 font-outfit font-black text-[11px] hover:bg-neo-yellow"
                  @click="openAddressModal"
                >
                  + Tambah Alamat
                </button>
              </div>

              <div v-if="addressesLoading" class="grid sm:grid-cols-2 gap-3">
                <div
                  v-for="n in 2"
                  :key="`addr-skeleton-${n}`"
                  class="h-28 bg-gray-100 border-2 border-black animate-pulse"
                ></div>
              </div>

              <div v-else-if="savedAddresses.length" class="grid sm:grid-cols-2 gap-3">
                <button
                  v-for="addr in savedAddresses"
                  :key="addr.id"
                  type="button"
                  class="text-left border-2 border-black p-3.5 transition-all shadow-neo-sm"
                  :class="
                    addressId === addr.id
                      ? 'bg-neo-yellow shadow-neo'
                      : 'bg-background hover:bg-gray-100'
                  "
                  @click="selectAddress(addr)"
                >
                  <div class="flex items-start justify-between gap-2">
                    <span class="font-outfit font-black text-xs uppercase">
                      {{ addr.receiver_name }}
                    </span>
                    <span
                      v-if="addr.is_primary"
                      class="bg-black text-white text-[9px] font-outfit font-black px-1.5 py-0.5"
                    >
                      UTAMA
                    </span>
                  </div>
                  <p class="font-sans text-[11px] font-bold text-muted-foreground mt-1">
                    {{ addr.phone }}
                  </p>
                  <p class="font-sans text-xs font-semibold text-black mt-1 leading-snug">
                    {{ addr.address_line }}, {{ addr.city_name }} {{ addr.postal_code }}
                  </p>
                </button>
              </div>

              <div v-else class="border-2 border-black bg-background p-4">
                <p class="font-sans text-xs font-semibold text-muted-foreground">
                  Belum ada alamat tersimpan. Tambahkan alamat untuk menghitung ongkir.
                </p>
                <button
                  type="button"
                  class="mt-3 neubrutal-btn bg-neo-yellow text-black border-2 border-black px-3 py-2 font-outfit font-black text-xs shadow-neo-sm"
                  @click="openAddressModal"
                >
                  Tambah Alamat
                </button>
              </div>
            </div>
          </div>

          <div class="bg-white border-3 border-black shadow-neo p-6 space-y-4">
            <div class="flex items-center gap-2 border-b-2 border-black pb-2">
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                />
              </svg>
              <h2 class="font-outfit font-black text-lg">PILIH KURIR</h2>
            </div>
            <div v-if="ratesLoading" class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div
                v-for="n in 3"
                :key="`rate-skeleton-${n}`"
                class="h-24 bg-gray-100 border-2 border-black animate-pulse"
              ></div>
            </div>
            <div v-else-if="!rates.length" class="border-2 border-black bg-background p-4">
              <p class="font-sans text-xs font-semibold text-muted-foreground">
                {{
                  addressId
                    ? 'Layanan kurir belum tersedia untuk alamat ini.'
                    : 'Pilih alamat pengiriman untuk melihat ongkir.'
                }}
              </p>
            </div>
            <template v-else>
              <div v-if="courierOptions.length > 1" class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="neubrutal-btn border-2 border-black px-3 py-1.5 font-outfit font-black text-[11px]"
                  :class="
                    courierFilter === 'all'
                      ? 'bg-black text-white shadow-neo-sm'
                      : 'bg-background hover:bg-gray-100'
                  "
                  @click="courierFilter = 'all'"
                >
                  Semua Kurir
                </button>
                <button
                  v-for="courier in courierOptions"
                  :key="courier.code"
                  type="button"
                  class="neubrutal-btn border-2 border-black px-3 py-1.5 font-outfit font-black text-[11px]"
                  :class="
                    courierFilter === courier.code
                      ? 'bg-black text-white shadow-neo-sm'
                      : 'bg-background hover:bg-gray-100'
                  "
                  @click="courierFilter = courier.code"
                >
                  {{ courier.name }}
                </button>
              </div>

              <div v-if="!visibleRates.length" class="border-2 border-black bg-background p-4">
                <p class="font-sans text-xs font-semibold text-muted-foreground">
                  Tidak ada layanan dari kurir ini untuk alamat tersebut.
                </p>
              </div>

              <div v-else class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label
                  v-for="rate in visibleRates"
                  :key="`${rate.courier_code}|${rate.courier_service_code}`"
                  class="cursor-pointer"
                >
                  <input
                    v-model="selectedRateKey"
                    type="radio"
                    :value="`${rate.courier_code}|${rate.courier_service_code}`"
                    class="sr-only"
                  />
                  <div
                    class="border-2 border-black p-3.5 transition-all h-full"
                    :class="
                      selectedRateKey === `${rate.courier_code}|${rate.courier_service_code}`
                        ? 'bg-neo-yellow shadow-neo'
                        : 'bg-background shadow-neo-sm hover:bg-gray-100'
                    "
                  >
                    <span class="font-outfit font-black text-sm block">
                      {{ rate.courier_name }}
                    </span>
                    <span class="block font-sans font-bold text-xs text-black/80 mt-0.5">
                      {{ rate.courier_service_name }}
                    </span>
                    <span class="block font-outfit font-black text-sm mt-2">
                      {{ formatCurrency(rate.price) }}
                    </span>
                    <span
                      class="block font-sans text-[11px] font-semibold text-muted-foreground mt-0.5"
                    >
                      {{ rate.etd ? `Estimasi ${rate.etd} hari` : rate.description || rate.type }}
                      <template v-if="rate.type"> · {{ rate.type }}</template>
                    </span>
                  </div>
                </label>
              </div>
            </template>
          </div>

          <div class="bg-white border-3 border-black shadow-neo p-6 space-y-4">
            <div class="flex items-center gap-2 border-b-2 border-black pb-2">
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z"
                />
              </svg>
              <h2 class="font-outfit font-black text-lg">METODE PEMBAYARAN</h2>
            </div>
            <div v-if="paymentMethodsLoading" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                v-for="n in 4"
                :key="`pay-skeleton-${n}`"
                class="h-20 bg-gray-100 border-2 border-black animate-pulse"
              ></div>
            </div>
            <div
              v-else-if="paymentMethodsError"
              class="border-2 border-black bg-background p-4 space-y-2"
            >
              <p class="font-sans text-xs font-semibold text-red-700">
                {{ paymentMethodsError }}
              </p>
              <button
                type="button"
                class="neubrutal-btn bg-white border-2 border-black px-3 py-1.5 font-outfit font-black text-[11px] shadow-neo-sm hover:bg-neo-yellow"
                @click="loadPaymentMethods"
              >
                Coba Lagi
              </button>
            </div>
            <div v-else-if="!paymentMethods.length" class="border-2 border-black bg-background p-4">
              <p class="font-sans text-xs font-semibold text-muted-foreground">
                Metode pembayaran sedang tidak tersedia. Coba beberapa saat lagi.
              </p>
            </div>
            <div v-else class="space-y-4">
              <div v-for="group in paymentGroups" :key="group.category" class="space-y-2">
                <p
                  class="font-outfit font-black text-[11px] uppercase tracking-wider text-muted-foreground"
                >
                  {{ group.name }}
                </p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label v-for="method in group.methods" :key="method.code" class="cursor-pointer">
                    <input
                      v-model="form.payment"
                      type="radio"
                      :value="method.code"
                      class="sr-only"
                    />
                    <div
                      class="border-2 border-black p-3.5 transition-all h-full"
                      :class="
                        form.payment === method.code
                          ? 'bg-neo-yellow shadow-neo'
                          : 'bg-background shadow-neo-sm hover:bg-gray-100'
                      "
                    >
                      <div class="flex items-center gap-2">
                        <img
                          v-if="method.image"
                          :src="assetUrl(method.image)"
                          :alt="method.name"
                          class="w-8 h-8 object-contain shrink-0"
                          loading="lazy"
                        />
                        <span class="font-outfit font-black text-sm">{{ method.name }}</span>
                      </div>
                      <span
                        class="block font-sans text-[11px] font-semibold text-muted-foreground mt-1"
                      >
                        {{ paymentFeeLabel(method) }}
                      </span>
                      <span
                        v-if="method.description"
                        class="block font-sans text-[10px] text-muted-foreground mt-0.5 line-clamp-2"
                      >
                        {{ method.description }}
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="lg:col-span-5">
          <div class="bg-white border-3 border-black shadow-neo p-6 space-y-5 sticky top-24">
            <div class="flex items-center gap-2 border-b-2 border-black pb-2">
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                />
              </svg>
              <h2 class="font-outfit font-black text-lg">RINGKASAN PESANAN</h2>
            </div>

            <div class="space-y-3">
              <div
                v-for="item in items"
                :key="item.id"
                class="flex gap-3 pb-3 border-b border-black/10 last:border-b-0 last:pb-0"
              >
                <div
                  class="w-20 h-28 shrink-0 border-2 border-black overflow-hidden shadow-neo-sm bg-background"
                >
                  <BookCover
                    :theme="item.theme || 'violet'"
                    :title="item.title"
                    :author="item.author"
                    class="w-full h-full"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="font-outfit font-black text-sm leading-snug line-clamp-1">
                    {{ item.title }}
                  </h4>
                  <p class="font-sans text-[11px] font-bold text-muted-foreground truncate">
                    {{ item.author }}
                  </p>
                  <p class="font-sans text-[10px] font-bold text-muted-foreground mt-0.5">
                    x {{ item.quantity }}
                  </p>
                  <div class="flex items-center justify-between mt-1.5">
                    <div class="flex items-center border-2 border-black bg-white shadow-neo-sm">
                      <button
                        class="w-6 h-6 flex items-center justify-center font-outfit font-black text-[11px] border-r border-black"
                        :class="
                          item.quantity <= 1
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'hover:bg-gray-100'
                        "
                        :aria-disabled="item.quantity <= 1"
                        @click="decrement(item)"
                      >
                        −
                      </button>
                      <span class="w-7 text-center font-outfit font-black text-[11px]">{{
                        item.quantity
                      }}</span>
                      <button
                        class="w-6 h-6 flex items-center justify-center font-outfit font-black text-[11px] hover:bg-gray-100 border-l border-black"
                        @click="updateQuantity(item.id, item.quantity + 1)"
                      >
                        +
                      </button>
                    </div>
                    <span class="font-outfit font-black text-sm">
                      {{
                        new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                          minimumFractionDigits: 0,
                        }).format(item.price * item.quantity)
                      }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div class="border-t-2 border-black pt-4 space-y-3 text-sm font-sans font-bold">
              <div class="flex justify-between">
                <span class="text-muted-foreground">Subtotal ({{ items.length }} item)</span>
                <span class="font-outfit font-black">{{ formattedSubtotal }}</span>
              </div>

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
                <span class="font-outfit font-black text-sm">Diskon Kupon</span>
                <span class="font-outfit font-black text-sm">-{{ formattedDiscount }}</span>
              </div>

              <div class="flex justify-between">
                <span class="text-muted-foreground">Ongkos Kirim</span>
                <span class="font-outfit font-black">{{ formattedShipping }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted-foreground">Biaya Admin</span>
                <span class="font-outfit font-black">{{
                  previewLoading ? 'Menghitung...' : formattedAdminFee
                }}</span>
              </div>
              <div
                class="flex justify-between text-base font-outfit font-black pt-2 border-t-2 border-black"
              >
                <span>TOTAL</span>
                <span v-if="previewLoading" class="text-sm">Menghitung...</span>
                <span v-else class="text-neo-violet text-xl">{{ formattedTotal }}</span>
              </div>
            </div>

            <button
              v-if="!isSubmitting"
              class="w-full neubrutal-btn bg-neo-yellow text-black border-3 border-black py-3.5 font-outfit font-black text-base shadow-neo hover:bg-yellow-300"
              @click="placeOrder"
            >
              BUAT PESANAN
            </button>

            <div
              v-else
              class="w-full bg-neo-yellow border-3 border-black p-3.5 shadow-neo"
              role="status"
              aria-live="polite"
            >
              <div class="flex items-center gap-3">
                <span
                  class="w-5 h-5 shrink-0 rounded-full border-3 border-black border-t-transparent animate-spin"
                ></span>
                <div>
                  <p class="font-outfit font-black text-sm uppercase">Memproses pesanan...</p>
                  <p class="font-sans text-[11px] font-semibold text-black/70">
                    Membuat invoice dan menyiapkan pembayaran. Jangan tutup halaman ini.
                  </p>
                </div>
              </div>
              <div class="mt-3 h-2 overflow-hidden border-2 border-black bg-white">
                <div class="h-full w-1/3 bg-black order-progress"></div>
              </div>
            </div>

            <p class="font-sans text-[11px] font-bold text-muted-foreground text-center">
              Dengan membuat pesanan, kamu menyetujui Syarat & Ketentuan serta Kebijakan Privasi
              BookStore.
            </p>
          </div>
        </div>
      </div>

      <div
        v-if="showAddressModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        @click.self="showAddressModal = false"
      >
        <div
          class="w-full max-w-md bg-white border-4 border-black shadow-neo-xl max-h-[90vh] overflow-y-auto"
        >
          <div class="bg-neo-yellow border-b-3 border-black p-4 flex items-center justify-between">
            <h3 class="font-outfit font-black text-base uppercase">Tambah Alamat Pengiriman</h3>
            <button
              type="button"
              class="w-8 h-8 bg-white border-2 border-black font-outfit font-black text-sm hover:bg-black hover:text-white"
              aria-label="Tutup"
              @click="showAddressModal = false"
            >
              X
            </button>
          </div>
          <form class="p-5 space-y-3" @submit.prevent="saveNewAddress">
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1"
                >Nama Penerima</label
              >
              <input
                v-model="addressForm.recipient"
                type="text"
                required
                class="w-full bg-background border-2 border-black p-2.5 font-sans font-semibold text-sm outline-none shadow-neo-sm"
              />
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">No. Telepon</label>
              <input
                v-model="addressForm.phone"
                type="tel"
                required
                class="w-full bg-background border-2 border-black p-2.5 font-sans font-semibold text-sm outline-none shadow-neo-sm"
              />
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1"
                >Alamat Lengkap</label
              >
              <textarea
                v-model="addressForm.fullAddress"
                rows="2"
                required
                class="w-full bg-background border-2 border-black p-2.5 font-sans font-semibold text-sm outline-none shadow-neo-sm resize-none"
              ></textarea>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-outfit font-black text-xs uppercase mb-1"
                  >Kota/Kabupaten</label
                >
                <input
                  v-model="addressForm.city"
                  type="text"
                  required
                  class="w-full bg-background border-2 border-black p-2.5 font-sans font-semibold text-sm outline-none shadow-neo-sm"
                />
              </div>
              <div>
                <label class="block font-outfit font-black text-xs uppercase mb-1">Kode Pos</label>
                <input
                  v-model="addressForm.postalCode"
                  type="text"
                  placeholder="10110"
                  class="w-full bg-background border-2 border-black p-2.5 font-sans font-semibold text-sm outline-none shadow-neo-sm"
                />
              </div>
            </div>
            <label class="flex items-center gap-2 font-sans text-xs font-bold">
              <input v-model="addressForm.isDefault" type="checkbox" class="w-4 h-4 accent-black" />
              Jadikan alamat utama
            </label>
            <button
              type="submit"
              :disabled="addressSaving"
              class="w-full neubrutal-btn bg-neo-yellow text-black border-3 border-black py-3 font-outfit font-black text-sm shadow-neo disabled:opacity-60"
            >
              {{ addressSaving ? 'Menyimpan...' : 'Simpan Alamat' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
