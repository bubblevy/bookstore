<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useStore } from '@/composables/useStore'
import { api } from '@/lib/api'
import { assetUrl } from '@/lib/assets'
import BookCard from '@/components/BookCard.vue'
import BookCover from '@/components/BookCover.vue'

const route = useRoute()
const router = useRouter()
const {
  state,
  loadBook,
  addToCart,
  toggleWishlist,
  isWishlisted,
  isWishlistPending,
  refreshWishlistStatus,
} = useStore()

const book = ref(null)
const loading = ref(true)
const coverError = ref(false)
const activeTab = ref('sinopsis')
const showSynopsisModal = ref(false)
const SYNOPSIS_LIMIT = 260
const isSynopsisLong = computed(() => (book.value?.description?.length || 0) > SYNOPSIS_LIMIT)
const truncatedSynopsis = computed(() => {
  const desc = book.value?.description || ''
  if (desc.length <= SYNOPSIS_LIMIT) return desc
  const cut = desc.slice(0, SYNOPSIS_LIMIT)
  const lastSpace = cut.lastIndexOf(' ')
  const cleanCut = lastSpace > SYNOPSIS_LIMIT * 0.7 ? cut.slice(0, lastSpace) : cut
  return cleanCut.trim() + '....'
})

function openSynopsisModal() {
  showSynopsisModal.value = true
}

function closeSynopsisModal() {
  showSynopsisModal.value = false
}

function handleGlobalKeydown(e) {
  if (e.key === 'Escape') {
    if (showSynopsisModal.value) closeSynopsisModal()
    if (isQtyModalOpen.value) closeQtyModal()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})

async function fetchBook() {
  const slugOrId = String(route.params.id)

  // Match cached book data first for instantaneous render.
  const cached = state.books.find(
    (b) => String(b.slug) === slugOrId || String(b.id) === slugOrId,
  )
  if (cached) {
    book.value = { ...cached }
    loading.value = false
  } else {
    loading.value = true
    book.value = null
  }

  coverError.value = false
  showSynopsisModal.value = false
  const detailed = await loadBook(slugOrId)
  if (detailed) {
    book.value = detailed
    if (detailed.slug && route.params.id !== detailed.slug) {
      router.replace({ name: 'book-detail', params: { id: detailed.slug } })
    }
    fetchReviews(1)
  }
  loading.value = false
  await refreshWishlistStatus(book.value?.id)
}

// Reviews State & Logic
const reviewsLoading = ref(false)
const reviewsList = ref([])
const reviewBreakdown = ref({
  average_rating: 0,
  total_reviews: 0,
  star_5_count: 0,
  star_4_count: 0,
  star_3_count: 0,
  star_2_count: 0,
  star_1_count: 0,
  with_comment_count: 0,
})
const reviewFilterRating = ref('')
const reviewFilterHasComment = ref(false)
const reviewSortBy = ref('newest')
const reviewPage = ref(1)
const reviewMeta = ref({
  page: 1,
  per_page: 5,
  total_items: 0,
  total_pages: 1,
})

async function fetchReviews(page = 1) {
  const targetSlug = book.value?.slug || route.params.id
  if (!targetSlug) return
  reviewPage.value = page
  reviewsLoading.value = true
  try {
    const params = {
      page: reviewPage.value,
      per_page: 5,
      sort_by: reviewSortBy.value,
    }
    if (reviewFilterRating.value) {
      params.rating = Number(reviewFilterRating.value)
    }
    if (reviewFilterHasComment.value) {
      params.has_comment = 'true'
    }
    const res = await api.bookReviews(targetSlug, params)
    reviewsList.value = res.data?.reviews || []
    if (res.data?.breakdown) {
      reviewBreakdown.value = res.data.breakdown
    }
    if (res.meta) {
      reviewMeta.value = res.meta
    }
  } catch {
    // Reviews are non-blocking
  } finally {
    reviewsLoading.value = false
  }
}

watch(
  () => [reviewFilterRating.value, reviewFilterHasComment.value, reviewSortBy.value],
  () => {
    fetchReviews(1)
  },
)

function calculatePercentage(count) {
  const total = Number(reviewBreakdown.value?.total_reviews) || 0
  if (total <= 0) return 0
  return Math.round(((Number(count) || 0) / total) * 100)
}

function formatReviewDate(dateStr) {
  if (!dateStr) return '-'
  try {
    const dt = new Date(dateStr)
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dt)
  } catch {
    return dateStr
  }
}

watch(() => route.params.id, fetchBook, { immediate: true })

watch(
  () => state.books,
  (books) => {
    if (!book.value) return
    const id = book.value.id
    const slug = book.value.slug
    const matched = books.find(
      (b) => (id && String(b.id) === String(id)) || (slug && String(b.slug) === String(slug)),
    )
    if (
      matched &&
      (matched.sold !== book.value.sold ||
        matched.stock !== book.value.stock ||
        matched.price !== book.value.price)
    ) {
      book.value = {
        ...book.value,
        sold: Number(matched.sold) || 0,
        stock: Number(matched.stock) || 0,
        price: Number(matched.price) || book.value.price,
      }
    }
  },
  { deep: true },
)

const relatedBooks = computed(() =>
  state.books.filter((item) => item.slug !== String(route.params.id)).slice(0, 4),
)

const isQtyModalOpen = ref(false)
const modalQty = ref(1)
const buyNow = ref(false)
const addingToCart = ref(false)

function openQtyModal(mode = 'cart') {
  buyNow.value = mode === 'buy'
  modalQty.value = 1
  isQtyModalOpen.value = true
}

