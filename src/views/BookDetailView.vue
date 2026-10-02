<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { featuredBooks } from '@/data/catalog'
import { useStore } from '@/composables/useStore'
import BookCard from '@/components/BookCard.vue'
import BookCover from '@/components/BookCover.vue'

const route = useRoute()
const router = useRouter()
const { addToCart, openCart } = useStore()

const book = computed(() => featuredBooks.find((b) => b.id === route.params.id))

const relatedBooks = computed(() =>
  featuredBooks.filter((b) => b.id !== route.params.id).slice(0, 4),
)

const selectedFormat = ref('Soft Cover')
const activeTab = ref('sinopsis')

const isQtyModalOpen = ref(false)
const modalQty = ref(1)

function openQtyModal() {
  modalQty.value = 1
  isQtyModalOpen.value = true
}

function closeQtyModal() {
  isQtyModalOpen.value = false
}

function incrementModalQty() {
  modalQty.value = Math.min(modalQty.value + 1, 99)
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

function confirmAddToCart() {
  if (book.value) {
    addToCart(book.value, { format: selectedFormat.value, quantity: modalQty.value })
    closeQtyModal()
  }
}

function handleBuyNow() {
  if (book.value) {
    addToCart(book.value, { format: selectedFormat.value, quantity: 1 })
    openCart()
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
  return [
    { label: 'Penerbit', value: d.publisher || '-' },
    { label: 'Tahun Terbit', value: d.publishDate || '-' },
    { label: 'Nomor ISBN', value: d.isbn || '-' },
    { label: 'Jumlah Halaman', value: `${d.pages || 0} Halaman` },
    { label: 'Bahasa', value: d.language || 'Indonesia' },
    { label: 'Dimensi Buku', value: `${d.length || '-'} × ${d.width || '-'}` },
    { label: 'Berat Bersih', value: d.weight || '-' },
    { label: 'Kondisi Fisik', value: '100% Baru & Segel Penerbit' },
  ]
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
    <div
      v-if="!book"
      class="text-center py-20 bg-white border-3 border-black rounded-[2px] shadow-neo p-8"
    >
      <div
        class="w-16 h-16 mx-auto mb-4 bg-neo-yellow border-2 border-black rounded-[2px] shadow-neo flex items-center justify-center"
      >
        <svg
          class="w-8 h-8 text-black"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10" />
          <path d="M6 10h10" />
        </svg>
      </div>
      <h2 class="font-outfit font-black text-2xl md:text-3xl">Buku Tidak Ditemukan</h2>
      <p class="font-sans text-sm text-muted-foreground mt-2">
        Buku yang Anda cari mungkin sedang tidak tersedia dalam katalog kami.
      </p>
      <button
        class="neubrutal-btn mt-6 bg-neo-yellow text-black border-2 border-black py-2.5 px-6 rounded-[2px] font-outfit font-black shadow-neo-sm"
        @click="router.push('/')"
      >
        Kembali ke Katalog
      </button>
    </div>

    <template v-else>
      <nav
        class="flex items-center gap-2 text-xs font-sans font-bold text-muted-foreground mb-6 sm:mb-8 overflow-x-auto sm:overflow-visible whitespace-nowrap sm:whitespace-normal pb-1 scrollbar-hide"
      >
        <router-link to="/" class="hover:text-neo-violet transition-colors">Beranda</router-link>
        <span>/</span>
        <router-link to="/#katalog" class="hover:text-neo-violet transition-colors"
          >Katalog Buku</router-link
        >
        <span>/</span>
        <span class="text-neo-violet">{{ book.category }}</span>
        <span>/</span>
        <span class="text-black line-clamp-1 font-extrabold max-w-[200px] sm:max-w-none">{{
          book.title
        }}</span>
      </nav>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 mb-12 sm:mb-16 items-start">
        <div class="lg:col-span-5 lg:sticky lg:top-24 self-start space-y-4">
          <div
            class="relative bg-white border-3 border-black rounded-[2px] p-6 sm:p-8 shadow-neo flex flex-col items-center justify-center overflow-hidden group transition-all"
          >
            <span
              v-if="discount > 0"
              class="absolute top-4 left-4 bg-neo-yellow text-black border-2 border-black px-2.5 py-1 rounded-[2px] font-outfit font-black text-xs shadow-neo-sm z-10"
            >
              HEMAT {{ discount }}%
            </span>

            <div
              class="w-full max-w-[260px] sm:max-w-[280px] aspect-[3/3.9] transition-transform duration-300 group-hover:scale-[1.03] group-hover:-rotate-0.5 my-3"
            >
              <BookCover
                :theme="book.theme"
                :title="book.title"
                :author="book.author"
                :accent="book.accentColor"
              />
            </div>

            <div
              class="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-background border border-black rounded-[2px] text-[11px] font-sans font-bold text-black/80"
            >
              <span class="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse"></span>
              <span>100% Fisik Original • Segel Penerbit</span>
            </div>
          </div>

          <div class="bg-white border-3 border-black rounded-[2px] p-4 shadow-neo space-y-2.5">
            <div class="flex items-center gap-2.5 text-xs font-sans font-bold text-black">
              <svg
                class="w-4 h-4 text-neo-violet shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <span>Jaminan Orisinalitas dari Distributor Resmi</span>
            </div>
            <div class="flex items-center gap-2.5 text-xs font-sans font-bold text-black">
              <svg
                class="w-4 h-4 text-neo-orange shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
              <span>Proteksi 3 Lapis Bubble Wrap & Kardus Tebal</span>
            </div>
            <div class="flex items-center gap-2.5 text-xs font-sans font-bold text-black">
              <svg
                class="w-4 h-4 text-green-600 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                <path d="M3 21v-5h5" />
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
              <svg
                class="w-4 h-4 text-yellow-500 fill-yellow-400 shrink-0"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <polygon
                  points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                />
              </svg>
              <span class="font-outfit font-bold text-sm">{{ book.rating }}</span>
              <span class="text-muted-foreground font-semibold">({{ book.reviews }} ulasan)</span>
              <span class="text-black/30 mx-1">·</span>
              <span class="text-muted-foreground font-semibold">{{ book.sold }} terjual</span>
            </div>
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

          <div class="flex items-baseline gap-3 flex-wrap">
            <span class="font-outfit font-black text-3xl sm:text-4xl text-black">
              {{ formattedPrice }}
            </span>
            <span
              v-if="discount > 0"
              class="font-sans text-base font-bold text-muted-foreground line-through"
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

          <div class="space-y-2">
            <span
              class="font-outfit font-bold text-xs text-muted-foreground uppercase tracking-wider block"
            >
              PILIH FORMAT CETAKAN
            </span>
            <div class="flex flex-wrap gap-2.5 sm:gap-3">
              <button
                v-for="fmt in ['Soft Cover', 'Hard Cover Collector']"
                :key="fmt"
                class="neubrutal-btn border-2 border-black py-2 px-3.5 sm:py-2.5 sm:px-4 rounded-[2px] font-outfit font-black text-xs sm:text-sm shadow-neo-sm transition-all"
                :class="
                  selectedFormat === fmt
                    ? 'bg-neo-yellow text-black'
                    : 'bg-white hover:bg-gray-100 text-black'
                "
                @click="selectedFormat = fmt"
              >
                {{ fmt }}
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2.5 sm:gap-4 pt-1">
            <button
              class="neubrutal-btn bg-white text-black border-2 border-black h-11 sm:h-12 px-3 sm:px-5 rounded-[2px] font-outfit font-black text-xs sm:text-sm shadow-neo-sm hover:bg-gray-100 active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-1.5 sm:gap-2 transition-all"
              @click="openQtyModal"
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
              <span class="truncate">Tambah Keranjang</span>
            </button>

            <button
              class="neubrutal-btn bg-neo-yellow text-black border-2 border-black h-11 sm:h-12 px-3 sm:px-5 rounded-[2px] font-outfit font-black text-xs sm:text-sm shadow-neo-sm hover:bg-yellow-300 active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-1.5 sm:gap-2 transition-all"
              @click="handleBuyNow"
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
              class="bg-white border-3 border-black rounded-[2px] p-5 sm:p-6 shadow-neo min-h-[200px]"
            >
              <div v-if="activeTab === 'sinopsis'" class="space-y-4">
                <div
                  class="font-sans text-sm sm:text-base leading-relaxed text-black/90 font-medium whitespace-pre-line"
                >
                  {{ book.description }}
                </div>
                <div
                  class="bg-background border-2 border-black p-3.5 rounded-[2px] text-xs font-sans font-bold flex items-start gap-2.5"
                >
                  <svg
                    class="w-4 h-4 text-neo-violet shrink-0 mt-0.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span class="text-black/80">
                    Setiap buku yang dikirim dijamin edisi original langsung dari penerbit resmi
                    dengan nomor ISBN terdaftar.
                  </span>
                </div>
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
                    class="w-5 h-5 text-neo-violet shrink-0 mt-0.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
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
                    class="w-5 h-5 text-neo-orange shrink-0 mt-0.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="m7.5 4.27 9 5.15" />
                    <path
                      d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
                    />
                    <path d="m3.3 7 8.7 5 8.7-5" />
                    <path d="M12 22V12" />
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
                    class="w-5 h-5 text-green-600 shrink-0 mt-0.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                    <path d="M21 3v5h-5" />
                    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                    <path d="M3 21v-5h5" />
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

      <section v-if="relatedBooks.length > 0" class="pt-8 border-t-2 border-black/10">
        <div class="flex items-center justify-between mb-6">
          <h2 class="font-outfit font-black text-2xl sm:text-3xl text-black">Buku Serupa</h2>
          <router-link
            to="/#katalog"
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
      <transition name="modal-fade">
        <div
          v-if="isQtyModalOpen && book"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px] select-none"
          @click.self="closeQtyModal"
        >
          <transition name="modal-pop" appear>
            <div
              class="relative w-full max-w-md bg-white border-3 border-black rounded-[2px] shadow-neo-lg p-5 sm:p-6"
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
                  TAMBAH KE KERANJANG
                </span>
                <h3
                  class="font-outfit font-black text-lg sm:text-xl text-black line-clamp-1 mt-0.5"
                >
                  {{ book.title }}
                </h3>
                <p class="text-xs font-sans font-bold text-muted-foreground mt-0.5">
                  Format: <span class="text-black">{{ selectedFormat }}</span> •
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
                  class="neubrutal-btn bg-neo-yellow text-black border-2 border-black py-2.5 px-4 rounded-[2px] font-outfit font-black text-xs sm:text-sm shadow-neo-sm hover:bg-yellow-300 active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-1.5 transition-all"
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
                  <span>Tambahkan</span>
                </button>
              </div>
            </div>
          </transition>
        </div>
      </transition>
    </Teleport>
  </div>
</template>
