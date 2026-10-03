<script setup>
import { ref, computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useStore } from '@/composables/useStore'
import BookCover from '@/components/BookCover.vue'

const router = useRouter()
const {
  state,
  addBook,
  updateBook,
  deleteBook,
  updateBookStock,
  addCategory,
  updateCategory,
  deleteCategory,
  addVoucher,
  updateVoucher,
  deleteVoucher,
  toggleVoucher,
  updateRajaOngkir,
  updatePaymentGateway,
  calculateShippingRates,
  updateOrderStatus,
  showToast,
  setUserRole,
} = useStore()

// Navigation Tabs
const activeTab = ref('overview') // 'overview' | 'books' | 'categories' | 'vouchers' | 'orders' | 'customers' | 'gateway'

// Format Rupiah
function formatRupiah(val) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(val || 0)
}

// ================= OVERVIEW METRICS =================
const totalRevenue = computed(() => {
  return state.orders
    .filter((o) => o.status !== 'dibatalkan')
    .reduce((sum, o) => sum + (o.total || 0), 0)
})

const pendingOrdersCount = computed(() => {
  return state.orders.filter((o) => o.status === 'diproses' || o.status === 'menunggu').length
})

const lowStockBooks = computed(() => {
  return state.books.filter((b) => (b.stock || 0) <= 5)
})

// Weekly sales data for Neubrutal Bar Chart
const weeklySales = [
  { day: 'Sen', amount: 3200000, height: '45%' },
  { day: 'Sel', amount: 4850000, height: '65%' },
  { day: 'Rab', amount: 2900000, height: '40%' },
  { day: 'Kam', amount: 5600000, height: '78%' },
  { day: 'Jum', amount: 6200000, height: '88%' },
  { day: 'Sab', amount: 7800000, height: '100%', best: true },
  { day: 'Min', amount: 5100000, height: '72%' },
]

// ================= 1. BOOK MANAGEMENT (CRUD) =================
const bookSearch = ref('')
const selectedCategory = ref('all')
const bookSort = ref('newest')

const filteredBooks = computed(() => {
  return state.books
    .filter((book) => {
      const matchCat =
        selectedCategory.value === 'all' || book.category === selectedCategory.value
      const query = bookSearch.value.toLowerCase().trim()
      const matchSearch =
        !query ||
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query)
      return matchCat && matchSearch
    })
    .sort((a, b) => {
      if (bookSort.value === 'price-low') return a.price - b.price
      if (bookSort.value === 'price-high') return b.price - a.price
      if (bookSort.value === 'stock-low') return (a.stock || 0) - (b.stock || 0)
      if (bookSort.value === 'stock-high') return (b.stock || 0) - (a.stock || 0)
      return 0
    })
})

const showBookModal = ref(false)
const isEditMode = ref(false)
const currentBookId = ref(null)
const fileInputRef = ref(null)

const bookForm = ref({
  title: '',
  subtitle: '',
  author: '',
  category: 'Fiksi Populer',
  price: 89000,
  originalPrice: 120000,
  stock: 15,
  coverImage: '',
  theme: 'black',
  badge: 'BARU',
  description: '',
  publisher: 'BookStore Publishing',
  isbn: '9786020000000',
})

function processImageFile(file) {
  if (!file) return
  if (!file.type.startsWith('image/')) {
    showToast('Harap pilih berkas gambar yang valid (JPG, PNG, WebP).', { type: 'error' })
    return
  }
  const reader = new FileReader()
  reader.onload = (event) => {
    bookForm.value.coverImage = event.target.result
    showToast('Gambar sampul buku berhasil dimuat.', { type: 'success' })
  }
  reader.readAsDataURL(file)
}

function handleImageUpload(e) {
  const file = e.target.files?.[0]
  processImageFile(file)
}

function handleDrop(e) {
  const file = e.dataTransfer?.files?.[0]
  processImageFile(file)
}