function closeQtyModal() {
  isQtyModalOpen.value = false
}

function incrementModalQty() {
  const maxQty = Math.max(1, book.value?.stock ?? 99)
  modalQty.value = Math.min(modalQty.value + 1, maxQty)
}

function decrementModalQty() {
  modalQty.value = Math.max(modalQty.value - 1, 1)
}

const modalSubtotal = computed(() => {
  if (!book.value) return ''
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(book.value.price * modalQty.value)
})

async function confirmAddToCart() {
  if (!book.value || addingToCart.value) return

  if (!state.isLoggedIn) {
    closeQtyModal()
    router.push({ name: 'login', query: { redirect: '/checkout' } })
    return
  }

  addingToCart.value = true
  try {
    const success = await addToCart(book.value, {
      quantity: modalQty.value,
      silent: buyNow.value,
    })
    if (!success) return

    closeQtyModal()
    if (buyNow.value) router.push('/checkout')
  } finally {
    addingToCart.value = false
  }
}

const discount = computed(() => {
  if (!book.value?.originalPrice) return 0
  return Math.round(
    ((book.value.originalPrice - book.value.price) / book.value.originalPrice) * 100,
  )
})

const formattedPrice = computed(() => {
  if (!book.value) return ''
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(book.value.price)
})
const coverUrl = computed(() => assetUrl(book.value?.coverImage))
const wishlisted = computed(() => isWishlisted(book.value?.id))
const inStock = computed(() => (Number(book.value?.stock) || 0) > 0)
const formattedOriginal = computed(() => {
  if (!book.value?.originalPrice) return ''
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(book.value.originalPrice)
})

