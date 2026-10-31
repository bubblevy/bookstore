<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from '@/composables/useStore'
import { assetUrl } from '@/lib/assets'
import BookCard from '@/components/BookCard.vue'
import BookCover from '@/components/BookCover.vue'

const route = useRoute()
const router = useRouter()
const { state, loadBooks, toggleWishlist, isWishlisted, isWishlistPending } = useStore()

const viewMode = ref('grid')

const selectedCategory = ref('Semua')
const selectedStock = ref('Semua')
const minPrice = ref('')
const maxPrice = ref('')
const sortBy = ref('popular')

const sortOptions = [
  { value: 'popular', label: 'Paling Banyak Terjual' },
  { value: 'terbaru', label: 'Buku Terbaru' },
  { value: 'harga_asc', label: 'Harga Terendah' },
  { value: 'harga_desc', label: 'Harga Tertinggi' },
  { value: 'title_asc', label: 'Judul (A - Z)' },
  { value: 'title_desc', label: 'Judul (Z - A)' },
]

const currentSortLabel = computed(() => {
  const found = sortOptions.find((opt) => opt.value === sortBy.value)
  return found ? found.label : 'Paling Banyak Terjual'
})

const isSortDropdownOpen = ref(false)
const isMobileSortDropdownOpen = ref(false)
const sortDropdownRef = ref(null)
const mobileSortDropdownRef = ref(null)

function toggleSortDropdown() {
  isSortDropdownOpen.value = !isSortDropdownOpen.value
}

function toggleMobileSortDropdown() {
  isMobileSortDropdownOpen.value = !isMobileSortDropdownOpen.value
}

function selectSortOption(val) {
  sortBy.value = val
  isSortDropdownOpen.value = false
  isMobileSortDropdownOpen.value = false
  updateUrlQuery()
}

function handleClickOutside(event) {
  if (sortDropdownRef.value && !sortDropdownRef.value.contains(event.target)) {
    isSortDropdownOpen.value = false
  }
  if (mobileSortDropdownRef.value && !mobileSortDropdownRef.value.contains(event.target)) {
    isMobileSortDropdownOpen.value = false
  }
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    isSortDropdownOpen.value = false
    isMobileSortDropdownOpen.value = false
  }
}

const isMobileFilterOpen = ref(false)

const stockOptions = [
  { label: 'Semua Status', value: 'Semua' },
  { label: 'Stok Tersedia (In Stock)', value: 'in_stock' },
  { label: 'Sedang Promo / Diskon', value: 'discount' },
]

const pricePresets = [
  { label: 'Semua Harga', value: 'all', min: '', max: '' },
  { label: 'Di bawah Rp 50.000', value: 'under_50k', min: '', max: '50000' },
  { label: 'Rp 50.000 - Rp 100.000', value: '50k_100k', min: '50000', max: '100000' },
  { label: 'Rp 100.000 - Rp 200.000', value: '100k_200k', min: '100000', max: '200000' },
  { label: 'Di atas Rp 200.000', value: 'above_200k', min: '200000', max: '' },
]

const currentPricePreset = computed(() => {
  const min = minPrice.value ? String(minPrice.value) : ''
  const max = maxPrice.value ? String(maxPrice.value) : ''

  if (!min && !max) return 'all'
  if (!min && max === '50000') return 'under_50k'
  if (min === '50000' && max === '100000') return '50k_100k'
  if (min === '100000' && max === '200000') return '100k_200k'
  if (min === '200000' && !max) return 'above_200k'
  return 'custom'
})

function applyPricePreset(preset) {
  minPrice.value = preset.min ? String(preset.min) : ''
  maxPrice.value = preset.max ? String(preset.max) : ''
}

function clearPriceFilter() {
  minPrice.value = ''
  maxPrice.value = ''
}

const priceFilterLabel = computed(() => {
  const min = minPrice.value ? Number(minPrice.value) : null
  const max = maxPrice.value ? Number(maxPrice.value) : null

  if (min !== null && max !== null) {
    return `${formatPrice(min)} - ${formatPrice(max)}`
  }
  if (min !== null) {
    return `≥ ${formatPrice(min)}`
  }
  if (max !== null) {
    return `≤ ${formatPrice(max)}`
  }
  return ''
})

const searchQuery = computed(() => String(route.query.q || '').trim())

const categoriesList = computed(() => {
  const cats = [{ name: 'Semua', count: state.books.length }]
  state.categories.forEach((c) => {
    const bookCount = state.books.filter(
      (b) =>
        b.category?.toLowerCase() === c.name?.toLowerCase() ||
        b.categorySlug?.toLowerCase() === c.slug?.toLowerCase(),
    ).length
    cats.push({ name: c.name, slug: c.slug, count: bookCount })
  })
  return cats
})

function formatPrice(val) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(val || 0)
}

