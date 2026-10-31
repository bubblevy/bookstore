<script setup>
import { ref, computed, onMounted, watch } from 'vue'
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
    publicationYear: raw.publication_year || new Date().getFullYear(),
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
    rawStatus: raw.status,
    customerName: raw.customer?.name || raw.customer_name || '—',
    customerEmail: raw.customer?.email || raw.customer_email || '',
    total: Number(raw.total_amount ?? raw.total) || 0,
    totalQuantity: Number(raw.total_quantity ?? raw.quantity) || 0,
    paymentMethod: raw.payment_method || '—',
    date: formatDateTime(raw.created_at),
    createdAt: raw.created_at,
  }
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

const reportOrders = computed(() => {
  const orders = adminReport.value?.orders || []
  return orders.map(mapAdminOrderRow)
})

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
    const response = await api.books({ per_page: 100, is_active: 'all' })
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
    const response = await api.authors({ per_page: 100 })
    adminAuthors.value = response.data || []
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal memuat penulis'), { type: 'error' })
  }
}

async function loadAdminPublishers() {
  try {
    const response = await api.publishers({ per_page: 100 })
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
    const response = await api.discounts({ per_page: 100 })
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
      per_page: 100,
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
    adminOrderRows.value = rows
  } catch (error) {
    if (adminReport.value?.orders?.length) {
      adminOrderRows.value = adminReport.value.orders.map(mapAdminOrderRow)
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
    const response = await api.users({ per_page: 100 })
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
        loadAdminBooks(),
        loadAdminOrders(),
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
      await loadAdminDiscounts()
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
  if (!data?.invoice_number) return
  const inv = data.invoice_number

  const rowIndex = adminOrderRows.value.findIndex((r) => r.invoice === inv || r.id === inv)
  if (rowIndex !== -1) {
    const row = adminOrderRows.value[rowIndex]
    if (data.order_status) row.rawStatus = data.order_status
    if (data.gross_amount) row.total = Number(data.gross_amount) || row.total
  } else {
    loadAdminOrders().catch(() => {})
  }

  loadAdminReport().catch(() => {})
}

function handleSSEShippingStatus(data) {
  if (!data?.invoice_number) return
  const inv = data.invoice_number

  const rowIndex = adminOrderRows.value.findIndex((r) => r.invoice === inv || r.id === inv)
  if (rowIndex !== -1) {
    const row = adminOrderRows.value[rowIndex]
    if (data.order_status) row.rawStatus = data.order_status
  }

  loadAdminReport().catch(() => {})
}

useOrderStatusSSE({
  onPaymentStatus: handleSSEPaymentStatus,
  onShippingStatus: handleSSEShippingStatus,
})

async function downloadReport() {
  if (isBusy('report-download')) return
  setBusy('report-download', true)
  try {
    const { blob, filename } = await api.reportPdf({ status: 'all' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || 'bookstore-report.pdf'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    showToast('Laporan PDF berhasil diunduh.', { type: 'success' })
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal mengunduh laporan'), { type: 'error' })
  } finally {
    setBusy('report-download', false)
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
      publication_year: Number(source.publicationYear) || new Date().getFullYear(),
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
        :report-loading="reportLoading"
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
        :loading="vouchersLoading"
        @refresh="onVouchersRefresh"
      />

      <AdminOrdersTab
        v-if="activeTab === 'orders'"
        :orders="adminOrderRows"
        :loading="adminOrdersLoading"
        :books="adminBooks"
        @refresh="onOrdersRefresh"
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
  </div>
</template>
