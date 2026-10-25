<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useStore } from '@/composables/useStore'
import { api } from '@/lib/api'
import { mapBook } from '@/lib/mappers'
import { assetUrl } from '@/lib/assets'
import { shippingLabel, ensureCourierCatalog } from '@/lib/shipping'
import { localizeApiError } from '@/lib/errors'
import StatusBadge from '@/components/StatusBadge.vue'
import BookCover from '@/components/BookCover.vue'

const { showToast, loadCategories, loadBooks } = useStore()

const busy = ref({})
const isBusy = (key) => Boolean(busy.value[key])
const setBusy = (key, value) => {
  busy.value = { ...busy.value, [key]: value }
}

function apiErrorText(error, fallback) {
  return localizeApiError(error?.message, error?.status) || fallback
}

const activeTab = ref('overview') // 'overview' | 'books' | 'categories' | 'people' | 'vouchers' | 'orders' | 'customers' | 'payments'

function formatRupiah(val) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(val || 0)
}

const adminBooks = ref([])
const adminCategories = ref([])
const adminAuthors = ref([])
const adminPublishers = ref([])
const adminDiscounts = ref([])
const adminReport = ref(null)
const adminLoading = ref(true)
const reportLoading = ref(false)
const failedBookCovers = ref({})

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(date)
}

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
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
  }
}

async function loadAdminBooks() {
  const response = await api.books({ per_page: 100, is_active: 'all' })
  adminBooks.value = (response.data || []).map(mapAdminBook)
}

async function loadAdminCategories() {
  const response = await api.categories()
  adminCategories.value = response.data || []
}

async function loadAdminAuthors() {
  const response = await api.authors({ per_page: 100 })
  adminAuthors.value = response.data || []
}

async function loadAdminPublishers() {
  const response = await api.publishers({ per_page: 100 })
  adminPublishers.value = response.data || []
}

async function loadAdminDiscounts() {
  const response = await api.discounts({ per_page: 100 })
  adminDiscounts.value = response.data || []
}