const filteredBooks = computed(() => {
  let list = [...state.books]

    const q = searchQuery.value.toLowerCase()
  if (q) {
    list = list.filter(
      (b) =>
        b.title?.toLowerCase().includes(q) ||
        b.author?.toLowerCase().includes(q) ||
        b.publisher?.toLowerCase().includes(q) ||
        b.category?.toLowerCase().includes(q) ||
        String(b.isbn || '').toLowerCase().includes(q),
    )
  }

    if (selectedCategory.value !== 'Semua') {
    const targetCat = selectedCategory.value.toLowerCase()
    list = list.filter(
      (b) =>
        b.category?.toLowerCase() === targetCat ||
        b.categorySlug?.toLowerCase() === targetCat,
    )
  }

    if (selectedStock.value === 'in_stock') {
    list = list.filter((b) => Number(b.stock) > 0)
  } else if (selectedStock.value === 'discount') {
    list = list.filter((b) => Number(b.discount) > 0)
  }

    if (minPrice.value || maxPrice.value) {
    const min = minPrice.value ? Number(minPrice.value) : 0
    const max = maxPrice.value ? Number(maxPrice.value) : Infinity
    list = list.filter((b) => {
      const p = Number(b.price) || 0
      return p >= min && p <= max
    })
  }

    if (sortBy.value === 'popular' || sortBy.value === 'terpopuler') {
    list.sort((a, b) => (Number(b.sold) || 0) - (Number(a.sold) || 0))
  } else if (sortBy.value === 'terbaru' || sortBy.value === 'newest') {
    list.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0))
  } else if (sortBy.value === 'harga_asc' || sortBy.value === 'price_asc') {
    list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0))
  } else if (sortBy.value === 'harga_desc' || sortBy.value === 'price_desc') {
    list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0))
  } else if (sortBy.value === 'title_asc') {
    list.sort((a, b) => String(a.title).localeCompare(String(b.title)))
  } else if (sortBy.value === 'title_desc') {
    list.sort((a, b) => String(b.title).localeCompare(String(a.title)))
  }

  return list
})

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

const catalogPage = ref(1)
const itemsPerPage = ref(12)

const totalCatalogPages = computed(() =>
  Math.max(1, Math.ceil(filteredBooks.value.length / itemsPerPage.value)),
)

const paginatedBooks = computed(() => {
  const start = (catalogPage.value - 1) * itemsPerPage.value
  return filteredBooks.value.slice(start, start + itemsPerPage.value)
})

const visibleCatalogPages = computed(() =>
  generatePagination(totalCatalogPages.value, catalogPage.value),
)

function changeCatalogPage(p) {
  if (p === '...' || p === catalogPage.value) return
  if (p < 1 || p > totalCatalogPages.value) return
  catalogPage.value = p
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

watch(
  [selectedCategory, selectedStock, minPrice, maxPrice, sortBy, searchQuery],
  () => {
    catalogPage.value = 1
  },
)

watch(totalCatalogPages, (newTotal) => {
  if (catalogPage.value > newTotal) {
    catalogPage.value = newTotal
  }
})

const activeFiltersCount = computed(() => {
  let count = 0
  if (searchQuery.value) count++
  if (selectedCategory.value !== 'Semua') count++
  if (selectedStock.value !== 'Semua') count++
  if (minPrice.value || maxPrice.value) count++
  return count
})

function clearSearch() {
  const query = { ...route.query }
  delete query.q
  router.replace({ path: route.path, query })
}

function resetFilters() {
  selectedCategory.value = 'Semua'
  selectedStock.value = 'Semua'
  clearPriceFilter()
  sortBy.value = 'popular'

  const query = {}
  if (viewMode.value !== 'grid') query.view = viewMode.value
  router.replace({ path: route.path, query })
}

function updateUrlQuery() {
  const query = {}
  if (searchQuery.value) query.q = searchQuery.value
  if (selectedCategory.value !== 'Semua') query.category = selectedCategory.value
  if (selectedStock.value !== 'Semua') query.stock = selectedStock.value
  if (minPrice.value) query.min_price = minPrice.value
  if (maxPrice.value) query.max_price = maxPrice.value
  if (sortBy.value !== 'popular') query.sort = sortBy.value
  if (viewMode.value !== 'grid') query.view = viewMode.value

  const isDiff =
    (query.q || '') !== (route.query.q || '') ||
    (query.category || '') !== (route.query.category || '') ||
    (query.stock || '') !== (route.query.stock || '') ||
    (query.min_price || '') !== (route.query.min_price || '') ||
    (query.max_price || '') !== (route.query.max_price || '') ||
    (query.sort || '') !== (route.query.sort || '') ||
    (query.view || '') !== (route.query.view || '')

  if (isDiff) {
    router.replace({ path: route.path, query })
  }
}

// Sync active filters to URL query parameters.
watch(
  [selectedCategory, selectedStock, minPrice, maxPrice, sortBy, viewMode],
  () => {
    updateUrlQuery()
  },
)

// Sync filter state on browser navigation.
watch(
  () => route.query,
  () => {
    syncFromRoute()
  },
  { deep: true },
)

// Prevent background scroll when mobile filter drawer is open.
watch(isMobileFilterOpen, (isOpen) => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = isOpen ? 'hidden' : ''
  }
})

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
  window.removeEventListener('click', handleClickOutside)
  window.removeEventListener('keydown', handleKeydown)
})

function syncFromRoute() {
  if (route.query.category) {
    const catQuery = String(route.query.category).toLowerCase()
    const matched = state.categories.find(
      (c) => c.slug?.toLowerCase() === catQuery || c.name?.toLowerCase() === catQuery,
    )
    if (matched) selectedCategory.value = matched.name
    else selectedCategory.value = route.query.category
  } else {
    selectedCategory.value = 'Semua'
  }

  if (route.query.stock) {
    selectedStock.value = String(route.query.stock)
  } else {
    selectedStock.value = 'Semua'
  }

    if (route.query.min_price !== undefined || route.query.max_price !== undefined) {
    minPrice.value = route.query.min_price ? String(route.query.min_price) : ''
    maxPrice.value = route.query.max_price ? String(route.query.max_price) : ''
  } else if (route.query.price) {
    const oldPrice = String(route.query.price)
    if (oldPrice === 'under_50k') {
      minPrice.value = ''
      maxPrice.value = '50000'
    } else if (oldPrice === '50k_100k') {
      minPrice.value = '50000'
      maxPrice.value = '100000'
    } else if (oldPrice === '100k_200k') {
      minPrice.value = '100000'
      maxPrice.value = '200000'
    } else if (oldPrice === 'above_200k') {
      minPrice.value = '200000'
      maxPrice.value = ''
    }
  } else {
    minPrice.value = ''
    maxPrice.value = ''
  }

  if (route.query.sort) {
    const s = String(route.query.sort).toLowerCase()
    if (s === 'popular' || s === 'populer' || s === 'terpopuler') {
      sortBy.value = 'popular'
    } else {
      sortBy.value = String(route.query.sort)
    }
  }
  if (route.query.view && ['grid', 'list'].includes(route.query.view)) {
    viewMode.value = route.query.view
  }
}

