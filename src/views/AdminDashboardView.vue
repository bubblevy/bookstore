<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useStore } from '@/composables/useStore'
import { api } from '@/lib/api'
import { mapBook } from '@/lib/mappers'
import { localizeApiError } from '@/lib/errors'
import { ensureCourierCatalog } from '@/lib/shipping'
import { useOrderStatusSSE } from '@/composables/useOrderStatusSSE'

import FullScreenLoader from '@/components/FullScreenLoader.vue'
import AdminOverviewTab from '@/components/admin/tabs/AdminOverviewTab.vue'
import AdminBooksTab from '@/components/admin/tabs/AdminBooksTab.vue'
import AdminCategoriesTab from '@/components/admin/tabs/AdminCategoriesTab.vue'
import AdminPeopleTab from '@/components/admin/tabs/AdminPeopleTab.vue'
import AdminVouchersTab from '@/components/admin/tabs/AdminVouchersTab.vue'
import AdminOrdersTab from '@/components/admin/tabs/AdminOrdersTab.vue'
import AdminCustomersTab from '@/components/admin/tabs/AdminCustomersTab.vue'
import AdminPaymentsTab from '@/components/admin/tabs/AdminPaymentsTab.vue'
import AdminProfileTab from '@/components/admin/tabs/AdminProfileTab.vue'

const { showToast, loadCategories, loadBooks } = useStore()

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

function mapAdminBook(raw = {}) {
  return {
    ...mapBook(raw),
    rawId: raw.id,
    categoryId: raw.category?.id || '',
    authorId: raw.author?.id || '',
    publisherId: raw.publisher?.id || '',
    isbn: raw.isbn || '',
    description: raw.synopsis || '',
    pages: raw.pages || 0,
    publicationDate: raw.publication_date ? raw.publication_date.slice(0, 10) : '',
    language: raw.language || 'Indonesia',
    length: raw.length || 0,
    width: raw.width || 0,
    height: raw.height || 0,
    condition: raw.condition || '100% Baru & Segel Penerbit',
    isActive: raw.is_active !== false,
    coverImage: raw.cover_image || '',
    publisher: raw.publisher?.name || '',
    author: raw.author?.name || '',
    category: raw.category?.name || '',
    sold: Number(raw.sold ?? raw.total_sold ?? 0) || 0,
  }
}

function mapAdminOrderRow(raw = {}) {
  const inv = raw.invoice_number || raw.invoice || raw.id || ''
  return {
    id: inv,
    invoice: inv,
    rawStatus: raw.status || raw.order_status || raw.payment_status,
    customerName:
      raw.customer?.name || raw.customer_name || raw.user?.name || raw.recipient_name || '—',
    customerEmail: raw.customer?.email || raw.customer_email || raw.user?.email || '',
    total: Number(raw.total_amount ?? raw.total ?? raw.gross_amount) || 0,
    totalQuantity:
      Number(
        raw.total_quantity ??
          raw.quantity ??
          (Array.isArray(raw.items)
            ? raw.items.reduce((s, it) => s + (Number(it.quantity) || 1), 0)
            : 0),
      ) || 0,
    paymentMethod:
      raw.payment_method || raw.payment?.name || raw.payment?.payment_method || raw.payment_type || '—',
    date: formatDateTime(raw.created_at || raw.date),
    createdAt: raw.created_at || raw.date,
  }
}

function getOrderTimestamp(order) {
  if (!order) return 0
  if (order.createdAt) {
    const t = new Date(order.createdAt).getTime()
    if (!Number.isNaN(t)) return t
  }
  const match = String(order.invoice || order.id || '').match(/INV-(\d{4})(\d{2})(\d{2})/)
  if (match) {
    const [, y, m, d] = match
    return new Date(`${y}-${m}-${d}`).getTime()
  }
  return 0
}

function sortOrdersNewestFirst(a, b) {
  const timeA = getOrderTimestamp(a)
  const timeB = getOrderTimestamp(b)
  if (timeB !== timeA) return timeB - timeA
  return String(b.invoice || b.id || '').localeCompare(
    String(a.invoice || a.id || ''),
    undefined,
    { numeric: true },
  )
}

const activeTab = ref('overview') // 'overview' | 'books' | 'categories' | 'people' | 'vouchers' | 'orders' | 'customers' | 'payments' | 'profile'

const adminBooks = ref([])
const adminCategories = ref([])
const adminAuthors = ref([])
const adminPublishers = ref([])
const adminDiscounts = ref([])
const adminReport = ref(null)
const adminOrderRows = ref([])
const customersList = ref([])
const paymentMethods = ref([])

const adminLoading = ref(true)
const reportLoading = ref(false)
const booksLoading = ref(false)
const categoriesLoading = ref(false)
const peopleLoading = ref(false)
const vouchersLoading = ref(false)
const adminOrdersLoading = ref(false)
const customersLoading = ref(false)
const paymentMethodsLoading = ref(false)