// /reports powers the KPIs, chart, and per-user totals, while the orders tab
// reads the paginated /orders/all endpoint.
// shortcut: /reports has no pagination; revisit when the totals stop fitting
// in one response.
const reportOrders = computed(() =>
  (adminReport.value?.orders || [])
    .map((order) => ({
      id: order.invoice_number,
      invoice: order.invoice_number,
      rawStatus: order.status,
      customerName: order.customer_name || '—',
      customerEmail: order.customer_email || '',
      total: Number(order.total_amount) || 0,
      totalQuantity: Number(order.total_quantity) || 0,
      paymentMethod: order.payment_method || '—',
      date: formatDate(order.created_at),
      createdAt: order.created_at,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
)

async function loadAdminReport() {
  reportLoading.value = true
  try {
    const response = await api.report({ status: 'all' })
    adminReport.value = response.data
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal memuat laporan'), { type: 'error' })
  } finally {
    reportLoading.value = false
  }
}

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

// Weekly sales data: seven WIB calendar days, zero-filled.
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

const bookSearch = ref('')
const selectedCategory = ref('all')
const bookSort = ref('newest')

const filteredBooks = computed(() => {
  return adminBooks.value
    .filter((book) => {
      const matchCat = selectedCategory.value === 'all' || book.category === selectedCategory.value
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
  authorId: '',
  categoryId: '',
  publisherId: '',
  price: 89000,
  originalPrice: 120000,
  stock: 15,
  weightGrams: 300,
  coverImage: '',
  isbn: '',
  description: '',
  pages: 100,
  publicationYear: new Date().getFullYear(),
  language: 'Indonesia',
  length: 20,
  width: 13,
  height: 2,
  condition: '100% Baru & Segel Penerbit',
  isActive: true,
})
const uploadingCover = ref(false)
const draftCover = ref(null)

async function discardDraftCover() {
  const draft = draftCover.value
  draftCover.value = null
  if (!draft?.key) return
  try {
    await api.deleteUpload({ file_key: draft.key })
  } catch {
    // An orphaned upload only wastes storage; the form stays usable.
  }
}

async function processImageFile(file) {
  if (!file) return
  if (!file.type.startsWith('image/')) {
    showToast('Harap pilih berkas gambar yang valid (JPG, PNG, WebP).', { type: 'error' })
    return
  }
  uploadingCover.value = true
  const previousDraft = draftCover.value
  draftCover.value = null
  try {
    const response = await api.uploadImage(file, 'covers')
    const data = response.data || {}
    bookForm.value.coverImage = data.file_url || ''
    draftCover.value = { url: data.file_url || '', key: data.file_key || '' }
    if (previousDraft?.key && previousDraft.url !== bookForm.value.coverImage) {
      api.deleteUpload({ file_key: previousDraft.key }).catch(() => {})
    }
    showToast('Gambar sampul berhasil diunggah.', { type: 'success' })
  } catch (error) {
    draftCover.value = previousDraft
    showToast(apiErrorText(error, 'Gagal mengunggah gambar'), { type: 'error' })
  } finally {
    uploadingCover.value = false
  }
}

function handleImageUpload(e) {
  const file = e.target.files?.[0]
  processImageFile(file)
}

function handleDrop(e) {
  const file = e.dataTransfer?.files?.[0]
  processImageFile(file)
}

async function removeCoverImage() {
  const draft = draftCover.value
  bookForm.value.coverImage = ''
  draftCover.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
  if (draft?.key) {
    try {
      await api.deleteUpload({ file_key: draft.key })
    } catch {
      // The file may already be gone; clearing the form is what matters.
    }
  }
}

function closeBookModal() {
  discardDraftCover()
  showBookModal.value = false
}

function openAddBook() {
  discardDraftCover()
  isEditMode.value = false
  currentBookId.value = null
  bookForm.value = {
    title: '',
    subtitle: '',
    authorId: adminAuthors.value[0]?.id || '',
    categoryId: adminCategories.value[0]?.id || '',
    publisherId: adminPublishers.value[0]?.id || '',
    price: 89000,
    originalPrice: 120000,
    stock: 15,
    weightGrams: 300,
    coverImage: '',
    isbn: '',
    description: '',
    pages: 100,
    publicationYear: new Date().getFullYear(),
    language: 'Indonesia',
    length: 20,
    width: 13,
    height: 2,
    condition: '100% Baru & Segel Penerbit',
    isActive: true,
  }
  if (fileInputRef.value) fileInputRef.value.value = ''
  showBookModal.value = true
}

async function openEditBook(book) {
  discardDraftCover()
  let detail = book
  if (book.slug) {
    try {
      const response = await api.book(book.slug)
      if (response.data) detail = mapAdminBook(response.data)
    } catch {
      // Fall back to the list payload; the form still validates required fields.
    }
  }
  isEditMode.value = true
  currentBookId.value = detail.rawId || detail.id
  bookForm.value = {
    title: detail.title || '',
    subtitle: detail.subtitle || '',
    authorId: detail.authorId || adminAuthors.value[0]?.id || '',
    categoryId: detail.categoryId || adminCategories.value[0]?.id || '',
    publisherId: detail.publisherId || adminPublishers.value[0]?.id || '',
    price: detail.price || 0,
    originalPrice: detail.originalPrice || detail.price || 0,
    stock: detail.stock ?? 0,
    weightGrams: detail.weightGrams || 300,
    coverImage: detail.coverImage || '',
    isbn: detail.isbn || '',
    description: detail.description || '',
    pages: detail.pages || 1,
    publicationYear: detail.publicationYear || new Date().getFullYear(),
    language: detail.language || 'Indonesia',
    length: detail.length || 1,
    width: detail.width || 1,
    height: detail.height || 1,
    condition: detail.condition || '100% Baru & Segel Penerbit',
    isActive: detail.isActive !== false,
  }
  if (fileInputRef.value) fileInputRef.value.value = ''
  showBookModal.value = true
}

async function handleSaveBook() {
  if (
    !bookForm.value.title ||
    !bookForm.value.categoryId ||
    !bookForm.value.authorId ||
    !bookForm.value.publisherId ||
    !bookForm.value.isbn ||
    !bookForm.value.description ||
    !bookForm.value.coverImage
  ) {
    showToast('Lengkapi judul, ISBN, kategori, penulis, penerbit, sinopsis, dan cover.', {
      type: 'error',
    })
    return
  }

  const payload = {
    category_id: Number(bookForm.value.categoryId),
    author_id: Number(bookForm.value.authorId),
    publisher_id: Number(bookForm.value.publisherId),
    title: bookForm.value.title.trim(),
    isbn: bookForm.value.isbn.trim(),
    synopsis: bookForm.value.description.trim(),
    price: Number(bookForm.value.price) || 0,
    original_price: Number(bookForm.value.originalPrice) || Number(bookForm.value.price) || 0,
    discount_percentage: Math.max(
      0,
      Math.min(
        100,
        Number(bookForm.value.discountPercentage) ||
          Math.round(
            ((Number(bookForm.value.originalPrice) - Number(bookForm.value.price)) /
              Number(bookForm.value.originalPrice || 1)) *
              100,
          ),
      ),
    ),
    weight_grams: Number(bookForm.value.weightGrams) || 300,
    pages: Number(bookForm.value.pages) || 1,
    publication_year: Number(bookForm.value.publicationYear) || new Date().getFullYear(),
    language: bookForm.value.language || 'Indonesia',
    length: Number(bookForm.value.length) || 1,
    width: Number(bookForm.value.width) || 1,
    height: Number(bookForm.value.height) || 1,
    condition: bookForm.value.condition || '100% Baru & Segel Penerbit',
    stock: Number(bookForm.value.stock) || 0,
    cover_image: bookForm.value.coverImage,
    is_active: bookForm.value.isActive !== false,
  }

  try {
    setBusy('book-save', true)
    if (isEditMode.value && currentBookId.value) {
      await api.updateBook(currentBookId.value, payload)
      showToast('Buku berhasil diperbarui.', { type: 'success' })
    } else {
      await api.createBook(payload)
      showToast('Buku berhasil ditambahkan.', { type: 'success' })
    }
    await Promise.all([loadAdminBooks(), loadAdminReport(), loadCategories(), loadBooks()])
    draftCover.value = null
    showBookModal.value = false
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal menyimpan buku'), { type: 'error' })
  } finally {
    setBusy('book-save', false)
  }
}

const bookToDelete = ref(null)
const showDeleteConfirm = ref(false)

function confirmDeleteBook(book) {
  bookToDelete.value = book
  showDeleteConfirm.value = true
}

async function executeDeleteBook() {
  if (!bookToDelete.value || isBusy('book-delete')) return
  setBusy('book-delete', true)
  try {
    await api.deleteBook(bookToDelete.value.rawId || bookToDelete.value.id)
    await Promise.all([loadAdminBooks(), loadAdminReport(), loadCategories(), loadBooks()])
    showToast('Buku berhasil dihapus.', { type: 'info' })
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal menghapus buku'), { type: 'error' })
  } finally {
    setBusy('book-delete', false)
    showDeleteConfirm.value = false
    bookToDelete.value = null
  }
}

async function updateBookStock(bookId, amount) {
  const book = adminBooks.value.find(
    (item) => String(item.rawId) === String(bookId) || String(item.id) === String(bookId),
  )
  if (!book || isBusy(`stock-${bookId}`)) return
  setBusy(`stock-${bookId}`, true)
  try {
    // The lean admin list omits ISBN/synopsis, which the update endpoint requires.
    let source = book
    if (book.slug) {
      try {
        const response = await api.book(book.slug)
        if (response.data) source = mapAdminBook(response.data)
      } catch {
        // Fall back to the list payload when the detail request fails.
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

const showCategoryModal = ref(false)
const isEditCategory = ref(false)
const currentCategoryId = ref(null)
const categoryImageInput = ref(null)
const uploadingCategoryImage = ref(false)
const categoryDraftImage = ref(null)

const categoryForm = ref({
  name: '',
  imageUrl: '',
})

async function discardCategoryDraft() {
  const draft = categoryDraftImage.value
  categoryDraftImage.value = null
  if (!draft?.key) return
  try {
    await api.deleteUpload({ file_key: draft.key })
  } catch {
    // An orphaned upload only wastes storage.
  }
}

function closeCategoryModal() {
  discardCategoryDraft()
  showCategoryModal.value = false
}

async function processCategoryImage(file) {
  if (!file) return
  if (!file.type.startsWith('image/')) {
    showToast('Harap pilih berkas gambar yang valid (JPG, PNG, WebP).', { type: 'error' })
    return
  }

  uploadingCategoryImage.value = true
  const previousDraft = categoryDraftImage.value
  categoryDraftImage.value = null
  try {
    const response = await api.uploadImage(file, 'categories')
    const data = response.data || {}
    categoryForm.value.imageUrl = data.file_url || ''
    categoryDraftImage.value = { url: data.file_url || '', key: data.file_key || '' }
    if (previousDraft?.key && previousDraft.url !== categoryForm.value.imageUrl) {
      api.deleteUpload({ file_key: previousDraft.key }).catch(() => {})
    }
    showToast('Gambar kategori berhasil diunggah.', { type: 'success' })
  } catch (error) {
    categoryDraftImage.value = previousDraft
    showToast(apiErrorText(error, 'Gagal mengunggah gambar'), { type: 'error' })
  } finally {
    uploadingCategoryImage.value = false
  }
}

function handleCategoryImageChange(event) {
  const file = event.target.files?.[0]
  processCategoryImage(file)
}

async function removeCategoryImage() {
  const draft = categoryDraftImage.value
  categoryForm.value.imageUrl = ''
  categoryDraftImage.value = null
  if (categoryImageInput.value) categoryImageInput.value.value = ''
  if (draft?.key) {
    try {
      await api.deleteUpload({ file_key: draft.key })
    } catch {
      // The file may already be gone.
    }
  }
}

function openAddCategory() {
  isEditCategory.value = false
  currentCategoryId.value = null
  categoryDraftImage.value = null
  categoryForm.value = { name: '', imageUrl: '' }
  if (categoryImageInput.value) categoryImageInput.value.value = ''
  showCategoryModal.value = true
}

function openEditCategory(cat) {
  isEditCategory.value = true
  currentCategoryId.value = cat.id
  categoryDraftImage.value = null
  categoryForm.value = {
    name: cat.name || '',
    imageUrl: cat.image_url || '',
  }
  if (categoryImageInput.value) categoryImageInput.value.value = ''
  showCategoryModal.value = true
}

async function handleSaveCategory() {
  if (!categoryForm.value.name.trim()) {
    showToast('Nama kategori tidak boleh kosong.', { type: 'error' })
    return
  }

  const imageUrl = categoryForm.value.imageUrl.trim()
  const payload = {
    name: categoryForm.value.name.trim(),
    image_url: imageUrl || null,
  }

  try {
    setBusy('category-save', true)
    if (isEditCategory.value && currentCategoryId.value) {
      await api.updateCategory(currentCategoryId.value, payload)
      showToast('Kategori berhasil diperbarui.', { type: 'success' })
    } else {
      await api.createCategory(payload)
      showToast('Kategori berhasil ditambahkan.', { type: 'success' })
    }
    await Promise.all([loadAdminCategories(), loadAdminBooks(), loadCategories(), loadBooks()])
    categoryDraftImage.value = null
    showCategoryModal.value = false
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal menyimpan kategori'), { type: 'error' })
  } finally {
    setBusy('category-save', false)
  }
}

const categoryToDelete = ref(null)
const showDeleteCategoryConfirm = ref(false)

function confirmDeleteCategory(cat) {
  categoryToDelete.value = cat
  showDeleteCategoryConfirm.value = true
}

async function executeDeleteCategory() {
  if (!categoryToDelete.value || isBusy('category-delete')) return
  setBusy('category-delete', true)
  try {
    await api.deleteCategory(categoryToDelete.value.id)
    await Promise.all([loadAdminCategories(), loadAdminBooks(), loadCategories(), loadBooks()])
    showToast('Kategori berhasil dihapus.', { type: 'info' })
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal menghapus kategori'), { type: 'error' })
  } finally {
    setBusy('category-delete', false)
    showDeleteCategoryConfirm.value = false
    categoryToDelete.value = null
  }
}

const showVoucherModal = ref(false)
const isEditVoucher = ref(false)
const currentVoucherId = ref(null)

function dateInputValue(daysAhead = 0) {
  const date = new Date()
  date.setDate(date.getDate() + daysAhead)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function mapVoucherTier(tier = {}) {
  return {
    minSpend: Number(tier.min_spend) || 0,
    rewardType: String(tier.reward_type || 'FIXED').toLowerCase(),
    rewardValue: Number(tier.reward_value) || 0,
    maxReward:
      tier.max_reward === null || tier.max_reward === undefined ? '' : Number(tier.max_reward),
  }
}

function mapVoucher(discount) {
  return {
    id: discount.id,
    code: discount.code || '',
    name: discount.name || '',
    type: String(discount.discount_type || 'PERCENTAGE').toLowerCase(),
    rawType: String(discount.discount_type || 'PERCENTAGE').toUpperCase(),
    value: Number(discount.discount_value) || 0,
    minSpend: Number(discount.min_purchase) || 0,
    quota: Number(discount.quota) || 0,
    used: Number(discount.used_count) || 0,
    startDate: discount.start_date ? String(discount.start_date).slice(0, 10) : '',
    validUntil: discount.end_date ? String(discount.end_date).slice(0, 10) : '',
    active: discount.is_active !== false,
    desc: discount.description || '',
    tiers: Array.isArray(discount.tiers) ? discount.tiers.map(mapVoucherTier) : [],
  }
}

const adminVouchers = computed(() => adminDiscounts.value.map(mapVoucher))

function voucherTypeLabel(type) {
  if (type === 'percentage') return 'Persen'
  if (type === 'fixed') return 'Nominal Tetap'
  if (type === 'tiered') return 'Bertingkat (Up To)'
  return type
}

function voucherValueLabel(voucher) {
  if (voucher.type === 'tiered') return `Up To ${voucher.value}%`
  return voucher.type === 'percentage' ? `${voucher.value}%` : formatRupiah(voucher.value)
}

function voucherTierPayload(tiers = []) {
  return tiers.map((tier) => ({
    min_spend: Number(tier.minSpend) || 0,
    reward_type: tier.rewardType === 'percentage' ? 'PERCENTAGE' : 'FIXED',
    reward_value: Number(tier.rewardValue) || 0,
    max_reward:
      tier.maxReward === '' || tier.maxReward === null ? null : Number(tier.maxReward) || null,
  }))
}

function voucherTypeCode(type) {
  if (type === 'fixed') return 'FIXED'
  if (type === 'tiered') return 'TIERED'
  return 'PERCENTAGE'
}

const voucherForm = ref({
  code: '',
  name: '',
  type: 'percentage',
  value: 10,
  minSpend: 50000,
  quota: 100,
  startDate: '',
  validUntil: dateInputValue(30),
  active: true,
  desc: '',
  tiers: [],
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
    startDate: '',
    validUntil: dateInputValue(30),
    active: true,
    desc: '',
    tiers: [],
  }
  showVoucherModal.value = true
}

async function openEditVoucher(v) {
  isEditVoucher.value = true
  currentVoucherId.value = v.id
  let detail = v
  let loaded = false
  try {
    const response = await api.discount(v.id)
    if (response.data) {
      detail = mapVoucher(response.data)
      loaded = true
    }
  } catch {
    // Fall back to the list row when the detail request fails.
  }

  if (detail.type === 'tiered' && !loaded) {
    showToast('Detail voucher bertingkat gagal dimuat. Coba lagi.', { type: 'error' })
    return
  }

  voucherForm.value = {
    code: detail.code,
    name: detail.name,
    type: detail.type,
    value: detail.value,
    minSpend: detail.minSpend,
    quota: detail.quota,
    startDate: detail.startDate,
    validUntil: detail.validUntil,
    active: detail.active,
    desc: detail.desc || '',
    tiers: detail.tiers || [],
  }
  showVoucherModal.value = true
}

function addVoucherTier() {
  voucherForm.value.tiers.push({
    minSpend: 100000,
    rewardType: 'fixed',
    rewardValue: 5000,
    maxReward: '',
  })
}

function removeVoucherTier(index) {
  voucherForm.value.tiers.splice(index, 1)
}

async function handleSaveVoucher() {
  if (!voucherForm.value.code.trim() || !voucherForm.value.value) {
    showToast('Harap lengkapi kode voucher dan nilai diskon.', { type: 'error' })
    return
  }
  if (!voucherForm.value.validUntil) {
    showToast('Tentukan tanggal berakhir voucher.', { type: 'error' })
    return
  }

  const type = voucherTypeCode(voucherForm.value.type)
  const value = Number(voucherForm.value.value) || 0

  if (type !== 'FIXED' && (value < 1 || value > 100)) {
    showToast('Nilai persentase harus antara 1 dan 100.', { type: 'error' })
    return
  }
  if (type === 'TIERED') {
    if (!voucherForm.value.tiers.length) {
      showToast('Tambahkan minimal satu tier untuk voucher bertingkat.', { type: 'error' })
      return
    }
    if (voucherForm.value.tiers.some((tier) => Number(tier.rewardValue) <= 0)) {
      showToast('Nilai reward setiap tier harus lebih dari 0.', { type: 'error' })
      return
    }
  }

  const code = voucherForm.value.code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  const startDate = voucherForm.value.startDate
    ? new Date(`${voucherForm.value.startDate}T00:00:00`)
    : new Date()
  const endDate = new Date(`${voucherForm.value.validUntil}T23:59:59`)
  if (endDate.getTime() < startDate.getTime()) {
    showToast('Tanggal berakhir tidak boleh sebelum tanggal mulai.', { type: 'error' })
    return
  }

  const payload = {
    code,
    name: voucherForm.value.name.trim() || `Voucher ${code}`,
    description: voucherForm.value.desc || null,
    discount_type: type,
    discount_value: value,
    min_purchase: Number(voucherForm.value.minSpend) || 0,
    quota: Number(voucherForm.value.quota) || 0,
    is_all_books: true,
    is_active: Boolean(voucherForm.value.active),
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
  }
  if (type === 'TIERED') {
    payload.tiers = voucherTierPayload(voucherForm.value.tiers)
  }

  try {
    setBusy('voucher-save', true)
    if (isEditVoucher.value && currentVoucherId.value) {
      await api.updateDiscount(currentVoucherId.value, payload)
      showToast('Voucher berhasil diperbarui.', { type: 'success' })
    } else {
      await api.createDiscount(payload)
      showToast('Voucher berhasil ditambahkan.', { type: 'success' })
    }
    await loadAdminDiscounts()
    showVoucherModal.value = false
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal menyimpan voucher'), { type: 'error' })
  } finally {
    setBusy('voucher-save', false)
  }
}

const voucherToDelete = ref(null)
const showDeleteVoucherConfirm = ref(false)

function confirmDeleteVoucher(v) {
  voucherToDelete.value = v
  showDeleteVoucherConfirm.value = true
}

async function executeDeleteVoucher() {
  if (!voucherToDelete.value || isBusy('voucher-delete')) return
  setBusy('voucher-delete', true)
  try {
    await api.deleteDiscount(voucherToDelete.value.id)
    await loadAdminDiscounts()
    showToast('Voucher berhasil dihapus.', { type: 'info' })
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal menghapus voucher'), { type: 'error' })
  } finally {
    setBusy('voucher-delete', false)
    showDeleteVoucherConfirm.value = false
    voucherToDelete.value = null
  }
}

async function toggleVoucher(voucher) {
  const key = `voucher-toggle-${voucher.id}`
  if (isBusy(key)) return
  setBusy(key, true)
  try {
    const type = voucher.rawType || voucherTypeCode(voucher.type)
    const payload = {
      code: voucher.code,
      name: voucher.name,
      description: voucher.desc || null,
      discount_type: type,
      discount_value: Number(voucher.value) || 0,
      min_purchase: Number(voucher.minSpend) || 0,
      quota: Number(voucher.quota) || 0,
      is_all_books: true,
      is_active: !voucher.active,
      start_date: voucher.startDate
        ? new Date(`${voucher.startDate}T00:00:00`).toISOString()
        : new Date().toISOString(),
      end_date: new Date(`${voucher.validUntil}T23:59:59`).toISOString(),
    }
    if (type === 'TIERED') {
      payload.tiers = voucherTierPayload(voucher.tiers)
    }

    await api.updateDiscount(voucher.id, payload)
    await loadAdminDiscounts()
    showToast('Status voucher diperbarui.', { type: 'success' })
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal mengubah status voucher'), { type: 'error' })
  } finally {
    setBusy(key, false)
  }
}

const orderSearch = ref('')
const orderStatusFilter = ref('all')
const orderSortFilter = ref('newest')
const adminOrderRows = ref([])
const adminOrdersLoading = ref(false)
const adminOrderPage = ref(1)
const adminOrdersMeta = ref({
  current_page: 1,
  per_page: 10,
  total_items: 0,
  total_pages: 1,
})
const adminOrderDetail = ref(null)
const adminOrderDetailLoading = ref(false)
const showAdminOrderModal = ref(false)
let orderSearchTimer = null

function mapAdminOrderRow(raw = {}) {
  return {
    id: raw.invoice_number,
    invoice: raw.invoice_number,
    rawStatus: raw.status,
    customerName: raw.customer?.name || '—',
    customerEmail: raw.customer?.email || '',
    total: Number(raw.total_amount) || 0,
    totalQuantity: Number(raw.total_quantity) || 0,
    paymentMethod: raw.payment_method || '—',
    date: formatDate(raw.created_at),
    createdAt: raw.created_at,
  }
}

async function loadAdminOrders() {
  adminOrdersLoading.value = true
  try {
    const params = {
      page: adminOrderPage.value,
      per_page: 10,
      sort_by: orderSortFilter.value === 'newest' ? 'created_at' : 'total_amount',
      sort_order: orderSortFilter.value === 'total-low' ? 'asc' : 'desc',
    }
    if (orderStatusFilter.value !== 'all') params.status = orderStatusFilter.value
    const keyword = orderSearch.value.trim()
    if (keyword) params.search = keyword

    const response = await api.adminOrders(params)
    adminOrderRows.value = (response.data || []).map(mapAdminOrderRow)
    const meta = response.meta || {}
    adminOrdersMeta.value = {
      current_page: Number(meta.current_page) || 1,
      per_page: Number(meta.per_page) || 10,
      total_items: Number(meta.total_items) || adminOrderRows.value.length,
      total_pages: Math.max(1, Number(meta.total_pages) || 1),
    }
  } catch (error) {
    adminOrderRows.value = []
    showToast(apiErrorText(error, 'Gagal memuat daftar pesanan'), { type: 'error' })
  } finally {
    adminOrdersLoading.value = false
  }
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

function changeAdminOrderPage(delta) {
  const next = adminOrderPage.value + delta
  if (next < 1 || next > adminOrdersMeta.value.total_pages) return
  adminOrderPage.value = next
}

function resetAdminOrderPage() {
  if (adminOrderPage.value !== 1) {
    adminOrderPage.value = 1
  } else {
    loadAdminOrders()
  }
}

watch(orderSearch, () => {
  clearTimeout(orderSearchTimer)
  orderSearchTimer = setTimeout(resetAdminOrderPage, 350)
})

watch([orderStatusFilter, orderSortFilter], resetAdminOrderPage)

watch(adminOrderPage, loadAdminOrders)

onUnmounted(() => clearTimeout(orderSearchTimer))

async function fulfillOrder(order) {
  const invoice = order.invoice || order.id
  const key = `dispatch-${invoice}`
  if (isBusy(key)) return
  setBusy(key, true)
  try {
    await api.fulfillOrder(invoice, 'Diproses dari dashboard admin')
    await Promise.all([loadAdminReport(), loadAdminOrders()])
    showToast('Pesanan berhasil didispatch ke kurir.', { type: 'success' })
  } catch (error) {
    const message = String(error?.message || '')
    showToast(
      /already (processed|fulfilled)/i.test(message)
        ? 'Pesanan ini sudah pernah didispatch.'
        : message || 'Gagal dispatch pesanan',
      { type: 'error' },
    )
  } finally {
    setBusy(key, false)
  }
}

async function returnOrder(order) {
  const invoice = order.invoice || order.id
  const key = `return-${invoice}`
  if (isBusy(key)) return
  setBusy(key, true)
  try {
    await api.returnOrder(invoice, 'Retur dari dashboard admin')
    await Promise.all([loadAdminReport(), loadAdminOrders()])
    showToast('Retur pesanan berhasil diproses.', { type: 'success' })
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

const paymentMethods = ref([])
const paymentMethodsLoading = ref(false)
const showPaymentModal = ref(false)
const savingPayment = ref(false)
const uploadingPaymentLogo = ref(false)
const currentPaymentId = ref(null)
const currentPaymentImage = ref('')
const paymentDraftLogo = ref(null)
const paymentLogoInput = ref(null)

const paymentForm = ref({
  code: '',
  name: '',
  category: '',
  description: '',
  image: '',
  feeType: 'fixed',
  feeAmount: 0,
  feePercent: 0,
  isActive: true,
  instructions: [],
})

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function instructionTextToHtml(value) {
  const items = String(value || '')
    .split('\n')
    .map((step) => step.trim())
    .filter(Boolean)
    .map((step) => `<li><p>${escapeHtml(step)}</p></li>`)
    .join('')
  return items ? `<ol>${items}</ol>` : ''
}

function instructionHtmlToText(html) {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(String(html), 'text/html')
  const items = Array.from(doc.querySelectorAll('li')).map((node) =>
    node.textContent.replace(/\s+/g, ' ').trim(),
  )
  const fallback = Array.from(doc.querySelectorAll('p')).map((node) =>
    node.textContent.replace(/\s+/g, ' ').trim(),
  )
  return (items.length ? items : fallback).filter(Boolean).join('\n')
}

function paymentFeeText(method) {
  if (method.fee_type === 'percentage') {
    const percent = Number((Number(method.fee_percent) * 100).toFixed(2))
    return `${percent}%`
  }
  return formatRupiah(Number(method.fee_amount) || 0)
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

async function discardPaymentDraftLogo() {
  const draft = paymentDraftLogo.value
  paymentDraftLogo.value = null
  if (!draft?.key) return
  try {
    await api.deleteUpload({ file_key: draft.key })
  } catch {
    // An orphaned upload only wastes storage.
  }
}

async function processPaymentLogo(file) {
  if (!file) return
  if (!file.type.startsWith('image/')) {
    showToast('Harap pilih berkas gambar yang valid (JPG, PNG, WebP).', { type: 'error' })
    return
  }
  uploadingPaymentLogo.value = true
  const previousDraft = paymentDraftLogo.value
  paymentDraftLogo.value = null
  try {
    const response = await api.uploadImage(file, 'payments')
    const data = response.data || {}
    paymentForm.value.image = data.file_url || ''
    paymentDraftLogo.value = { url: data.file_url || '', key: data.file_key || '' }
    if (previousDraft?.key && previousDraft.url !== paymentForm.value.image) {
      api.deleteUpload({ file_key: previousDraft.key }).catch(() => {})
    }
    showToast('Logo pembayaran berhasil diunggah.', { type: 'success' })
  } catch (error) {
    paymentDraftLogo.value = previousDraft
    showToast(apiErrorText(error, 'Gagal mengunggah logo'), { type: 'error' })
  } finally {
    uploadingPaymentLogo.value = false
  }
}

function handlePaymentLogoChange(event) {
  const file = event.target.files?.[0]
  processPaymentLogo(file)
}

async function removePaymentLogo() {
  const draft = paymentDraftLogo.value
  paymentForm.value.image = ''
  paymentDraftLogo.value = null
  if (paymentLogoInput.value) paymentLogoInput.value.value = ''
  if (draft?.key) {
    try {
      await api.deleteUpload({ file_key: draft.key })
    } catch {
      // The file may already be gone.
    }
  }
}

async function openEditPayment(method) {
  currentPaymentId.value = method.id
  currentPaymentImage.value = method.image || ''
  paymentDraftLogo.value = null
  paymentForm.value = {
    code: method.code || '',
    name: method.name || '',
    category: method.category || '',
    description: method.description || '',
    image: method.image || '',
    feeType: method.fee_type || 'fixed',
    feeAmount: Number(method.fee_amount) || 0,
    feePercent: Number(method.fee_percent) || 0,
    isActive: method.is_active !== false,
    instructions: [],
  }
  showPaymentModal.value = true

  try {
    const response = await api.paymentMethod(method.id)
    const detail = response.data || {}
    const instructions = (detail.instructions || []).map((section) => ({
      title: section.title || '',
      steps: instructionHtmlToText(section.content),
    }))
    currentPaymentImage.value = detail.image || currentPaymentImage.value
    paymentForm.value = {
      ...paymentForm.value,
      name: detail.name || paymentForm.value.name,
      category: detail.category || paymentForm.value.category,
      description: detail.description || '',
      image: detail.image || paymentForm.value.image,
      feeType: detail.fee_type || paymentForm.value.feeType,
      feeAmount: Number(detail.fee_amount) || 0,
      feePercent: Number(detail.fee_percent) || 0,
      isActive: detail.is_active !== false,
      instructions: instructions.length ? instructions : [{ title: '', steps: '' }],
    }
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal memuat detail metode pembayaran'), { type: 'error' })
  }
}

function addInstructionSection() {
  paymentForm.value.instructions.push({ title: '', steps: '' })
}

function closePaymentModal() {
  discardPaymentDraftLogo()
  showPaymentModal.value = false
}

function removeInstructionSection(index) {
  paymentForm.value.instructions.splice(index, 1)
}

async function handleSavePayment() {
  if (!currentPaymentId.value) return
  if (!paymentForm.value.name.trim()) {
    showToast('Nama metode pembayaran tidak boleh kosong.', { type: 'error' })
    return
  }

  savingPayment.value = true
  try {
    const instructions = paymentForm.value.instructions
      .map((section) => ({
        title: String(section.title || '').trim(),
        content: instructionTextToHtml(section.steps),
      }))
      .filter((section) => section.content)

    const payload = {
      name: paymentForm.value.name.trim(),
      category: paymentForm.value.category,
      fee_type: paymentForm.value.feeType,
      fee_amount: Number(paymentForm.value.feeAmount) || 0,
      fee_percent: Number(paymentForm.value.feePercent) || 0,
      description: paymentForm.value.description.trim(),
      instructions,
      is_active: Boolean(paymentForm.value.isActive),
    }
    if (paymentForm.value.image !== currentPaymentImage.value) {
      payload.image = paymentForm.value.image
    }

    await api.updatePaymentMethod(currentPaymentId.value, payload)
    await loadPaymentMethods()
    paymentDraftLogo.value = null
    showPaymentModal.value = false
    showToast('Metode pembayaran berhasil diperbarui.', { type: 'success' })
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal menyimpan metode pembayaran'), { type: 'error' })
  } finally {
    savingPayment.value = false
  }
}

async function togglePayment(method) {
  const key = `payment-toggle-${method.id}`
  if (isBusy(key)) return
  setBusy(key, true)
  try {
    await api.updatePaymentMethod(method.id, { is_active: method.is_active === false })
    await loadPaymentMethods()
    showToast('Status metode pembayaran diperbarui.', { type: 'success' })
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal mengubah status metode pembayaran'), { type: 'error' })
  } finally {
    setBusy(key, false)
  }
}

const peopleTab = ref('authors')
const showPeopleModal = ref(false)
const isEditPeople = ref(false)
const currentPeopleId = ref(null)
const peopleType = ref('author')
const peopleForm = ref({ name: '', bio: '' })
const peopleToDelete = ref(null)
const showDeletePeopleConfirm = ref(false)

function openAddPeople(type) {
  peopleType.value = type
  isEditPeople.value = false
  currentPeopleId.value = null
  peopleForm.value = { name: '', bio: '' }
  showPeopleModal.value = true
}

async function openEditPeople(type, item) {
  peopleType.value = type
  isEditPeople.value = true
  currentPeopleId.value = item.id
  peopleForm.value = { name: item.name || '', bio: '' }
  showPeopleModal.value = true

  if (type === 'author' && item.slug) {
    try {
      const response = await api.author(item.slug)
      const detail = response.data || {}
      peopleForm.value = {
        name: detail.name || peopleForm.value.name,
        bio: detail.bio || '',
      }
    } catch {
      // Keep the list payload when the detail request fails.
    }
  }
}

async function handleSavePeople() {
  const name = peopleForm.value.name.trim()
  if (name.length < 2) {
    showToast('Nama minimal 2 karakter.', { type: 'error' })
    return
  }

  const payload =
    peopleType.value === 'author' ? { name, bio: peopleForm.value.bio.trim() || null } : { name }

  try {
    setBusy('people-save', true)
    if (isEditPeople.value && currentPeopleId.value) {
      if (peopleType.value === 'author') {
        await api.updateAuthor(currentPeopleId.value, payload)
      } else {
        await api.updatePublisher(currentPeopleId.value, payload)
      }
      showToast(`${peopleType.value === 'author' ? 'Penulis' : 'Penerbit'} diperbarui.`, {
        type: 'success',
      })
    } else {
      if (peopleType.value === 'author') {
        await api.createAuthor(payload)
      } else {
        await api.createPublisher(payload)
      }
      showToast(`${peopleType.value === 'author' ? 'Penulis' : 'Penerbit'} ditambahkan.`, {
        type: 'success',
      })
    }
    await Promise.all([loadAdminAuthors(), loadAdminPublishers(), loadAdminBooks()])
    showPeopleModal.value = false
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal menyimpan data'), { type: 'error' })
  } finally {
    setBusy('people-save', false)
  }
}

function confirmDeletePeople(type, item) {
  peopleToDelete.value = { type, item }
  showDeletePeopleConfirm.value = true
}

async function executeDeletePeople() {
  if (!peopleToDelete.value || isBusy('people-delete')) return
  setBusy('people-delete', true)
  const { type, item } = peopleToDelete.value
  try {
    if (type === 'author') {
      await api.deleteAuthor(item.id)
    } else {
      await api.deletePublisher(item.id)
    }
    await Promise.all([loadAdminAuthors(), loadAdminPublishers(), loadAdminBooks()])
    showToast(`${type === 'author' ? 'Penulis' : 'Penerbit'} dihapus.`, { type: 'info' })
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal menghapus data'), { type: 'error' })
  } finally {
    setBusy('people-delete', false)
    showDeletePeopleConfirm.value = false
    peopleToDelete.value = null
  }
}

const customersList = ref([])
const customersLoading = ref(false)

const activeUsersCount = computed(
  () =>
    customersList.value.filter((customer) => customer.role === 'Pembeli' && customer.isActive)
      .length,
)

const revenueStatuses = new Set(['paid', 'processing', 'shipped', 'completed'])

const userOrderStats = computed(() => {
  const map = new Map()
  for (const order of reportOrders.value) {
    const email = String(order.customerEmail || '').toLowerCase()
    if (!email) continue
    const stat = map.get(email) || { orders: 0, spent: 0 }
    stat.orders += 1
    if (revenueStatuses.has(order.rawStatus)) stat.spent += order.total
    map.set(email, stat)
  }
  return map
})

const customerRows = computed(() =>
  customersList.value.map((customer) => ({
    ...customer,
    ...(userOrderStats.value.get(String(customer.email || '').toLowerCase()) || {
      orders: 0,
      spent: 0,
    }),
  })),
)

function formatJoinDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(date)
}

async function loadCustomers() {
  customersLoading.value = true
  try {
    const response = await api.users({ per_page: 100 })
    customersList.value = (response.data || []).map((user) => ({
      id: user.id,
      name: user.name || 'Tanpa Nama',
      email: user.email || '',
      role: user.role === 'admin' ? 'Admin' : 'Pembeli',
      isActive: user.is_active !== false,
      status: user.is_active === false ? 'Nonaktif' : 'Aktif',
      joinDate: formatJoinDate(user.created_at),
    }))
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal memuat data pengguna'), { type: 'error' })
  } finally {
    customersLoading.value = false
  }
}

onMounted(async () => {
  adminLoading.value = true
  await Promise.allSettled([
    loadAdminBooks(),
    loadAdminCategories(),
    loadAdminAuthors(),
    loadAdminPublishers(),
    loadAdminDiscounts(),
    loadAdminReport(),
    loadAdminOrders(),
    loadPaymentMethods(),
    loadCustomers(),
    ensureCourierCatalog(),
  ])
  adminLoading.value = false
})
</script>

<template>
  <div class="min-h-screen bg-background py-6 sm:py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div
        v-if="adminLoading"
        class="mb-4 bg-neo-yellow border-3 border-black p-3 shadow-neo-sm flex items-center gap-2 font-outfit font-black text-xs uppercase"
      >
        <span
          class="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin"
        ></span>
        Memuat data admin...
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="bg-white border-3 border-black p-5 rounded-[2px] shadow-neo">
          <div class="flex items-center justify-between">
            <span class="font-outfit font-black text-xs uppercase text-black">Total Penjualan</span>
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
                d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6H2.25m0 0v10.5m0-10.5h16.5m0 0h1.5m0 0v10.5m0-10.5-.75.75m.75-.75-.75-.75m.75 1.5H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25h13.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25Z"
              />
            </svg>
          </div>
          <p class="font-outfit font-black text-2xl text-black mt-2">
            {{ formatRupiah(totalRevenue) }}
          </p>
          <div class="text-xs font-bold text-black mt-2">
            <span>dari {{ paidOrdersCount }} pesanan lunas</span>
          </div>
        </div>

        <div class="bg-white border-3 border-black p-5 rounded-[2px] shadow-neo">
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
          <p class="font-outfit font-black text-2xl text-black mt-2">
            {{ totalOrdersCount }} Pesanan
          </p>
          <div class="text-xs font-bold text-black mt-2">
            <span>
              {{ paidOrdersCount }} lunas · {{ waitingOrdersCount }} menunggu ·
              {{ cancelledOrdersCount }} batal/retur
            </span>
          </div>
        </div>

        <div class="bg-white border-3 border-black p-5 rounded-[2px] shadow-neo">
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
          <p class="font-outfit font-black text-2xl text-black mt-2">
            {{ adminBooks.length }} Judul Buku
          </p>
          <div class="text-xs font-bold text-black mt-2">
            <span>{{ lowStockBooks.length }} judul stok kritis</span>
          </div>
        </div>

        <div class="bg-white border-3 border-black p-5 rounded-[2px] shadow-neo">
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
          <p class="font-outfit font-black text-2xl text-black mt-2">
            {{ activeUsersCount }} Pembeli
          </p>
          <div class="text-xs font-bold text-black mt-2">
            <span>{{ customersList.length }} total akun</span>
          </div>
        </div>
      </div>

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
            {{ adminBooks.length }}
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
            {{ adminCategories.length }}
          </span>
        </button>

        <button
          class="neubrutal-btn px-4 sm:px-5 py-2.5 rounded-[2px] font-outfit font-black text-xs sm:text-sm whitespace-nowrap transition-all border-2 sm:border-3 border-black flex items-center gap-2"
          :class="
            activeTab === 'people'
              ? 'bg-neo-yellow text-black shadow-neo'
              : 'bg-white text-muted-foreground hover:bg-gray-100 shadow-neo-sm'
          "
          @click="activeTab = 'people'"
        >
          <span>Penulis & Penerbit</span>
          <span class="px-1.5 py-0.2 bg-black text-white text-[10px] rounded-full">
            {{ adminAuthors.length + adminPublishers.length }}
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
            {{ adminVouchers.length }}
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
            v-if="needsActionCount > 0"
            class="px-1.5 py-0.2 bg-black text-white text-[10px] rounded-full"
          >
            {{ needsActionCount }}
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
          Data Pengguna
        </button>

        <button
          class="neubrutal-btn px-4 sm:px-5 py-2.5 rounded-[2px] font-outfit font-black text-xs sm:text-sm whitespace-nowrap transition-all border-2 sm:border-3 border-black flex items-center gap-2"
          :class="
            activeTab === 'payments'
              ? 'bg-neo-yellow text-black shadow-neo'
              : 'bg-white text-muted-foreground hover:bg-gray-100 shadow-neo-sm'
          "
          @click="activeTab = 'payments'"
        >
          <span>Metode Bayar</span>
          <span class="px-1.5 py-0.2 bg-black text-white text-[10px] rounded-full">
            {{ paymentMethods.length }}
          </span>
        </button>
      </div>

      <div v-if="activeTab === 'overview'" class="space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div
            class="lg:col-span-8 bg-white border-3 border-black p-4 sm:p-6 rounded-[2px] shadow-neo overflow-hidden"
          >
            <div
              class="border-b-2 border-black pb-3 mb-4 sm:mb-6 flex items-start justify-between gap-3"
            >
              <div>
                <h3 class="font-outfit font-black text-base sm:text-lg text-black">
                  Tren Omset Penjualan Mingguan
                </h3>
                <p class="font-sans text-xs text-muted-foreground mt-0.5">
                  7 hari terakhir · hanya pesanan lunas/diproses/dikirim/selesai
                </p>
                <p class="font-outfit font-black text-sm text-black mt-1">
                  Total {{ formatRupiah(weeklySalesTotal) }}
                </p>
              </div>
              <button
                type="button"
                :disabled="isBusy('report-download')"
                class="neubrutal-btn bg-neo-yellow border-2 border-black px-3 py-1.5 font-outfit font-black text-[11px] shadow-neo-sm hover:bg-yellow-300 shrink-0 disabled:opacity-60"
                @click="downloadReport"
              >
                {{ isBusy('report-download') ? 'Mengunduh...' : 'Laporan PDF' }}
              </button>
            </div>

            <div class="w-full overflow-x-auto pb-2 scrollbar-none">
              <div
                class="h-52 sm:h-60 min-w-[280px] sm:min-w-full flex items-end justify-between gap-2 sm:gap-3 pt-6 px-1"
              >
                <div
                  v-for="s in weeklySales"
                  :key="s.key"
                  class="flex-1 flex flex-col items-center gap-1.5 sm:gap-2 group h-full justify-end"
                >
                  <div
                    class="opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] whitespace-nowrap shadow-neo-sm pointer-events-none"
                  >
                    {{ formatRupiah(s.amount) }}
                  </div>

                  <div
                    class="w-full border-2 border-black rounded-[2px] transition-all group-hover:scale-105 shadow-neo-sm"
                    :class="s.amount > 0 ? 'bg-neo-violet' : 'bg-gray-200'"
                    :style="{ height: s.height }"
                    :title="`${s.label}: ${formatRupiah(s.amount)}`"
                  ></div>

                  <span class="font-outfit font-black text-[11px] sm:text-xs text-black">
                    {{ s.label }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div
            class="lg:col-span-4 bg-white border-3 border-black p-6 rounded-[2px] shadow-neo flex flex-col justify-between"
          >
            <div>
              <div class="border-b-2 border-black pb-2 mb-4">
                <h3 class="font-outfit font-black text-base text-black uppercase">
                  Peringatan Stok Kritis
                </h3>
                <p class="font-sans text-xs text-muted-foreground mt-0.5">
                  Buku dengan sisa stok 5 unit atau kurang.
                </p>
              </div>

              <div class="space-y-3">
                <div
                  v-for="b in lowStockBooks.slice(0, 4)"
                  :key="b.id"
                  class="bg-surface border-2 border-black p-2.5 rounded-[2px] flex items-center justify-between gap-2"
                >
                  <div class="min-w-0">
                    <h5 class="font-outfit font-black text-xs text-black truncate">
                      {{ b.title }}
                    </h5>
                    <span class="font-sans text-[10px] text-muted-foreground">{{ b.author }}</span>
                  </div>

                  <div class="flex items-center gap-2 shrink-0">
                    <span
                      class="bg-red-500 text-white font-outfit font-black text-xs px-2 py-0.5 rounded-[2px] border border-black"
                    >
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

        <div class="bg-white border-3 border-black p-6 rounded-[2px] shadow-neo">
          <div class="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
            <div>
              <h3 class="font-outfit font-black text-lg text-black">Transaksi Masuk Terbaru</h3>
              <p class="font-sans text-xs text-muted-foreground">
                Pembaruan langsung status transaksi pembeli
              </p>
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
                <tr v-if="!reportOrders.length">
                  <td
                    colspan="6"
                    class="p-6 text-center font-outfit font-black text-sm text-muted-foreground"
                  >
                    {{ reportLoading ? 'Memuat pesanan...' : 'Belum ada pesanan.' }}
                  </td>
                </tr>
                <tr
                  v-for="order in reportOrders.slice(0, 5)"
                  :key="order.id"
                  class="border-b border-black/10 hover:bg-gray-50"
                >
                  <td class="p-3 font-outfit font-black">#{{ order.id }}</td>
                  <td class="p-3 font-bold">{{ order.customerName }}</td>
                  <td class="p-3 text-muted-foreground">{{ order.totalQuantity }} item</td>
                  <td class="p-3 font-outfit font-black text-neo-violet">
                    {{ formatRupiah(order.total) }}
                  </td>
                  <td class="p-3">
                    <StatusBadge :status="order.rawStatus" size="xs" />
                  </td>
                  <td class="p-3 text-right">
                    <button
                      v-if="order.rawStatus === 'paid'"
                      :disabled="isBusy(`dispatch-${order.invoice || order.id}`)"
                      class="neubrutal-btn bg-white border border-black px-2.5 py-1 font-outfit font-black text-[11px] shadow-neo-sm hover:bg-neo-yellow disabled:opacity-50"
                      @click="fulfillOrder(order)"
                    >
                      {{ isBusy(`dispatch-${order.invoice || order.id}`) ? '...' : 'Dispatch' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'books'" class="space-y-6">
        <div
          class="bg-white border-3 border-black p-4 rounded-[2px] shadow-neo-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
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
              <option v-for="cat in adminCategories" :key="cat.id" :value="cat.name">
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
                    <div
                      class="w-12 h-16 bg-background border-2 border-black p-0.5 shadow-neo-sm overflow-hidden flex items-center justify-center"
                    >
                      <img
                        v-if="book.coverImage && !failedBookCovers[book.id]"
                        :src="assetUrl(book.coverImage)"
                        :alt="book.title"
                        class="w-full h-full object-cover"
                        @error="failedBookCovers[book.id] = true"
                      />
                      <BookCover
                        v-else
                        :theme="book.theme"
                        :title="book.title"
                        :author="book.author"
                      />
                    </div>
                  </td>
                  <td class="p-3">
                    <h4 class="font-outfit font-black text-sm text-black line-clamp-1">
                      {{ book.title }}
                    </h4>
                    <p class="font-sans text-xs text-muted-foreground">{{ book.author }}</p>
                  </td>
                  <td class="p-3">
                    <span
                      class="bg-neutral-100 border border-black/40 px-2 py-1 font-outfit font-bold text-[11px] rounded-[2px]"
                    >
                      {{ book.category }}
                    </span>
                  </td>
                  <td class="p-3">
                    <span class="font-outfit font-black text-black block">{{
                      formatRupiah(book.price)
                    }}</span>
                    <span
                      v-if="book.originalPrice"
                      class="line-through text-muted-foreground text-[10px]"
                    >
                      {{ formatRupiah(book.originalPrice) }}
                    </span>
                  </td>
                  <td class="p-3 text-center">
                    <div class="flex items-center justify-center gap-1.5">
                      <button
                        :disabled="isBusy(`stock-${book.id}`)"
                        class="w-5 h-5 border border-black bg-white rounded-[2px] font-black hover:bg-gray-200 disabled:opacity-40"
                        title="Kurang 1"
                        @click="updateBookStock(book.id, -1)"
                      >
                        -
                      </button>
                      <span
                        class="font-outfit font-black px-2 py-0.5 rounded-[2px] border border-black min-w-[32px] text-center"
                        :class="
                          (book.stock || 0) <= 5
                            ? 'bg-red-400 text-white'
                            : 'bg-neo-lime text-black'
                        "
                      >
                        {{ isBusy(`stock-${book.id}`) ? '…' : book.stock || 0 }}
                      </span>
                      <button
                        :disabled="isBusy(`stock-${book.id}`)"
                        class="w-5 h-5 border border-black bg-white rounded-[2px] font-black hover:bg-gray-200 disabled:opacity-40"
                        title="Tambah 1"
                        @click="updateBookStock(book.id, 1)"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td class="p-3 text-center">
                    <span
                      class="px-2 py-0.5 border border-black rounded-[2px] font-outfit font-bold text-[10px] uppercase block"
                      :class="
                        (book.stock || 0) > 0
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      "
                    >
                      {{ (book.stock || 0) > 0 ? 'Tersedia' : 'Habis' }}
                    </span>
                    <span
                      class="px-2 py-0.5 border border-black rounded-[2px] font-outfit font-bold text-[9px] uppercase inline-block mt-1"
                      :class="
                        book.isActive ? 'bg-neo-lime text-black' : 'bg-gray-200 text-gray-600'
                      "
                    >
                      {{ book.isActive ? 'Tampil' : 'Disembunyikan' }}
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

      <div v-if="activeTab === 'categories'" class="space-y-6">
        <div
          class="bg-white border-3 border-black p-4 rounded-[2px] shadow-neo-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h2 class="font-outfit font-black text-lg text-black">Manajemen Kategori Buku</h2>
            <p class="font-sans text-xs text-muted-foreground">
              Kelola kategori etalase, gambar kategori, dan filter koleksi buku.
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
            v-for="cat in adminCategories"
            :key="cat.id"
            class="bg-white border-3 border-black p-5 rounded-[2px] shadow-neo flex flex-col justify-between"
          >
            <div>
              <div class="flex items-center justify-between gap-2 mb-2">
                <span
                  class="border-2 border-black px-2.5 py-1 rounded-[2px] font-outfit font-black text-xs uppercase shadow-neo-sm bg-neo-yellow"
                >
                  {{ cat.name }}
                </span>
                <span class="font-mono text-xs text-muted-foreground">#{{ cat.id }}</span>
              </div>
              <div class="flex items-center gap-3 mt-2">
                <div class="w-14 h-14 border-2 border-black bg-background overflow-hidden shrink-0">
                  <img
                    v-if="cat.image_url"
                    :src="assetUrl(cat.image_url)"
                    :alt="cat.name"
                    class="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <p class="font-sans text-xs text-gray-700">
                  {{ cat.total_books || 0 }} buku dalam kategori ini.
                </p>
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-black/10 flex items-center justify-between">
              <span class="font-sans text-xs text-muted-foreground">
                Slug: <strong class="font-outfit">{{ cat.slug }}</strong>
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

      <div v-if="activeTab === 'vouchers'" class="space-y-6">
        <div
          class="bg-white border-3 border-black p-4 rounded-[2px] shadow-neo-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h2 class="font-outfit font-black text-lg text-black">
              Manajemen Kupon & Voucher Diskon
            </h2>
            <p class="font-sans text-xs text-muted-foreground">
              Voucher yang dibuat di sini otomatis aktif dan dapat divalidasi langsung oleh pembeli
              saat checkout.
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
                  v-for="v in adminVouchers"
                  :key="v.id"
                  class="border-b border-black/10 hover:bg-gray-50"
                >
                  <td class="p-3">
                    <span
                      class="font-mono font-black text-sm bg-neo-yellow border-2 border-black px-2.5 py-0.5 rounded-[2px] shadow-neo-sm inline-block"
                    >
                      {{ v.code }}
                    </span>
                  </td>
                  <td class="p-3">
                    <h5 class="font-outfit font-black text-sm text-black">{{ v.name }}</h5>
                    <p class="font-sans text-xs text-muted-foreground mt-0.5">{{ v.desc }}</p>
                  </td>
                  <td class="p-3">
                    <span class="font-outfit font-black text-sm text-green-700">
                      {{ voucherValueLabel(v) }}
                    </span>
                    <span class="block text-[10px] text-muted-foreground uppercase font-bold">
                      {{ voucherTypeLabel(v.type) }}
                    </span>
                    <span
                      v-if="v.type === 'tiered' && v.tiers.length"
                      class="block text-[10px] text-muted-foreground"
                    >
                      {{ v.tiers.length }} tier
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
                      :disabled="isBusy(`voucher-toggle-${v.id}`)"
                      class="border-2 border-black px-2.5 py-0.5 rounded-[2px] font-outfit font-black text-[10px] uppercase shadow-neo-sm cursor-pointer disabled:opacity-50"
                      :class="
                        v.active
                          ? 'bg-neo-lime text-black hover:bg-red-100'
                          : 'bg-gray-200 text-gray-600 hover:bg-neo-lime'
                      "
                      @click="toggleVoucher(v)"
                    >
                      {{
                        isBusy(`voucher-toggle-${v.id}`) ? '...' : v.active ? 'Aktif' : 'Nonaktif'
                      }}
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

      <div v-if="activeTab === 'orders'" class="space-y-6">
        <div
          class="bg-white border-3 border-black p-4 rounded-[2px] shadow-neo-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div class="flex flex-wrap items-center gap-3 flex-1">
            <div class="relative flex-1 min-w-[200px] max-w-md">
              <input
                v-model="orderSearch"
                type="text"
                placeholder="Cari Invoice, Pelanggan, atau Email..."
                class="w-full bg-background border-2 border-black p-2 pl-3 font-outfit font-bold text-xs outline-none shadow-neo-sm"
              />
            </div>

            <select
              v-model="orderStatusFilter"
              class="bg-background border-2 border-black p-2 font-outfit font-bold text-xs outline-none shadow-neo-sm cursor-pointer"
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

        <p class="font-sans text-[11px] font-semibold text-muted-foreground">
          Admin hanya dapat melakukan Dispatch dan Retur. API belum menyediakan create/update/delete
          pesanan.
        </p>

        <div class="bg-white border-3 border-black rounded-[2px] shadow-neo overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-xs font-sans border-collapse">
              <thead>
                <tr class="bg-black text-white font-outfit font-black text-left">
                  <th class="p-3">INVOICE & TANGGAL</th>
                  <th class="p-3">PELANGGAN</th>
                  <th class="p-3">PEMBAYARAN</th>
                  <th class="p-3">BUKU</th>
                  <th class="p-3">TOTAL</th>
                  <th class="p-3">STATUS PESANAN</th>
                  <th class="p-3 text-right">AKSI</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="order in adminOrderRows"
                  :key="order.id"
                  class="border-b border-black/10 hover:bg-gray-50"
                >
                  <td class="p-3">
                    <span class="font-outfit font-black text-black block">#{{ order.id }}</span>
                    <span class="text-muted-foreground text-[10px]">{{ order.date }}</span>
                  </td>
                  <td class="p-3">
                    <span class="font-outfit font-black text-black block">{{
                      order.customerName
                    }}</span>
                    <span class="text-muted-foreground text-[10px]">{{ order.customerEmail }}</span>
                  </td>
                  <td class="p-3 max-w-xs">
                    <span class="font-bold text-black block">{{ order.paymentMethod }}</span>
                    <span class="text-muted-foreground text-[10px] truncate block">{{
                      order.invoice
                    }}</span>
                  </td>
                  <td class="p-3">
                    <span class="text-neutral-800 font-semibold">
                      {{ order.totalQuantity }} item
                    </span>
                  </td>
                  <td class="p-3">
                    <span class="font-outfit font-black text-neo-violet text-sm block">
                      {{ formatRupiah(order.total) }}
                    </span>
                    <span class="text-[10px] text-muted-foreground">{{ order.paymentMethod }}</span>
                  </td>
                  <td class="p-3">
                    <StatusBadge :status="order.rawStatus" size="xs" />
                  </td>
                  <td class="p-3 text-right">
                    <div class="flex flex-wrap justify-end gap-1.5">
                      <button
                        class="neubrutal-btn bg-white border border-black px-2 py-1 font-outfit font-black text-[10px] shadow-neo-sm hover:bg-gray-100"
                        @click="openAdminOrder(order)"
                      >
                        Detail
                      </button>
                      <button
                        v-if="order.rawStatus === 'paid'"
                        :disabled="isBusy(`dispatch-${order.invoice || order.id}`)"
                        class="neubrutal-btn bg-neo-yellow border border-black px-2 py-1 font-outfit font-black text-[10px] shadow-neo-sm disabled:opacity-50"
                        @click="fulfillOrder(order)"
                      >
                        {{ isBusy(`dispatch-${order.invoice || order.id}`) ? '...' : 'Dispatch' }}
                      </button>
                      <button
                        v-if="['shipped', 'completed'].includes(order.rawStatus)"
                        :disabled="isBusy(`return-${order.invoice || order.id}`)"
                        class="neubrutal-btn bg-white border border-black px-2 py-1 font-outfit font-black text-[10px] shadow-neo-sm hover:bg-red-50 disabled:opacity-50"
                        @click="returnOrder(order)"
                      >
                        {{ isBusy(`return-${order.invoice || order.id}`) ? '...' : 'Retur' }}
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="adminOrdersLoading && !adminOrderRows.length">
                  <td colspan="7" class="p-8 text-center bg-gray-50/50">
                    <span class="font-outfit font-black text-sm">Memuat pesanan...</span>
                  </td>
                </tr>
                <tr v-else-if="!adminOrderRows.length">
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

          <div
            class="border-t-2 border-black p-3 flex flex-wrap items-center justify-between gap-3"
          >
            <span class="font-sans text-xs font-bold text-muted-foreground">
              Halaman {{ adminOrdersMeta.current_page }} dari {{ adminOrdersMeta.total_pages }} ·
              {{ adminOrdersMeta.total_items }} pesanan
            </span>
            <div class="flex items-center gap-2">
              <button
                type="button"
                :disabled="adminOrdersMeta.current_page <= 1 || adminOrdersLoading"
                class="neubrutal-btn bg-white border-2 border-black px-3 py-1 font-outfit font-black text-[11px] shadow-neo-sm hover:bg-neo-yellow disabled:opacity-40"
                @click="changeAdminOrderPage(-1)"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                :disabled="
                  adminOrdersMeta.current_page >= adminOrdersMeta.total_pages || adminOrdersLoading
                "
                class="neubrutal-btn bg-white border-2 border-black px-3 py-1 font-outfit font-black text-[11px] shadow-neo-sm hover:bg-neo-yellow disabled:opacity-40"
                @click="changeAdminOrderPage(1)"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'people'" class="space-y-6">
        <div
          class="bg-white border-3 border-black p-4 rounded-[2px] shadow-neo-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h2 class="font-outfit font-black text-lg text-black">Manajemen Penulis & Penerbit</h2>
            <p class="font-sans text-xs text-muted-foreground">
              Data ini dipakai saat menambah atau mengubah buku di katalog.
            </p>
          </div>
          <button
            class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo hover:bg-yellow-300 shrink-0"
            @click="openAddPeople(peopleTab === 'authors' ? 'author' : 'publisher')"
          >
            + Tambah {{ peopleTab === 'authors' ? 'Penulis' : 'Penerbit' }}
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="neubrutal-btn px-4 py-2 border-2 border-black font-outfit font-black text-xs rounded-[2px]"
            :class="
              peopleTab === 'authors'
                ? 'bg-black text-white shadow-neo-sm'
                : 'bg-white hover:bg-gray-100'
            "
            @click="peopleTab = 'authors'"
          >
            Penulis ({{ adminAuthors.length }})
          </button>
          <button
            type="button"
            class="neubrutal-btn px-4 py-2 border-2 border-black font-outfit font-black text-xs rounded-[2px]"
            :class="
              peopleTab === 'publishers'
                ? 'bg-black text-white shadow-neo-sm'
                : 'bg-white hover:bg-gray-100'
            "
            @click="peopleTab = 'publishers'"
          >
            Penerbit ({{ adminPublishers.length }})
          </button>
        </div>

        <div class="bg-white border-3 border-black rounded-[2px] shadow-neo overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-xs font-sans border-collapse">
              <thead>
                <tr class="bg-black text-white font-outfit font-black text-left">
                  <th class="p-3">NAMA</th>
                  <th class="p-3">SLUG</th>
                  <th class="p-3 text-right">AKSI</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="person in peopleTab === 'authors' ? adminAuthors : adminPublishers"
                  :key="person.id"
                  class="border-b border-black/10 hover:bg-gray-50"
                >
                  <td class="p-3 font-outfit font-black text-sm text-black">{{ person.name }}</td>
                  <td class="p-3 font-mono text-xs text-muted-foreground">{{ person.slug }}</td>
                  <td class="p-3 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                      <button
                        class="neubrutal-btn bg-white border border-black px-2.5 py-1 font-outfit font-black text-xs shadow-neo-sm hover:bg-neo-yellow"
                        @click="
                          openEditPeople(peopleTab === 'authors' ? 'author' : 'publisher', person)
                        "
                      >
                        Edit
                      </button>
                      <button
                        class="neubrutal-btn bg-red-100 text-red-700 border border-black px-2.5 py-1 font-outfit font-black text-xs shadow-neo-sm hover:bg-red-200"
                        @click="
                          confirmDeletePeople(
                            peopleTab === 'authors' ? 'author' : 'publisher',
                            person,
                          )
                        "
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="!(peopleTab === 'authors' ? adminAuthors : adminPublishers).length">
                  <td colspan="3" class="p-8 text-center bg-gray-50/50">
                    <p class="font-outfit font-black text-sm text-black">Belum ada data</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'payments'" class="space-y-6">
        <div class="bg-white border-3 border-black p-4 rounded-[2px] shadow-neo-sm">
          <h2 class="font-outfit font-black text-lg text-black">Metode Pembayaran</h2>
          <p class="font-sans text-xs text-muted-foreground mt-0.5">
            Kode metode bersifat tetap dari gateway. Admin hanya dapat mengubah nama, logo, biaya,
            instruksi, dan status aktif.
          </p>
        </div>

        <div class="bg-white border-3 border-black rounded-[2px] shadow-neo overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-xs font-sans border-collapse">
              <thead>
                <tr class="bg-black text-white font-outfit font-black text-left">
                  <th class="p-3">METODE</th>
                  <th class="p-3">KATEGORI</th>
                  <th class="p-3">BIAYA</th>
                  <th class="p-3 text-center">STATUS</th>
                  <th class="p-3 text-right">AKSI</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="paymentMethodsLoading && !paymentMethods.length">
                  <td colspan="5" class="p-8 text-center bg-gray-50/50">
                    <span class="font-outfit font-black text-sm">Memuat metode pembayaran...</span>
                  </td>
                </tr>
                <tr v-else-if="!paymentMethods.length">
                  <td colspan="5" class="p-8 text-center bg-gray-50/50">
                    <p class="font-outfit font-black text-sm text-black">Belum ada metode</p>
                  </td>
                </tr>
                <tr
                  v-for="method in paymentMethods"
                  :key="method.id"
                  class="border-b border-black/10 hover:bg-gray-50"
                >
                  <td class="p-3">
                    <div class="flex items-center gap-2">
                      <div
                        class="w-10 h-10 border-2 border-black bg-white shrink-0 flex items-center justify-center overflow-hidden"
                      >
                        <img
                          v-if="method.image"
                          :src="assetUrl(method.image)"
                          :alt="method.name"
                          class="w-full h-full object-contain p-0.5"
                          loading="lazy"
                        />
                      </div>
                      <div class="min-w-0">
                        <span class="font-outfit font-black text-sm text-black block">
                          {{ method.name }}
                        </span>
                        <span class="font-mono text-[10px] text-muted-foreground">
                          {{ method.code }}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td class="p-3 font-semibold">{{ method.categoryName }}</td>
                  <td class="p-3 font-outfit font-black">{{ paymentFeeText(method) }}</td>
                  <td class="p-3 text-center">
                    <button
                      :disabled="isBusy(`payment-toggle-${method.id}`)"
                      class="border-2 border-black px-2.5 py-0.5 rounded-[2px] font-outfit font-black text-[10px] uppercase shadow-neo-sm disabled:opacity-50"
                      :class="
                        method.is_active !== false
                          ? 'bg-neo-lime text-black hover:bg-red-100'
                          : 'bg-gray-200 text-gray-600 hover:bg-neo-lime'
                      "
                      @click="togglePayment(method)"
                    >
                      {{
                        isBusy(`payment-toggle-${method.id}`)
                          ? '...'
                          : method.is_active !== false
                            ? 'Aktif'
                            : 'Nonaktif'
                      }}
                    </button>
                  </td>
                  <td class="p-3 text-right">
                    <button
                      class="neubrutal-btn bg-white border border-black px-2.5 py-1 font-outfit font-black text-xs shadow-neo-sm hover:bg-neo-yellow"
                      @click="openEditPayment(method)"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'customers'" class="space-y-6">
        <div class="bg-white border-3 border-black rounded-[2px] shadow-neo p-6">
          <div class="border-b-2 border-black pb-3 mb-4 flex items-center justify-between">
            <div>
              <h3 class="font-outfit font-black text-xl text-black">Data Akun Pengguna</h3>
              <p class="font-sans text-xs text-muted-foreground">
                Daftar pengguna terdaftar di toko BookStore
              </p>
            </div>
            <span
              class="bg-neo-yellow border-2 border-black px-3 py-1 font-outfit font-black text-xs shadow-neo-sm"
            >
              Total {{ customersList.length }} Pengguna
            </span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-xs font-sans border-collapse">
              <thead>
                <tr class="bg-black text-white font-outfit font-black text-left">
                  <th class="p-3">NAMA PENGGUNA</th>
                  <th class="p-3">KONTAK</th>
                  <th class="p-3 text-center">TOTAL PESANAN</th>
                  <th class="p-3">TOTAL BELANJA</th>
                  <th class="p-3">TANGGAL BERGABUNG</th>
                  <th class="p-3 text-center">STATUS AKUN</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="customersLoading">
                  <td colspan="6" class="p-8 text-center bg-gray-50/50">
                    <span
                      class="inline-block w-5 h-5 align-middle rounded-full border-3 border-black border-t-transparent animate-spin"
                    ></span>
                    <span class="ml-2 align-middle font-outfit font-black text-sm"
                      >Memuat data pengguna...</span
                    >
                  </td>
                </tr>
                <tr v-else-if="customersList.length === 0">
                  <td colspan="6" class="p-8 text-center bg-gray-50/50">
                    <p class="font-outfit font-black text-sm text-black">Belum ada pengguna</p>
                    <p class="font-sans text-xs text-muted-foreground mt-1">
                      Data akan tampil setelah pengguna terdaftar.
                    </p>
                  </td>
                </tr>
                <tr
                  v-for="c in customerRows"
                  :key="c.id"
                  class="border-b border-black/10 hover:bg-gray-50"
                >
                  <td class="p-3 font-outfit font-black text-sm text-black">
                    {{ c.name }}
                  </td>
                  <td class="p-3">
                    <span class="block text-black font-semibold">{{ c.email }}</span>
                    <span class="text-muted-foreground">{{ c.role }}</span>
                  </td>
                  <td class="p-3 text-center font-outfit font-black text-sm">
                    {{ c.orders }}
                  </td>
                  <td class="p-3 font-outfit font-black text-black">
                    {{ formatRupiah(c.spent) }}
                  </td>
                  <td class="p-3 text-muted-foreground">{{ c.joinDate }}</td>
                  <td class="p-3 text-center">
                    <span
                      class="border px-2 py-0.5 rounded-[2px] font-outfit font-bold text-[10px]"
                      :class="
                        c.isActive
                          ? 'bg-green-100 text-green-800 border-green-800'
                          : 'bg-red-100 text-red-800 border-red-800'
                      "
                    >
                      {{ c.status }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p class="font-sans text-[11px] font-semibold text-muted-foreground mt-3">
            Total pesanan menghitung semua status. Total belanja hanya menghitung pesanan
            lunas/diproses/dikirim/selesai, sama seperti omzet laporan. Data pengguna bersifat
            read-only karena API belum menyediakan endpoint ubah/hapus.
          </p>
        </div>
      </div>
    </div>

    <div
      v-if="showBookModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="closeBookModal"
    >
      <div
        class="bg-white border-4 border-black max-w-xl w-full rounded-[2px] shadow-neo-xl overflow-hidden max-h-[90vh] flex flex-col animate-hero-entrance"
      >
        <div class="bg-neo-yellow border-b-3 border-black p-4 flex items-center justify-between">
          <h3 class="font-outfit font-black text-lg text-black uppercase">
            {{ isEditMode ? 'EDIT DATA BUKU' : 'TAMBAH BUKU BARU' }}
          </h3>
          <button
            class="w-8 h-8 rounded-[2px] bg-white border-2 border-black flex items-center justify-center font-outfit font-black text-sm hover:bg-black hover:text-white"
            @click="closeBookModal"
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
              <select
                v-model="bookForm.authorId"
                required
                class="w-full bg-background border-2 border-black p-2.5 font-outfit font-bold text-sm outline-none shadow-neo-sm cursor-pointer"
              >
                <option value="" disabled>Pilih penulis</option>
                <option v-for="author in adminAuthors" :key="author.id" :value="author.id">
                  {{ author.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Kategori *</label>
              <select
                v-model="bookForm.categoryId"
                required
                class="w-full bg-background border-2 border-black p-2.5 font-outfit font-bold text-sm outline-none shadow-neo-sm cursor-pointer"
              >
                <option value="" disabled>Pilih kategori</option>
                <option v-for="cat in adminCategories" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </option>
              </select>
            </div>
          </div>

          <div>
            <label class="block font-outfit font-black text-xs uppercase mb-1">Penerbit *</label>
            <select
              v-model="bookForm.publisherId"
              required
              class="w-full bg-background border-2 border-black p-2.5 font-outfit font-bold text-sm outline-none shadow-neo-sm cursor-pointer"
            >
              <option value="" disabled>Pilih penerbit</option>
              <option
                v-for="publisher in adminPublishers"
                :key="publisher.id"
                :value="publisher.id"
              >
                {{ publisher.name }}
              </option>
            </select>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1"
                >Harga Jual (Rp) *</label
              >
              <input
                v-model="bookForm.price"
                type="number"
                required
                placeholder="Contoh: 89000"
                class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-sm outline-none shadow-neo-sm"
              />
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1"
                >Harga Asli (Rp)</label
              >
              <input
                v-model="bookForm.originalPrice"
                type="number"
                placeholder="Contoh: 120000"
                class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-sm outline-none shadow-neo-sm"
              />
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1"
                >Jumlah Stok *</label
              >
              <input
                v-model="bookForm.stock"
                type="number"
                required
                placeholder="Contoh: 15"
                class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-sm outline-none shadow-neo-sm"
              />
            </div>
          </div>

          <div class="border-2 border-black p-4 bg-surface rounded-[2px] shadow-neo-sm space-y-3">
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

            <div
              v-if="bookForm.coverImage"
              class="border-2 border-black bg-white p-3.5 rounded-[2px] shadow-neo-sm flex flex-col sm:flex-row items-center gap-4"
              @dragover.prevent
              @drop.prevent="handleDrop"
            >
              <div
                class="w-24 h-32 bg-black border-2 border-black p-0.5 shadow-neo shrink-0 overflow-hidden relative flex items-center justify-center"
              >
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
                    <span
                      class="bg-neo-lime text-black border border-black px-1.5 py-0.2 text-[9px] font-outfit font-bold rounded-[2px]"
                    >
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
                    <svg
                      class="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                      />
                    </svg>
                    Ganti Gambar
                  </button>
                  <button
                    type="button"
                    class="neubrutal-btn bg-white text-red-600 border-2 border-black px-3 py-1.5 font-outfit font-black text-xs shadow-neo-sm hover:bg-red-50 flex items-center gap-1.5"
                    @click="removeCoverImage"
                  >
                    <svg
                      class="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                      />
                    </svg>
                    Hapus
                  </button>
                </div>
              </div>
            </div>

            <div
              v-else
              class="border-2 border-dashed border-black bg-white p-4 rounded-[2px] shadow-neo-sm hover:bg-yellow-50/60 transition-all cursor-pointer flex flex-col justify-center gap-2 group"
              @click="fileInputRef?.click()"
              @dragover.prevent
              @drop.prevent="handleDrop"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 bg-neo-yellow border-2 border-black rounded-[2px] flex items-center justify-center shadow-neo-sm shrink-0 group-hover:scale-105 transition-transform"
                >
                  <svg
                    class="w-5 h-5 text-black"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                    />
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span
                      class="font-outfit font-black text-xs text-black group-hover:text-neo-violet transition-colors"
                    >
                      Pilih Berkas Sampul
                    </span>
                    <span
                      class="bg-black text-white text-[10px] font-outfit font-bold px-1.5 py-0.2 rounded-[2px]"
                    >
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
              <label class="block font-outfit font-black text-xs uppercase mb-1">ISBN *</label>
              <input
                v-model="bookForm.isbn"
                type="text"
                required
                placeholder="9786020000000"
                class="w-full bg-background border-2 border-black p-2 font-mono text-sm outline-none shadow-neo-sm"
              />
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1"
                >Berat (gram) *</label
              >
              <input
                v-model="bookForm.weightGrams"
                type="number"
                min="1"
                required
                class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-sm outline-none shadow-neo-sm"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Halaman</label>
              <input
                v-model="bookForm.pages"
                type="number"
                min="1"
                class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-sm outline-none shadow-neo-sm"
              />
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Tahun</label>
              <input
                v-model="bookForm.publicationYear"
                type="number"
                min="1000"
                max="2100"
                class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-sm outline-none shadow-neo-sm"
              />
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1"
                >Panjang (cm)</label
              >
              <input
                v-model="bookForm.length"
                type="number"
                step="0.1"
                min="0.1"
                class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-sm outline-none shadow-neo-sm"
              />
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Lebar (cm)</label>
              <input
                v-model="bookForm.width"
                type="number"
                step="0.1"
                min="0.1"
                class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-sm outline-none shadow-neo-sm"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Tinggi (cm)</label>
              <input
                v-model="bookForm.height"
                type="number"
                step="0.1"
                min="0.1"
                class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-sm outline-none shadow-neo-sm"
              />
            </div>
            <label class="flex items-center gap-2 font-sans text-xs font-bold mt-5">
              <input v-model="bookForm.isActive" type="checkbox" class="w-4 h-4 accent-black" />
              Tampilkan di katalog (whitelist produk)
            </label>
          </div>

          <div>
            <label class="block font-outfit font-black text-xs uppercase mb-1"
              >Deskripsi Singkat</label
            >
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
              @click="closeBookModal"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="isBusy('book-save')"
              class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-5 py-2 font-outfit font-black text-xs shadow-neo hover:bg-yellow-300 disabled:opacity-60"
            >
              {{
                isBusy('book-save')
                  ? 'Menyimpan...'
                  : isEditMode
                    ? 'Simpan Perubahan'
                    : 'Terbitkan Buku'
              }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div
      v-if="showCategoryModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="closeCategoryModal"
    >
      <div
        class="bg-white border-4 border-black max-w-md w-full rounded-[2px] shadow-neo-xl overflow-hidden animate-hero-entrance"
      >
        <div class="bg-neo-yellow border-b-3 border-black p-4 flex items-center justify-between">
          <h3 class="font-outfit font-black text-base text-black uppercase">
            {{ isEditCategory ? 'EDIT KATEGORI' : 'TAMBAH KATEGORI BARU' }}
          </h3>
          <button
            class="w-8 h-8 rounded-[2px] bg-white border-2 border-black flex items-center justify-center font-outfit font-black text-sm hover:bg-black hover:text-white"
            @click="closeCategoryModal"
          >
            X
          </button>
        </div>

        <form class="p-6 space-y-4" @submit.prevent="handleSaveCategory">
          <div>
            <label class="block font-outfit font-black text-xs uppercase mb-1"
              >Nama Kategori *</label
            >
            <input
              v-model="categoryForm.name"
              type="text"
              required
              placeholder="Contoh: Bisnis & Finansial"
              class="w-full bg-background border-2 border-black p-2.5 font-outfit font-bold text-sm outline-none shadow-neo-sm"
            />
          </div>

          <div class="border-2 border-black p-3 bg-surface space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-outfit font-black text-xs uppercase">Gambar Kategori</span>
              <span
                v-if="categoryForm.imageUrl"
                class="bg-neo-lime border border-black px-2 py-0.5 font-outfit font-black text-[9px] uppercase"
              >
                Terpasang
              </span>
            </div>

            <input
              ref="categoryImageInput"
              type="file"
              accept=".png, .jpg, .jpeg, .webp, image/png, image/jpeg, image/webp"
              class="hidden"
              @change="handleCategoryImageChange"
            />

            <div class="flex items-center gap-3">
              <div
                class="w-16 h-16 border-2 border-black bg-white shrink-0 flex items-center justify-center overflow-hidden"
              >
                <img
                  v-if="categoryForm.imageUrl"
                  :src="assetUrl(categoryForm.imageUrl)"
                  alt="Gambar kategori"
                  class="w-full h-full object-cover"
                />
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  :disabled="uploadingCategoryImage"
                  class="neubrutal-btn bg-white border-2 border-black px-3 py-1.5 font-outfit font-black text-xs shadow-neo-sm hover:bg-neo-yellow disabled:opacity-60"
                  @click="categoryImageInput?.click()"
                >
                  {{ uploadingCategoryImage ? 'Mengunggah...' : 'Unggah Gambar' }}
                </button>
                <button
                  v-if="categoryForm.imageUrl"
                  type="button"
                  class="neubrutal-btn bg-white text-red-600 border-2 border-black px-3 py-1.5 font-outfit font-black text-xs shadow-neo-sm hover:bg-red-50"
                  @click="removeCategoryImage"
                >
                  Hapus
                </button>
              </div>
            </div>

            <input
              v-model="categoryForm.imageUrl"
              type="text"
              placeholder="/categories/..."
              class="w-full bg-white border-2 border-black p-2 font-mono text-[11px] outline-none shadow-neo-sm"
            />
            <p class="font-sans text-[10px] text-muted-foreground">
              Unggah gambar atau isi path/URL manual.
            </p>
          </div>

          <div class="border-t-2 border-black pt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              class="neubrutal-btn bg-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100"
              @click="closeCategoryModal"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="isBusy('category-save')"
              class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-5 py-2 font-outfit font-black text-xs shadow-neo hover:bg-yellow-300 disabled:opacity-60"
            >
              {{
                isBusy('category-save')
                  ? 'Menyimpan...'
                  : isEditCategory
                    ? 'Simpan Kategori'
                    : 'Buat Kategori'
              }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div
      v-if="showVoucherModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="showVoucherModal = false"
    >
      <div
        class="bg-white border-4 border-black max-w-lg w-full rounded-[2px] shadow-neo-xl overflow-hidden animate-hero-entrance"
      >
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

        <form
          class="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
          @submit.prevent="handleSaveVoucher"
        >
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1"
                >Kode Voucher *</label
              >
              <input
                v-model="voucherForm.code"
                type="text"
                required
                placeholder="CONTOH10"
                class="w-full bg-background border-2 border-black p-2 font-mono font-bold text-xs uppercase outline-none shadow-neo-sm"
              />
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1"
                >Nama Voucher</label
              >
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
                <option value="tiered">Bertingkat / Up To (%)</option>
              </select>
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">
                {{ voucherForm.type === 'tiered' ? 'Maks. Diskon (%)' : 'Nilai Diskon' }}
                {{ voucherForm.type === 'fixed' ? '(Rp)' : '(%)' }} *
              </label>
              <input
                v-model="voucherForm.value"
                type="number"
                required
                placeholder="Contoh: 10 atau 25000"
                class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-xs outline-none shadow-neo-sm"
              />
              <p
                v-if="voucherForm.type === 'tiered'"
                class="font-sans text-[10px] text-muted-foreground mt-1"
              >
                Angka ini hanya headline "Up To". Potongan sebenarnya mengikuti tier.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1"
                >Min. Belanja (Rp)</label
              >
              <input
                v-model="voucherForm.minSpend"
                type="number"
                placeholder="Contoh: 50000"
                class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-xs outline-none shadow-neo-sm"
              />
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1"
                >Kuota Penggunaan</label
              >
              <input
                v-model="voucherForm.quota"
                type="number"
                placeholder="Contoh: 100"
                class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-xs outline-none shadow-neo-sm"
              />
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1"
                >Mulai Berlaku</label
              >
              <input
                v-model="voucherForm.startDate"
                type="date"
                class="w-full bg-background border-2 border-black p-2 font-mono text-xs outline-none shadow-neo-sm"
              />
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1"
                >Berlaku Sampai</label
              >
              <input
                v-model="voucherForm.validUntil"
                type="date"
                required
                class="w-full bg-background border-2 border-black p-2 font-mono text-xs outline-none shadow-neo-sm"
              />
            </div>
          </div>

          <div
            v-if="voucherForm.type === 'tiered'"
            class="border-2 border-black p-3 bg-surface space-y-2"
          >
            <div class="flex items-center justify-between">
              <span class="font-outfit font-black text-xs uppercase">Tier Diskon</span>
              <button
                type="button"
                class="neubrutal-btn bg-white border-2 border-black px-2.5 py-1 font-outfit font-black text-[10px] shadow-neo-sm hover:bg-neo-yellow"
                @click="addVoucherTier"
              >
                + Tier
              </button>
            </div>

            <p
              v-if="!voucherForm.tiers.length"
              class="font-sans text-[11px] font-semibold text-muted-foreground"
            >
              Belum ada tier. Tambahkan minimal satu tier.
            </p>

            <div
              v-for="(tier, index) in voucherForm.tiers"
              :key="index"
              class="bg-white border-2 border-black p-3 space-y-2"
            >
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block font-outfit font-black text-[10px] uppercase mb-1">
                    Min. Belanja (Rp)
                  </label>
                  <input
                    v-model="tier.minSpend"
                    type="number"
                    min="0"
                    class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-xs outline-none shadow-neo-sm"
                  />
                </div>
                <div>
                  <label class="block font-outfit font-black text-[10px] uppercase mb-1">
                    Tipe Reward
                  </label>
                  <select
                    v-model="tier.rewardType"
                    class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-xs outline-none shadow-neo-sm cursor-pointer"
                  >
                    <option value="fixed">Nominal (Rp)</option>
                    <option value="percentage">Persen (%)</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block font-outfit font-black text-[10px] uppercase mb-1">
                    Nilai Reward
                  </label>
                  <input
                    v-model="tier.rewardValue"
                    type="number"
                    min="1"
                    class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-xs outline-none shadow-neo-sm"
                  />
                </div>
                <div>
                  <label class="block font-outfit font-black text-[10px] uppercase mb-1">
                    Maks. Reward (opsional)
                  </label>
                  <input
                    v-model="tier.maxReward"
                    type="number"
                    min="1"
                    class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-xs outline-none shadow-neo-sm"
                  />
                </div>
              </div>

              <button
                type="button"
                class="neubrutal-btn bg-red-100 text-red-700 border-2 border-black px-2.5 py-1 font-outfit font-black text-[10px] shadow-neo-sm hover:bg-red-200"
                @click="removeVoucherTier(index)"
              >
                Hapus Tier
              </button>
            </div>
          </div>

          <div>
            <label class="block font-outfit font-black text-xs uppercase mb-1"
              >Deskripsi Ketentuan</label
            >
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
              :disabled="isBusy('voucher-save')"
              class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-5 py-2 font-outfit font-black text-xs shadow-neo hover:bg-yellow-300 disabled:opacity-60"
            >
              {{
                isBusy('voucher-save')
                  ? 'Menyimpan...'
                  : isEditVoucher
                    ? 'Simpan Perubahan'
                    : 'Terbitkan Voucher'
              }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div
      v-if="showDeleteConfirm && bookToDelete"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="showDeleteConfirm = false"
    >
      <div
        class="bg-white border-4 border-black max-w-sm w-full rounded-[2px] shadow-neo-xl overflow-hidden animate-hero-entrance p-5 space-y-4 text-center"
      >
        <h3 class="font-outfit font-black text-base text-black">Hapus Buku dari Katalog?</h3>
        <p class="font-sans text-xs text-muted-foreground">
          Buku "<strong>{{ bookToDelete.title }}</strong
          >" akan dihapus dari etalase toko.
        </p>

        <div class="flex items-center justify-center gap-2 pt-2">
          <button
            class="neubrutal-btn bg-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100"
            @click="showDeleteConfirm = false"
          >
            Batal
          </button>
          <button
            :disabled="isBusy('book-delete')"
            class="neubrutal-btn bg-red-500 text-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo hover:bg-red-600 disabled:opacity-60"
            @click="executeDeleteBook"
          >
            {{ isBusy('book-delete') ? 'Menghapus...' : 'Ya, Hapus Buku' }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showDeleteCategoryConfirm && categoryToDelete"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="showDeleteCategoryConfirm = false"
    >
      <div
        class="bg-white border-4 border-black max-w-sm w-full rounded-[2px] shadow-neo-xl overflow-hidden animate-hero-entrance p-5 space-y-4 text-center"
      >
        <h3 class="font-outfit font-black text-base text-black">Hapus Kategori?</h3>
        <p class="font-sans text-xs text-muted-foreground">
          Kategori "<strong>{{ categoryToDelete.name }}</strong
          >" akan dihapus dari sistem.
        </p>

        <div class="flex items-center justify-center gap-2 pt-2">
          <button
            class="neubrutal-btn bg-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100"
            @click="showDeleteCategoryConfirm = false"
          >
            Batal
          </button>
          <button
            :disabled="isBusy('category-delete')"
            class="neubrutal-btn bg-red-500 text-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo hover:bg-red-600 disabled:opacity-60"
            @click="executeDeleteCategory"
          >
            {{ isBusy('category-delete') ? 'Menghapus...' : 'Ya, Hapus Kategori' }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showDeleteVoucherConfirm && voucherToDelete"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="showDeleteVoucherConfirm = false"
    >
      <div
        class="bg-white border-4 border-black max-w-sm w-full rounded-[2px] shadow-neo-xl overflow-hidden animate-hero-entrance p-5 space-y-4 text-center"
      >
        <h3 class="font-outfit font-black text-base text-black">Hapus Voucher?</h3>
        <p class="font-sans text-xs text-muted-foreground">
          Voucher promo "<strong>{{ voucherToDelete.code }}</strong
          >" akan dihapus permanen.
        </p>

        <div class="flex items-center justify-center gap-2 pt-2">
          <button
            class="neubrutal-btn bg-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100"
            @click="showDeleteVoucherConfirm = false"
          >
            Batal
          </button>
          <button
            :disabled="isBusy('voucher-delete')"
            class="neubrutal-btn bg-red-500 text-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo hover:bg-red-600 disabled:opacity-60"
            @click="executeDeleteVoucher"
          >
            {{ isBusy('voucher-delete') ? 'Menghapus...' : 'Ya, Hapus Voucher' }}
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
        class="bg-white border-4 border-black max-w-2xl w-full rounded-[2px] shadow-neo-xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div class="bg-neo-yellow border-b-3 border-black p-4 flex items-center justify-between">
          <h3 class="font-outfit font-black text-base text-black uppercase">DETAIL PESANAN</h3>
          <button
            class="w-8 h-8 rounded-[2px] bg-white border-2 border-black flex items-center justify-center font-outfit font-black text-sm hover:bg-black hover:text-white"
            @click="showAdminOrderModal = false"
          >
            X
          </button>
        </div>

        <div class="p-5 overflow-y-auto space-y-4">
          <div
            v-if="adminOrderDetailLoading"
            class="flex items-center gap-2 font-sans text-xs font-bold text-muted-foreground"
          >
            <span
              class="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin"
            ></span>
            Memuat detail pesanan...
          </div>

          <template v-else-if="adminOrderDetail">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="font-outfit font-black text-lg"
                >#{{ adminOrderDetail.invoice_number }}</span
              >
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
                  {{ adminOrderDetail.customer?.email || '—' }}
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
              <p>
                <span class="text-muted-foreground">Resi:&nbsp;</span>
                <span class="font-mono ml-1">
                  {{ adminOrderDetail.shipping?.tracking_number || 'Belum diterbitkan' }}
                </span>
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
              <p v-if="adminOrderDetail.payment?.va_number">
                <span class="text-muted-foreground">VA:</span>
                <span class="font-mono">{{ adminOrderDetail.payment.va_number }}</span>
              </p>
              <p v-if="adminOrderDetail.payment?.bill_key">
                <span class="text-muted-foreground">Kode bayar:</span>
                <span class="font-mono">{{ adminOrderDetail.payment.bill_key }}</span>
              </p>
              <p v-if="adminOrderDetail.payment?.payment_code">
                <span class="text-muted-foreground">Kode:</span>
                <span class="font-mono">{{ adminOrderDetail.payment.payment_code }}</span>
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

            <div class="overflow-x-auto">
              <table class="w-full text-xs font-sans border-collapse">
                <thead>
                  <tr class="bg-black text-white font-outfit font-black text-left">
                    <th class="p-2">BUKU</th>
                    <th class="p-2 text-center">QTY</th>
                    <th class="p-2 text-right">HARGA</th>
                    <th class="p-2 text-right">SUBTOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in adminOrderDetail.items || []"
                    :key="item.book_id"
                    class="border-b border-black/10"
                  >
                    <td class="p-2 font-bold">{{ item.title }}</td>
                    <td class="p-2 text-center">{{ item.quantity }}</td>
                    <td class="p-2 text-right">{{ formatRupiah(item.price) }}</td>
                    <td class="p-2 text-right font-bold">
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

        <div class="bg-background border-t-3 border-black p-3 text-right">
          <button
            class="neubrutal-btn bg-black text-white border-2 border-black px-5 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-neutral-800"
            @click="showAdminOrderModal = false"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showPeopleModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="showPeopleModal = false"
    >
      <div
        class="bg-white border-4 border-black max-w-md w-full rounded-[2px] shadow-neo-xl overflow-hidden"
      >
        <div class="bg-neo-yellow border-b-3 border-black p-4 flex items-center justify-between">
          <h3 class="font-outfit font-black text-base text-black uppercase">
            {{ isEditPeople ? 'EDIT' : 'TAMBAH' }}
            {{ peopleType === 'author' ? 'PENULIS' : 'PENERBIT' }}
          </h3>
          <button
            class="w-8 h-8 rounded-[2px] bg-white border-2 border-black flex items-center justify-center font-outfit font-black text-sm hover:bg-black hover:text-white"
            @click="showPeopleModal = false"
          >
            X
          </button>
        </div>

        <form class="p-6 space-y-4" @submit.prevent="handleSavePeople">
          <div>
            <label class="block font-outfit font-black text-xs uppercase mb-1">Nama *</label>
            <input
              v-model="peopleForm.name"
              type="text"
              required
              maxlength="150"
              class="w-full bg-background border-2 border-black p-2.5 font-outfit font-bold text-sm outline-none shadow-neo-sm"
            />
          </div>

          <div v-if="peopleType === 'author'">
            <label class="block font-outfit font-black text-xs uppercase mb-1">Biografi</label>
            <textarea
              v-model="peopleForm.bio"
              rows="3"
              maxlength="2000"
              class="w-full bg-background border-2 border-black p-2.5 font-sans text-xs outline-none shadow-neo-sm resize-none"
            ></textarea>
          </div>

          <div class="border-t-2 border-black pt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              class="neubrutal-btn bg-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100"
              @click="showPeopleModal = false"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="isBusy('people-save')"
              class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-5 py-2 font-outfit font-black text-xs shadow-neo hover:bg-yellow-300 disabled:opacity-60"
            >
              {{ isBusy('people-save') ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div
      v-if="showDeletePeopleConfirm && peopleToDelete"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="showDeletePeopleConfirm = false"
    >
      <div
        class="bg-white border-4 border-black max-w-sm w-full rounded-[2px] shadow-neo-xl p-5 space-y-4 text-center"
      >
        <h3 class="font-outfit font-black text-base text-black">
          Hapus {{ peopleToDelete.type === 'author' ? 'Penulis' : 'Penerbit' }}?
        </h3>
        <p class="font-sans text-xs text-muted-foreground">
          "<strong>{{ peopleToDelete.item.name }}</strong
          >" akan dihapus dari sistem.
        </p>

        <div class="flex items-center justify-center gap-2 pt-2">
          <button
            class="neubrutal-btn bg-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100"
            @click="showDeletePeopleConfirm = false"
          >
            Batal
          </button>
          <button
            :disabled="isBusy('people-delete')"
            class="neubrutal-btn bg-red-500 text-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo hover:bg-red-600 disabled:opacity-60"
            @click="executeDeletePeople"
          >
            {{ isBusy('people-delete') ? 'Menghapus...' : 'Ya, Hapus' }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showPaymentModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="closePaymentModal"
    >
      <div
        class="bg-white border-4 border-black max-w-xl w-full rounded-[2px] shadow-neo-xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div class="bg-neo-yellow border-b-3 border-black p-4 flex items-center justify-between">
          <div>
            <h3 class="font-outfit font-black text-base text-black uppercase">
              EDIT METODE PEMBAYARAN
            </h3>
            <p class="font-mono text-[10px] text-black/70">{{ paymentForm.code }}</p>
          </div>
          <button
            class="w-8 h-8 rounded-[2px] bg-white border-2 border-black flex items-center justify-center font-outfit font-black text-sm hover:bg-black hover:text-white"
            @click="closePaymentModal"
          >
            X
          </button>
        </div>

        <form class="p-6 overflow-y-auto space-y-4" @submit.prevent="handleSavePayment">
          <div>
            <label class="block font-outfit font-black text-xs uppercase mb-1"
              >Nama Tampilan *</label
            >
            <input
              v-model="paymentForm.name"
              type="text"
              required
              maxlength="150"
              class="w-full bg-background border-2 border-black p-2.5 font-outfit font-bold text-sm outline-none shadow-neo-sm"
            />
          </div>

          <div>
            <label class="block font-outfit font-black text-xs uppercase mb-1"
              >Deskripsi Singkat</label
            >
            <textarea
              v-model="paymentForm.description"
              rows="2"
              class="w-full bg-background border-2 border-black p-2.5 font-sans text-xs outline-none shadow-neo-sm resize-none"
            ></textarea>
          </div>

          <div class="border-2 border-black p-3 bg-surface space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-outfit font-black text-xs uppercase">Logo Pembayaran</span>
              <span
                v-if="paymentForm.image"
                class="bg-neo-lime border border-black px-2 py-0.5 font-outfit font-black text-[9px] uppercase"
              >
                Terpasang
              </span>
            </div>

            <input
              ref="paymentLogoInput"
              type="file"
              accept=".png, .jpg, .jpeg, .webp, image/png, image/jpeg, image/webp"
              class="hidden"
              @change="handlePaymentLogoChange"
            />

            <div class="flex items-center gap-3">
              <div
                class="w-16 h-16 border-2 border-black bg-white shrink-0 flex items-center justify-center overflow-hidden"
              >
                <img
                  v-if="paymentForm.image"
                  :src="assetUrl(paymentForm.image)"
                  alt="Logo pembayaran"
                  class="w-full h-full object-contain p-1"
                />
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  :disabled="uploadingPaymentLogo"
                  class="neubrutal-btn bg-white border-2 border-black px-3 py-1.5 font-outfit font-black text-xs shadow-neo-sm hover:bg-neo-yellow disabled:opacity-60"
                  @click="paymentLogoInput?.click()"
                >
                  {{ uploadingPaymentLogo ? 'Mengunggah...' : 'Unggah Logo' }}
                </button>
                <button
                  v-if="paymentForm.image"
                  type="button"
                  class="neubrutal-btn bg-white text-red-600 border-2 border-black px-3 py-1.5 font-outfit font-black text-xs shadow-neo-sm hover:bg-red-50"
                  @click="removePaymentLogo"
                >
                  Hapus Logo
                </button>
              </div>
            </div>

            <input
              v-model="paymentForm.image"
              type="text"
              placeholder="/payments/bca_logo.svg"
              class="w-full bg-white border-2 border-black p-2 font-mono text-[11px] outline-none shadow-neo-sm"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Tipe Biaya</label>
              <select
                v-model="paymentForm.feeType"
                class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-xs outline-none shadow-neo-sm cursor-pointer"
              >
                <option value="fixed">Nominal Tetap</option>
                <option value="percentage">Persentase</option>
              </select>
            </div>
            <div v-if="paymentForm.feeType === 'fixed'">
              <label class="block font-outfit font-black text-xs uppercase mb-1"
                >Nominal (Rp)</label
              >
              <input
                v-model="paymentForm.feeAmount"
                type="number"
                min="0"
                class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-xs outline-none shadow-neo-sm"
              />
            </div>
            <div v-else>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Persentase</label>
              <input
                v-model="paymentForm.feePercent"
                type="number"
                min="0"
                step="0.0001"
                class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-xs outline-none shadow-neo-sm"
              />
              <p class="font-sans text-[10px] text-muted-foreground mt-1">
                Gunakan desimal, mis. 0.007 untuk 0,7%.
              </p>
            </div>
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              v-model="paymentForm.isActive"
              type="checkbox"
              class="w-4 h-4 border-2 border-black accent-black rounded-[2px]"
            />
            <span class="font-sans text-xs font-bold">Aktif untuk checkout</span>
          </label>

          <div class="border-t-2 border-black pt-3 space-y-3">
            <div class="flex items-center justify-between">
              <span class="font-outfit font-black text-xs uppercase">Instruksi Pembayaran</span>
              <button
                type="button"
                class="neubrutal-btn bg-white border-2 border-black px-2.5 py-1 font-outfit font-black text-[10px] shadow-neo-sm hover:bg-neo-yellow"
                @click="addInstructionSection"
              >
                + Bagian
              </button>
            </div>

            <div
              v-for="(section, index) in paymentForm.instructions"
              :key="index"
              class="border-2 border-black p-3 space-y-2 bg-white"
            >
              <div class="flex items-center gap-2">
                <input
                  v-model="section.title"
                  type="text"
                  placeholder="Judul bagian (mis. Melalui ATM BCA)"
                  class="flex-1 bg-background border-2 border-black p-2 font-outfit font-bold text-xs outline-none shadow-neo-sm"
                />
                <button
                  type="button"
                  class="w-7 h-7 border-2 border-black bg-red-100 text-red-700 font-outfit font-black text-xs hover:bg-red-200"
                  aria-label="Hapus bagian"
                  @click="removeInstructionSection(index)"
                >
                  X
                </button>
              </div>
              <textarea
                v-model="section.steps"
                rows="3"
                placeholder="Satu langkah per baris"
                class="w-full bg-background border-2 border-black p-2 font-sans text-xs outline-none shadow-neo-sm resize-none"
              ></textarea>
            </div>
          </div>

          <div class="border-t-2 border-black pt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              class="neubrutal-btn bg-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100"
              @click="closePaymentModal"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="savingPayment"
              class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-5 py-2 font-outfit font-black text-xs shadow-neo hover:bg-yellow-300 disabled:opacity-60"
            >
              {{ savingPayment ? 'Menyimpan...' : 'Simpan Perubahan' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