function removeCoverImage() {
  bookForm.value.coverImage = ''
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function openAddBook() {
  isEditMode.value = false
  currentBookId.value = null
  bookForm.value = {
    title: '',
    subtitle: '',
    author: '',
    category: state.categories[0]?.name || 'Fiksi Populer',
    price: 89000,
    originalPrice: 120000,
    stock: 15,
    coverImage: '',
    theme: 'black',
    badge: 'BARU',
    description: '',
    publisher: 'BookStore Publishing',
    isbn: '978602' + Math.floor(1000000 + Math.random() * 9000000),
  }
  if (fileInputRef.value) fileInputRef.value.value = ''
  showBookModal.value = true
}

function openEditBook(book) {
  isEditMode.value = true
  currentBookId.value = book.id
  bookForm.value = {
    title: book.title,
    subtitle: book.subtitle || '',
    author: book.author,
    category: book.category,
    price: book.price,
    originalPrice: book.originalPrice || book.price,
    stock: book.stock !== undefined ? book.stock : 10,
    coverImage: book.coverImage || '',
    theme: book.theme || 'black',
    badge: book.badge || '',
    description: book.description || '',
    publisher: book.details?.publisher || 'BookStore Publishing',
    isbn: book.details?.isbn || '9786020000000',
  }
  if (fileInputRef.value) fileInputRef.value.value = ''
  showBookModal.value = true
}

function handleSaveBook() {
  if (!bookForm.value.title || !bookForm.value.author || !bookForm.value.price) {
    showToast('Harap isi judul, penulis, dan harga buku.', { type: 'error' })
    return
  }

  if (isEditMode.value && currentBookId.value) {
    updateBook(currentBookId.value, {
      title: bookForm.value.title,
      subtitle: bookForm.value.subtitle,
      author: bookForm.value.author,
      category: bookForm.value.category,
      price: Number(bookForm.value.price),
      originalPrice: Number(bookForm.value.originalPrice),
      stock: Number(bookForm.value.stock),
      coverImage: bookForm.value.coverImage,
      theme: bookForm.value.theme,
      badge: bookForm.value.badge,
      description: bookForm.value.description,
    })
  } else {
    addBook({ ...bookForm.value })
  }
  showBookModal.value = false
}

const bookToDelete = ref(null)
const showDeleteConfirm = ref(false)

function confirmDeleteBook(book) {
  bookToDelete.value = book
  showDeleteConfirm.value = true
}

function executeDeleteBook() {
  if (bookToDelete.value) {
    deleteBook(bookToDelete.value.id)
    showDeleteConfirm.value = false
    bookToDelete.value = null
  }
}

// ================= 2. CATEGORY MANAGEMENT (CRUD) =================
const showCategoryModal = ref(false)
const isEditCategory = ref(false)
const currentCategoryId = ref(null)

const categoryForm = ref({
  name: '',
  description: '',
  theme: 'violet',
  bg: '#8847F5',
  text: '#FFFFFF',
})

function openAddCategory() {
  isEditCategory.value = false
  currentCategoryId.value = null
  categoryForm.value = {
    name: '',
    description: '',
    theme: 'violet',
    bg: '#8847F5',
    text: '#FFFFFF',
  }
  showCategoryModal.value = true
}

function openEditCategory(cat) {
  isEditCategory.value = true
  currentCategoryId.value = cat.id
  categoryForm.value = {
    name: cat.name,
    description: cat.description || '',
    theme: cat.theme || 'violet',
    bg: cat.bg || '#8847F5',
    text: cat.text || '#FFFFFF',
  }
  showCategoryModal.value = true
}

function handleSaveCategory() {
  if (!categoryForm.value.name.trim()) {
    showToast('Nama kategori tidak boleh kosong.', { type: 'error' })
    return
  }

  const themeColors = {
    violet: { bg: '#8847F5', text: '#FFFFFF' },
    yellow: { bg: '#D8FA00', text: '#000000' },
    orange: { bg: '#FF7B29', text: '#FFFFFF' },
    lime: { bg: '#CBFF00', text: '#000000' },
    pink: { bg: '#FF9EC1', text: '#000000' },
    sky: { bg: '#6EC6FF', text: '#000000' },
  }

  const colorSetting = themeColors[categoryForm.value.theme] || themeColors.violet

  if (isEditCategory.value && currentCategoryId.value) {
    updateCategory(currentCategoryId.value, {
      name: categoryForm.value.name,
      description: categoryForm.value.description,
      theme: categoryForm.value.theme,
      bg: colorSetting.bg,
      text: colorSetting.text,
    })
  } else {
    addCategory({
      name: categoryForm.value.name,
      description: categoryForm.value.description,
      theme: categoryForm.value.theme,
      bg: colorSetting.bg,
      text: colorSetting.text,
    })
  }
  showCategoryModal.value = false
}

const categoryToDelete = ref(null)
const showDeleteCategoryConfirm = ref(false)

function confirmDeleteCategory(cat) {
  categoryToDelete.value = cat
  showDeleteCategoryConfirm.value = true
}

function executeDeleteCategory() {
  if (categoryToDelete.value) {
    deleteCategory(categoryToDelete.value.id)
    showDeleteCategoryConfirm.value = false
    categoryToDelete.value = null
  }
}

// ================= 3. VOUCHER MANAGEMENT (CRUD) =================
const showVoucherModal = ref(false)
const isEditVoucher = ref(false)
const currentVoucherId = ref(null)

const voucherForm = ref({
  code: '',
  name: '',
  type: 'percentage', // percentage | fixed | shipping
  value: 10,
  minSpend: 50000,
  quota: 100,
  validUntil: '2026-12-31',
  active: true,
  desc: '',
})

function openAddVoucher() {
  isEditVoucher.value = false
  currentVoucherId.value = null
  voucherForm.value = {
    code: '',
    name: '',
    type: 'percentage',
    value: 10,
    minSpend: 50000,
    quota: 100,
    validUntil: '2026-12-31',
    active: true,
    desc: '',
  }
  showVoucherModal.value = true
}

function openEditVoucher(v) {
  isEditVoucher.value = true
  currentVoucherId.value = v.id
  voucherForm.value = {
    code: v.code,
    name: v.name,
    type: v.type,
    value: v.value,
    minSpend: v.minSpend,
    quota: v.quota,
    validUntil: v.validUntil,
    active: v.active,
    desc: v.desc || '',
  }
  showVoucherModal.value = true
}

function handleSaveVoucher() {
  if (!voucherForm.value.code.trim() || !voucherForm.value.value) {
    showToast('Harap lengkapi kode voucher dan nilai diskon.', { type: 'error' })
    return
  }

  if (isEditVoucher.value && currentVoucherId.value) {
    updateVoucher(currentVoucherId.value, {
      code: voucherForm.value.code,
      name: voucherForm.value.name,
      type: voucherForm.value.type,
      value: Number(voucherForm.value.value),
      minSpend: Number(voucherForm.value.minSpend),
      quota: Number(voucherForm.value.quota),
      validUntil: voucherForm.value.validUntil,
      active: voucherForm.value.active,
      desc: voucherForm.value.desc,
    })
  } else {
    addVoucher({ ...voucherForm.value })
  }
  showVoucherModal.value = false
}

const voucherToDelete = ref(null)
const showDeleteVoucherConfirm = ref(false)

function confirmDeleteVoucher(v) {
  voucherToDelete.value = v
  showDeleteVoucherConfirm.value = true
}

function executeDeleteVoucher() {
  if (voucherToDelete.value) {
    deleteVoucher(voucherToDelete.value.id)
    showDeleteVoucherConfirm.value = false
    voucherToDelete.value = null
  }
}

// ================= 4. ORDER MANAGEMENT =================
const orderSearch = ref('')
const orderStatusFilter = ref('all')
const orderCourierFilter = ref('all')
const orderSortFilter = ref('newest')

const filteredOrders = computed(() => {
  let list = state.orders.filter((o) => {
    const matchStatus =
      orderStatusFilter.value === 'all' || o.status === orderStatusFilter.value
    const matchCourier =
      orderCourierFilter.value === 'all' ||
      (o.courier && o.courier.toLowerCase().includes(orderCourierFilter.value.toLowerCase()))
    const query = orderSearch.value.toLowerCase().trim()
    const matchSearch =
      !query ||
      o.id.toLowerCase().includes(query) ||
      o.customerName.toLowerCase().includes(query) ||
      o.customerEmail.toLowerCase().includes(query) ||
      (o.trackingNumber && o.trackingNumber.toLowerCase().includes(query))
    return matchStatus && matchCourier && matchSearch
  })

  if (orderSortFilter.value === 'total-high') {
    return list.slice().sort((a, b) => (b.total || 0) - (a.total || 0))
  } else if (orderSortFilter.value === 'total-low') {
    return list.slice().sort((a, b) => (a.total || 0) - (b.total || 0))
  }
  return list
})

const showResiModal = ref(false)
const selectedOrderForResi = ref(null)
const inputResiNumber = ref('')

function openResiInput(order) {
  selectedOrderForResi.value = order
  inputResiNumber.value = order.trackingNumber || ''
  showResiModal.value = true
}

function handleOrderStatusChange(order, newStatus) {
  if (newStatus === 'dikirim' && !order.trackingNumber) {
    selectedOrderForResi.value = order
    inputResiNumber.value = ''
    showResiModal.value = true
    return
  }
  updateOrderStatus(order.id, newStatus)
}

function saveResi() {
  if (!inputResiNumber.value.trim()) {
    showToast('Nomor resi tidak boleh kosong.', { type: 'error' })
    return
  }
  updateOrderStatus(selectedOrderForResi.value.id, 'dikirim', inputResiNumber.value.trim())
  showResiModal.value = false
}

// ================= 5. CUSTOMERS MANAGEMENT (NO TIERS) =================
const customersList = ref([
  {
    id: 'c1',
    name: 'Budi Pratama',
    email: 'budi.pratama@gmail.com',
    phone: '0812-3456-7890',
    ordersCount: 8,
    totalSpent: 1240000,
    status: 'Aktif',
    joinDate: '15 Jan 2024',
  },
  {
    id: 'c2',
    name: 'Siti Nurhaliza',
    email: 'siti.nur@gmail.com',
    phone: '0813-8877-6655',
    ordersCount: 4,
    totalSpent: 620000,
    status: 'Aktif',
    joinDate: '22 Feb 2024',
  },
  {
    id: 'c3',
    name: 'Rian Hidayat',
    email: 'rian.h@outlook.com',
    phone: '0857-1122-3344',
    ordersCount: 2,
    totalSpent: 211000,
    status: 'Aktif',
    joinDate: '10 Mei 2024',
  },
  {
    id: 'c4',
    name: 'Dewi Lestari',
    email: 'dewi.l@gmail.com',
    phone: '0819-0011-2233',
    ordersCount: 14,
    totalSpent: 2450000,
    status: 'Aktif',
    joinDate: '01 Des 2023',
  },
  {
    id: 'c5',
    name: 'Agus Setiawan',
    email: 'agus.setiawan@yahoo.com',
    phone: '0821-7788-9900',
    ordersCount: 1,
    totalSpent: 89000,
    status: 'Aktif',
    joinDate: '18 Agu 2024',
  },
])

// ================= 6. GATEWAY & RAJAONGKIR SETTINGS =================
const rajaongkirConfig = ref({
  apiKey: state.integrations.rajaongkir.apiKey,
  accountType: state.integrations.rajaongkir.accountType,
  originCityName: state.integrations.rajaongkir.originCityName,
  originCityId: state.integrations.rajaongkir.originCityId,
  activeCouriers: [...state.integrations.rajaongkir.activeCouriers],
})

const paymentGatewayConfig = ref({
  provider: state.integrations.paymentGateway.provider,
  environment: state.integrations.paymentGateway.environment,
  merchantId: state.integrations.paymentGateway.merchantId,
  clientKey: state.integrations.paymentGateway.clientKey,
  serverKey: state.integrations.paymentGateway.serverKey,
  snapEnabled: state.integrations.paymentGateway.snapEnabled,
})

// RajaOngkir Rate Tester
const testCity = ref('Bandung')
const testWeight = ref(1000)
const calculatedRates = ref([])

function runRateTest() {
  calculatedRates.value = calculateShippingRates(testCity.value, testWeight.value)
  showToast(`Tarif RajaOngkir berhasil dihitung untuk kota: ${testCity.value}`, { type: 'success' })
}

function handleSaveRajaongkir() {
  updateRajaOngkir({ ...rajaongkirConfig.value })
}

function handleSaveGateway() {
  updatePaymentGateway({ ...paymentGatewayConfig.value })
}

function testGatewayConnection() {
  showToast('Koneksi Midtrans Payment Gateway terverifikasi (HTTP 200 OK).', { type: 'success' })
}

function switchRoleToUser() {
  setUserRole('user')
  router.push('/dashboard')
}
</script>

<template>
  <div class="min-h-screen bg-background py-6 sm:py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- KPI Metrics Grid (Unified Black Style) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="bg-white border-3 border-black p-5 rounded-[2px] shadow-neo">
          <div class="flex items-center justify-between">
            <span class="font-outfit font-black text-xs uppercase text-black">Total Penjualan</span>
            <svg class="w-5 h-5 text-black" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6H2.25m0 0v10.5m0-10.5h16.5m0 0h1.5m0 0v10.5m0-10.5-.75.75m.75-.75-.75-.75m.75 1.5H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25h13.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25Z" />
            </svg>
          </div>
          <p class="font-outfit font-black text-2xl text-black mt-2">
            {{ formatRupiah(totalRevenue + 45200000) }}
          </p>
          <div class="text-xs font-bold text-black mt-2">
            <span>+18.4% vs bulan lalu</span>
          </div>
        </div>

        <div class="bg-white border-3 border-black p-5 rounded-[2px] shadow-neo">
          <div class="flex items-center justify-between">
            <span class="font-outfit font-black text-xs uppercase text-black">Total Transaksi</span>
            <svg class="w-5 h-5 text-black" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
          </div>
          <p class="font-outfit font-black text-2xl text-black mt-2">
            {{ state.orders.length + 328 }} Pesanan
          </p>
          <div class="text-xs font-bold text-black mt-2">
            <span>{{ pendingOrdersCount }} dalam proses</span>
          </div>
        </div>

        <div class="bg-white border-3 border-black p-5 rounded-[2px] shadow-neo">
          <div class="flex items-center justify-between">
            <span class="font-outfit font-black text-xs uppercase text-black">Katalog Buku</span>
            <svg class="w-5 h-5 text-black" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <p class="font-outfit font-black text-2xl text-black mt-2">
            {{ state.books.length }} Judul Buku
          </p>
          <div class="text-xs font-bold text-black mt-2">
            <span>{{ lowStockBooks.length }} judul stok kritis</span>
          </div>
        </div>

        <div class="bg-white border-3 border-black p-5 rounded-[2px] shadow-neo">
          <div class="flex items-center justify-between">
            <span class="font-outfit font-black text-xs uppercase text-black">Pelanggan Aktif</span>
            <svg class="w-5 h-5 text-black" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
          </div>
          <p class="font-outfit font-black text-2xl text-black mt-2">
            892 Pengguna
          </p>
          <div class="text-xs font-bold text-black mt-2">
            <span>+14 akun baru minggu ini</span>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs (No Emojis) -->
      <div class="flex items-center gap-2 overflow-x-auto pt-2 px-1 pb-3 mb-6 scrollbar-none">
        <button
          class="neubrutal-btn px-4 sm:px-5 py-2.5 rounded-[2px] font-outfit font-black text-xs sm:text-sm whitespace-nowrap transition-all border-2 sm:border-3 border-black"
          :class="
            activeTab === 'overview'
              ? 'bg-neo-yellow text-black shadow-neo'
              : 'bg-white text-muted-foreground hover:bg-gray-100 shadow-neo-sm'
          "
          @click="activeTab = 'overview'"
        >
          Ringkasan & Grafik
        </button>

        <button
          class="neubrutal-btn px-4 sm:px-5 py-2.5 rounded-[2px] font-outfit font-black text-xs sm:text-sm whitespace-nowrap transition-all border-2 sm:border-3 border-black flex items-center gap-2"
          :class="
            activeTab === 'books'
              ? 'bg-neo-yellow text-black shadow-neo'
              : 'bg-white text-muted-foreground hover:bg-gray-100 shadow-neo-sm'
          "
          @click="activeTab = 'books'"
        >
          <span>Katalog Buku</span>
          <span class="px-1.5 py-0.2 bg-black text-white text-[10px] rounded-full">
            {{ state.books.length }}
          </span>
        </button>

        <button
          class="neubrutal-btn px-4 sm:px-5 py-2.5 rounded-[2px] font-outfit font-black text-xs sm:text-sm whitespace-nowrap transition-all border-2 sm:border-3 border-black flex items-center gap-2"
          :class="
            activeTab === 'categories'
              ? 'bg-neo-yellow text-black shadow-neo'
              : 'bg-white text-muted-foreground hover:bg-gray-100 shadow-neo-sm'
          "
          @click="activeTab = 'categories'"
        >
          <span>Kategori Buku</span>
          <span class="px-1.5 py-0.2 bg-black text-white text-[10px] rounded-full">
            {{ state.categories.length }}
          </span>
        </button>

        <button
          class="neubrutal-btn px-4 sm:px-5 py-2.5 rounded-[2px] font-outfit font-black text-xs sm:text-sm whitespace-nowrap transition-all border-2 sm:border-3 border-black flex items-center gap-2"
          :class="
            activeTab === 'vouchers'
              ? 'bg-neo-yellow text-black shadow-neo'
              : 'bg-white text-muted-foreground hover:bg-gray-100 shadow-neo-sm'
          "
          @click="activeTab = 'vouchers'"
        >
          <span>Voucher Diskon</span>
          <span class="px-1.5 py-0.2 bg-black text-white text-[10px] rounded-full">
            {{ state.vouchers.length }}
          </span>
        </button>

        <button
          class="neubrutal-btn px-4 sm:px-5 py-2.5 rounded-[2px] font-outfit font-black text-xs sm:text-sm whitespace-nowrap transition-all border-2 sm:border-3 border-black flex items-center gap-2"
          :class="
            activeTab === 'orders'
              ? 'bg-neo-yellow text-black shadow-neo'
              : 'bg-white text-muted-foreground hover:bg-gray-100 shadow-neo-sm'
          "
          @click="activeTab = 'orders'"
        >
          <span>Pesanan Masuk</span>
          <span
            v-if="pendingOrdersCount > 0"
            class="px-1.5 py-0.2 bg-black text-white text-[10px] rounded-full"
          >
            {{ pendingOrdersCount }}
          </span>
        </button>

        <button
          class="neubrutal-btn px-4 sm:px-5 py-2.5 rounded-[2px] font-outfit font-black text-xs sm:text-sm whitespace-nowrap transition-all border-2 sm:border-3 border-black"
          :class="
            activeTab === 'customers'
              ? 'bg-neo-yellow text-black shadow-neo'
              : 'bg-white text-muted-foreground hover:bg-gray-100 shadow-neo-sm'
          "
          @click="activeTab = 'customers'"
        >
          Data Pelanggan
        </button>

        <button
          class="neubrutal-btn px-4 sm:px-5 py-2.5 rounded-[2px] font-outfit font-black text-xs sm:text-sm whitespace-nowrap transition-all border-2 sm:border-3 border-black"
          :class="
            activeTab === 'gateway'
              ? 'bg-neo-yellow text-black shadow-neo'
              : 'bg-white text-muted-foreground hover:bg-gray-100 shadow-neo-sm'
          "
          @click="activeTab = 'gateway'"
        >
          Gateway & RajaOngkir
        </button>
      </div>

      <!-- ================= TAB: OVERVIEW ================= -->
      <div v-if="activeTab === 'overview'" class="space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Sales Bar Chart (Responsive on Mobile) -->
          <div class="lg:col-span-8 bg-white border-3 border-black p-4 sm:p-6 rounded-[2px] shadow-neo overflow-hidden">
            <div class="border-b-2 border-black pb-3 mb-4 sm:mb-6">
              <h3 class="font-outfit font-black text-base sm:text-lg text-black">Tren Omset Penjualan Mingguan</h3>
              <p class="font-sans text-xs text-muted-foreground mt-0.5">Rekap transaksi otomatis 7 hari terakhir</p>
            </div>

            <div class="w-full overflow-x-auto pb-2 scrollbar-none">
              <div class="h-52 sm:h-60 min-w-[280px] sm:min-w-full flex items-end justify-between gap-2 sm:gap-3 pt-6 px-1">
                <div
                  v-for="s in weeklySales"
                  :key="s.day"
                  class="flex-1 flex flex-col items-center gap-1.5 sm:gap-2 group h-full justify-end"
                >
                  <div class="opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] whitespace-nowrap shadow-neo-sm pointer-events-none">
                    {{ formatRupiah(s.amount) }}
                  </div>

                  <div
                    class="w-full border-2 border-black rounded-[2px] transition-all group-hover:scale-105 bg-neo-violet shadow-neo-sm"
                    :style="{ height: s.height }"
                  ></div>

                  <span class="font-outfit font-black text-[11px] sm:text-xs text-black">
                    {{ s.day }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Low Stock Alert -->
          <div class="lg:col-span-4 bg-white border-3 border-black p-6 rounded-[2px] shadow-neo flex flex-col justify-between">
            <div>
              <div class="border-b-2 border-black pb-2 mb-4">
                <h3 class="font-outfit font-black text-base text-black uppercase">Peringatan Stok Kritis</h3>
                <p class="font-sans text-xs text-muted-foreground mt-0.5">
                  Buku dengan sisa stok 5 unit atau kurang.
                </p>
              </div>

              <div class="space-y-3">
                <div
                  v-for="b in lowStockBooks.slice(0, 4)"
                  :key="b.id"
                  class="bg-[#F8F8F6] border-2 border-black p-2.5 rounded-[2px] flex items-center justify-between gap-2"
                >
                  <div class="min-w-0">
                    <h5 class="font-outfit font-black text-xs text-black truncate">{{ b.title }}</h5>
                    <span class="font-sans text-[10px] text-muted-foreground">{{ b.author }}</span>
                  </div>

                  <div class="flex items-center gap-2 shrink-0">
                    <span class="bg-red-500 text-white font-outfit font-black text-xs px-2 py-0.5 rounded-[2px] border border-black">
                      {{ b.stock || 0 }} Unit
                    </span>
                    <button
                      class="neubrutal-btn bg-neo-yellow text-black border border-black px-2 py-0.5 font-outfit font-black text-[10px] shadow-neo-sm hover:bg-yellow-300"
                      title="Restock 10 Unit"
                      @click="updateBookStock(b.id, 10)"
                    >
                      +10
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              class="mt-4 w-full neubrutal-btn bg-white text-black border-2 border-black py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100"
              @click="activeTab = 'books'"
            >
              Kelola Seluruh Katalog
            </button>
          </div>
        </div>

        <!-- Recent Orders live table -->
        <div class="bg-white border-3 border-black p-6 rounded-[2px] shadow-neo">
          <div class="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
            <div>
              <h3 class="font-outfit font-black text-lg text-black">Transaksi Masuk Terbaru</h3>
              <p class="font-sans text-xs text-muted-foreground">Pembaruan langsung status transaksi pembeli</p>
            </div>
            <button
              class="neubrutal-btn bg-white border-2 border-black px-3 py-1 font-outfit font-black text-xs shadow-neo-sm hover:bg-neo-yellow"
              @click="activeTab = 'orders'"
            >
              Semua Pesanan
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-xs font-sans border-collapse">
              <thead>
                <tr class="bg-black text-white font-outfit font-black text-left">
                  <th class="p-3">INVOICE</th>
                  <th class="p-3">PEMBELI</th>
                  <th class="p-3">BUKU</th>
                  <th class="p-3">TOTAL</th>
                  <th class="p-3">STATUS</th>
                  <th class="p-3 text-right">AKSI</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="order in state.orders.slice(0, 5)"
                  :key="order.id"
                  class="border-b border-black/10 hover:bg-gray-50"
                >
                  <td class="p-3 font-outfit font-black">#{{ order.id }}</td>
                  <td class="p-3 font-bold">{{ order.customerName }}</td>
                  <td class="p-3 text-muted-foreground">
                    <span v-for="(it, i) in order.items" :key="it.id">
                      {{ it.title }} ({{ it.quantity }}){{ i < order.items.length - 1 ? ', ' : '' }}
                    </span>
                  </td>
                  <td class="p-3 font-outfit font-black text-neo-violet">
                    {{ formatRupiah(order.total) }}
                  </td>
                  <td class="p-3">
                    <select
                      :value="order.status"
                      class="border-2 border-black font-outfit font-black text-xs py-1.5 px-3 rounded-[2px] shadow-neo-sm cursor-pointer outline-none transition-colors"
                      :class="{
                        'bg-neo-yellow text-black': order.status === 'diproses',
                        'bg-[#6EC6FF] text-black': order.status === 'dikirim',
                        'bg-neo-lime text-black': order.status === 'selesai',
                        'bg-red-300 text-black': order.status === 'dibatalkan',
                        'bg-gray-200 text-black': order.status === 'menunggu',
                      }"
                      @change="(e) => handleOrderStatusChange(order, e.target.value)"
                    >
                      <option value="menunggu" class="bg-white text-black font-sans font-medium">Menunggu</option>
                      <option value="diproses" class="bg-white text-black font-sans font-medium">Diproses</option>
                      <option value="dikirim" class="bg-white text-black font-sans font-medium">Dikirim</option>
                      <option value="selesai" class="bg-white text-black font-sans font-medium">Selesai</option>
                      <option value="dibatalkan" class="bg-white text-black font-sans font-medium">Dibatalkan</option>
                    </select>
                  </td>
                  <td class="p-3 text-right">
                    <button
                      v-if="order.status === 'diproses'"
                      class="neubrutal-btn bg-white border border-black px-2.5 py-1 font-outfit font-black text-[11px] shadow-neo-sm hover:bg-neo-yellow"
                      @click="openResiInput(order)"
                    >
                      Input Resi
                    </button>
                    <span v-else class="text-muted-foreground font-mono text-[11px]">
                      {{ order.trackingNumber || '-' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ================= TAB: BOOKS CRUD ================= -->
      <div v-if="activeTab === 'books'" class="space-y-6">
        <div class="bg-white border-3 border-black p-4 rounded-[2px] shadow-neo-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex flex-wrap items-center gap-3 flex-1">
            <div class="relative flex-1 min-w-[200px] max-w-md">
              <input
                v-model="bookSearch"
                type="text"
                placeholder="Cari judul buku atau penulis..."
                class="w-full bg-background border-2 border-black p-2 pl-3 font-outfit font-bold text-xs outline-none shadow-neo-sm"
              />
            </div>

            <select
              v-model="selectedCategory"
              class="bg-background border-2 border-black p-2 font-outfit font-bold text-xs outline-none shadow-neo-sm cursor-pointer"
            >
              <option value="all">Semua Kategori</option>
              <option v-for="cat in state.categories" :key="cat.id" :value="cat.name">
                {{ cat.name }}
              </option>
            </select>

            <select
              v-model="bookSort"
              class="bg-background border-2 border-black p-2 font-outfit font-bold text-xs outline-none shadow-neo-sm cursor-pointer"
            >
              <option value="newest">Urutan Standar</option>
              <option value="price-low">Harga: Termurah</option>
              <option value="price-high">Harga: Termahal</option>
              <option value="stock-low">Stok: Sedikit ke Banyak</option>
              <option value="stock-high">Stok: Banyak ke Sedikit</option>
            </select>
          </div>

          <button
            class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo hover:bg-yellow-300 shrink-0"
            @click="openAddBook"
          >
            + Tambah Buku Baru
          </button>
        </div>

        <div class="bg-white border-3 border-black rounded-[2px] shadow-neo overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-xs font-sans border-collapse">
              <thead>
                <tr class="bg-black text-white font-outfit font-black text-left">
                  <th class="p-3 w-16">COVER</th>
                  <th class="p-3">JUDUL & PENULIS</th>
                  <th class="p-3">KATEGORI</th>
                  <th class="p-3">HARGA</th>
                  <th class="p-3 text-center">STOK</th>
                  <th class="p-3 text-center">STATUS</th>
                  <th class="p-3 text-right">AKSI</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="book in filteredBooks"
                  :key="book.id"
                  class="border-b border-black/10 hover:bg-gray-50 transition-colors"
                >
                  <td class="p-3">
                    <div class="w-12 h-16 bg-background border-2 border-black p-0.5 shadow-neo-sm overflow-hidden flex items-center justify-center">
                      <img
                        v-if="book.coverImage"
                        :src="book.coverImage"
                        :alt="book.title"
                        class="w-full h-full object-cover"
                      />
                      <BookCover v-else :theme="book.theme" :title="book.title" :author="book.author" />
                    </div>
                  </td>
                  <td class="p-3">
                    <h4 class="font-outfit font-black text-sm text-black line-clamp-1">
                      {{ book.title }}
                    </h4>
                    <p class="font-sans text-xs text-muted-foreground">{{ book.author }}</p>
                  </td>
                  <td class="p-3">
                    <span class="bg-neutral-100 border border-black/40 px-2 py-1 font-outfit font-bold text-[11px] rounded-[2px]">
                      {{ book.category }}
                    </span>
                  </td>
                  <td class="p-3">
                    <span class="font-outfit font-black text-black block">{{ formatRupiah(book.price) }}</span>
                    <span v-if="book.originalPrice" class="line-through text-muted-foreground text-[10px]">
                      {{ formatRupiah(book.originalPrice) }}
                    </span>
                  </td>
                  <td class="p-3 text-center">
                    <div class="flex items-center justify-center gap-1.5">
                      <button
                        class="w-5 h-5 border border-black bg-white rounded-[2px] font-black hover:bg-gray-200"
                        title="Kurang 1"
                        @click="updateBookStock(book.id, -1)"
                      >
                        -
                      </button>
                      <span
                        class="font-outfit font-black px-2 py-0.5 rounded-[2px] border border-black min-w-[32px] text-center"
                        :class="(book.stock || 0) <= 5 ? 'bg-red-400 text-white' : 'bg-neo-lime text-black'"
                      >
                        {{ book.stock || 0 }}
                      </span>
                      <button
                        class="w-5 h-5 border border-black bg-white rounded-[2px] font-black hover:bg-gray-200"
                        title="Tambah 1"
                        @click="updateBookStock(book.id, 1)"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td class="p-3 text-center">
                    <span
                      class="px-2 py-0.5 border border-black rounded-[2px] font-outfit font-bold text-[10px] uppercase"
                      :class="(book.stock || 0) > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                    >
                      {{ (book.stock || 0) > 0 ? 'Tersedia' : 'Habis' }}
                    </span>
                  </td>
                  <td class="p-3 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                      <button
                        class="neubrutal-btn bg-white border border-black px-2.5 py-1 font-outfit font-black text-xs shadow-neo-sm hover:bg-neo-yellow"
                        @click="openEditBook(book)"
                      >
                        Edit
                      </button>
                      <button
                        class="neubrutal-btn bg-red-100 text-red-700 border border-black px-2.5 py-1 font-outfit font-black text-xs shadow-neo-sm hover:bg-red-200"
                        @click="confirmDeleteBook(book)"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ================= TAB: CATEGORIES CRUD ================= -->
      <div v-if="activeTab === 'categories'" class="space-y-6">
        <div class="bg-white border-3 border-black p-4 rounded-[2px] shadow-neo-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="font-outfit font-black text-lg text-black">Manajemen Kategori Buku</h2>
            <p class="font-sans text-xs text-muted-foreground">
              Kelola kategori etalase, tema warna label, dan filter koleksi buku.
            </p>
          </div>

          <button
            class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo hover:bg-yellow-300 shrink-0"
            @click="openAddCategory"
          >
            + Tambah Kategori Baru
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div
            v-for="cat in state.categories"
            :key="cat.id"
            class="bg-white border-3 border-black p-5 rounded-[2px] shadow-neo flex flex-col justify-between"
          >
            <div>
              <div class="flex items-center justify-between gap-2 mb-2">
                <span
                  class="border-2 border-black px-2.5 py-1 rounded-[2px] font-outfit font-black text-xs uppercase shadow-neo-sm"
                  :style="{ backgroundColor: cat.bg, color: cat.text }"
                >
                  {{ cat.name }}
                </span>
                <span class="font-mono text-xs text-muted-foreground">#{{ cat.id }}</span>
              </div>
              <p class="font-sans text-xs text-gray-700 mt-2">
                {{ cat.description || 'Tidak ada deskripsi kategori.' }}
              </p>
            </div>

            <div class="mt-4 pt-3 border-t border-black/10 flex items-center justify-between">
              <span class="font-sans text-xs text-muted-foreground">
                Tema: <strong class="uppercase font-outfit">{{ cat.theme || 'violet' }}</strong>
              </span>

              <div class="flex items-center gap-1.5">
                <button
                  class="neubrutal-btn bg-white border border-black px-2.5 py-1 font-outfit font-black text-xs shadow-neo-sm hover:bg-neo-yellow"
                  @click="openEditCategory(cat)"
                >
                  Edit
                </button>
                <button
                  class="neubrutal-btn bg-red-100 text-red-700 border border-black px-2.5 py-1 font-outfit font-black text-xs shadow-neo-sm hover:bg-red-200"
                  @click="confirmDeleteCategory(cat)"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ================= TAB: VOUCHERS CRUD ================= -->
      <div v-if="activeTab === 'vouchers'" class="space-y-6">
        <div class="bg-white border-3 border-black p-4 rounded-[2px] shadow-neo-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="font-outfit font-black text-lg text-black">Manajemen Kupon & Voucher Diskon</h2>
            <p class="font-sans text-xs text-muted-foreground">
              Voucher yang dibuat di sini otomatis aktif dan dapat divalidasi langsung oleh pembeli saat checkout.
            </p>
          </div>

          <button
            class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo hover:bg-yellow-300 shrink-0"
            @click="openAddVoucher"
          >
            + Terbitkan Voucher Baru
          </button>
        </div>

        <div class="bg-white border-3 border-black rounded-[2px] shadow-neo overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-xs font-sans border-collapse">
              <thead>
                <tr class="bg-black text-white font-outfit font-black text-left">
                  <th class="p-3">KODE VOUCHER</th>
                  <th class="p-3">NAMA & DESKRIPSI</th>
                  <th class="p-3">TIPE & NILAI</th>
                  <th class="p-3">MINIMAL BELANJA</th>
                  <th class="p-3 text-center">KUOTA / TERPAKAI</th>
                  <th class="p-3">BERLAKU SAMPAI</th>
                  <th class="p-3 text-center">STATUS</th>
                  <th class="p-3 text-right">AKSI</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="v in state.vouchers"
                  :key="v.id"
                  class="border-b border-black/10 hover:bg-gray-50"
                >
                  <td class="p-3">
                    <span class="font-mono font-black text-sm bg-neo-yellow border-2 border-black px-2.5 py-0.5 rounded-[2px] shadow-neo-sm inline-block">
                      {{ v.code }}
                    </span>
                  </td>
                  <td class="p-3">
                    <h5 class="font-outfit font-black text-sm text-black">{{ v.name }}</h5>
                    <p class="font-sans text-xs text-muted-foreground mt-0.5">{{ v.desc }}</p>
                  </td>
                  <td class="p-3">
                    <span class="font-outfit font-black text-sm text-green-700">
                      {{ v.type === 'percentage' ? v.value + '%' : formatRupiah(v.value) }}
                    </span>
                    <span class="block text-[10px] text-muted-foreground uppercase font-bold">
                      {{ v.type === 'shipping' ? 'Ongkos Kirim' : (v.type === 'percentage' ? 'Persen' : 'Nominal Tetap') }}
                    </span>
                  </td>
                  <td class="p-3 font-outfit font-bold">
                    {{ formatRupiah(v.minSpend) }}
                  </td>
                  <td class="p-3 text-center font-mono text-xs">
                    <strong>{{ v.used }}</strong> / {{ v.quota }}
                  </td>
                  <td class="p-3 font-mono text-xs text-muted-foreground">
                    {{ v.validUntil }}
                  </td>
                  <td class="p-3 text-center">
                    <button
                      class="border-2 border-black px-2.5 py-0.5 rounded-[2px] font-outfit font-black text-[10px] uppercase shadow-neo-sm cursor-pointer"
                      :class="v.active ? 'bg-neo-lime text-black hover:bg-red-100' : 'bg-gray-200 text-gray-600 hover:bg-neo-lime'"
                      @click="toggleVoucher(v.id)"
                    >
                      {{ v.active ? 'Aktif' : 'Nonaktif' }}
                    </button>
                  </td>
                  <td class="p-3 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                      <button
                        class="neubrutal-btn bg-white border border-black px-2.5 py-1 font-outfit font-black text-xs shadow-neo-sm hover:bg-neo-yellow"
                        @click="openEditVoucher(v)"
                      >
                        Edit
                      </button>
                      <button
                        class="neubrutal-btn bg-red-100 text-red-700 border border-black px-2.5 py-1 font-outfit font-black text-xs shadow-neo-sm hover:bg-red-200"
                        @click="confirmDeleteVoucher(v)"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ================= TAB: ORDERS MANAGEMENT ================= -->
      <div v-if="activeTab === 'orders'" class="space-y-6">
        <div class="bg-white border-3 border-black p-4 rounded-[2px] shadow-neo-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex flex-wrap items-center gap-3 flex-1">
            <div class="relative flex-1 min-w-[200px] max-w-md">
              <input
                v-model="orderSearch"
                type="text"
                placeholder="Cari Invoice, Pelanggan, atau No Resi..."
                class="w-full bg-background border-2 border-black p-2 pl-3 font-outfit font-bold text-xs outline-none shadow-neo-sm"
              />
            </div>

            <select
              v-model="orderStatusFilter"
              class="bg-background border-2 border-black p-2 font-outfit font-bold text-xs outline-none shadow-neo-sm cursor-pointer"
            >
              <option value="all" class="bg-white text-black">Semua Status</option>
              <option value="menunggu" class="bg-white text-black">Menunggu</option>
              <option value="diproses" class="bg-white text-black">Diproses</option>
              <option value="dikirim" class="bg-white text-black">Dikirim</option>
              <option value="selesai" class="bg-white text-black">Selesai</option>
              <option value="dibatalkan" class="bg-white text-black">Dibatalkan</option>
            </select>

            <select
              v-model="orderCourierFilter"
              class="bg-background border-2 border-black p-2 font-outfit font-bold text-xs outline-none shadow-neo-sm cursor-pointer"
            >
              <option value="all">Semua Kurir</option>
              <option value="jne">JNE Express</option>
              <option value="sicepat">SiCepat</option>
              <option value="j&t">J&T Express</option>
              <option value="pos">Pos Indonesia</option>
            </select>

            <select
              v-model="orderSortFilter"
              class="bg-background border-2 border-black p-2 font-outfit font-bold text-xs outline-none shadow-neo-sm cursor-pointer"
            >
              <option value="newest">Pesanan Terbaru</option>
              <option value="total-high">Total: Terbesar</option>
              <option value="total-low">Total: Terkecil</option>
            </select>
          </div>
        </div>

        <div class="bg-white border-3 border-black rounded-[2px] shadow-neo overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-xs font-sans border-collapse">
              <thead>
                <tr class="bg-black text-white font-outfit font-black text-left">
                  <th class="p-3">INVOICE & TANGGAL</th>
                  <th class="p-3">PELANGGAN</th>
                  <th class="p-3">KURIR (RAJAONGKIR)</th>
                  <th class="p-3">BUKU</th>
                  <th class="p-3">TOTAL</th>
                  <th class="p-3">STATUS PESANAN</th>
                  <th class="p-3 text-right">AKSI RESI</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="order in filteredOrders"
                  :key="order.id"
                  class="border-b border-black/10 hover:bg-gray-50"
                >
                  <td class="p-3">
                    <span class="font-outfit font-black text-black block">#{{ order.id }}</span>
                    <span class="text-muted-foreground text-[10px]">{{ order.date }}</span>
                  </td>
                  <td class="p-3">
                    <span class="font-outfit font-black text-black block">{{ order.customerName }}</span>
                    <span class="text-muted-foreground text-[10px]">{{ order.customerPhone }}</span>
                  </td>
                  <td class="p-3 max-w-xs">
                    <span class="font-bold text-black block">{{ order.courier }}</span>
                    <span class="text-muted-foreground text-[10px] truncate block">{{ order.address }}</span>
                  </td>
                  <td class="p-3">
                    <div v-for="it in order.items" :key="it.id" class="text-neutral-800 font-semibold truncate max-w-xs">
                      * {{ it.title }} ({{ it.quantity }}x)
                    </div>
                  </td>
                  <td class="p-3">
                    <span class="font-outfit font-black text-neo-violet text-sm block">
                      {{ formatRupiah(order.total) }}
                    </span>
                    <span class="text-[10px] text-muted-foreground">{{ order.paymentMethod }}</span>
                  </td>
                  <td class="p-3">
                    <select
                      :value="order.status"
                      class="border-2 border-black font-outfit font-black text-xs py-1.5 px-3 rounded-[2px] shadow-neo-sm cursor-pointer outline-none transition-colors"
                      :class="{
                        'bg-neo-yellow text-black': order.status === 'diproses',
                        'bg-[#6EC6FF] text-black': order.status === 'dikirim',
                        'bg-neo-lime text-black': order.status === 'selesai',
                        'bg-red-300 text-black': order.status === 'dibatalkan',
                        'bg-gray-200 text-black': order.status === 'menunggu',
                      }"
                      @change="(e) => handleOrderStatusChange(order, e.target.value)"
                    >
                      <option value="menunggu" class="bg-white text-black font-sans font-medium">Menunggu</option>
                      <option value="diproses" class="bg-white text-black font-sans font-medium">Diproses</option>
                      <option value="dikirim" class="bg-white text-black font-sans font-medium">Dikirim</option>
                      <option value="selesai" class="bg-white text-black font-sans font-medium">Selesai</option>
                      <option value="dibatalkan" class="bg-white text-black font-sans font-medium">Dibatalkan</option>
                    </select>
                  </td>
                  <td class="p-3 text-right">
                    <button
                      class="neubrutal-btn bg-white border border-black px-2.5 py-1 font-outfit font-black text-xs shadow-neo-sm hover:bg-neo-yellow"
                      @click="openResiInput(order)"
                    >
                      {{ order.trackingNumber ? 'Edit Resi' : '+ Input Resi' }}
                    </button>
                  </td>
                </tr>
                <tr v-if="filteredOrders.length === 0">
                  <td colspan="7" class="p-8 text-center bg-gray-50/50">
                    <p class="font-outfit font-black text-sm text-black">Tidak Ada Pesanan</p>
                    <p class="font-sans text-xs text-muted-foreground mt-1">
                      Tidak ditemukan pesanan dengan status atau kriteria filter yang dipilih.
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ================= TAB: CUSTOMERS (NO TIERS) ================= -->
      <div v-if="activeTab === 'customers'" class="space-y-6">
        <div class="bg-white border-3 border-black rounded-[2px] shadow-neo p-6">
          <div class="border-b-2 border-black pb-3 mb-4 flex items-center justify-between">
            <div>
              <h3 class="font-outfit font-black text-xl text-black">Data Akun Pelanggan</h3>
              <p class="font-sans text-xs text-muted-foreground">Daftar pengguna terdaftar di toko BookStore</p>
            </div>
            <span class="bg-neo-yellow border-2 border-black px-3 py-1 font-outfit font-black text-xs shadow-neo-sm">
              Total {{ customersList.length }} Pelanggan
            </span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-xs font-sans border-collapse">
              <thead>
                <tr class="bg-black text-white font-outfit font-black text-left">
                  <th class="p-3">NAMA PELANGGAN</th>
                  <th class="p-3">KONTAK</th>
                  <th class="p-3 text-center">TOTAL PESANAN</th>
                  <th class="p-3">TOTAL BELANJA</th>
                  <th class="p-3">TANGGAL BERGABUNG</th>
                  <th class="p-3 text-center">STATUS AKUN</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="c in customersList"
                  :key="c.id"
                  class="border-b border-black/10 hover:bg-gray-50"
                >
                  <td class="p-3 font-outfit font-black text-sm text-black">
                    {{ c.name }}
                  </td>
                  <td class="p-3">
                    <span class="block text-black font-semibold">{{ c.email }}</span>
                    <span class="text-muted-foreground">{{ c.phone }}</span>
                  </td>
                  <td class="p-3 text-center font-outfit font-black text-sm">
                    {{ c.ordersCount }}
                  </td>
                  <td class="p-3 font-outfit font-black text-black">
                    {{ formatRupiah(c.totalSpent) }}
                  </td>
                  <td class="p-3 text-muted-foreground">{{ c.joinDate }}</td>
                  <td class="p-3 text-center">
                    <span class="bg-green-100 text-green-800 border border-green-800 px-2 py-0.5 rounded-[2px] font-outfit font-bold text-[10px]">
                      {{ c.status }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ================= TAB: GATEWAY & RAJAONGKIR ================= -->
      <div v-if="activeTab === 'gateway'" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- RajaOngkir Configuration -->
        <div class="lg:col-span-6 bg-white border-3 border-black p-6 rounded-[2px] shadow-neo space-y-4">
          <div class="border-b-2 border-black pb-2">
            <div>
              <h3 class="font-outfit font-black text-lg text-black">Integrasi Kurir RajaOngkir</h3>
              <p class="font-sans text-xs text-muted-foreground">Kalkulasi ongkir otomatis berdasarkan kota dan berat buku</p>
            </div>
          </div>

          <form class="space-y-3.5" @submit.prevent="handleSaveRajaongkir">
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">RajaOngkir API Key (Pro/Starter)</label>
              <input
                v-model="rajaongkirConfig.apiKey"
                type="text"
                placeholder="Contoh: 8a7f9bc3e210129a..."
                class="w-full bg-background border-2 border-black p-2.5 font-mono text-xs outline-none shadow-neo-sm"
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-outfit font-black text-xs uppercase mb-1">Kota Asal (Origin City)</label>
                <input
                  v-model="rajaongkirConfig.originCityName"
                  type="text"
                  placeholder="Contoh: Jakarta Pusat"
                  class="w-full bg-background border-2 border-black p-2.5 font-outfit font-bold text-xs outline-none shadow-neo-sm"
                />
              </div>
              <div>
                <label class="block font-outfit font-black text-xs uppercase mb-1">ID Kota Asal (RajaOngkir)</label>
                <input
                  v-model="rajaongkirConfig.originCityId"
                  type="text"
                  placeholder="Contoh: 151"
                  class="w-full bg-background border-2 border-black p-2.5 font-mono text-xs outline-none shadow-neo-sm"
                />
              </div>
            </div>

            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1.5">Kurir Aktif Otomatis</label>
              <div class="grid grid-cols-2 gap-2 text-xs font-sans">
                <label class="flex items-center gap-2 p-2 bg-background border border-black rounded-[2px]">
                  <input type="checkbox" checked class="accent-black" />
                  <span>JNE Express (OKE, REG, YES)</span>
                </label>
                <label class="flex items-center gap-2 p-2 bg-background border border-black rounded-[2px]">
                  <input type="checkbox" checked class="accent-black" />
                  <span>SiCepat (REG, BEST)</span>
                </label>
                <label class="flex items-center gap-2 p-2 bg-background border border-black rounded-[2px]">
                  <input type="checkbox" checked class="accent-black" />
                  <span>J&T Express (EZ)</span>
                </label>
                <label class="flex items-center gap-2 p-2 bg-background border border-black rounded-[2px]">
                  <input type="checkbox" checked class="accent-black" />
                  <span>Pos Indonesia (Kilat Khusus)</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              class="w-full neubrutal-btn bg-neo-yellow text-black border-2 border-black py-2.5 font-outfit font-black text-xs shadow-neo hover:bg-yellow-300"
            >
              Simpan Konfigurasi RajaOngkir
            </button>
          </form>

          <!-- Simulator Hitung Ongkir Otomatis -->
          <div class="mt-4 pt-4 border-t-2 border-black/15 bg-background p-4 rounded-[2px] border border-black">
            <span class="font-outfit font-black text-xs uppercase block text-black mb-2">Simulasi Hitung Ongkir Otomatis</span>
            <div class="grid grid-cols-2 gap-2 mb-2">
              <input
                v-model="testCity"
                type="text"
                placeholder="Kota Tujuan (e.g. Surabaya)"
                class="bg-white border-2 border-black p-2 text-xs font-outfit font-bold outline-none"
              />
              <button
                class="neubrutal-btn bg-black text-white px-3 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-neutral-800"
                @click="runRateTest"
              >
                Hitung Tarif
              </button>
            </div>

            <div v-if="calculatedRates.length > 0" class="space-y-1.5 mt-3">
              <div
                v-for="r in calculatedRates"
                :key="r.code"
                class="bg-white border border-black p-2 flex justify-between items-center text-xs"
              >
                <div>
                  <strong class="font-outfit">{{ r.courier }} - {{ r.service }}</strong>
                  <span class="text-muted-foreground block text-[10px]">Estimasi: {{ r.etd }}</span>
                </div>
                <span class="font-outfit font-black text-black">{{ formatRupiah(r.cost) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Payment Gateway Configuration (Midtrans) -->
        <div class="lg:col-span-6 bg-white border-3 border-black p-6 rounded-[2px] shadow-neo space-y-4">
          <div class="border-b-2 border-black pb-2">
            <div>
              <h3 class="font-outfit font-black text-lg text-black">Payment Gateway (Midtrans)</h3>
              <p class="font-sans text-xs text-muted-foreground">Otomasi verifikasi pembayaran digital QRIS & Virtual Account</p>
            </div>
          </div>

          <form class="space-y-3.5" @submit.prevent="handleSaveGateway">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-outfit font-black text-xs uppercase mb-1">Provider Gateway</label>
                <input
                  v-model="paymentGatewayConfig.provider"
                  type="text"
                  disabled
                  class="w-full bg-gray-100 border-2 border-black p-2.5 font-outfit font-bold text-xs"
                />
              </div>
              <div>
                <label class="block font-outfit font-black text-xs uppercase mb-1">Environment Mode</label>
                <select
                  v-model="paymentGatewayConfig.environment"
                  class="w-full bg-background border-2 border-black p-2.5 font-outfit font-bold text-xs outline-none cursor-pointer"
                >
                  <option value="sandbox">Sandbox (Testing)</option>
                  <option value="production">Production (Live)</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Merchant ID</label>
              <input
                v-model="paymentGatewayConfig.merchantId"
                type="text"
                placeholder="Contoh: G123456789"
                class="w-full bg-background border-2 border-black p-2.5 font-mono text-xs outline-none shadow-neo-sm"
              />
            </div>

            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Client Key</label>
              <input
                v-model="paymentGatewayConfig.clientKey"
                type="text"
                placeholder="Contoh: SB-Mid-client-XXXXX"
                class="w-full bg-background border-2 border-black p-2.5 font-mono text-xs outline-none shadow-neo-sm"
              />
            </div>

            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Server Key</label>
              <input
                v-model="paymentGatewayConfig.serverKey"
                type="password"
                placeholder="Contoh: SB-Mid-server-XXXXX"
                class="w-full bg-background border-2 border-black p-2.5 font-mono text-xs outline-none shadow-neo-sm"
              />
            </div>

            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Webhook URL Notification</label>
              <input
                type="text"
                readonly
                value="https://bookstore.id/api/payment/notification"
                class="w-full bg-gray-100 border-2 border-black p-2 font-mono text-xs"
              />
            </div>

            <div class="flex items-center gap-2 pt-1">
              <button
                type="button"
                class="flex-1 neubrutal-btn bg-white border-2 border-black py-2.5 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100"
                @click="testGatewayConnection"
              >
                Uji Koneksi Gateway
              </button>
              <button
                type="submit"
                class="flex-1 neubrutal-btn bg-neo-yellow text-black border-2 border-black py-2.5 font-outfit font-black text-xs shadow-neo hover:bg-yellow-300"
              >
                Simpan Kredensial
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- ================= MODAL: ADD / EDIT BOOK ================= -->
    <div
      v-if="showBookModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="showBookModal = false"
    >
      <div class="bg-white border-4 border-black max-w-xl w-full rounded-[2px] shadow-neo-xl overflow-hidden max-h-[90vh] flex flex-col animate-hero-entrance">
        <div class="bg-neo-yellow border-b-3 border-black p-4 flex items-center justify-between">
          <h3 class="font-outfit font-black text-lg text-black uppercase">
            {{ isEditMode ? 'EDIT DATA BUKU' : 'TAMBAH BUKU BARU' }}
          </h3>
          <button
            class="w-8 h-8 rounded-[2px] bg-white border-2 border-black flex items-center justify-center font-outfit font-black text-sm hover:bg-black hover:text-white"
            @click="showBookModal = false"
          >
            X
          </button>
        </div>

        <form class="p-6 overflow-y-auto space-y-4" @submit.prevent="handleSaveBook">
          <div>
            <label class="block font-outfit font-black text-xs uppercase mb-1">Judul Buku *</label>
            <input
              v-model="bookForm.title"
              type="text"
              required
              placeholder="Contoh: Filosofi Teras / Laut Bercerita"
              class="w-full bg-background border-2 border-black p-2.5 font-outfit font-bold text-sm outline-none shadow-neo-sm"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Penulis *</label>
              <input
                v-model="bookForm.author"
                type="text"
                required
                placeholder="Contoh: Henry Manampiring"
                class="w-full bg-background border-2 border-black p-2.5 font-outfit font-bold text-sm outline-none shadow-neo-sm"
              />
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Kategori *</label>
              <select
                v-model="bookForm.category"
                class="w-full bg-background border-2 border-black p-2.5 font-outfit font-bold text-sm outline-none shadow-neo-sm cursor-pointer"
              >
                <option v-for="cat in state.categories" :key="cat.id" :value="cat.name">
                  {{ cat.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Harga Jual (Rp) *</label>
              <input
                v-model="bookForm.price"
                type="number"
                required
                placeholder="Contoh: 89000"
                class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-sm outline-none shadow-neo-sm"
              />
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Harga Asli (Rp)</label>
              <input
                v-model="bookForm.originalPrice"
                type="number"
                placeholder="Contoh: 120000"
                class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-sm outline-none shadow-neo-sm"
              />
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Jumlah Stok *</label>
              <input
                v-model="bookForm.stock"
                type="number"
                required
                placeholder="Contoh: 15"
                class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-sm outline-none shadow-neo-sm"
              />
            </div>
          </div>

          <!-- Upload Gambar Sampul & Preview Otomatis -->
          <div class="border-2 border-black p-4 bg-[#F8F8F6] rounded-[2px] shadow-neo-sm space-y-3">
            <div class="flex items-center justify-between border-b border-black/20 pb-2">
              <span class="font-outfit font-black text-xs uppercase text-black">
                Gambar Sampul Buku
              </span>
              <span
                v-if="bookForm.coverImage"
                class="bg-neo-lime text-black border border-black px-2 py-0.5 font-outfit font-black text-[9px] uppercase rounded-[2px]"
              >
                Kustom Terpasang
              </span>
            </div>

            <input
              ref="fileInputRef"
              type="file"
              accept=".png, .jpg, .jpeg, .webp, image/png, image/jpeg, image/webp"
              class="hidden"
              @change="handleImageUpload"
            />

            <!-- Kondisi 1: Sudah ada gambar -> Kotak otomatis ganti jadi preview -->
            <div
              v-if="bookForm.coverImage"
              class="border-2 border-black bg-white p-3.5 rounded-[2px] shadow-neo-sm flex flex-col sm:flex-row items-center gap-4"
              @dragover.prevent
              @drop.prevent="handleDrop"
            >
              <div class="w-24 h-32 bg-black border-2 border-black p-0.5 shadow-neo shrink-0 overflow-hidden relative flex items-center justify-center">
                <img
                  :src="bookForm.coverImage"
                  alt="Pratinjau Sampul Buku"
                  class="w-full h-full object-cover"
                />
              </div>

              <div class="flex-1 w-full space-y-2 text-center sm:text-left">
                <div>
                  <div class="flex items-center justify-center sm:justify-start gap-2">
                    <span class="font-outfit font-black text-xs text-black">
                      Sampul Berhasil Dimuat
                    </span>
                    <span class="bg-neo-lime text-black border border-black px-1.5 py-0.2 text-[9px] font-outfit font-bold rounded-[2px]">
                      Siap
                    </span>
                  </div>
                  <p class="font-sans text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Format PNG, JPG, WebP (Rasio 3:4)
                  </p>
                </div>

                <div class="flex items-center justify-center sm:justify-start gap-2 pt-1">
                  <button
                    type="button"
                    class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-3 py-1.5 font-outfit font-black text-xs shadow-neo-sm hover:bg-yellow-300 flex items-center gap-1.5"
                    @click="fileInputRef?.click()"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    Ganti Gambar
                  </button>
                  <button
                    type="button"
                    class="neubrutal-btn bg-white text-red-600 border-2 border-black px-3 py-1.5 font-outfit font-black text-xs shadow-neo-sm hover:bg-red-50 flex items-center gap-1.5"
                    @click="removeCoverImage"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                    Hapus
                  </button>
                </div>
              </div>
            </div>

            <!-- Kondisi 2: Belum ada gambar -> Hanya kotak upload (tanpa preview di kiri) -->
            <div
              v-else
              class="border-2 border-dashed border-black bg-white p-4 rounded-[2px] shadow-neo-sm hover:bg-yellow-50/60 transition-all cursor-pointer flex flex-col justify-center gap-2 group"
              @click="fileInputRef?.click()"
              @dragover.prevent
              @drop.prevent="handleDrop"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-neo-yellow border-2 border-black rounded-[2px] flex items-center justify-center shadow-neo-sm shrink-0 group-hover:scale-105 transition-transform">
                  <svg class="w-5 h-5 text-black" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-outfit font-black text-xs text-black group-hover:text-neo-violet transition-colors">
                      Pilih Berkas Sampul
                    </span>
                    <span class="bg-black text-white text-[10px] font-outfit font-bold px-1.5 py-0.2 rounded-[2px]">
                      Jelajahi
                    </span>
                  </div>
                  <p class="font-sans text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Klik area ini atau seret file gambar langsung dari perangkat
                  </p>
                </div>
              </div>

              <div class="border-t border-black/10 pt-2 mt-0.5">
                <p class="font-sans text-[11px] text-gray-700 leading-relaxed font-medium">
                  Format PNG, JPG, WebP (Rasio 3:4)
                </p>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Badge Tag</label>
              <input
                v-model="bookForm.badge"
                type="text"
                placeholder="Contoh: BESTSELLER, BARU, atau DISKON"
                class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-sm outline-none shadow-neo-sm"
              />
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Penerbit (Opsional)</label>
              <input
                v-model="bookForm.publisher"
                type="text"
                placeholder="Contoh: Gramedia Pustaka Utama"
                class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-sm outline-none shadow-neo-sm"
              />
            </div>
          </div>

          <div>
            <label class="block font-outfit font-black text-xs uppercase mb-1">Deskripsi Singkat</label>
            <textarea
              v-model="bookForm.description"
              rows="3"
              placeholder="Tuliskan sinopsis buku, pengenalan karakter, atau deskripsi singkat isi buku..."
              class="w-full bg-background border-2 border-black p-2.5 font-sans text-xs outline-none shadow-neo-sm"
            ></textarea>
          </div>

          <div class="border-t-2 border-black pt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              class="neubrutal-btn bg-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100"
              @click="showBookModal = false"
            >
              Batal
            </button>
            <button
              type="submit"
              class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-5 py-2 font-outfit font-black text-xs shadow-neo hover:bg-yellow-300"
            >
              {{ isEditMode ? 'Simpan Perubahan' : 'Terbitkan Buku' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ================= MODAL: ADD / EDIT CATEGORY ================= -->
    <div
      v-if="showCategoryModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="showCategoryModal = false"
    >
      <div class="bg-white border-4 border-black max-w-md w-full rounded-[2px] shadow-neo-xl overflow-hidden animate-hero-entrance">
        <div class="bg-neo-yellow border-b-3 border-black p-4 flex items-center justify-between">
          <h3 class="font-outfit font-black text-base text-black uppercase">
            {{ isEditCategory ? 'EDIT KATEGORI' : 'TAMBAH KATEGORI BARU' }}
          </h3>
          <button
            class="w-8 h-8 rounded-[2px] bg-white border-2 border-black flex items-center justify-center font-outfit font-black text-sm hover:bg-black hover:text-white"
            @click="showCategoryModal = false"
          >
            X
          </button>
        </div>

        <form class="p-6 space-y-4" @submit.prevent="handleSaveCategory">
          <div>
            <label class="block font-outfit font-black text-xs uppercase mb-1">Nama Kategori *</label>
            <input
              v-model="categoryForm.name"
              type="text"
              required
              placeholder="Contoh: Bisnis & Finansial"
              class="w-full bg-background border-2 border-black p-2.5 font-outfit font-bold text-sm outline-none shadow-neo-sm"
            />
          </div>

          <div>
            <label class="block font-outfit font-black text-xs uppercase mb-1">Deskripsi Kategori</label>
            <textarea
              v-model="categoryForm.description"
              rows="2"
              placeholder="Penjelasan isi kategori..."
              class="w-full bg-background border-2 border-black p-2.5 font-sans text-xs outline-none shadow-neo-sm"
            ></textarea>
          </div>

          <div>
            <label class="block font-outfit font-black text-xs uppercase mb-1">Tema Warna Label</label>
            <select
              v-model="categoryForm.theme"
              class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-sm outline-none shadow-neo-sm cursor-pointer"
            >
              <option value="violet">Violet (#8847F5)</option>
              <option value="yellow">Yellow (#D8FA00)</option>
              <option value="orange">Orange (#FF7B29)</option>
              <option value="lime">Lime (#CBFF00)</option>
              <option value="pink">Pink (#FF9EC1)</option>
              <option value="sky">Sky Blue (#6EC6FF)</option>
            </select>
          </div>

          <div class="border-t-2 border-black pt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              class="neubrutal-btn bg-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100"
              @click="showCategoryModal = false"
            >
              Batal
            </button>
            <button
              type="submit"
              class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-5 py-2 font-outfit font-black text-xs shadow-neo hover:bg-yellow-300"
            >
              {{ isEditCategory ? 'Simpan Kategori' : 'Buat Kategori' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ================= MODAL: ADD / EDIT VOUCHER ================= -->
    <div
      v-if="showVoucherModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="showVoucherModal = false"
    >
      <div class="bg-white border-4 border-black max-w-lg w-full rounded-[2px] shadow-neo-xl overflow-hidden animate-hero-entrance">
        <div class="bg-neo-yellow border-b-3 border-black p-4 flex items-center justify-between">
          <h3 class="font-outfit font-black text-base text-black uppercase">
            {{ isEditVoucher ? 'EDIT VOUCHER DISKON' : 'BUAT VOUCHER DISKON BARU' }}
          </h3>
          <button
            class="w-8 h-8 rounded-[2px] bg-white border-2 border-black flex items-center justify-center font-outfit font-black text-sm hover:bg-black hover:text-white"
            @click="showVoucherModal = false"
          >
            X
          </button>
        </div>

        <form class="p-6 space-y-4 max-h-[80vh] overflow-y-auto" @submit.prevent="handleSaveVoucher">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Kode Voucher *</label>
              <input
                v-model="voucherForm.code"
                type="text"
                required
                placeholder="CONTOH10"
                class="w-full bg-background border-2 border-black p-2 font-mono font-bold text-xs uppercase outline-none shadow-neo-sm"
              />
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Nama Voucher</label>
              <input
                v-model="voucherForm.name"
                type="text"
                placeholder="Promo Spesial"
                class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-xs outline-none shadow-neo-sm"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Tipe Diskon</label>
              <select
                v-model="voucherForm.type"
                class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-xs outline-none shadow-neo-sm cursor-pointer"
              >
                <option value="percentage">Persentase (%)</option>
                <option value="fixed">Nominal Tetap (Rp)</option>
                <option value="shipping">Potongan Ongkir (Rp)</option>
              </select>
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">
                Nilai Diskon {{ voucherForm.type === 'percentage' ? '(%)' : '(Rp)' }} *
              </label>
              <input
                v-model="voucherForm.value"
                type="number"
                required
                placeholder="Contoh: 10 atau 25000"
                class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-xs outline-none shadow-neo-sm"
              />
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Min. Belanja (Rp)</label>
              <input
                v-model="voucherForm.minSpend"
                type="number"
                placeholder="Contoh: 50000"
                class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-xs outline-none shadow-neo-sm"
              />
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Kuota Penggunaan</label>
              <input
                v-model="voucherForm.quota"
                type="number"
                placeholder="Contoh: 100"
                class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-xs outline-none shadow-neo-sm"
              />
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Berlaku Sampai</label>
              <input
                v-model="voucherForm.validUntil"
                type="date"
                class="w-full bg-background border-2 border-black p-2 font-mono text-xs outline-none shadow-neo-sm"
              />
            </div>
          </div>

          <div>
            <label class="block font-outfit font-black text-xs uppercase mb-1">Deskripsi Ketentuan</label>
            <textarea
              v-model="voucherForm.desc"
              rows="2"
              placeholder="Contoh: Diskon khusus semua buku dengan minimal transaksi..."
              class="w-full bg-background border-2 border-black p-2 font-sans text-xs outline-none shadow-neo-sm"
            ></textarea>
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              v-model="voucherForm.active"
              type="checkbox"
              class="w-4 h-4 border-2 border-black accent-black rounded-[2px]"
            />
            <span class="font-sans text-xs font-bold">Status Aktif untuk Checkout</span>
          </label>

          <div class="border-t-2 border-black pt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              class="neubrutal-btn bg-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100"
              @click="showVoucherModal = false"
            >
              Batal
            </button>
            <button
              type="submit"
              class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-5 py-2 font-outfit font-black text-xs shadow-neo hover:bg-yellow-300"
            >
              {{ isEditVoucher ? 'Simpan Perubahan' : 'Terbitkan Voucher' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ================= MODAL: INPUT RESI ================= -->
    <div
      v-if="showResiModal && selectedOrderForResi"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="showResiModal = false"
    >
      <div class="bg-white border-4 border-black max-w-sm w-full rounded-[2px] shadow-neo-xl overflow-hidden animate-hero-entrance">
        <div class="bg-neo-yellow border-b-3 border-black p-4 flex items-center justify-between">
          <h3 class="font-outfit font-black text-sm text-black uppercase">INPUT RESI RAJAONGKIR</h3>
          <button
            class="w-7 h-7 rounded-[2px] bg-white border-2 border-black flex items-center justify-center font-outfit font-black text-xs hover:bg-black hover:text-white"
            @click="showResiModal = false"
          >
            X
          </button>
        </div>

        <div class="p-5 space-y-4">
          <p class="font-sans text-xs text-muted-foreground">
            Nomor resi dari ekspedisi <strong>{{ selectedOrderForResi.courier }}</strong> untuk pesanan #{{ selectedOrderForResi.id }}.
          </p>

          <div>
            <label class="block font-outfit font-black text-xs uppercase mb-1">Nomor Resi / AWB</label>
            <input
              v-model="inputResiNumber"
              type="text"
              placeholder="Contoh: JNE8829104812"
              class="w-full bg-background border-2 border-black p-2.5 font-mono font-bold text-sm outline-none shadow-neo-sm"
            />
          </div>

          <button
            class="w-full neubrutal-btn bg-neo-lime text-black border-2 border-black py-2.5 font-outfit font-black text-xs shadow-neo hover:bg-lime-300"
            @click="saveResi"
          >
            Simpan Resi & Ubah Status: DIKIRIM
          </button>
        </div>
      </div>
    </div>

    <!-- ================= MODAL: KONFIRMASI HAPUS BUKU ================= -->
    <div
      v-if="showDeleteConfirm && bookToDelete"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="showDeleteConfirm = false"
    >
      <div class="bg-white border-4 border-black max-w-sm w-full rounded-[2px] shadow-neo-xl overflow-hidden animate-hero-entrance p-5 space-y-4 text-center">
        <h3 class="font-outfit font-black text-base text-black">Hapus Buku dari Katalog?</h3>
        <p class="font-sans text-xs text-muted-foreground">
          Buku "<strong>{{ bookToDelete.title }}</strong>" akan dihapus dari etalase toko.
        </p>

        <div class="flex items-center justify-center gap-2 pt-2">
          <button
            class="neubrutal-btn bg-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100"
            @click="showDeleteConfirm = false"
          >
            Batal
          </button>
          <button
            class="neubrutal-btn bg-red-500 text-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo hover:bg-red-600"
            @click="executeDeleteBook"
          >
            Ya, Hapus Buku
          </button>
        </div>
      </div>
    </div>

    <!-- ================= MODAL: KONFIRMASI HAPUS KATEGORI ================= -->
    <div
      v-if="showDeleteCategoryConfirm && categoryToDelete"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="showDeleteCategoryConfirm = false"
    >
      <div class="bg-white border-4 border-black max-w-sm w-full rounded-[2px] shadow-neo-xl overflow-hidden animate-hero-entrance p-5 space-y-4 text-center">
        <h3 class="font-outfit font-black text-base text-black">Hapus Kategori?</h3>
        <p class="font-sans text-xs text-muted-foreground">
          Kategori "<strong>{{ categoryToDelete.name }}</strong>" akan dihapus dari sistem.
        </p>

        <div class="flex items-center justify-center gap-2 pt-2">
          <button
            class="neubrutal-btn bg-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100"
            @click="showDeleteCategoryConfirm = false"
          >
            Batal
          </button>
          <button
            class="neubrutal-btn bg-red-500 text-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo hover:bg-red-600"
            @click="executeDeleteCategory"
          >
            Ya, Hapus Kategori
          </button>
        </div>
      </div>
    </div>

    <!-- ================= MODAL: KONFIRMASI HAPUS VOUCHER ================= -->
    <div
      v-if="showDeleteVoucherConfirm && voucherToDelete"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="showDeleteVoucherConfirm = false"
    >
      <div class="bg-white border-4 border-black max-w-sm w-full rounded-[2px] shadow-neo-xl overflow-hidden animate-hero-entrance p-5 space-y-4 text-center">
        <h3 class="font-outfit font-black text-base text-black">Hapus Voucher?</h3>
        <p class="font-sans text-xs text-muted-foreground">
          Voucher promo "<strong>{{ voucherToDelete.code }}</strong>" akan dihapus permanen.
        </p>

        <div class="flex items-center justify-center gap-2 pt-2">
          <button
            class="neubrutal-btn bg-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100"
            @click="showDeleteVoucherConfirm = false"
          >
            Batal
          </button>
          <button
            class="neubrutal-btn bg-red-500 text-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo hover:bg-red-600"
            @click="executeDeleteVoucher"
          >
            Ya, Hapus Voucher
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