const specItems = computed(() => {
  if (!book.value?.details) return []
  const d = book.value.details
  const rawL = d.length ? d.length.replace(/\s*cm/i, '').trim() : ''
  const rawW = d.width ? d.width.replace(/\s*cm/i, '').trim() : ''
  const rawH = d.height ? String(d.height).replace(/\s*cm/i, '').trim() : ''

  let dimStr = '-'
  if (rawL && rawW && rawH) {
    dimStr = `${rawL} × ${rawW} × ${rawH} cm`
  } else if (rawL && rawW) {
    dimStr = `${rawL} × ${rawW} cm`
  }

  let formattedDate = d.publishDate || '-'
  if (d.publishDate && typeof d.publishDate === 'string' && d.publishDate.includes('-')) {
    const parsed = new Date(d.publishDate)
    if (!Number.isNaN(parsed.getTime())) {
      formattedDate = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(parsed)
    }
  }

  return [
    { label: 'Penerbit', value: d.publisher || '-' },
    { label: 'Tanggal Terbit', value: formattedDate },
    { label: 'Nomor ISBN', value: d.isbn || '-' },
    { label: 'Jumlah Halaman', value: `${d.pages || 0} Halaman` },
    { label: 'Bahasa', value: d.language || 'Indonesia' },
    { label: 'Dimensi Buku', value: dimStr },
    { label: 'Berat Bersih', value: d.weight || '-' },
    { label: 'Kondisi Fisik', value: d.condition || '100% Baru & Segel Penerbit' },
  ]
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div
      v-if="!loading && !book"
      class="py-16 sm:py-24 text-center max-w-lg mx-auto px-4 space-y-3"
    >
      <h1 class="font-outfit font-black text-2xl sm:text-3xl text-black tracking-tight">
        Buku Tidak Ditemukan
      </h1>
      <p class="font-sans text-sm sm:text-base text-neutral-600 font-medium leading-relaxed">
        Buku yang Anda cari mungkin sedang tidak tersedia dalam katalog kami.
      </p>
      <div class="pt-3">
        <RouterLink
          to="/catalog"
          class="inline-block neubrutal-btn bg-neo-yellow text-black border-2 border-black py-2.5 px-6 rounded-[2px] font-outfit font-black text-sm shadow-neo-sm hover:bg-yellow-300 cursor-pointer transition-all"
        >
          Kembali ke Katalog
        </RouterLink>
      </div>
    </div>

        <div v-else-if="loading && !book" class="animate-pulse">
            <div class="flex items-center gap-2 mb-6 sm:mb-8 overflow-hidden">
        <div class="h-4 w-16 bg-neutral-200 border border-black/15 rounded-[2px]"></div>
        <span class="text-neutral-400">/</span>
        <div class="h-4 w-24 bg-neutral-200 border border-black/15 rounded-[2px]"></div>
        <span class="text-neutral-400">/</span>
        <div class="h-4 w-20 bg-neutral-200 border border-black/15 rounded-[2px]"></div>
        <span class="text-neutral-400">/</span>
        <div class="h-4 w-40 bg-neutral-300 border border-black/20 rounded-[2px]"></div>
      </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 mb-12 sm:mb-16 items-start">
                <div class="lg:col-span-5 space-y-4">
          <div
            class="bg-white border-2 sm:border-3 border-black rounded-[2px] p-6 sm:p-8 shadow-neo-sm sm:shadow-neo flex flex-col items-center justify-center"
          >
            <div
              class="w-full max-w-[260px] sm:max-w-[280px] aspect-[3/3.9] bg-neutral-100 border-2 border-black/20 rounded-[2px] my-3 flex items-center justify-center"
            >
              <svg
                class="w-12 h-12 text-black/15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                <path d="M6 6h10" />
                <path d="M6 10h10" />
              </svg>
            </div>
            <div class="h-6 w-48 bg-neutral-100 border border-black/15 rounded-[2px] mt-2"></div>
          </div>

                    <div class="bg-white border-2 sm:border-3 border-black rounded-[2px] p-4 shadow-neo-sm sm:shadow-neo space-y-3">
            <div class="h-4 w-3/4 bg-neutral-200 rounded-[2px]"></div>
            <div class="h-4 w-5/6 bg-neutral-200 rounded-[2px]"></div>
            <div class="h-4 w-2/3 bg-neutral-200 rounded-[2px]"></div>
          </div>
        </div>

                <div class="lg:col-span-7 space-y-5">
                    <div class="flex items-center gap-3">
            <div class="h-6 w-24 bg-black/80 rounded-[2px]"></div>
            <div class="h-4 w-20 bg-neutral-200 rounded-[2px]"></div>
          </div>

                    <div class="space-y-2">
            <div class="h-9 sm:h-11 w-4/5 bg-neutral-300 border border-black/15 rounded-[2px]"></div>
            <div class="h-5 w-2/5 bg-neutral-200 rounded-[2px]"></div>
          </div>

                    <div class="flex items-center gap-3">
            <div class="h-10 w-40 bg-neutral-300 border border-black/15 rounded-[2px]"></div>
            <div class="h-6 w-24 bg-neutral-200 rounded-[2px]"></div>
          </div>

                    <div class="grid grid-cols-2 gap-2.5 sm:gap-4 pt-1">
            <div
              class="h-11 sm:h-12 bg-neutral-200 border-2 border-black/30 rounded-[2px] shadow-neo-sm"
            ></div>
            <div
              class="h-11 sm:h-12 bg-neo-yellow/40 border-2 border-black/30 rounded-[2px] shadow-neo-sm"
            ></div>
          </div>

                    <div
            class="h-11 w-full bg-neutral-100 border-2 border-black/30 rounded-[2px] shadow-neo-sm"
          ></div>

                    <div class="pt-6 border-t-2 border-black/10 space-y-4">
            <div class="flex gap-2">
              <div class="h-9 w-28 bg-neutral-300 border border-black/15 rounded-[2px]"></div>
              <div class="h-9 w-36 bg-neutral-200 border border-black/15 rounded-[2px]"></div>
            </div>
            <div class="space-y-2.5 pt-2">
              <div class="h-4 w-full bg-neutral-200 rounded-[2px]"></div>
              <div class="h-4 w-full bg-neutral-200 rounded-[2px]"></div>
              <div class="h-4 w-4/5 bg-neutral-200 rounded-[2px]"></div>
              <div class="h-4 w-3/5 bg-neutral-200 rounded-[2px]"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template v-else-if="book">
      <nav
        class="flex items-center gap-2 text-xs font-sans font-bold text-neutral-500 mb-6 sm:mb-8 overflow-x-auto whitespace-nowrap scrollbar-hide select-none"
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
        <router-link to="/catalog" class="hover:text-black transition-colors shrink-0">
          Katalog Buku
        </router-link>
        <template v-if="book.category">
          <span class="text-neutral-400 shrink-0">/</span>
          <router-link
            :to="{ name: 'catalog', query: { category: book.categorySlug || book.category } }"
            class="hover:text-black transition-colors shrink-0"
          >
            {{ book.category }}
          </router-link>
        </template>
        <span class="text-neutral-400 shrink-0">/</span>
        <span class="text-neutral-900 font-black line-clamp-1 max-w-[220px] sm:max-w-none shrink-0">
          {{ book.title }}
        </span>
      </nav>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 mb-12 sm:mb-16 items-start">
        <div class="lg:col-span-5 lg:sticky lg:top-24 self-start space-y-4">
          <div
            class="relative bg-white border-2 sm:border-3 border-black rounded-[2px] p-6 sm:p-8 shadow-neo-sm sm:shadow-neo flex flex-col items-center justify-center overflow-hidden group transition-all"
          >
            <div
              class="w-full max-w-[260px] sm:max-w-[280px] aspect-[5/7] transition-transform duration-300 group-hover:scale-[1.02] flex items-center justify-center shrink-0"
            >
              <img
                v-if="coverUrl && !coverError"
                :src="coverUrl"
                :alt="book.title"
                class="w-full h-full object-cover border border-black sm:border-2 rounded-[2px] shadow-neo-xs sm:shadow-neo-sm block"
                @error="coverError = true"
              />
              <BookCover
                v-else
                :theme="book.theme"
                :title="book.title"
                :author="book.author"
                :accent="book.accentColor"
                class="w-full h-full shadow-neo-xs sm:shadow-neo-sm block"
              />
            </div>
          </div>

          <div class="bg-white border-2 sm:border-3 border-black rounded-[2px] p-4 shadow-neo-sm sm:shadow-neo space-y-2.5">
            <div class="flex items-center gap-2.5 text-xs font-sans font-bold text-black">
              <svg
                class="w-4 h-4 text-black shrink-0"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                />
              </svg>
              <span>Jaminan Orisinalitas dari Distributor Resmi</span>
            </div>
            <div class="flex items-center gap-2.5 text-xs font-sans font-bold text-black">
              <svg
                class="w-4 h-4 text-black shrink-0"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
                />
              </svg>
              <span>Proteksi 3 Lapis Bubble Wrap & Kardus Tebal</span>
            </div>
            <div class="flex items-center gap-2.5 text-xs font-sans font-bold text-black">
              <svg
                class="w-4 h-4 text-black shrink-0"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
              <span>Garansi tukar baru jika ada cacat cetak</span>
            </div>
          </div>
        </div>

        <div class="lg:col-span-7 space-y-4 sm:space-y-6">
          <div class="flex items-center gap-3 flex-wrap">
            <span
              class="bg-black text-white px-3 py-1 rounded-[2px] font-outfit font-bold text-xs uppercase tracking-wider"
            >
              {{ book.category }}
            </span>
            <div class="flex items-center gap-1.5 text-xs font-sans">
              <span class="text-muted-foreground font-semibold">
                {{ Number(book.sold) || 0 }} terjual
              </span>
              <span v-if="!inStock" class="text-red-600 font-black uppercase">· Stok habis</span>
            </div>

            <!-- Star rating badge -->
            <a
              href="#ulasan-pembeli"
              class="flex items-center gap-1.5 text-xs font-sans font-bold hover:text-neo-violet transition-colors group cursor-pointer"
            >
              <span class="text-black/30 font-bold">•</span>
              <div v-if="(reviewBreakdown.total_reviews > 0) || (book.rating > 0)" class="flex items-center gap-1 text-black">
                <svg class="w-4 h-4 fill-amber-400 text-black" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                </svg>
                <span class="font-outfit font-black text-sm">{{ Number(reviewBreakdown.average_rating || book.rating).toFixed(1) }}</span>
                <span class="text-muted-foreground font-semibold group-hover:underline">
                  ({{ reviewBreakdown.total_reviews || book.reviewsCount || 0 }} ulasan)
                </span>
              </div>
              <div v-else class="flex items-center gap-1.5 text-neutral-500">
                <div class="flex items-center">
                  <svg
                    v-for="s in 5"
                    :key="s"
                    class="w-3.5 h-3.5 fill-neutral-200 text-neutral-400"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                  </svg>
                </div>
                <span class="font-outfit font-bold text-xs text-neutral-600">N/A</span>
                <span class="text-muted-foreground font-semibold group-hover:underline text-[11px]">
                  (0 ulasan)
                </span>
              </div>
            </a>
          </div>

          <div>
            <h1
              class="font-outfit font-black text-2xl sm:text-3xl lg:text-4xl text-black tracking-tight leading-tight"
            >
              {{ book.title }}
            </h1>
            <p
              v-if="book.subtitle"
              class="font-sans text-sm sm:text-base font-semibold text-muted-foreground mt-1 leading-snug"
            >
              {{ book.subtitle }}
            </p>
            <div
              class="flex items-center gap-1.5 mt-2 text-sm font-sans font-bold text-black flex-wrap"
            >
              <span>Ditulis oleh:</span>
              <span>{{ book.author }}</span>
            </div>
          </div>

          <div class="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <span class="font-outfit font-black text-3xl sm:text-4xl text-black">
              {{ formattedPrice }}
            </span>
            <span
              v-if="discount > 0"
              class="font-sans text-base sm:text-lg font-bold text-muted-foreground line-through"
            >
              {{ formattedOriginal }}
            </span>
            <span
              v-if="discount > 0"
              class="bg-neo-yellow text-black border-2 border-black px-2 py-0.5 rounded-[2px] font-outfit font-black text-xs shadow-neo-sm"
            >
              Hemat {{ discount }}%
            </span>
          </div>

          <div class="grid grid-cols-2 gap-2.5 sm:gap-4 pt-1">
            <button
              :disabled="!inStock"
              class="neubrutal-btn bg-white text-black border-2 border-black h-11 sm:h-12 px-3 sm:px-5 rounded-[2px] font-outfit font-black text-xs sm:text-sm shadow-neo-sm hover:bg-gray-100 active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-1.5 sm:gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              @click="openQtyModal('cart')"
            >
              <svg
                class="w-4 h-4 text-black shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="8" cy="21" r="1" />
                <circle cx="19" cy="21" r="1" />
                <path
                  d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"
                />
              </svg>
              <span class="truncate">{{ inStock ? 'Tambah Keranjang' : 'Stok Habis' }}</span>
            </button>

            <button
              :disabled="!inStock"
              class="neubrutal-btn bg-neo-yellow text-black border-2 border-black h-11 sm:h-12 px-3 sm:px-5 rounded-[2px] font-outfit font-black text-xs sm:text-sm shadow-neo-sm hover:bg-yellow-300 active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-1.5 sm:gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              @click="openQtyModal('buy')"
            >
              <span class="truncate">Beli Sekarang</span>
              <svg
                class="w-4 h-4 text-black shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          </div>

          <button
            type="button"
            :disabled="isWishlistPending(book.id)"
            class="w-full neubrutal-btn bg-white text-black border-2 border-black h-11 px-4 rounded-[2px] font-outfit font-black text-xs sm:text-sm shadow-neo-sm hover:bg-neo-pink flex items-center justify-center gap-2 disabled:opacity-60"
            @click="toggleWishlist(book)"
          >
            <svg
              v-if="wishlisted"
              class="w-4 h-4 fill-red-500 text-red-500"
              viewBox="0 0 24 24"
            >
              <path
                d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z"
              />
            </svg>
            <svg
              v-else
              class="w-4 h-4 fill-none text-black"
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
            {{
              isWishlistPending(book.id)
                ? 'Memproses...'
                : wishlisted
                  ? 'Hapus dari Wishlist'
                  : 'Simpan ke Wishlist'
            }}
          </button>

          <div class="pt-4 border-t-2 border-black/10">
            <div class="grid grid-cols-3 gap-2 sm:gap-3 mb-3">
              <button
                class="neubrutal-btn py-2.5 px-2 sm:px-4 text-xs sm:text-sm font-outfit font-black rounded-[2px] transition-all border-2 border-black shadow-neo-sm flex items-center justify-center gap-1.5 sm:gap-2"
                :class="
                  activeTab === 'sinopsis'
                    ? 'bg-neo-yellow text-black'
                    : 'bg-white text-black hover:bg-gray-100'
                "
                @click="activeTab = 'sinopsis'"
              >
                <svg
                  class="w-4 h-4 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                  <path d="M6 6h10" />
                  <path d="M6 10h10" />
                </svg>
                <span class="hidden sm:inline">Sinopsis Buku</span>
                <span class="sm:hidden">Sinopsis</span>
              </button>
              <button
                class="neubrutal-btn py-2.5 px-2 sm:px-4 text-xs sm:text-sm font-outfit font-black rounded-[2px] transition-all border-2 border-black shadow-neo-sm flex items-center justify-center gap-1.5 sm:gap-2"
                :class="
                  activeTab === 'spesifikasi'
                    ? 'bg-neo-yellow text-black'
                    : 'bg-white text-black hover:bg-gray-100'
                "
                @click="activeTab = 'spesifikasi'"
              >
                <svg
                  class="w-4 h-4 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
                  />
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                  <path d="M9 12h6" />
                  <path d="M9 16h6" />
                </svg>
                <span class="hidden sm:inline">Spesifikasi Detail</span>
                <span class="sm:hidden">Spesifikasi</span>
              </button>
              <button
                class="neubrutal-btn py-2.5 px-2 sm:px-4 text-xs sm:text-sm font-outfit font-black rounded-[2px] transition-all border-2 border-black shadow-neo-sm flex items-center justify-center gap-1.5 sm:gap-2"
                :class="
                  activeTab === 'pengiriman'
                    ? 'bg-neo-yellow text-black'
                    : 'bg-white text-black hover:bg-gray-100'
                "
                @click="activeTab = 'pengiriman'"
              >
                <svg
                  class="w-4 h-4 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
                <span class="hidden sm:inline">Info Pengiriman</span>
                <span class="sm:hidden">Pengiriman</span>
              </button>
            </div>

            <div
              class="bg-white border-2 sm:border-3 border-black rounded-[2px] p-5 sm:p-6 shadow-neo-sm sm:shadow-neo min-h-auto"
            >
              <div v-if="activeTab === 'sinopsis'" class="space-y-3.5">
                <div
                  class="font-sans text-sm sm:text-base leading-relaxed text-black/90 font-medium whitespace-pre-line"
                >
                  {{ isSynopsisLong ? truncatedSynopsis : book.description }}
                </div>

                <button
                  v-if="isSynopsisLong"
                  type="button"
                  class="inline-flex items-center gap-1.5 font-outfit font-black text-xs sm:text-sm text-black hover:text-neo-violet transition-colors cursor-pointer select-none group"
                  @click="openSynopsisModal"
                >
                  <span class="underline underline-offset-4 decoration-2">
                    Lihat Lebih Lengkap
                  </span>
                  <svg
                    class="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>

              <div v-else-if="activeTab === 'spesifikasi'" class="space-y-3">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div
                    v-for="spec in specItems"
                    :key="spec.label"
                    class="bg-background border border-black rounded-[2px] p-3 flex items-center justify-between text-xs sm:text-sm font-sans"
                  >
                    <span class="font-bold text-muted-foreground">{{ spec.label }}</span>
                    <span class="font-outfit font-black text-black text-right ml-2">{{
                      spec.value
                    }}</span>
                  </div>
                </div>
              </div>

              <div
                v-else-if="activeTab === 'pengiriman'"
                class="space-y-3 text-xs sm:text-sm font-sans font-medium text-black/85 leading-relaxed"
              >
                <div
                  class="flex items-start gap-3 p-3 bg-background border border-black rounded-[2px]"
                >
                  <svg
                    class="w-5 h-5 text-black shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                    />
                  </svg>
                  <div>
                    <strong class="font-outfit font-black text-black block mb-0.5"
                      >100% Produk Orisinal Bersegel</strong
                    >
                    Semua buku diperoleh langsung dari penerbit resmi atau distributor tunggal tanpa
                    perantara bajakan.
                  </div>
                </div>
                <div
                  class="flex items-start gap-3 p-3 bg-background border border-black rounded-[2px]"
                >
                  <svg
                    class="w-5 h-5 text-black shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
                    />
                  </svg>
                  <div>
                    <strong class="font-outfit font-black text-black block mb-0.5"
                      >Proteksi Pengemasan Berlapis</strong
                    >
                    Dibungkus plastik seal kedap air, kardus pelindung sudut siku, dan 3 lapis
                    bubble wrap tebal ekstra.
                  </div>
                </div>
                <div
                  class="flex items-start gap-3 p-3 bg-background border border-black rounded-[2px]"
                >
                  <svg
                    class="w-5 h-5 text-black shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                  <div>
                    <strong class="font-outfit font-black text-black block mb-0.5"
                      >Garansi Retur 30 Hari</strong
                    >
                    Jika buku mengalami cacat produksi, halaman terbalik atau hilang, kami ganti
                    buku baru tanpa dipungut biaya retur.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Ulasan & Rating Pembeli -->
      <section id="ulasan-pembeli" class="pt-8 sm:pt-12 border-t-2 sm:border-t-3 border-black space-y-6 scroll-mt-24 mb-10">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="font-outfit font-black text-2xl sm:text-3xl text-black">
              Ulasan & Rating Pembeli
            </h2>
            <p class="font-sans text-xs sm:text-sm text-neutral-600 font-medium mt-1">
              Ulasan nyata dari pembeli terverifikasi setelah pesanan diterima.
            </p>
          </div>
        </div>

        <!-- Rating Breakdown Card -->
        <div class="bg-white border-2 sm:border-3 border-black p-5 sm:p-7 rounded-[2px] shadow-neo-sm sm:shadow-neo grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
          <!-- Overall Rating -->
          <div class="md:col-span-4 flex flex-col items-center justify-center text-center p-4 bg-amber-50/60 border-2 border-black rounded-[2px]">
            <div class="font-outfit font-black text-4xl sm:text-5xl text-black flex items-baseline gap-1">
              <span>{{ Number(reviewBreakdown.average_rating || 0).toFixed(1) }}</span>
              <span class="text-lg text-neutral-500 font-bold">/ 5.0</span>
            </div>
            <div class="flex items-center gap-1 mt-2">
              <svg
                v-for="star in 5"
                :key="star"
                class="w-5 h-5"
                :class="star <= Math.round(reviewBreakdown.average_rating || 0) ? 'fill-amber-400 text-black' : 'fill-neutral-200 text-neutral-400'"
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
              </svg>
            </div>
            <p class="font-sans text-xs font-bold text-neutral-600 mt-2">
              {{ reviewBreakdown.total_reviews }} total ulasan • {{ reviewBreakdown.with_comment_count }} dengan komentar
            </p>
          </div>

          <!-- Star Distribution Bars -->
          <div class="md:col-span-8 space-y-2 font-sans">
            <div
              v-for="s in [5, 4, 3, 2, 1]"
              :key="s"
              class="flex items-center gap-3 text-xs"
            >
              <div class="flex items-center gap-1.5 w-8 shrink-0 font-bold text-black">
                <span class="w-3 text-right tabular-nums">{{ s }}</span>
                <svg class="w-3.5 h-3.5 fill-amber-400 text-black shrink-0" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" stroke-width="1.5"/>
                </svg>
              </div>

              <!-- Bar -->
              <div class="flex-1 h-3.5 bg-neutral-100 border border-black rounded-[2px] overflow-hidden relative">
                <div
                  class="h-full bg-neo-yellow border-r border-black transition-all duration-300"
                  :style="{ width: `${calculatePercentage(reviewBreakdown[`star_${s}_count`])}%` }"
                ></div>
              </div>

              <div class="w-12 text-right font-mono font-bold text-neutral-600 text-[11px] shrink-0">
                {{ reviewBreakdown[`star_${s}_count`] || 0 }}
              </div>
            </div>
          </div>
        </div>

        <!-- Filters & Sorting Toolbar -->
        <div class="bg-neutral-50 border-2 border-black p-3.5 rounded-[2px] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <!-- Star Filter Pills -->
          <div class="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              class="px-3 py-1.5 rounded-[2px] font-outfit font-black text-xs border-2 border-black transition-all cursor-pointer"
              :class="reviewFilterRating === '' ? 'bg-black text-white shadow-neo-xs' : 'bg-white text-black hover:bg-neutral-100'"
              @click="reviewFilterRating = ''"
            >
              Semua ({{ reviewBreakdown.total_reviews }})
            </button>
            <button
              v-for="star in [5, 4, 3, 2, 1]"
              :key="star"
              type="button"
              class="px-2.5 py-1.5 rounded-[2px] font-outfit font-black text-xs border-2 border-black transition-all cursor-pointer flex items-center gap-1"
              :class="reviewFilterRating === String(star) ? 'bg-neo-yellow text-black shadow-neo-xs -translate-y-0.5' : 'bg-white text-black hover:bg-neutral-100'"
              @click="reviewFilterRating = reviewFilterRating === String(star) ? '' : String(star)"
            >
              <span>{{ star }}</span>
              <svg class="w-3 h-3 fill-amber-400 text-black" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span>({{ reviewBreakdown[`star_${star}_count`] || 0 }})</span>
            </button>
          </div>

          <!-- Secondary Filters: Has comment toggle & Sort dropdown -->
          <div class="flex items-center gap-2.5 flex-wrap justify-between md:justify-end">
            <button
              type="button"
              class="px-3 py-1.5 rounded-[2px] font-outfit font-bold text-xs border-2 border-black transition-all cursor-pointer flex items-center gap-1.5"
              :class="reviewFilterHasComment ? 'bg-neo-yellow text-black shadow-neo-xs font-black' : 'bg-white text-neutral-700 hover:bg-neutral-100'"
              @click="reviewFilterHasComment = !reviewFilterHasComment"
            >
              <span>Ada Komentar</span>
              <span class="text-[10px] px-1 bg-black/10 rounded-[1px] font-mono font-bold">{{ reviewBreakdown.with_comment_count || 0 }}</span>
            </button>

            <select
              v-model="reviewSortBy"
              class="px-2.5 py-1.5 rounded-[2px] font-outfit font-black text-xs border-2 border-black bg-white focus:outline-none cursor-pointer"
            >
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
              <option value="highest_rating">Rating Tertinggi</option>
              <option value="lowest_rating">Rating Terendah</option>
            </select>
          </div>
        </div>

        <!-- Reviews List -->
        <div v-if="reviewsLoading" class="space-y-4 py-6">
          <div v-for="i in 3" :key="i" class="p-5 bg-white border-2 border-black rounded-[2px] animate-pulse space-y-3">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-neutral-200"></div>
              <div class="space-y-1.5">
                <div class="h-4 w-32 bg-neutral-200 rounded-[2px]"></div>
                <div class="h-3 w-20 bg-neutral-100 rounded-[2px]"></div>
              </div>
            </div>
            <div class="h-4 w-3/4 bg-neutral-100 rounded-[2px]"></div>
          </div>
        </div>

        <div v-else-if="reviewsList.length === 0" class="p-8 sm:p-12 text-center bg-white border-2 border-black rounded-[2px] shadow-neo-sm space-y-2">
          <p class="font-outfit font-black text-base text-black">
            Belum ada ulasan untuk filter ini
          </p>
          <p class="font-sans text-xs text-neutral-500 max-w-sm mx-auto">
            Jadilah yang pertama membaca dan memberikan ulasan setelah menyelesaikan pesanan buku ini.
          </p>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="rev in reviewsList"
            :key="rev.id"
            class="p-4 sm:p-6 bg-white border-2 sm:border-3 border-black rounded-[2px] shadow-neo-sm space-y-3"
          >
            <!-- Review Header -->
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-2.5">
                <!-- User avatar placeholder -->
                <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-neo-yellow border-2 border-black font-outfit font-black text-xs sm:text-sm flex items-center justify-center text-black shrink-0 shadow-neo-xs">
                  {{ (rev.user_name || 'U').charAt(0).toUpperCase() }}
                </div>
                <div>
                  <span class="font-outfit font-black text-xs sm:text-sm text-black block">
                    {{ rev.user_name }}
                  </span>
                  <span class="font-sans text-[11px] text-neutral-500 block mt-0.5">
                    {{ formatReviewDate(rev.created_at) }}
                  </span>
                </div>
              </div>

              <!-- Rating stars -->
              <div class="flex items-center gap-0.5 shrink-0">
                <svg
                  v-for="s in 5"
                  :key="s"
                  class="w-3.5 h-3.5"
                  :class="s <= rev.rating ? 'fill-amber-400 text-black' : 'fill-neutral-200 text-neutral-400'"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" stroke-width="1.5"/>
                </svg>
              </div>
            </div>

            <!-- Comment text -->
            <p v-if="rev.comment" class="font-sans text-xs sm:text-sm text-neutral-800 leading-relaxed whitespace-pre-line">
              {{ rev.comment }}
            </p>

            <!-- Seller Reply (Thread Connected) -->
            <div
              v-if="rev.seller_reply"
              class="mt-3.5 ml-1 sm:ml-2 pl-3.5 sm:pl-4 border-l-2 border-black space-y-1"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-1.5">
                  <span class="font-outfit font-black text-xs text-black flex items-center gap-1">
                    Admin
                    <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="10" fill="#3B82F6" />
                      <path d="M6 10l2.5 2.5L14 7.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </span>
                </div>
                <span class="font-sans text-[10px] text-neutral-500">
                  {{ formatReviewDate(rev.seller_reply_at) }}
                </span>
              </div>
              <p class="font-sans text-xs text-neutral-800 leading-relaxed">
                {{ rev.seller_reply }}
              </p>
            </div>
          </div>

          <!-- Pagination -->
          <div
            v-if="reviewMeta.total_pages > 1"
            class="flex items-center justify-between pt-2 select-none"
          >
            <span class="font-outfit font-bold text-xs text-neutral-600">
              Halaman {{ reviewMeta.page }} dari {{ reviewMeta.total_pages }}
            </span>
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                :disabled="reviewPage <= 1 || reviewsLoading"
                class="px-3 py-1.5 bg-white border-2 border-black font-outfit font-black text-xs shadow-neo-xs hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                @click="fetchReviews(reviewPage - 1)"
              >
                ← Sebelumnya
              </button>
              <button
                type="button"
                :disabled="reviewPage >= reviewMeta.total_pages || reviewsLoading"
                class="px-3 py-1.5 bg-neo-yellow text-black border-2 border-black font-outfit font-black text-xs shadow-neo-xs hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                @click="fetchReviews(reviewPage + 1)"
              >
                Selanjutnya →
              </button>
            </div>
          </div>
        </div>
      </section>

      <section v-if="relatedBooks.length > 0" class="pt-8 border-t-2 border-black/10">
        <div class="flex items-center justify-between mb-6">
          <h2 class="font-outfit font-black text-2xl sm:text-3xl text-black">Buku Serupa</h2>
          <router-link
            to="/catalog"
            class="font-outfit font-black text-xs sm:text-sm text-neo-violet underline hover:text-black font-extrabold flex items-center gap-1"
          >
            <span>Lihat Semua</span>
            <svg
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </router-link>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          <BookCard
            v-for="(rel, idx) in relatedBooks"
            :key="rel.id"
            :book="rel"
            :delay="(idx % 4) * 120"
          />
        </div>
      </section>
    </template>

    <Teleport to="body">
      <!-- Modal Sinopsis Lengkap -->
      <transition name="modal-fade">
        <div
          v-if="showSynopsisModal && book"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px] select-none"
          @click.self="closeSynopsisModal"
        >
          <transition name="modal-pop" appear>
            <div
              class="relative w-full max-w-2xl bg-white border-2 sm:border-3 border-black rounded-[2px] shadow-neo-sm sm:shadow-neo flex flex-col max-h-[85vh] overflow-hidden"
            >
              <!-- Modal Header -->
              <div
                class="p-4 sm:p-5 border-b-2 border-black flex items-start justify-between gap-4 bg-white shrink-0"
              >
                <div class="pr-6 min-w-0">
                  <span
                    class="text-[10px] font-outfit font-black uppercase tracking-wider text-neo-violet block"
                  >
                    SINOPSIS BUKU
                  </span>
                  <h3 class="font-outfit font-black text-lg sm:text-xl text-black line-clamp-1 mt-0.5">
                    {{ book.title }}
                  </h3>
                  <p v-if="book.author" class="text-xs font-sans font-bold text-muted-foreground mt-0.5 truncate">
                    Karya {{ book.author }}
                  </p>
                </div>
                <button
                  type="button"
                  class="w-8 h-8 rounded-[2px] border-2 border-black bg-white hover:bg-gray-100 flex items-center justify-center font-black text-sm shadow-neo-sm transition-colors cursor-pointer shrink-0"
                  aria-label="Tutup sinopsis"
                  @click="closeSynopsisModal"
                >
                  ✕
                </button>
              </div>

              <!-- Modal Body (Scrollable) -->
              <div class="p-5 sm:p-6 overflow-y-auto overscroll-contain select-text">
                <div
                  class="font-sans text-sm sm:text-base leading-relaxed text-black/90 font-medium whitespace-pre-line"
                >
                  {{ book.description }}
                </div>
              </div>
            </div>
          </transition>
        </div>
      </transition>

      <transition name="modal-fade">
        <div
          v-if="isQtyModalOpen && book"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px] select-none"
          @click.self="closeQtyModal"
        >
          <transition name="modal-pop" appear>
            <div
              class="relative w-full max-w-md bg-white border-2 sm:border-3 border-black rounded-[2px] shadow-neo-sm sm:shadow-neo p-5 sm:p-6"
            >
              <button
                class="absolute top-3.5 right-3.5 w-8 h-8 rounded-[2px] border-2 border-black bg-white hover:bg-gray-100 flex items-center justify-center font-black text-sm shadow-neo-sm transition-colors cursor-pointer"
                aria-label="Tutup popup"
                @click="closeQtyModal"
              >
                ✕
              </button>

              <div class="mb-4 pr-8">
                <span
                  class="text-[10px] font-outfit font-black uppercase tracking-wider text-neo-violet block"
                >
                  {{ buyNow ? 'BELI SEKARANG' : 'TAMBAH KE KERANJANG' }}
                </span>
                <h3
                  class="font-outfit font-black text-lg sm:text-xl text-black line-clamp-1 mt-0.5"
                >
                  {{ book.title }}
                </h3>
                <p class="text-xs font-sans font-bold text-muted-foreground mt-0.5">
                  {{ formattedPrice }} / item
                </p>
              </div>

              <div class="bg-background border-2 border-black rounded-[2px] p-4 mb-5 space-y-3">
                <div class="flex items-center justify-between gap-4">
                  <span class="font-outfit font-black text-xs sm:text-sm uppercase text-black">
                    Jumlah Buku:
                  </span>

                  <div
                    class="inline-flex items-center border-2 border-black rounded-[2px] bg-white shadow-neo-sm overflow-hidden h-10"
                  >
                    <button
                      class="w-10 h-full flex items-center justify-center font-bold text-lg hover:bg-gray-100 active:bg-neutral-200 border-r-2 border-black transition-colors"
                      aria-label="Kurangi kuantitas"
                      @click="decrementModalQty"
                    >
                      −
                    </button>
                    <span class="w-12 text-center font-outfit font-black text-sm select-none">{{
                      modalQty
                    }}</span>
                    <button
                      class="w-10 h-full flex items-center justify-center font-bold text-lg hover:bg-gray-100 active:bg-neutral-200 border-l-2 border-black transition-colors"
                      aria-label="Tambah kuantitas"
                      @click="incrementModalQty"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div
                  class="pt-2.5 border-t border-black/15 flex items-center justify-between text-xs sm:text-sm font-sans"
                >
                  <span class="font-bold text-muted-foreground">Total Estimasi:</span>
                  <span class="font-outfit font-black text-base sm:text-lg text-black">{{
                    modalSubtotal
                  }}</span>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <button
                  class="neubrutal-btn bg-white text-black border-2 border-black py-2.5 px-4 rounded-[2px] font-outfit font-black text-xs sm:text-sm shadow-neo-sm hover:bg-gray-100 active:translate-x-0.5 active:translate-y-0.5 transition-all text-center"
                  @click="closeQtyModal"
                >
                  Batal
                </button>
                <button
                  :disabled="addingToCart"
                  class="neubrutal-btn bg-neo-yellow text-black border-2 border-black py-2.5 px-4 rounded-[2px] font-outfit font-black text-xs sm:text-sm shadow-neo-sm hover:bg-yellow-300 active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-1.5 transition-all disabled:opacity-60"
                  @click="confirmAddToCart"
                >
                  <svg
                    class="w-4 h-4 text-black shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <circle cx="8" cy="21" r="1" />
                    <circle cx="19" cy="21" r="1" />
                    <path
                      d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"
                    />
                  </svg>
                  <span>{{
                    addingToCart ? 'Memproses...' : buyNow ? 'Lanjut ke Checkout' : 'Tambahkan'
                  }}</span>
                </button>
              </div>
            </div>
          </transition>
        </div>
      </transition>
    </Teleport>
  </div>
</template>