const allKnownOrders = computed(() => {
  const map = new Map()

  // First add adminOrderRows (from /v1/orders/all)
  for (const row of adminOrderRows.value) {
    const key = String(row.invoice || row.id || '').trim()
    if (key) map.set(key, row)
  }

  // Then add from adminReport if not already present
  const reportList = adminReport.value?.orders || []
  for (const raw of reportList) {
    const row = mapAdminOrderRow(raw)
    const key = String(row.invoice || row.id || '').trim()
    if (key && !map.has(key)) {
      map.set(key, row)
    }
  }

  const list = Array.from(map.values())
  list.sort(sortOrdersNewestFirst)
  return list
})

const reportOrders = computed(() => allKnownOrders.value)

const reportSummary = computed(() => adminReport.value?.summary || {})
const totalRevenue = computed(() => Number(reportSummary.value.net_revenue) || 0)
const totalOrdersCount = computed(
  () => Number(reportSummary.value.total_orders) || reportOrders.value.length,
)
const paidOrdersCount = computed(() => Number(reportSummary.value.paid_orders) || 0)
const cancelledOrdersCount = computed(
  () =>
    (Number(reportSummary.value.cancelled_orders) || 0) +
    (Number(reportSummary.value.returned_orders) || 0),
)
const waitingOrdersCount = computed(() => {
  const value = Number(reportSummary.value.waiting_payment_orders)
  return Number.isFinite(value)
    ? value
    : reportOrders.value.filter((o) => o.rawStatus === 'waiting_payment').length
})
const needsActionCount = computed(
  () => reportOrders.value.filter((o) => ['waiting_payment', 'paid'].includes(o.rawStatus)).length,
)

const lowStockBooks = computed(() => adminBooks.value.filter((b) => (b.stock || 0) <= 5))

const activeUsersCount = computed(
  () =>
    customersList.value.filter((customer) => customer.role === 'Pembeli' && customer.isActive)
      .length,
)

const weeklySales = computed(() => {
  const dayLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
  const trendMap = new Map(
    (adminReport.value?.daily_trends || []).map((item) => [
      String(item.date).slice(0, 10),
      Number(item.total_revenue) || 0,
    ]),
  )
  const wibNow = new Date(Date.now() + 7 * 60 * 60 * 1000)
  const base = Date.UTC(wibNow.getUTCFullYear(), wibNow.getUTCMonth(), wibNow.getUTCDate())
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(base - (6 - index) * 86400000)
    const key = date.toISOString().slice(0, 10)
    return {
      key,
      label: `${dayLabels[date.getUTCDay()]} ${date.getUTCDate()}`,
      amount: trendMap.get(key) || 0,
    }
  })
  const max = Math.max(...days.map((item) => item.amount), 1)
  return days.map((item) => ({
    ...item,
    height: item.amount > 0 ? `${Math.max(8, Math.round((item.amount / max) * 100))}%` : '6px',
  }))
})

const weeklySalesTotal = computed(() =>
  weeklySales.value.reduce((sum, item) => sum + item.amount, 0),
)

async function loadAdminReport() {
  reportLoading.value = true
  try {
    const response = await api.report({ period: 'weekly' })
    adminReport.value = response.data || null
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal memuat laporan admin'), { type: 'error' })
  } finally {
    reportLoading.value = false
  }
}

async function loadAdminBooks() {
  booksLoading.value = true
  try {
    const response = await api.books({ per_page: 10, is_active: 'all' })
    adminBooks.value = (response.data || []).map(mapAdminBook)
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal memuat data buku'), { type: 'error' })
  } finally {
    booksLoading.value = false
  }
}

async function loadAdminCategories() {
  categoriesLoading.value = true
  try {
    const response = await api.categories()
    adminCategories.value = response.data || []
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal memuat kategori'), { type: 'error' })
  } finally {
    categoriesLoading.value = false
  }
}

async function loadAdminAuthors() {
  try {
    const response = await api.authors({ per_page: 10 })
    adminAuthors.value = response.data || []
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal memuat penulis'), { type: 'error' })
  }
}

async function loadAdminPublishers() {
  try {
    const response = await api.publishers({ per_page: 10 })
    adminPublishers.value = response.data || []
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal memuat penerbit'), { type: 'error' })
  }
}

async function loadAdminPeople() {
  peopleLoading.value = true
  try {
    await Promise.allSettled([loadAdminAuthors(), loadAdminPublishers()])
  } finally {
    peopleLoading.value = false
  }
}

async function loadAdminDiscounts() {
  vouchersLoading.value = true
  try {
    const response = await api.discounts({ per_page: 10 })
    adminDiscounts.value = response.data || []
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal memuat voucher diskon'), { type: 'error' })
  } finally {
    vouchersLoading.value = false
  }
}