onMounted(async () => {
  window.addEventListener('click', handleClickOutside)
  window.addEventListener('keydown', handleKeydown)
  if (!state.books.length) {
    await loadBooks({ per_page: 100 })
  }
  syncFromRoute()
})

function goToDetail(book) {
  router.push({ name: 'book-detail', params: { id: book.slug || book.id } })
}
</script>

<template>
  <div class="min-h-screen bg-background pb-16">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-7 items-start">
                                <aside
          class="hidden lg:block lg:col-span-4 xl:col-span-3 bg-white border-2 sm:border-3 border-black rounded-[2px] shadow-neo-sm p-4 sm:p-5 space-y-5 lg:sticky lg:top-[88px] self-start max-h-[calc(100vh-6.5rem)] overflow-y-auto"
        >
                    <div class="flex items-center gap-2 pb-2 border-b-2 border-black/10">
            <svg class="w-5 h-5 text-black" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
            <h2 class="font-outfit font-black text-base text-black">Filter Buku</h2>
          </div>

                    <div class="space-y-2">
            <h3 class="font-outfit font-black text-xs text-black uppercase tracking-wider">
              Kategori Buku
            </h3>
            <div class="space-y-1.5 max-h-60 overflow-y-auto pr-1 text-xs">
              <label
                v-for="cat in categoriesList"
                :key="cat.name"
                class="flex items-center justify-between gap-2 cursor-pointer group select-none py-0.5"
              >
                <div class="flex items-center gap-2">
                  <input
                    v-model="selectedCategory"
                    type="radio"
                    :value="cat.name"
                    name="category_filter_desktop"
                    class="w-4 h-4 text-black border-2 border-black focus:ring-0 cursor-pointer accent-black"
                  />
                  <span
                    class="font-sans font-semibold transition-colors"
                    :class="selectedCategory === cat.name ? 'text-black font-black' : 'text-neutral-700 group-hover:text-black'"
                  >
                    {{ cat.name }}
                  </span>
                </div>
                <span class="min-w-5 h-5 px-1 inline-flex items-center justify-center text-center text-[10px] font-bold text-muted-foreground bg-gray-100 rounded border border-black/10 tabular-nums shrink-0">
                  {{ cat.count }}
                </span>
              </label>
            </div>
          </div>

                    <div class="space-y-2 pt-3 border-t border-black/15">
            <h3 class="font-outfit font-black text-xs text-black uppercase tracking-wider">
              Ketersediaan & Promo
            </h3>
            <div class="space-y-1.5 text-xs">
              <label
                v-for="stock in stockOptions"
                :key="stock.value"
                class="flex items-center gap-2 cursor-pointer group select-none py-0.5"
              >
                <input
                  v-model="selectedStock"
                  type="radio"
                  :value="stock.value"
                  name="stock_filter_desktop"
                  class="w-4 h-4 text-black border-2 border-black focus:ring-0 cursor-pointer accent-black"
                />
                <span
                  class="font-sans font-semibold transition-colors"
                  :class="selectedStock === stock.value ? 'text-black font-black' : 'text-neutral-700 group-hover:text-black'"
                >
                  {{ stock.label }}
                </span>
              </label>
            </div>
          </div>

                    <div class="space-y-2 pt-3 border-t border-black/15">
            <h3 class="font-outfit font-black text-xs text-black uppercase tracking-wider">
              Rentang Harga
            </h3>

                        <div class="space-y-1.5 text-xs">
              <label
                v-for="preset in pricePresets"
                :key="preset.value"
                class="flex items-center gap-2 cursor-pointer group select-none py-0.5"
              >
                <input
                  type="radio"
                  :checked="currentPricePreset === preset.value"
                  name="price_filter_desktop"
                  class="w-4 h-4 text-black border-2 border-black focus:ring-0 cursor-pointer accent-black"
                  @change="applyPricePreset(preset)"
                />
                <span
                  class="font-sans font-semibold transition-colors"
                  :class="currentPricePreset === preset.value ? 'text-black font-black' : 'text-neutral-700 group-hover:text-black'"
                >
                  {{ preset.label }}
                </span>
              </label>
            </div>
          </div>
        </aside>

                                        <transition
          enter-active-class="transition-opacity duration-200"
          leave-active-class="transition-opacity duration-200"
          enter-from-class="opacity-0"
          leave-to-class="opacity-0"
        >
          <div
            v-if="isMobileFilterOpen"
            class="fixed inset-0 bg-black/60 z-50 backdrop-blur-xs lg:hidden"
            @click="isMobileFilterOpen = false"
          ></div>
        </transition>

                <transition name="drawer">
          <div
            v-if="isMobileFilterOpen"
            class="fixed inset-y-0 left-0 w-full max-w-[280px] sm:max-w-xs md:max-w-sm bg-background z-50 lg:hidden border-r-3 sm:border-r-4 border-black shadow-[6px_0px_0px_0px_var(--color-black)] sm:shadow-[8px_0px_0px_0px_var(--color-black)] flex flex-col"
          >
                        <div class="flex items-center justify-between p-4 sm:p-5 border-b-4 border-black bg-white shrink-0">
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5 text-black" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                </svg>
                <span class="font-outfit font-black text-xl text-black">Filter Buku</span>
              </div>
              <button
                class="w-9 h-9 border-2 border-black rounded-[2px] bg-white shadow-neo-sm hover:bg-gray-100 flex items-center justify-center cursor-pointer"
                aria-label="Tutup filter"
                @click="isMobileFilterOpen = false"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

                        <div class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 bg-white">

                            <div class="space-y-2">
                <h3 class="font-outfit font-black text-xs text-black uppercase tracking-wider">
                  Kategori Buku
                </h3>
                <div class="space-y-1.5 text-xs">
                  <label
                    v-for="cat in categoriesList"
                    :key="`m-cat-${cat.name}`"
                    class="flex items-center justify-between gap-2 cursor-pointer group select-none py-0.5"
                  >
                    <div class="flex items-center gap-2">
                      <input
                        v-model="selectedCategory"
                        type="radio"
                        :value="cat.name"
                        name="category_filter_mobile"
                        class="w-4 h-4 text-black border-2 border-black focus:ring-0 cursor-pointer accent-black"
                      />
                      <span
                        class="font-sans font-semibold transition-colors"
                        :class="selectedCategory === cat.name ? 'text-black font-black' : 'text-neutral-700'"
                      >
                        {{ cat.name }}
                      </span>
                    </div>
                    <span class="min-w-5 h-5 px-1 inline-flex items-center justify-center text-center text-[10px] font-bold text-muted-foreground bg-gray-100 rounded border border-black/10 tabular-nums shrink-0">
                      {{ cat.count }}
                    </span>
                  </label>
                </div>
              </div>

                            <div class="space-y-2 pt-3 border-t border-black/15">
                <h3 class="font-outfit font-black text-xs text-black uppercase tracking-wider">
                  Ketersediaan & Promo
                </h3>
                <div class="space-y-1.5 text-xs">
                  <label
                    v-for="stock in stockOptions"
                    :key="`m-stock-${stock.value}`"
                    class="flex items-center gap-2 cursor-pointer group select-none py-0.5"
                  >
                    <input
                      v-model="selectedStock"
                      type="radio"
                      :value="stock.value"
                      name="stock_filter_mobile"
                      class="w-4 h-4 text-black border-2 border-black focus:ring-0 cursor-pointer accent-black"
                    />
                    <span
                      class="font-sans font-semibold transition-colors"
                      :class="selectedStock === stock.value ? 'text-black font-black' : 'text-neutral-700'"
                    >
                      {{ stock.label }}
                    </span>
                  </label>
                </div>
              </div>

                            <div class="space-y-2 pt-3 border-t border-black/15">
                <h3 class="font-outfit font-black text-xs text-black uppercase tracking-wider">
                  Rentang Harga
                </h3>

                <div class="space-y-1.5 text-xs">
                  <label
                    v-for="preset in pricePresets"
                    :key="`m-preset-${preset.value}`"
                    class="flex items-center gap-2 cursor-pointer group select-none py-0.5"
                  >
                    <input
                      type="radio"
                      :checked="currentPricePreset === preset.value"
                      name="price_filter_mobile"
                      class="w-4 h-4 text-black border-2 border-black focus:ring-0 cursor-pointer accent-black"
                      @change="applyPricePreset(preset)"
                    />
                    <span
                      class="font-sans font-semibold transition-colors"
                      :class="currentPricePreset === preset.value ? 'text-black font-black' : 'text-neutral-700'"
                    >
                      {{ preset.label }}
                    </span>
                  </label>
                </div>
              </div>
            </div>

                        <div class="p-4 border-t-4 border-black bg-white shrink-0 flex items-center gap-2">
              <button
                v-if="activeFiltersCount > 0"
                type="button"
                class="px-3.5 py-2.5 rounded-[2px] border-2 border-black font-outfit font-black text-xs hover:bg-gray-100 cursor-pointer"
                @click="resetFilters"
              >
                Reset
              </button>
              <button
                type="button"
                class="flex-1 neubrutal-btn bg-neo-yellow text-black border-2 border-black py-2.5 rounded-[2px] font-outfit font-black text-xs shadow-neo-sm hover:bg-yellow-300 cursor-pointer text-center"
                @click="isMobileFilterOpen = false"
              >
                Terapkan ({{ filteredBooks.length }} Buku)
              </button>
            </div>
          </div>
        </transition>

                                <main class="lg:col-span-8 xl:col-span-9 space-y-4">
                                                  <div class="relative z-20 flex flex-col gap-2.5 sm:gap-3">
                        <div class="flex flex-col gap-2.5 sm:hidden">
                            <div class="flex items-center justify-between gap-2">
                                <button
                  type="button"
                  class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-3 py-1.5 rounded-[2px] font-outfit font-black text-xs shadow-neo-xs hover:bg-yellow-300 flex items-center gap-1.5 cursor-pointer shrink-0"
                  @click="isMobileFilterOpen = true"
                >
                  <svg class="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                  </svg>
                  <span>Filter</span>
                  <span
                    v-if="activeFiltersCount > 0"
                    class="w-4 h-4 bg-black text-white rounded-full text-[9px] font-outfit font-black flex items-center justify-center"
                  >
                    {{ activeFiltersCount }}
                  </span>
                </button>

                                <div class="font-outfit font-black text-xs text-black truncate text-center min-w-0 px-1">
                  <span>{{ filteredBooks.length }} buku</span>
                  <span v-if="searchQuery" class="text-neo-violet font-black ml-1 truncate">
                    "{{ searchQuery }}"
                  </span>
                </div>

                                <div class="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    title="Tampilan Grid (Kotak)"
                    class="w-7.5 h-7.5 rounded-[2px] border-2 border-black flex items-center justify-center transition-all cursor-pointer"
                    :class="[
                      viewMode === 'grid'
                        ? 'bg-black text-white shadow-neo-xs'
                        : 'bg-white text-neutral-600 hover:bg-gray-100',
                    ]"
                    @click="viewMode = 'grid'"
                  >
                    <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 16 16">
                      <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    title="Tampilan List (Baris)"
                    class="w-7.5 h-7.5 rounded-[2px] border-2 border-black flex items-center justify-center transition-all cursor-pointer"
                    :class="[
                      viewMode === 'list'
                        ? 'bg-black text-white shadow-neo-xs'
                        : 'bg-white text-neutral-600 hover:bg-gray-100',
                    ]"
                    @click="viewMode = 'list'"
                  >
                    <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 16 16">
                      <path fill-rule="evenodd" d="M2 3.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0 4a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0 4a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z" />
                    </svg>
                  </button>
                </div>
              </div>

                            <div ref="mobileSortDropdownRef" class="relative w-full">
                <button
                  type="button"
                  class="w-full flex items-center justify-between gap-2 border-2 border-black rounded-[2px] px-3 py-2 bg-white shadow-neo-xs hover:shadow-neo transition-all cursor-pointer select-none text-left"
                  :class="{ 'shadow-neo bg-yellow-50/30': isMobileSortDropdownOpen }"
                  aria-haspopup="listbox"
                  :aria-expanded="isMobileSortDropdownOpen"
                  @click.stop="toggleMobileSortDropdown"
                >
                  <div class="flex items-center gap-2 min-w-0">
                    <span
                      class="text-[10px] font-outfit font-black text-neutral-400 uppercase tracking-wider shrink-0"
                    >
                      Urutkan:
                    </span>
                    <span class="font-outfit font-black text-xs text-neutral-900 truncate">
                      {{ currentSortLabel }}
                    </span>
                  </div>
                  <svg
                    class="w-4 h-4 text-neutral-700 transition-transform duration-200 shrink-0 ml-1"
                    :class="{ 'rotate-180 text-black': isMobileSortDropdownOpen }"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                                <transition
                  enter-active-class="transition duration-150 ease-out"
                  enter-from-class="opacity-0 -translate-y-1 scale-95"
                  enter-to-class="opacity-100 translate-y-0 scale-100"
                  leave-active-class="transition duration-100 ease-in"
                  leave-from-class="opacity-100 translate-y-0 scale-100"
                  leave-to-class="opacity-0 -translate-y-1 scale-95"
                >
                  <div
                    v-if="isMobileSortDropdownOpen"
                    class="absolute left-0 right-0 top-full mt-1.5 w-full bg-white border-2 border-black rounded-[2px] shadow-neo-md z-50 py-1 overflow-hidden select-none"
                    role="listbox"
                  >
                    <div
                      class="px-3 py-1.5 border-b border-neutral-100 bg-neutral-50 flex items-center justify-between text-[10px] font-outfit font-black uppercase tracking-wider text-neutral-400"
                    >
                      <span>PILIH URUTAN</span>
                      <span>{{ sortOptions.length }} Opsi</span>
                    </div>
                    <div class="py-1">
                      <button
                        v-for="opt in sortOptions"
                        :key="opt.value"
                        type="button"
                        class="w-full px-3 py-2.5 text-left flex items-center justify-between font-outfit text-xs transition-colors cursor-pointer group"
                        :class="
                          sortBy === opt.value
                            ? 'bg-neo-yellow/25 font-black text-black border-l-4 border-black'
                            : 'font-bold text-neutral-700 hover:bg-neutral-100 hover:text-black border-l-4 border-transparent'
                        "
                        role="option"
                        :aria-selected="sortBy === opt.value"
                        @click="selectSortOption(opt.value)"
                      >
                        <span>{{ opt.label }}</span>
                        <svg
                          v-if="sortBy === opt.value"
                          class="w-3.5 h-3.5 text-black shrink-0"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="3"
                          viewBox="0 0 24 24"
                        >
                          <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </transition>
              </div>
            </div>

                        <div class="hidden sm:flex items-center justify-between gap-3">
                            <div class="flex items-center gap-2.5 min-w-0">
                                <button
                  type="button"
                  class="lg:hidden neubrutal-btn bg-neo-yellow text-black border-2 border-black px-3 py-1.5 rounded-[2px] font-outfit font-black text-xs shadow-neo-sm hover:bg-yellow-300 flex items-center gap-1.5 cursor-pointer shrink-0"
                  @click="isMobileFilterOpen = true"
                >
                  <svg class="w-4 h-4 text-black" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                  </svg>
                  <span>Filter Buku</span>
                  <span
                    v-if="activeFiltersCount > 0"
                    class="w-4 h-4 bg-black text-white rounded-full text-[10px] font-outfit font-black flex items-center justify-center"
                  >
                    {{ activeFiltersCount }}
                  </span>
                </button>

                                <div class="font-outfit font-black text-xs sm:text-sm text-black flex items-center flex-wrap gap-1">
                  <span>Menampilkan {{ filteredBooks.length }} buku</span>
                  <template v-if="searchQuery">
                    <span class="text-neutral-500 font-semibold">untuk kata kunci</span>
                    <span class="inline-flex items-center gap-1 bg-neo-yellow/30 border border-black/30 px-1.5 py-0.5 rounded-[2px] font-black text-black">
                      "{{ searchQuery }}"
                    </span>
                  </template>
                  <span
                    v-else-if="filteredBooks.length !== state.books.length"
                    class="text-muted-foreground font-semibold"
                  >
                    (dari {{ state.books.length }} koleksi)
                  </span>
                </div>
              </div>

                            <div class="flex items-center gap-3 ml-auto">
                                <div ref="sortDropdownRef" class="relative">
                  <button
                    type="button"
                    class="flex items-center gap-2 border-2 border-black rounded-[2px] px-3 py-1.5 bg-white shadow-neo-xs hover:shadow-neo transition-all cursor-pointer select-none group"
                    :class="{ 'shadow-neo bg-yellow-50/30': isSortDropdownOpen }"
                    aria-haspopup="listbox"
                    :aria-expanded="isSortDropdownOpen"
                    @click.stop="toggleSortDropdown"
                  >
                    <span
                      class="text-[10px] font-outfit font-black text-neutral-400 uppercase tracking-wider shrink-0"
                    >
                      Urutkan:
                    </span>
                    <span class="font-outfit font-black text-xs sm:text-sm text-neutral-900 pr-1">
                      {{ currentSortLabel }}
                    </span>
                    <svg
                      class="w-4 h-4 text-neutral-700 transition-transform duration-200 shrink-0"
                      :class="{ 'rotate-180 text-black': isSortDropdownOpen }"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>

                                    <transition
                    enter-active-class="transition duration-150 ease-out"
                    enter-from-class="opacity-0 -translate-y-1 scale-95"
                    enter-to-class="opacity-100 translate-y-0 scale-100"
                    leave-active-class="transition duration-100 ease-in"
                    leave-from-class="opacity-100 translate-y-0 scale-100"
                    leave-to-class="opacity-0 -translate-y-1 scale-95"
                  >
                    <div
                      v-if="isSortDropdownOpen"
                      class="absolute right-0 top-full mt-1.5 w-60 bg-white border-2 border-black rounded-[2px] shadow-neo-md z-50 py-1 overflow-hidden select-none"
                      role="listbox"
                    >
                      <div
                        class="px-3 py-1.5 border-b border-neutral-100 bg-neutral-50 flex items-center justify-between text-[10px] font-outfit font-black uppercase tracking-wider text-neutral-400"
                      >
                        <span>PILIH URUTAN</span>
                        <span>{{ sortOptions.length }} Pilihan</span>
                      </div>
                      <div class="py-1">
                        <button
                          v-for="opt in sortOptions"
                          :key="opt.value"
                          type="button"
                          class="w-full px-3 py-2 text-left flex items-center justify-between font-outfit text-xs transition-colors cursor-pointer group"
                          :class="
                            sortBy === opt.value
                              ? 'bg-neo-yellow/25 font-black text-black border-l-4 border-black'
                              : 'font-bold text-neutral-700 hover:bg-neutral-100 hover:text-black border-l-4 border-transparent'
                          "
                          role="option"
                          :aria-selected="sortBy === opt.value"
                          @click="selectSortOption(opt.value)"
                        >
                          <span>{{ opt.label }}</span>
                          <svg
                            v-if="sortBy === opt.value"
                            class="w-3.5 h-3.5 text-black shrink-0"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="3"
                            viewBox="0 0 24 24"
                          >
                            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </transition>
                </div>

                                <div class="flex items-center gap-1 shrink-0">
                                    <button
                    type="button"
                    title="Tampilan Grid (Kotak)"
                    class="w-8 h-8 rounded-[2px] border-2 border-black flex items-center justify-center transition-all cursor-pointer"
                    :class="[
                      viewMode === 'grid'
                        ? 'bg-black text-white shadow-neo-xs'
                        : 'bg-white text-muted-foreground hover:bg-gray-100',
                    ]"
                    @click="viewMode = 'grid'"
                  >
                    <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 16 16">
                      <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z" />
                    </svg>
                  </button>

                                    <button
                    type="button"
                    title="Tampilan List (Baris)"
                    class="w-8 h-8 rounded-[2px] border-2 border-black flex items-center justify-center transition-all cursor-pointer"
                    :class="[
                      viewMode === 'list'
                        ? 'bg-black text-white shadow-neo-xs'
                        : 'bg-white text-muted-foreground hover:bg-gray-100',
                    ]"
                    @click="viewMode = 'list'"
                  >
                    <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 16 16">
                      <path fill-rule="evenodd" d="M2 3.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0 4a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0 4a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

                        <div v-if="activeFiltersCount > 0" class="flex items-center gap-1.5 overflow-x-auto scrollbar-hide flex-nowrap sm:flex-wrap py-0.5">
              <span class="text-[10px] font-bold text-neutral-500 uppercase tracking-wider shrink-0">
                Filter Aktif:
              </span>

              <span
                v-if="searchQuery"
                class="inline-flex items-center gap-1 bg-neo-yellow border border-black px-2 py-0.5 rounded-[2px] font-outfit font-bold text-[11px] shrink-0"
              >
                <span>"{{ searchQuery }}"</span>
                <button type="button" class="font-black hover:text-red-600 cursor-pointer" @click="clearSearch">✕</button>
              </span>

              <span
                v-if="selectedCategory !== 'Semua'"
                class="inline-flex items-center gap-1 bg-neo-lime border border-black px-2 py-0.5 rounded-[2px] font-outfit font-bold text-[11px] shrink-0"
              >
                <span>{{ selectedCategory }}</span>
                <button type="button" class="font-black hover:text-red-600 cursor-pointer" @click="selectedCategory = 'Semua'">✕</button>
              </span>

              <span
                v-if="selectedStock !== 'Semua'"
                class="inline-flex items-center gap-1 bg-white border border-black px-2 py-0.5 rounded-[2px] font-outfit font-bold text-[11px] shrink-0"
              >
                <span>{{ selectedStock === 'in_stock' ? 'Stok Tersedia' : 'Diskon' }}</span>
                <button type="button" class="font-black hover:text-red-600 cursor-pointer" @click="selectedStock = 'Semua'">✕</button>
              </span>

              <span
                v-if="minPrice || maxPrice"
                class="inline-flex items-center gap-1 bg-white border border-black px-2 py-0.5 rounded-[2px] font-outfit font-bold text-[11px] shrink-0"
              >
                <span>{{ priceFilterLabel }}</span>
                <button type="button" class="font-black hover:text-red-600 cursor-pointer" @click="clearPriceFilter">✕</button>
              </span>

              <button
                type="button"
                class="text-[11px] font-outfit font-black text-red-600 hover:underline ml-1 cursor-pointer shrink-0"
                @click="resetFilters"
              >
                Hapus Semua
              </button>
            </div>
          </div>

                    <div v-if="state.catalogLoading" class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4">
            <div
              v-for="n in 6"
              :key="`catalog-skeleton-${n}`"
              class="bg-white border-2 border-black rounded-[2px] p-3 shadow-neo-xs animate-pulse space-y-2.5"
            >
              <div class="w-full aspect-[4/3] bg-neutral-200 border border-black/10 rounded"></div>
              <div class="h-3.5 bg-neutral-200 rounded w-3/4"></div>
              <div class="h-2.5 bg-neutral-200 rounded w-1/2"></div>
              <div class="h-4 bg-neutral-200 rounded w-1/3"></div>
            </div>
          </div>

                    <div
            v-else-if="filteredBooks.length === 0"
            class="bg-white border-2 sm:border-3 border-black rounded-[2px] shadow-neo-sm p-8 sm:p-12 text-center flex flex-col items-center justify-center my-2"
          >
            <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-100 border border-black/15 flex items-center justify-center mb-4 shadow-inner">
              <svg
                class="w-8 h-8 sm:w-10 sm:h-10 text-slate-500"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="7" />
                <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35" />
              </svg>
            </div>

            <h2 class="font-outfit font-black text-xl sm:text-2xl text-black tracking-tight">
              Buku tidak ditemukan
            </h2>

            <p class="font-sans text-xs sm:text-sm font-semibold text-muted-foreground mt-1.5 max-w-md">
              <template v-if="searchQuery">
                Tidak ada buku yang cocok dengan kata kunci "<span class="text-black font-black">{{ searchQuery }}</span>". Coba gunakan kata kunci lain atau periksa ejaan.
              </template>
              <template v-else>
                Coba ubah filter atau kata kunci pencarian untuk menemukan koleksi buku lainnya.
              </template>
            </p>

            <button
              type="button"
              class="mt-5 inline-flex items-center justify-center px-5 py-2 rounded-full border-2 border-black bg-white text-black font-outfit font-black text-xs sm:text-sm shadow-neo-xs hover:bg-neo-yellow hover:shadow-neo transition-all active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
              @click="resetFilters"
            >
              Reset Filter
            </button>
          </div>

                    <div v-else>
                        <div
              v-if="viewMode === 'grid'"
              class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-2.5 sm:gap-4 md:gap-5"
            >
              <BookCard
                v-for="(book, idx) in paginatedBooks"
                :key="`grid-book-${book.id}`"
                :book="book"
                :animate="true"
                :delay="(idx % 6) * 50"
              />
            </div>

                        <div v-else class="space-y-2.5">
              <article
                v-for="book in paginatedBooks"
                :key="`list-book-${book.id}`"
                class="group bg-white border-2 border-black rounded-[2px] shadow-neo-xs hover:shadow-neo hover:-translate-y-0.5 transition-all p-2.5 sm:p-3.5 flex items-stretch gap-3 sm:gap-4"
              >
                                <div
                  class="w-18 h-24 sm:w-22 sm:h-30 shrink-0 bg-background border border-black rounded-[2px] p-1 flex items-center justify-center relative overflow-hidden cursor-pointer"
                  @click="goToDetail(book)"
                >
                  <img
                    v-if="book.coverImage"
                    :src="assetUrl(book.coverImage)"
                    :alt="book.title"
                    class="w-full h-full object-cover rounded-[1px]"
                    loading="lazy"
                  />
                  <BookCover
                    v-else
                    :theme="book.theme"
                    :title="book.title"
                    :author="book.author"
                  />

                  <span
                    v-if="Number(book.discount) > 0"
                    class="absolute top-0.5 left-0.5 bg-neo-yellow border border-black text-black font-outfit font-black text-[8px] sm:text-[9px] px-1 py-0.2 rounded shadow-neo-xs"
                  >
                    -{{ book.discount }}%
                  </span>
                </div>

                                <div class="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                                        <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="bg-black text-white px-1.5 py-0.2 rounded-[1px] font-outfit font-black text-[9px] uppercase tracking-wider">
                        {{ book.category }}
                      </span>
                      <span class="text-[10px] sm:text-xs font-bold text-muted-foreground">
                        · {{ Number(book.sold) || 0 }} terjual
                      </span>
                      <span
                        v-if="Number(book.stock) <= 0"
                        class="text-[9px] font-bold text-red-600 bg-red-50 border border-red-300 px-1 py-0.2 rounded"
                      >
                        Habis
                      </span>
                    </div>

                                        <h3
                      class="font-outfit font-black text-xs sm:text-sm md:text-base text-black hover:text-neo-violet cursor-pointer line-clamp-2 leading-snug mt-1"
                      @click="goToDetail(book)"
                    >
                      {{ book.title }}
                    </h3>

                                        <p class="font-sans text-[10px] sm:text-xs font-semibold text-muted-foreground truncate mt-0.5">
                      oleh <span class="text-black">{{ book.author }}</span>
                    </p>
                  </div>

                                    <div class="flex items-center justify-between gap-2 pt-2 mt-1 border-t border-black/10">
                                        <div>
                      <div class="font-outfit font-black text-xs sm:text-sm md:text-base text-black whitespace-nowrap">
                        {{ formatPrice(book.price) }}
                      </div>
                      <div
                        v-if="Number(book.discount) > 0 && book.originalPrice"
                        class="text-[9px] sm:text-[11px] font-bold text-muted-foreground line-through"
                      >
                        {{ formatPrice(book.originalPrice) }}
                      </div>
                    </div>

                                        <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                            <button
                        type="button"
                        :disabled="isWishlistPending(book.id)"
                        class="group/btn w-8 h-8 sm:w-9 sm:h-9 bg-white border-2 border-black rounded-[2px] flex items-center justify-center shadow-neo-xs hover:bg-red-50 disabled:opacity-50 cursor-pointer transition-all active:scale-110 shrink-0"
                        :title="isWishlisted(book.id) ? 'Hapus dari Wishlist' : 'Tambah ke Wishlist'"
                        :aria-label="isWishlisted(book.id) ? 'Hapus dari Wishlist' : 'Tambah ke Wishlist'"
                        @click.stop="toggleWishlist(book)"
                      >
                                                <svg
                          v-if="isWishlisted(book.id)"
                          class="w-4 h-4 fill-red-500 text-red-500"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z"
                          />
                        </svg>
                                                <svg
                          v-else
                          class="w-4 h-4 text-black group-hover/btn:text-red-500 transition-colors"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2.2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
                          />
                        </svg>
                      </button>

                                            <button
                        type="button"
                        class="neubrutal-btn bg-neo-yellow text-black border-2 border-black h-8 sm:h-9 px-3 rounded-[2px] font-outfit font-black text-xs shadow-neo-xs hover:bg-yellow-300 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                        @click="goToDetail(book)"
                      >
                        <span>Detail</span>
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            </div>

                        <nav
              v-if="totalCatalogPages > 1"
              aria-label="Paginasi Katalog Buku"
              class="mt-10 pt-6 border-t-2 border-black/15 flex flex-col sm:flex-row items-center justify-between gap-4 select-none"
            >
                            <p class="font-outfit text-xs font-bold text-neutral-600 text-center sm:text-left">
                Menampilkan halaman
                <span class="font-black text-black">{{ catalogPage }}</span> dari
                <span class="font-black text-black">{{ totalCatalogPages }}</span>
                <span class="text-neutral-400 mx-1.5">·</span>
                <span class="text-black font-black">{{ filteredBooks.length }} total buku</span>
              </p>

                            <div class="flex items-center gap-1.5 sm:gap-2">
                                <button
                  type="button"
                  :disabled="catalogPage <= 1"
                  aria-label="Halaman sebelumnya"
                  class="neubrutal-btn h-9 px-3 rounded-[2px] border-2 border-black font-outfit font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  :class="[
                    catalogPage <= 1
                      ? 'bg-neutral-100 text-neutral-400 border-neutral-300 cursor-not-allowed shadow-none'
                      : 'bg-white text-black hover:bg-neo-yellow shadow-neo-xs hover:shadow-neo',
                  ]"
                  @click="changeCatalogPage(catalogPage - 1)"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                  </svg>
                  <span class="hidden sm:inline">Prev</span>
                </button>

                                <div class="flex items-center gap-1">
                  <button
                    v-for="p in visibleCatalogPages"
                    :key="`catalog-page-${p}`"
                    type="button"
                    :disabled="p === '...'"
                    :aria-current="p === catalogPage ? 'page' : undefined"
                    class="w-9 h-9 rounded-[2px] font-outfit font-black text-xs transition-all flex items-center justify-center cursor-pointer"
                    :class="[
                      p === catalogPage
                        ? 'bg-black text-white border-2 border-black shadow-neo-xs scale-105'
                        : p === '...'
                          ? 'text-neutral-400 cursor-default border-transparent'
                          : 'bg-white text-black border-2 border-black hover:bg-neo-yellow shadow-neo-xs hover:shadow-neo',
                    ]"
                    @click="p !== '...' && changeCatalogPage(p)"
                  >
                    {{ p }}
                  </button>
                </div>

                                <button
                  type="button"
                  :disabled="catalogPage >= totalCatalogPages"
                  aria-label="Halaman berikutnya"
                  class="neubrutal-btn h-9 px-3 rounded-[2px] border-2 border-black font-outfit font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  :class="[
                    catalogPage >= totalCatalogPages
                      ? 'bg-neutral-100 text-neutral-400 border-neutral-300 cursor-not-allowed shadow-none'
                      : 'bg-white text-black hover:bg-neo-yellow shadow-neo-xs hover:shadow-neo',
                  ]"
                  @click="changeCatalogPage(catalogPage + 1)"
                >
                  <span class="hidden sm:inline">Next</span>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            </nav>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(-100%);
}
</style>
