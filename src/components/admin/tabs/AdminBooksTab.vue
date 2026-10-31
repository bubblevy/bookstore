<script setup>
import { ref, computed, watch } from 'vue'
import { api } from '@/lib/api'
import { assetUrl } from '@/lib/assets'
import { localizeApiError } from '@/lib/errors'
import { mapBook } from '@/lib/mappers'
import { useStore } from '@/composables/useStore'
import BookCover from '@/components/BookCover.vue'

const props = defineProps({
  books: {
    type: Array,
    default: () => [],
  },
  categories: {
    type: Array,
    default: () => [],
  },
  authors: {
    type: Array,
    default: () => [],
  },
  publishers: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
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

const failedBookCovers = ref({})
const bookSearch = ref('')
const selectedCategory = ref('all')
const bookSort = ref('newest')

const filteredBooks = computed(() => {
  return props.books
    .filter((book) => {
      const matchCat = selectedCategory.value === 'all' || book.category === selectedCategory.value
      const query = bookSearch.value.toLowerCase().trim()
      const matchSearch =
        !query ||
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        (book.publisher && book.publisher.toLowerCase().includes(query))
      return matchCat && matchSearch
    })
    .sort((a, b) => {
      if (bookSort.value === 'sold-high') return (b.sold || 0) - (a.sold || 0)
      if (bookSort.value === 'price-low') return a.price - b.price
      if (bookSort.value === 'price-high') return b.price - a.price
      if (bookSort.value === 'stock-low') return (a.stock || 0) - (b.stock || 0)
      if (bookSort.value === 'stock-high') return (b.stock || 0) - (a.stock || 0)
      return 0
    })
})

const booksPage = ref(1)
const booksPerPage = ref(10)
const totalBookPages = computed(() =>
  Math.max(1, Math.ceil(filteredBooks.value.length / booksPerPage.value)),
)
const paginatedBooks = computed(() => {
  const start = (booksPage.value - 1) * booksPerPage.value
  return filteredBooks.value.slice(start, start + booksPerPage.value)
})
const visibleBookPages = computed(() => generatePagination(totalBookPages.value, booksPage.value))

function changeBookPage(p) {
  if (p === '...' || p === booksPage.value) return
  if (p < 1 || p > totalBookPages.value) return
  booksPage.value = p
}

watch([bookSearch, selectedCategory, bookSort], () => {
  booksPage.value = 1
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
  price: '',
  originalPrice: '',
  stock: '',
  weightGrams: '',
  coverImage: '',
  isbn: '',
  description: '',
  pages: '',
  publicationYear: '',
  language: 'Indonesia',
  length: '',
  width: '',
  height: '',
  condition: '100% Baru & Segel Penerbit',
  isActive: true,
})
const uploadingCover = ref(false)
const draftCover = ref(null)
const localCoverPreview = ref('')

async function discardDraftCover() {
  if (localCoverPreview.value && localCoverPreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(localCoverPreview.value)
    localCoverPreview.value = ''
  }
  const draft = draftCover.value
  draftCover.value = null
  if (!draft?.key) return
  try {
    await api.deleteUpload({ file_key: draft.key })
  } catch {
    // Clean up orphaned upload on failure without blocking the form.
  }
}

async function processImageFile(file) {
  if (!file) return
  if (!file.type.startsWith('image/')) {
    showToast('Harap pilih berkas gambar yang valid (JPG, PNG, WebP).', { type: 'error' })
    return
  }
  if (localCoverPreview.value && localCoverPreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(localCoverPreview.value)
  }
  localCoverPreview.value = URL.createObjectURL(file)
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
  if (localCoverPreview.value && localCoverPreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(localCoverPreview.value)
  }
  localCoverPreview.value = ''
  const draft = draftCover.value
  bookForm.value.coverImage = ''
  draftCover.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
  if (draft?.key) {
    try {
      await api.deleteUpload({ file_key: draft.key })
    } catch {
          }
  }
}

function closeBookModal() {
  if (localCoverPreview.value && localCoverPreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(localCoverPreview.value)
    localCoverPreview.value = ''
  }
  discardDraftCover()
  showBookModal.value = false
}

function openAddBook() {
  if (localCoverPreview.value && localCoverPreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(localCoverPreview.value)
  }
  localCoverPreview.value = ''
  discardDraftCover()
  isEditMode.value = false
  currentBookId.value = null
  bookForm.value = {
    title: '',
    subtitle: '',
    authorId: '',
    categoryId: '',
    publisherId: '',
    price: '',
    originalPrice: '',
    stock: '',
    weightGrams: '',
    coverImage: '',
    isbn: '',
    description: '',
    pages: '',
    publicationYear: '',
    language: 'Indonesia',
    length: '',
    width: '',
    height: '',
    condition: '100% Baru & Segel Penerbit',
    isActive: true,
  }
  if (fileInputRef.value) fileInputRef.value.value = ''
  showBookModal.value = true
}

async function openEditBook(book) {
  if (localCoverPreview.value && localCoverPreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(localCoverPreview.value)
  }
  localCoverPreview.value = ''
  discardDraftCover()
  let detail = book
  if (book.slug) {
    try {
      const response = await api.book(book.slug)
      if (response.data) detail = mapAdminBook(response.data)
    } catch {
      // Fall back to list data if detail request fails.
    }
  }
  isEditMode.value = true
  currentBookId.value = detail.rawId || detail.id
  bookForm.value = {
    title: detail.title || '',
    subtitle: detail.subtitle || '',
    authorId: detail.authorId || '',
    categoryId: detail.categoryId || '',
    publisherId: detail.publisherId || '',
    price: detail.price ?? '',
    originalPrice: detail.originalPrice ?? '',
    stock: detail.stock ?? '',
    weightGrams: detail.weightGrams ?? '',
    coverImage: detail.coverImage || '',
    isbn: detail.isbn || '',
    description: detail.description || '',
    pages: detail.pages ?? '',
    publicationYear: detail.publicationYear ?? '',
    language: detail.language || 'Indonesia',
    length: detail.length ?? '',
    width: detail.width ?? '',
    height: detail.height ?? '',
    condition: detail.condition || '100% Baru & Segel Penerbit',
    isActive: detail.isActive !== false,
  }
  if (fileInputRef.value) fileInputRef.value.value = ''
  showBookModal.value = true
}

async function handleSaveBook() {
  if (
    !bookForm.value.title?.trim() ||
    !bookForm.value.categoryId ||
    !bookForm.value.authorId ||
    !bookForm.value.publisherId ||
    !bookForm.value.isbn?.trim() ||
    !bookForm.value.description?.trim() ||
    !bookForm.value.coverImage ||
    bookForm.value.price === '' ||
    bookForm.value.price === null ||
    bookForm.value.stock === '' ||
    bookForm.value.stock === null ||
    bookForm.value.weightGrams === '' ||
    bookForm.value.weightGrams === null ||
    bookForm.value.pages === '' ||
    bookForm.value.pages === null ||
    bookForm.value.publicationYear === '' ||
    bookForm.value.publicationYear === null ||
    bookForm.value.length === '' ||
    bookForm.value.length === null ||
    bookForm.value.width === '' ||
    bookForm.value.width === null ||
    bookForm.value.height === '' ||
    bookForm.value.height === null
  ) {
    showToast('Lengkapi seluruh data wajib: Judul, ISBN, Kategori, Penulis, Penerbit, Harga, Stok, Berat, Halaman, Tahun, Dimensi (P×L×T), Sinopsis, dan Sampul.', {
      type: 'error',
    })
    return
  }

  if (bookForm.value.description.trim().length < 5) {
    showToast('Deskripsi / Sinopsis buku minimal 5 karakter sesuai spesifikasi API.', {
      type: 'error',
    })
    return
  }

  const pubYear = Number(bookForm.value.publicationYear)
  if (pubYear < 1000 || pubYear > 2100) {
    showToast('Tahun terbit harus antara tahun 1000 dan 2100.', {
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
    original_price:
      bookForm.value.originalPrice !== '' && bookForm.value.originalPrice !== null
        ? Number(bookForm.value.originalPrice)
        : Number(bookForm.value.price) || 0,
    discount_percentage: Math.max(
      0,
      Math.min(
        100,
        Number(bookForm.value.discountPercentage) ||
          Math.round(
            ((Number(bookForm.value.originalPrice || bookForm.value.price) -
              Number(bookForm.value.price)) /
              Number(bookForm.value.originalPrice || bookForm.value.price || 1)) *
              100,
          ),
      ),
    ),
    weight_grams: Number(bookForm.value.weightGrams) || 1,
    pages: Math.max(1, Number(bookForm.value.pages) || 1),
    publication_year: pubYear,
    language: bookForm.value.language || 'Indonesia',
    length: Math.max(0.1, Number(bookForm.value.length) || 1),
    width: Math.max(0.1, Number(bookForm.value.width) || 1),
    height: Math.max(0.1, Number(bookForm.value.height) || 1),
    condition: bookForm.value.condition || '100% Baru & Segel Penerbit',
    stock: Math.max(0, Number(bookForm.value.stock) || 0),
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
    emit('refresh')
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
    emit('refresh')
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
  const book = props.books.find(
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
    emit('refresh')
    showToast('Stok buku diperbarui.', { type: 'info' })
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal memperbarui stok'), { type: 'error' })
  } finally {
    setBusy(`stock-${bookId}`, false)
  }
}
</script>

<template>
  <div class="space-y-6">
        <div
          class="bg-white border-2 sm:border-3 border-black p-3 sm:p-4 rounded-[2px] shadow-neo-sm flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4"
        >
          <div class="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 flex-1">
            <div class="relative w-full sm:flex-1 sm:max-w-md">
              <input
                v-model="bookSearch"
                type="text"
                placeholder="Cari judul, penulis, atau penerbit..."
                class="w-full bg-background border-2 border-black p-2 pl-3 rounded-[2px] font-outfit font-bold text-xs outline-none shadow-neo-sm focus:border-black"
              />
            </div>

                        <div class="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-2">
              <div class="relative w-full sm:w-auto">
                <select
                  v-model="selectedCategory"
                  class="w-full appearance-none bg-white border-2 border-black rounded-[2px] pl-3 pr-8 py-2 font-outfit font-bold text-xs shadow-neo-sm hover:bg-neutral-50 focus:outline-none focus:border-black cursor-pointer transition-all"
                >
                  <option value="all">Semua Kategori</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.name">
                    {{ cat.name }}
                  </option>
                </select>
                <div class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-black">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </div>

                            <div class="relative w-full sm:w-auto">
                <select
                  v-model="bookSort"
                  class="w-full appearance-none bg-white border-2 border-black rounded-[2px] pl-3 pr-8 py-2 font-outfit font-bold text-xs shadow-neo-sm hover:bg-neutral-50 focus:outline-none focus:border-black cursor-pointer transition-all"
                >
                  <option value="newest">Urutan Standar</option>
                  <option value="sold-high">Terlaris (Terjual Terbanyak)</option>
                  <option value="price-low">Harga: Termurah</option>
                  <option value="price-high">Harga: Termahal</option>
                  <option value="stock-low">Stok: Sedikit ke Banyak</option>
                  <option value="stock-high">Stok: Banyak ke Sedikit</option>
                </select>
                <div class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-black">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <button
            class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-4 py-2 rounded-[2px] font-outfit font-black text-xs shadow-neo-sm hover:bg-yellow-300 w-full md:w-auto text-center shrink-0 cursor-pointer"
            @click="openAddBook"
          >
            + Tambah Buku Baru
          </button>
        </div>

        <div class="bg-white border-2 sm:border-3 border-black rounded-[2px] shadow-neo-sm overflow-hidden">
          <div class="overflow-x-auto table-scrollbar">
            <table class="w-full min-w-[860px] text-xs font-sans border-collapse">
              <thead>
                <tr class="bg-black text-white font-outfit font-black text-left">
                  <th class="p-3 w-16 whitespace-nowrap">COVER</th>
                  <th class="p-3 whitespace-nowrap min-w-[200px]">JUDUL, PENULIS & PENERBIT</th>
                  <th class="p-3 whitespace-nowrap">KATEGORI</th>
                  <th class="p-3 whitespace-nowrap">HARGA</th>
                  <th class="p-3 text-center whitespace-nowrap">TERJUAL</th>
                  <th class="p-3 text-center whitespace-nowrap">STOK</th>
                  <th class="p-3 text-center whitespace-nowrap">STATUS</th>
                  <th class="p-3 text-right whitespace-nowrap shrink-0">AKSI</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="8" class="p-8 text-center bg-gray-50/50">
                    <div class="inline-flex items-center justify-center gap-2.5">
                      <span
                        class="inline-block w-4 h-4 rounded-[2px] border-2 border-black border-t-transparent animate-spin shrink-0"
                      ></span>
                      <span class="font-outfit font-black text-sm text-black">
                        Memuat katalog buku...
                      </span>
                    </div>
                  </td>
                </tr>
                <tr v-else-if="filteredBooks.length === 0">
                  <td colspan="8" class="p-8 text-center bg-gray-50/50">
                    <p class="font-outfit font-black text-sm text-black">Tidak Ada Buku Ditemukan</p>
                    <p class="font-sans text-xs text-muted-foreground mt-1">
                      Coba sesuaikan kata kunci pencarian atau filter kategori.
                    </p>
                  </td>
                </tr>
                <template v-else>
                  <tr
                    v-for="book in paginatedBooks"
                    :key="book.id"
                    class="border-b border-black/10 hover:bg-gray-50 transition-colors"
                  >
                  <td class="p-3 w-16 shrink-0">
                    <div
                      class="w-12 h-16 bg-white border-2 border-black rounded-[2px] shadow-neo-sm overflow-hidden flex items-center justify-center"
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
                  <td class="p-3 min-w-[200px]">
                    <h4 class="font-outfit font-black text-sm text-black line-clamp-1">
                      {{ book.title }}
                    </h4>
                    <div class="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span class="font-sans text-xs text-muted-foreground">{{ book.author || 'Tanpa Penulis' }}</span>
                      <span v-if="book.publisher" class="text-neutral-400 text-xs">·</span>
                      <span
                        v-if="book.publisher"
                        class="bg-neutral-100 border border-black/20 px-1.5 py-0.2 rounded-[2px] text-[10px] text-neutral-700 font-medium"
                      >
                        {{ book.publisher }}
                      </span>
                    </div>
                  </td>
                  <td class="p-3 whitespace-nowrap">
                    <span
                      class="bg-neutral-100 border border-black/40 px-2 py-1 font-outfit font-bold text-[11px] rounded-[2px]"
                    >
                      {{ book.category }}
                    </span>
                  </td>
                  <td class="p-3 whitespace-nowrap">
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
                  <td class="p-3 text-center whitespace-nowrap">
                    <span class="font-outfit font-black text-xs text-black">
                      {{ book.sold || 0 }}
                    </span>
                  </td>
                  <td class="p-3 text-center whitespace-nowrap">
                    <span
                      class="font-outfit font-black px-2.5 py-1 rounded-[2px] border border-black min-w-[36px] inline-block text-center shadow-neo-xs text-xs"
                      :class="
                        (book.stock || 0) <= 5
                          ? 'bg-red-400 text-white'
                          : 'bg-neo-lime text-black'
                      "
                    >
                      {{ book.stock || 0 }}
                    </span>
                  </td>
                  <td class="p-3 text-center whitespace-nowrap">
                    <span
                      class="px-2.5 py-1 border border-black rounded-[2px] font-outfit font-bold text-[10px] uppercase inline-block shadow-neo-xs"
                      :class="
                        book.isActive ? 'bg-neo-lime text-black' : 'bg-neutral-200 text-neutral-600'
                      "
                    >
                      {{ book.isActive ? 'Aktif' : 'Nonaktif' }}
                    </span>
                  </td>
                  <td class="p-3 text-right whitespace-nowrap shrink-0">
                    <div class="flex items-center justify-end gap-1.5 whitespace-nowrap">
                      <button
                        class="neubrutal-btn bg-white border border-black px-2.5 py-1 font-outfit font-black text-xs shadow-neo-sm hover:bg-neo-yellow cursor-pointer"
                        @click="openEditBook(book)"
                      >
                        Edit
                      </button>
                      <button
                        class="neubrutal-btn bg-red-100 text-red-700 border border-black px-2.5 py-1 font-outfit font-black text-xs shadow-neo-sm hover:bg-red-200 cursor-pointer"
                        @click="confirmDeleteBook(book)"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
            </table>
          </div>

                    <div
            v-if="filteredBooks.length > 0"
            class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 border-t-2 border-black bg-neutral-50"
          >
            <div class="text-xs font-sans font-bold text-neutral-600 text-center sm:text-left">
              Halaman <span class="font-outfit font-black text-black">{{ booksPage }}</span> dari
              <span class="font-outfit font-black text-black">{{ totalBookPages }}</span>
              <span class="text-neutral-400 mx-1">·</span>
              Total {{ filteredBooks.length }} buku
            </div>

            <div v-if="totalBookPages > 1" class="flex flex-wrap items-center justify-center sm:justify-end gap-1.5">
              <button
                type="button"
                :disabled="booksPage <= 1"
                class="neubrutal-btn px-2.5 sm:px-3 py-1.5 rounded-[2px] border-2 border-black font-outfit font-black text-xs transition-all flex items-center gap-1 cursor-pointer"
                :class="[
                  booksPage <= 1
                    ? 'bg-neutral-100 text-neutral-400 border-neutral-300 cursor-not-allowed shadow-none'
                    : 'bg-white text-black hover:bg-neo-yellow shadow-neo-xs hover:shadow-neo-sm',
                ]"
                @click="changeBookPage(booksPage - 1)"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
                <span>Prev</span>
              </button>

              <button
                v-for="p in visibleBookPages"
                :key="`book-page-${p}`"
                type="button"
                :disabled="p === '...'"
                class="w-8 h-8 rounded-[2px] border-2 border-black font-outfit font-black text-xs transition-all flex items-center justify-center cursor-pointer"
                :class="[
                  p === booksPage
                    ? 'bg-black text-white shadow-neo-xs'
                    : p === '...'
                      ? 'border-transparent text-neutral-400 cursor-default shadow-none'
                      : 'bg-white text-black hover:bg-neutral-100 shadow-neo-xs hover:shadow-neo-sm',
                ]"
                @click="p !== '...' && changeBookPage(p)"
              >
                {{ p }}
              </button>

              <button
                type="button"
                :disabled="booksPage >= totalBookPages"
                class="neubrutal-btn px-2.5 sm:px-3 py-1.5 rounded-[2px] border-2 border-black font-outfit font-black text-xs transition-all flex items-center gap-1 cursor-pointer"
                :class="[
                  booksPage >= totalBookPages
                    ? 'bg-neutral-100 text-neutral-400 border-neutral-300 cursor-not-allowed shadow-none'
                    : 'bg-white text-black hover:bg-neo-yellow shadow-neo-xs hover:shadow-neo-sm',
                ]"
                @click="changeBookPage(booksPage + 1)"
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
      v-if="showBookModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="closeBookModal"
    >
      <div
        class="bg-white border-2 sm:border-3 border-black max-w-2xl w-full rounded-[2px] shadow-neo-sm overflow-hidden max-h-[90vh] flex flex-col animate-hero-entrance"
      >
        <div class="bg-neo-yellow border-b-2 sm:border-b-3 border-black p-3.5 sm:p-4 flex items-center justify-between shrink-0">
          <div>
            <h3 class="font-outfit font-black text-sm sm:text-base text-black uppercase tracking-wide">
              {{ isEditMode ? 'EDIT DATA BUKU' : 'TAMBAH BUKU BARU' }}
            </h3>
            <p class="font-sans text-[11px] text-black/70 mt-0.5">
              {{ isEditMode ? 'Perbarui informasi detail buku, harga, stok, dan spesifikasi katalog.' : 'Lengkapi data buku baru, penulis, penerbit, harga, stok, dan spesifikasi katalog.' }}
            </p>
          </div>
          <button
            type="button"
            class="w-8 h-8 rounded-[2px] bg-white border-2 border-black flex items-center justify-center font-outfit font-black text-sm hover:bg-black hover:text-white transition-colors cursor-pointer"
            @click="closeBookModal"
          >
            ✕
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
              class="w-full bg-background border-2 border-black p-2.5 rounded-[2px] font-outfit font-bold text-sm outline-none shadow-neo-sm focus:border-black"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Penulis *</label>
              <div class="relative">
                <select
                  v-model="bookForm.authorId"
                  required
                  class="w-full appearance-none bg-white border-2 border-black rounded-[2px] p-2.5 pr-9 font-outfit font-bold text-xs sm:text-sm outline-none shadow-neo-sm focus:border-black cursor-pointer transition-all"
                >
                  <option value="" disabled>Pilih penulis</option>
                  <option v-for="author in authors" :key="author.id" :value="author.id">
                    {{ author.name }}
                  </option>
                </select>
                <div class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </div>
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Penerbit *</label>
              <div class="relative">
                <select
                  v-model="bookForm.publisherId"
                  required
                  class="w-full appearance-none bg-white border-2 border-black rounded-[2px] p-2.5 pr-9 font-outfit font-bold text-xs sm:text-sm outline-none shadow-neo-sm focus:border-black cursor-pointer transition-all"
                >
                  <option value="" disabled>Pilih penerbit</option>
                  <option
                    v-for="publisher in publishers"
                    :key="publisher.id"
                    :value="publisher.id"
                  >
                    {{ publisher.name }}
                  </option>
                </select>
                <div class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label class="block font-outfit font-black text-xs uppercase mb-1">Kategori *</label>
            <div class="relative">
              <select
                v-model="bookForm.categoryId"
                required
                class="w-full appearance-none bg-white border-2 border-black rounded-[2px] p-2.5 pr-9 font-outfit font-bold text-xs sm:text-sm outline-none shadow-neo-sm focus:border-black cursor-pointer transition-all"
              >
                <option value="" disabled>Pilih kategori</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </option>
              </select>
              <div class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>
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
                v-if="uploadingCover"
                class="bg-neo-yellow text-black border border-black px-2 py-0.5 font-outfit font-black text-[9px] uppercase rounded-[2px]"
              >
                Mengunggah...
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
              v-if="localCoverPreview || bookForm.coverImage"
              class="border-2 border-black bg-white p-3.5 rounded-[2px] shadow-neo-sm flex flex-col sm:flex-row items-center gap-4"
              @dragover.prevent
              @drop.prevent="handleDrop"
            >
              <div
                class="w-24 h-32 bg-white border-2 border-black rounded-[2px] shadow-neo shrink-0 overflow-hidden relative flex items-center justify-center"
              >
                <img
                  :src="localCoverPreview || assetUrl(bookForm.coverImage)"
                  alt="Pratinjau Sampul Buku"
                  class="w-full h-full object-cover"
                  loading="lazy"
                  crossorigin="anonymous"
                  referrerpolicy="no-referrer"
                />
              </div>

              <div class="flex-1 w-full space-y-2 text-center sm:text-left">
                <div>
                  <div class="flex items-center justify-center sm:justify-start gap-2">
                    <span class="font-outfit font-black text-xs text-black">
                      {{ uploadingCover ? 'Mengunggah Berkas...' : 'Sampul Berhasil Dimuat' }}
                    </span>
                    <span
                      :class="uploadingCover ? 'bg-neo-yellow' : 'bg-neo-lime'"
                      class="text-black border border-black px-1.5 py-0.2 text-[9px] font-outfit font-bold rounded-[2px]"
                    >
                      {{ uploadingCover ? 'Proses' : 'Siap' }}
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
                placeholder="Contoh: 250"
                class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-sm outline-none focus:border-black shadow-neo-sm"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Halaman *</label>
              <input
                v-model="bookForm.pages"
                type="number"
                min="1"
                required
                placeholder="Contoh: 150"
                class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-sm outline-none shadow-neo-sm"
              />
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Tahun Terbit *</label>
              <input
                v-model="bookForm.publicationYear"
                type="number"
                min="1000"
                max="2100"
                required
                placeholder="Contoh: 2024"
                class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-sm outline-none shadow-neo-sm"
              />
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1"
                >Panjang (cm) *</label
              >
              <input
                v-model="bookForm.length"
                type="number"
                step="0.1"
                min="0.1"
                required
                placeholder="Contoh: 20"
                class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-sm outline-none shadow-neo-sm"
              />
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Lebar (cm) *</label>
              <input
                v-model="bookForm.width"
                type="number"
                step="0.1"
                min="0.1"
                required
                placeholder="Contoh: 13.5"
                class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-sm outline-none shadow-neo-sm"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Tinggi (cm) *</label>
              <input
                v-model="bookForm.height"
                type="number"
                step="0.1"
                min="0.1"
                required
                placeholder="Contoh: 2"
                class="w-full bg-background border-2 border-black p-2 font-outfit font-bold text-sm outline-none shadow-neo-sm"
              />
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">
                Status Katalog
              </label>
              <div class="relative">
                <select
                  v-model="bookForm.isActive"
                  class="w-full bg-background border-2 border-black p-2 pr-8 font-outfit font-bold text-sm outline-none focus:border-black shadow-neo-sm cursor-pointer appearance-none rounded-[2px]"
                >
                  <option :value="true">Aktif</option>
                  <option :value="false">Nonaktif</option>
                </select>
                <div
                  class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-black"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="m19.5 8.25-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label class="block font-outfit font-black text-xs uppercase mb-1"
              >Deskripsi Singkat / Sinopsis *</label
            >
            <textarea
              v-model="bookForm.description"
              rows="3"
              required
              minlength="5"
              placeholder="Tuliskan sinopsis buku, pengenalan karakter, atau deskripsi singkat isi buku (minimal 5 karakter)..."
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
              class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-5 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-yellow-300 disabled:opacity-60"
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
      v-if="showDeleteConfirm && bookToDelete"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="showDeleteConfirm = false"
    >
      <div
        class="bg-white border-2 sm:border-3 border-black max-w-sm w-full rounded-[2px] shadow-neo-sm overflow-hidden animate-hero-entrance p-5 space-y-4 text-center"
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
            class="neubrutal-btn bg-red-500 text-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-red-600 disabled:opacity-60"
            @click="executeDeleteBook"
          >
            {{ isBusy('book-delete') ? 'Menghapus...' : 'Ya, Hapus Buku' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