async function loadAdminOrders() {
  adminOrdersLoading.value = true
  try {
    const params = {
      page: 1,
      per_page: 10,
      sort_by: 'created_at',
      sort_order: 'desc',
    }
    const response = await api.adminOrders(params)
    let rows = (response.data || []).map(mapAdminOrderRow)

    const reportList = adminReport.value?.orders || []
    if (reportList.length > 0) {
      const knownInvoices = new Set(rows.map((r) => r.invoice || r.id))
      for (const raw of reportList) {
        const inv = raw.invoice_number || raw.invoice || raw.id
        if (inv && !knownInvoices.has(inv)) {
          rows.push(mapAdminOrderRow(raw))
          knownInvoices.add(inv)
        }
      }
    }
    rows.sort(sortOrdersNewestFirst)
    adminOrderRows.value = rows
  } catch (error) {
    if (adminReport.value?.orders?.length) {
      const fallbackRows = adminReport.value.orders.map(mapAdminOrderRow)
      fallbackRows.sort(sortOrdersNewestFirst)
      adminOrderRows.value = fallbackRows
    } else {
      adminOrderRows.value = []
      showToast(apiErrorText(error, 'Gagal memuat daftar pesanan'), { type: 'error' })
    }
  } finally {
    adminOrdersLoading.value = false
  }
}

async function loadCustomers() {
  customersLoading.value = true
  try {
    const response = await api.users({ per_page: 10 })
    customersList.value = (response.data || [])
      .filter((user) => String(user.role || '').toLowerCase() !== 'admin')
      .map((user) => ({
        id: user.id,
        name: user.name || 'Tanpa Nama',
        email: user.email || '',
        role: 'Pembeli',
        isActive: user.is_active !== false,
        status: user.is_active === false ? 'Nonaktif' : 'Aktif',
        joinDate: formatDateTime(user.created_at),
      }))
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal memuat data pengguna'), { type: 'error' })
  } finally {
    customersLoading.value = false
  }
}

async function loadPaymentMethods() {
  paymentMethodsLoading.value = true
  try {
    const response = await api.paymentMethods({ only_active: 'false' })
    const list = []
    for (const group of response.data?.groups || []) {
      for (const method of group.methods || []) {
        list.push({
          ...method,
          categoryName: group.name || group.category || method.category,
        })
      }
    }
    paymentMethods.value = list
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal memuat metode pembayaran'), { type: 'error' })
  } finally {
    paymentMethodsLoading.value = false
  }
}

// Cache tab data to prevent redundant network fetches.
const loadedTabs = ref(new Set())

async function loadTabData(tabName) {
  if (loadedTabs.value.has(tabName)) return
  loadedTabs.value.add(tabName)

  switch (tabName) {
    case 'overview':
      await Promise.allSettled([
        loadAdminReport(),
        loadAdminOrders(),
        loadAdminBooks(),
        loadCustomers(),
      ])
      break
    case 'books':
      await Promise.allSettled([
        loadAdminBooks(),
        loadAdminCategories(),
        loadAdminAuthors(),
        loadAdminPublishers(),
      ])
      break
    case 'categories':
      await loadAdminCategories()
      break
    case 'people':
      await loadAdminPeople()
      break
    case 'vouchers':
      await Promise.allSettled([
        loadAdminDiscounts(),
        loadAdminBooks(),
      ])
      break
    case 'orders':
      await Promise.allSettled([
        loadAdminOrders(),
        loadAdminBooks(),
      ])
      break
    case 'customers':
      await Promise.allSettled([
        loadCustomers(),
        loadAdminReport(),
      ])
      break
    case 'payments':
      await Promise.allSettled([
        loadPaymentMethods(),
        ensureCourierCatalog(),
      ])
      break
    case 'profile':
      break
  }
}

watch(activeTab, async (tab) => {
  await loadTabData(tab)
})

// Listen to order SSE updates and sync metrics silently.
function handleSSEPaymentStatus(data) {
  if (!data) return
  const inv = data.invoice_number || data.invoice || data.order_id || data.id
  if (inv) {
    const rowIndex = adminOrderRows.value.findIndex((r) => r.invoice === inv || r.id === inv)
    if (rowIndex !== -1) {
      const row = adminOrderRows.value[rowIndex]
      if (data.order_status) row.rawStatus = data.order_status
      if (data.payment_status && !data.order_status) row.rawStatus = data.payment_status
      if (data.gross_amount) row.total = Number(data.gross_amount) || row.total
    } else {
      loadAdminOrders().catch(() => {})
    }
  } else {
    loadAdminOrders().catch(() => {})
  }

  loadAdminReport().catch(() => {})
}

function handleSSEShippingStatus(data) {
  if (!data) return
  const inv = data.invoice_number || data.invoice || data.order_id || data.id
  if (inv) {
    const rowIndex = adminOrderRows.value.findIndex((r) => r.invoice === inv || r.id === inv)
    if (rowIndex !== -1) {
      const row = adminOrderRows.value[rowIndex]
      if (data.order_status) row.rawStatus = data.order_status
      if (data.shipping_status && !data.order_status) row.rawStatus = data.shipping_status
    } else {
      loadAdminOrders().catch(() => {})
    }
  } else {
    loadAdminOrders().catch(() => {})
  }

  loadAdminReport().catch(() => {})
}

function handleSSEGeneralOrderStatus(data) {
  if (!data) return
  const inv = data.invoice_number || data.invoice || data.order_id || data.id
  if (inv) {
    const rowIndex = adminOrderRows.value.findIndex((r) => r.invoice === inv || r.id === inv)
    if (rowIndex !== -1) {
      const row = adminOrderRows.value[rowIndex]
      if (data.order_status || data.status) row.rawStatus = data.order_status || data.status
    } else {
      loadAdminOrders().catch(() => {})
    }
  } else {
    loadAdminOrders().catch(() => {})
  }
  loadAdminReport().catch(() => {})
}

function handleSSEOrderCreated() {
  loadAdminOrders().catch(() => {})
  loadAdminReport().catch(() => {})
}

const { isConnected: isSSEConnected } = useOrderStatusSSE({
  onPaymentStatus: handleSSEPaymentStatus,
  onShippingStatus: handleSSEShippingStatus,
  onOrderStatus: handleSSEGeneralOrderStatus,
  onOrderCreated: handleSSEOrderCreated,
  onOrderEvent: (evt) => {
    if (evt?.data?.invoice_number || evt?.data?.order_id) {
      handleSSEGeneralOrderStatus(evt.data)
    }
  },
})

async function refreshOverviewOrders() {
  await Promise.allSettled([loadAdminOrders(), loadAdminReport()])
}

const showReportModal = ref(false)
const reportFilter = ref({
  startDate: '',
  endDate: '',
  status: 'all',
  preset: 'this_month',
})

const reportDatePresets = [
  { key: 'today', label: 'Hari Ini' },
  { key: '7days', label: '7 Hari Terakhir' },
  { key: '30days', label: '30 Hari Terakhir' },
  { key: 'this_month', label: 'Bulan Ini' },
  { key: 'last_month', label: 'Bulan Lalu' },
  { key: 'all', label: 'Semua Waktu' },
]

function formatYMD(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function selectReportPreset(preset) {
  const now = new Date()
  reportFilter.value.preset = preset
  if (preset === 'today') {
    reportFilter.value.startDate = formatYMD(now)
    reportFilter.value.endDate = formatYMD(now)
  } else if (preset === '7days') {
    const d = new Date()
    d.setDate(d.getDate() - 6)
    reportFilter.value.startDate = formatYMD(d)
    reportFilter.value.endDate = formatYMD(now)
  } else if (preset === '30days') {
    const d = new Date()
    d.setDate(d.getDate() - 29)
    reportFilter.value.startDate = formatYMD(d)
    reportFilter.value.endDate = formatYMD(now)
  } else if (preset === 'this_month') {
    const d = new Date(now.getFullYear(), now.getMonth(), 1)
    reportFilter.value.startDate = formatYMD(d)
    reportFilter.value.endDate = formatYMD(now)
  } else if (preset === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0)
    reportFilter.value.startDate = formatYMD(start)
    reportFilter.value.endDate = formatYMD(end)
  } else if (preset === 'all') {
    reportFilter.value.startDate = ''
    reportFilter.value.endDate = ''
  }
}

function openReportDownloadModal() {
  if (!reportFilter.value.startDate && !reportFilter.value.endDate) {
    selectReportPreset('this_month')
  }
  showReportModal.value = true
}

function closeReportDownloadModal() {
  showReportModal.value = false
}

function handleReportKeydown(e) {
  if (e.key === 'Escape' && showReportModal.value) {
    closeReportDownloadModal()
  }
}

let overviewPollingTimer = null

onMounted(() => {
  window.addEventListener('keydown', handleReportKeydown)
  overviewPollingTimer = setInterval(() => {
    if (activeTab.value === 'overview' && !document.hidden) {
      loadAdminOrders().catch(() => {})
      loadAdminReport().catch(() => {})
    }
  }, 30000)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleReportKeydown)
  if (overviewPollingTimer) {
    clearInterval(overviewPollingTimer)
    overviewPollingTimer = null
  }
})

async function executeDownloadReport() {
  if (isBusy('report-download')) return

  if (
    reportFilter.value.startDate &&
    reportFilter.value.endDate &&
    reportFilter.value.startDate > reportFilter.value.endDate
  ) {
    showToast('Tanggal mulai tidak boleh melebihi tanggal selesai.', { type: 'error' })
    return
  }

  setBusy('report-download', true)
  try {
    const params = {
      status: reportFilter.value.status || 'all',
    }
    if (reportFilter.value.startDate) {
      params.start_date = reportFilter.value.startDate
      params.from_date = reportFilter.value.startDate
      params.from = reportFilter.value.startDate
      params.startDate = reportFilter.value.startDate
    }
    if (reportFilter.value.endDate) {
      params.end_date = reportFilter.value.endDate
      params.to_date = reportFilter.value.endDate
      params.to = reportFilter.value.endDate
      params.endDate = reportFilter.value.endDate
    }

    const { blob, filename } = await api.reportPdf(params)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url

    const defaultFilename =
      reportFilter.value.startDate && reportFilter.value.endDate
        ? `laporan-penjualan-${reportFilter.value.startDate}-sd-${reportFilter.value.endDate}.pdf`
        : 'bookstore-report.pdf'

    link.download = filename || defaultFilename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)

    showToast('Laporan PDF berhasil diunduh.', { type: 'success' })
    showReportModal.value = false
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal mengunduh laporan'), { type: 'error' })
  } finally {
    setBusy('report-download', false)
  }
}

function downloadReport(filters = null) {
  if (filters && typeof filters === 'object' && (filters.startDate || filters.endDate || filters.status)) {
    reportFilter.value = {
      ...reportFilter.value,
      ...filters,
    }
    executeDownloadReport()
  } else {
    openReportDownloadModal()
  }
}

async function updateBookStock(bookId, amount) {
  const book = adminBooks.value.find(
    (item) => String(item.rawId) === String(bookId) || String(item.id) === String(bookId),
  )
  if (!book || isBusy(`stock-${bookId}`)) return
  setBusy(`stock-${bookId}`, true)
  try {
    let source = book
    if (book.slug) {
      try {
        const response = await api.book(book.slug)
        if (response.data) source = mapAdminBook(response.data)
      } catch {
              }
    }

    await api.updateBook(book.rawId, {
      category_id: Number(source.categoryId),
      author_id: Number(source.authorId),
      publisher_id: Number(source.publisherId),
      title: source.title,
      isbn: source.isbn,
      synopsis: source.description,
      price: Number(source.price) || 0,
      original_price: Number(source.originalPrice) || Number(source.price) || 0,
      discount_percentage: Number(source.discount) || 0,
      weight_grams: Number(source.weightGrams) || 300,
      pages: Number(source.pages) || 1,
      publication_date: source.publicationDate
        ? source.publicationDate.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      language: source.language || 'Indonesia',
      length: Number(source.length) || 1,
      width: Number(source.width) || 1,
      height: Number(source.height) || 1,
      condition: source.condition || '100% Baru & Segel Penerbit',
      stock: Math.max(0, (Number(source.stock) || 0) + Number(amount || 0)),
      cover_image: source.coverImage,
      is_active: source.isActive !== false,
    })
    await Promise.all([loadAdminBooks(), loadBooks()])
    showToast('Stok buku diperbarui.', { type: 'info' })
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal memperbarui stok'), { type: 'error' })
  } finally {
    setBusy(`stock-${bookId}`, false)
  }
}

async function onBooksRefresh() {
  await Promise.all([
    loadAdminBooks(),
    loadAdminReport(),
    loadCategories(),
    loadBooks(),
  ])
}

async function onCategoryRefresh() {
  await Promise.all([
    loadAdminCategories(),
    loadAdminBooks(),
    loadCategories(),
    loadBooks(),
  ])
}

async function onPeopleRefresh() {
  await Promise.all([
    loadAdminPeople(),
    loadAdminBooks(),
  ])
}

async function onVouchersRefresh() {
  await loadAdminDiscounts()
}

async function onOrdersRefresh() {
  await Promise.all([
    loadAdminOrders(),
    loadAdminReport(),
  ])
}

async function onPaymentsRefresh() {
  await loadPaymentMethods()
}

onMounted(async () => {
  adminLoading.value = true
  await loadTabData(activeTab.value)
  adminLoading.value = false
})
</script>

<template>
  <div class="min-h-screen bg-background py-5 sm:py-8">
    <FullScreenLoader :show="adminLoading" />

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div class="bg-white border-2 sm:border-3 border-black p-4 sm:p-5 rounded-[2px] shadow-neo-sm select-none">
          <div class="flex items-center justify-between">
            <span class="font-outfit font-black text-xs uppercase text-black">Total Penjualan</span>
            <svg
              class="w-5 h-5 text-black"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M9 12v-4" />
              <path d="M15 12v-2" />
              <path d="M12 12v-1" />
              <path d="M3 4h18" />
              <path d="M4 4v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-10" />
              <path d="M12 16v4" />
              <path d="M9 20h6" />
            </svg>
          </div>
          <p class="font-outfit font-black text-xl sm:text-2xl text-black mt-2">
            {{ formatRupiah(totalRevenue) }}
          </p>
          <div class="text-xs font-bold text-black mt-2">
            <span>dari {{ paidOrdersCount }} pesanan lunas</span>
          </div>
        </div>

        <div class="bg-white border-2 sm:border-3 border-black p-4 sm:p-5 rounded-[2px] shadow-neo-sm select-none">
          <div class="flex items-center justify-between">
            <span class="font-outfit font-black text-xs uppercase text-black">Total Transaksi</span>
            <svg
              class="w-5 h-5 text-black"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
              />
            </svg>
          </div>
          <p class="font-outfit font-black text-xl sm:text-2xl text-black mt-2">
            {{ totalOrdersCount }} Pesanan
          </p>
          <div class="text-xs font-bold text-black mt-2">
            <span>
              {{ paidOrdersCount }} lunas · {{ waitingOrdersCount }} menunggu ·
              {{ cancelledOrdersCount }} batal/retur
            </span>
          </div>
        </div>

        <div class="bg-white border-2 sm:border-3 border-black p-4 sm:p-5 rounded-[2px] shadow-neo-sm select-none">
          <div class="flex items-center justify-between">
            <span class="font-outfit font-black text-xs uppercase text-black">Katalog Buku</span>
            <svg
              class="w-5 h-5 text-black"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
              />
            </svg>
          </div>
          <p class="font-outfit font-black text-xl sm:text-2xl text-black mt-2">
            {{ adminBooks.length }} Judul Buku
          </p>
          <div class="text-xs font-bold text-black mt-2">
            <span>{{ lowStockBooks.length }} judul stok kritis</span>
          </div>
        </div>

        <div class="bg-white border-2 sm:border-3 border-black p-4 sm:p-5 rounded-[2px] shadow-neo-sm select-none">
          <div class="flex items-center justify-between">
            <span class="font-outfit font-black text-xs uppercase text-black">Pengguna Aktif</span>
            <svg
              class="w-5 h-5 text-black"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
              />
            </svg>
          </div>
          <p class="font-outfit font-black text-xl sm:text-2xl text-black mt-2">
            {{ activeUsersCount }} Pembeli
          </p>
          <div class="text-xs font-bold text-black mt-2">
            <span>{{ customersList.length }} total akun</span>
          </div>
        </div>
      </div>

            <div class="relative mb-6">
        <div class="flex items-center gap-2 overflow-x-auto pb-2 -mb-2 pt-1 pr-2 scrollbar-none">
          <button
            type="button"
            class="neubrutal-btn px-3.5 sm:px-5 py-2.5 rounded-[2px] font-outfit font-black text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 border-2 sm:border-3 border-black shrink-0 cursor-pointer"
            :class="
              activeTab === 'overview'
                ? 'bg-neo-yellow text-black shadow-neo-sm -translate-y-0.5'
                : 'bg-white text-muted-foreground hover:bg-gray-100 shadow-neo-sm'
            "
            @click="activeTab = 'overview'"
          >
            Ringkasan & Grafik
          </button>

          <button
            type="button"
            class="neubrutal-btn px-3.5 sm:px-5 py-2.5 rounded-[2px] font-outfit font-black text-xs sm:text-sm whitespace-nowrap transition-all border-2 sm:border-3 border-black shrink-0 cursor-pointer"
            :class="
              activeTab === 'books'
                ? 'bg-neo-yellow text-black shadow-neo-sm -translate-y-0.5'
                : 'bg-white text-muted-foreground hover:bg-gray-100 shadow-neo-sm'
            "
            @click="activeTab = 'books'"
          >
            Katalog Buku
          </button>

          <button
            type="button"
            class="neubrutal-btn px-3.5 sm:px-5 py-2.5 rounded-[2px] font-outfit font-black text-xs sm:text-sm whitespace-nowrap transition-all border-2 sm:border-3 border-black shrink-0 cursor-pointer"
            :class="
              activeTab === 'categories'
                ? 'bg-neo-yellow text-black shadow-neo-sm -translate-y-0.5'
                : 'bg-white text-muted-foreground hover:bg-gray-100 shadow-neo-sm'
            "
            @click="activeTab = 'categories'"
          >
            Kategori Buku
          </button>

          <button
            type="button"
            class="neubrutal-btn px-3.5 sm:px-5 py-2.5 rounded-[2px] font-outfit font-black text-xs sm:text-sm whitespace-nowrap transition-all border-2 sm:border-3 border-black shrink-0 cursor-pointer"
            :class="
              activeTab === 'people'
                ? 'bg-neo-yellow text-black shadow-neo-sm -translate-y-0.5'
                : 'bg-white text-muted-foreground hover:bg-gray-100 shadow-neo-sm'
            "
            @click="activeTab = 'people'"
          >
            Penulis & Penerbit
          </button>

          <button
            type="button"
            class="neubrutal-btn px-3.5 sm:px-5 py-2.5 rounded-[2px] font-outfit font-black text-xs sm:text-sm whitespace-nowrap transition-all border-2 sm:border-3 border-black shrink-0 cursor-pointer"
            :class="
              activeTab === 'vouchers'
                ? 'bg-neo-yellow text-black shadow-neo-sm -translate-y-0.5'
                : 'bg-white text-muted-foreground hover:bg-gray-100 shadow-neo-sm'
            "
            @click="activeTab = 'vouchers'"
          >
            Voucher Diskon
          </button>

          <button
            type="button"
            class="neubrutal-btn px-3.5 sm:px-5 py-2.5 rounded-[2px] font-outfit font-black text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 border-2 sm:border-3 border-black shrink-0 cursor-pointer"
            :class="
              activeTab === 'orders'
                ? 'bg-neo-yellow text-black shadow-neo-sm -translate-y-0.5'
                : 'bg-white text-muted-foreground hover:bg-gray-100 shadow-neo-sm'
            "
            @click="activeTab = 'orders'"
          >
            <span>Pesanan Masuk</span>
            <span
              v-if="needsActionCount > 0"
              class="px-1.5 py-0.5 bg-black text-white text-[10px] rounded-[2px] font-outfit font-black border border-black shadow-neo-xs"
            >
              {{ needsActionCount }}
            </span>
          </button>

          <button
            type="button"
            class="neubrutal-btn px-3.5 sm:px-5 py-2.5 rounded-[2px] font-outfit font-black text-xs sm:text-sm whitespace-nowrap transition-all border-2 sm:border-3 border-black shrink-0 cursor-pointer"
            :class="
              activeTab === 'customers'
                ? 'bg-neo-yellow text-black shadow-neo-sm -translate-y-0.5'
                : 'bg-white text-muted-foreground hover:bg-gray-100 shadow-neo-sm'
            "
            @click="activeTab = 'customers'"
          >
            Data Pengguna
          </button>

          <button
            type="button"
            class="neubrutal-btn px-3.5 sm:px-5 py-2.5 rounded-[2px] font-outfit font-black text-xs sm:text-sm whitespace-nowrap transition-all border-2 sm:border-3 border-black shrink-0 cursor-pointer"
            :class="
              activeTab === 'payments'
                ? 'bg-neo-yellow text-black shadow-neo-sm -translate-y-0.5'
                : 'bg-white text-muted-foreground hover:bg-gray-100 shadow-neo-sm'
            "
            @click="activeTab = 'payments'"
          >
            Metode Bayar
          </button>

          <button
            type="button"
            class="neubrutal-btn px-3.5 sm:px-5 py-2.5 rounded-[2px] font-outfit font-black text-xs sm:text-sm whitespace-nowrap transition-all border-2 sm:border-3 border-black shrink-0 cursor-pointer"
            :class="
              activeTab === 'profile'
                ? 'bg-neo-yellow text-black shadow-neo-sm -translate-y-0.5'
                : 'bg-white text-muted-foreground hover:bg-gray-100 shadow-neo-sm'
            "
            @click="activeTab = 'profile'"
          >
            Pengaturan Akun
          </button>
        </div>
      </div>

            <AdminOverviewTab
        v-if="activeTab === 'overview'"
        :weekly-sales="weeklySales"
        :weekly-sales-total="weeklySalesTotal"
        :low-stock-books="lowStockBooks"
        :report-orders="reportOrders"
        :report-loading="reportLoading || adminOrdersLoading"
        :downloading-report="isBusy('report-download')"
        @switch-tab="(tab) => (activeTab = tab)"
        @restock="updateBookStock"
        @download-report="downloadReport"
      />

      <AdminBooksTab
        v-if="activeTab === 'books'"
        :books="adminBooks"
        :loading="booksLoading"
        :categories="adminCategories"
        :authors="adminAuthors"
        :publishers="adminPublishers"
        @refresh="onBooksRefresh"
      />

      <AdminCategoriesTab
        v-if="activeTab === 'categories'"
        :categories="adminCategories"
        :loading="categoriesLoading"
        @refresh="onCategoryRefresh"
      />

      <AdminPeopleTab
        v-if="activeTab === 'people'"
        :authors="adminAuthors"
        :publishers="adminPublishers"
        :loading="peopleLoading"
        @refresh="onPeopleRefresh"
      />

      <AdminVouchersTab
        v-if="activeTab === 'vouchers'"
        :discounts="adminDiscounts"
        :books="adminBooks"
        :loading="vouchersLoading"
        @refresh="onVouchersRefresh"
      />

      <AdminOrdersTab
        v-if="activeTab === 'orders'"
        :orders="adminOrderRows"
        :loading="adminOrdersLoading"
        :books="adminBooks"
        @refresh="onOrdersRefresh"
        @download-report="downloadReport"
      />

      <AdminCustomersTab
        v-if="activeTab === 'customers'"
        :customers="customersList"
        :orders="reportOrders"
        :loading="customersLoading"
      />

      <AdminPaymentsTab
        v-if="activeTab === 'payments'"
        :payment-methods="paymentMethods"
        :loading="paymentMethodsLoading"
        @refresh="onPaymentsRefresh"
      />

      <AdminProfileTab
        v-if="activeTab === 'profile'"
      />
    </div>

    <!-- Modal Unduh Laporan PDF dengan Rentang Tanggal -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div
          v-if="showReportModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/60 backdrop-blur-xs select-none"
          @click.self="closeReportDownloadModal"
        >
          <transition name="modal-pop" appear>
            <div
              class="relative w-full max-w-lg bg-white border-2 sm:border-3 border-black rounded-[2px] shadow-neo-sm sm:shadow-neo overflow-hidden flex flex-col max-h-[90vh]"
            >
              <!-- Modal Header -->
              <div
                class="bg-neo-yellow border-b-2 sm:border-b-3 border-black p-3.5 sm:p-4 flex items-center justify-between gap-3 shrink-0"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-8 h-8 rounded-[2px] bg-black text-white flex items-center justify-center shrink-0">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                  </div>
                  <div class="min-w-0">
                    <h3 class="font-outfit font-black text-sm sm:text-base text-black uppercase tracking-tight truncate">
                      Unduh Laporan Penjualan (PDF)
                    </h3>
                    <p class="font-sans text-[11px] text-black/70 font-semibold truncate">
                      Pilih rentang tanggal dan status transaksi
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  class="w-8 h-8 rounded-[2px] bg-white border-2 border-black flex items-center justify-center font-outfit font-black text-sm hover:bg-black hover:text-white transition-colors cursor-pointer shadow-neo-xs shrink-0"
                  aria-label="Tutup modal"
                  @click="closeReportDownloadModal"
                >
                  ✕
                </button>
              </div>

              <!-- Modal Body -->
              <form class="p-4 sm:p-5 space-y-4 overflow-y-auto select-text" @submit.prevent="executeDownloadReport">
                <!-- Preset Pilihan Cepat -->
                <div>
                  <label class="block font-outfit font-black text-xs uppercase mb-1.5 text-black">
                    Pilihan Cepat Rentang Tanggal:
                  </label>
                  <div class="flex flex-wrap gap-1.5">
                    <button
                      v-for="p in reportDatePresets"
                      :key="p.key"
                      type="button"
                      class="px-2.5 py-1 font-outfit font-bold text-xs border-2 border-black rounded-[2px] transition-all cursor-pointer"
                      :class="reportFilter.preset === p.key ? 'bg-black text-white shadow-neo-xs' : 'bg-white hover:bg-neutral-100 text-black shadow-neo-xs'"
                      @click="selectReportPreset(p.key)"
                    >
                      {{ p.label }}
                    </button>
                  </div>
                </div>

                <!-- Input Tanggal Mulai & Tanggal Selesai -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block font-outfit font-black text-xs uppercase mb-1 text-black">
                      Dari Tanggal (Mulai):
                    </label>
                    <input
                      v-model="reportFilter.startDate"
                      type="date"
                      class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-xs outline-none shadow-neo-xs rounded-[2px] focus:bg-white"
                      @change="reportFilter.preset = 'custom'"
                    />
                  </div>
                  <div>
                    <label class="block font-outfit font-black text-xs uppercase mb-1 text-black">
                      Sampai Tanggal (Selesai):
                    </label>
                    <input
                      v-model="reportFilter.endDate"
                      type="date"
                      class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-xs outline-none shadow-neo-xs rounded-[2px] focus:bg-white"
                      @change="reportFilter.preset = 'custom'"
                    />
                  </div>
                </div>

                <!-- Filter Status Pesanan -->
                <div>
                  <label class="block font-outfit font-black text-xs uppercase mb-1 text-black">
                    Filter Status Transaksi:
                  </label>
                  <select
                    v-model="reportFilter.status"
                    class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-xs outline-none shadow-neo-xs rounded-[2px] cursor-pointer"
                  >
                    <option value="all">Semua Status (Lunas, Proses, Kirim, Batal, dll)</option>
                    <option value="paid">Hanya Lunas / Sukses (Paid, Processing, Shipped, Completed)</option>
                    <option value="waiting_payment">Hanya Menunggu Pembayaran</option>
                    <option value="cancelled">Hanya Dibatalkan</option>
                    <option value="returned">Hanya Diretur</option>
                  </select>
                </div>

                <!-- Info Box -->
                <div class="p-3 bg-neutral-50 border-2 border-black rounded-[2px] text-xs font-sans space-y-1">
                  <div class="flex items-center gap-1.5 font-outfit font-black uppercase text-black">
                    <svg class="w-3.5 h-3.5 text-neo-violet" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                    </svg>
                    <span>Cakupan Laporan:</span>
                  </div>
                  <p class="text-neutral-600">
                    <template v-if="reportFilter.startDate && reportFilter.endDate">
                      Mencakup data transaksi dari <strong class="text-black">{{ reportFilter.startDate }}</strong> s/d <strong class="text-black">{{ reportFilter.endDate }}</strong>.
                    </template>
                    <template v-else-if="reportFilter.startDate">
                      Mencakup data transaksi mulai <strong class="text-black">{{ reportFilter.startDate }}</strong> hingga terbaru.
                    </template>
                    <template v-else-if="reportFilter.endDate">
                      Mencakup data transaksi hingga tanggal <strong class="text-black">{{ reportFilter.endDate }}</strong>.
                    </template>
                    <template v-else>
                      Mencetak seluruh histori data transaksi tanpa filter tanggal.
                    </template>
                  </p>
                </div>

                <!-- Modal Actions -->
                <div class="border-t-2 border-black pt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    class="neubrutal-btn bg-white text-black border-2 border-black px-4 py-2 rounded-[2px] font-outfit font-black text-xs shadow-neo-sm hover:bg-neutral-100 cursor-pointer"
                    @click="closeReportDownloadModal"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    :disabled="isBusy('report-download')"
                    class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-5 py-2 rounded-[2px] font-outfit font-black text-xs shadow-neo-sm hover:bg-yellow-300 disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span v-if="isBusy('report-download')" class="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                    <svg v-else class="w-3.5 h-3.5 text-black shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    <span>{{ isBusy('report-download') ? 'Sedang Mengunduh...' : 'Unduh Laporan PDF' }}</span>
                  </button>
                </div>
              </form>
            </div>
          </transition>
        </div>
      </transition>
    </Teleport>
  </div>
</template>
