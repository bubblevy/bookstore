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
const quantity = ref(1)

// Accordion states
const openAccordions = ref({
  sinopsis: true, // open by default
  spesifikasi: true, // open by default
  pengiriman: false,
})

function toggleAccordion(key) {
  openAccordions.value[key] = !openAccordions.value[key]
}

const discount = computed(() => {
  if (!book.value?.originalPrice) return 0
  return Math.round(((book.value.originalPrice - book.value.price) / book.value.originalPrice) * 100)
})

const formattedPrice = computed(() => {
  if (!book.value) return ''
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(
    book.value.price,
  )
})
const formattedOriginal = computed(() => {
  if (!book.value?.originalPrice) return ''
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(
    book.value.originalPrice,
  )
})

const specItems = computed(() => {
  if (!book.value?.details) return []
  const d = book.value.details
  return [
    { label: 'Penerbit', value: d.publisher },
    { label: 'Tahun Terbit', value: d.publishDate },
    { label: 'Nomor ISBN', value: d.isbn },
    { label: 'Jumlah Halaman', value: `${d.pages} Halaman` },
    { label: 'Bahasa', value: d.language },
    { label: 'Dimensi Buku', value: `${d.length} × ${d.width}` },
    { label: 'Berat Bersih', value: d.weight },
    { label: 'Kondisi', value: '100% Baru & Segel Penerbit' },
  ]
})

function handleAddToCart() {
  if (book.value) {
    addToCart(book.value, { format: selectedFormat.value, quantity: quantity.value })
  }
}

function handleBuyNow() {
  if (book.value) {
    addToCart(book.value, { format: selectedFormat.value, quantity: quantity.value })
    openCart()
  }
}

function increment() {
  quantity.value = Math.min(quantity.value + 1, 99)
}

function decrement() {
  quantity.value = Math.max(quantity.value - 1, 1)
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 select-none">
    <!-- State jika buku tidak ditemukan -->
    <div
      v-if="!book"
      class="text-center py-20 bg-white border-3 border-black rounded-[2px] shadow-neo p-8"
    >
      <div class="text-4xl mb-3">📖</div>
      <h2 class="font-outfit font-black text-2xl md:text-3xl">Buku Tidak Ditemukan</h2>
      <p class="font-sans text-sm text-muted-foreground mt-2">Buku yang Anda cari mungkin sedang tidak tersedia dalam katalog kami.</p>
      <button
        class="neubrutal-btn mt-6 bg-neo-yellow text-black border-2 border-black py-2.5 px-6 rounded-[2px] font-outfit font-black shadow-neo-sm"
        @click="router.push('/')"
      >
        Kembali ke Katalog
      </button>
    </div>

    <template v-else>
      <!-- Breadcrumb Navigasi -->
      <nav class="flex items-center gap-2 text-xs font-sans font-bold text-muted-foreground mb-8">
        <router-link to="/" class="hover:text-neo-violet transition-colors">Beranda</router-link>
        <span>/</span>
        <router-link to="/#katalog" class="hover:text-neo-violet transition-colors">Katalog Buku</router-link>
        <span>/</span>
        <span class="text-black line-clamp-1 font-extrabold">{{ book.title }}</span>
      </nav>

      <!-- Grid Produk Utama -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mb-14 items-start">
        <!-- Kolom Kiri: Sampul Buku (5 Kolom) -->
        <div class="lg:col-span-5">
          <div
            class="relative bg-white border-3 border-black rounded-[2px] p-6 sm:p-8 shadow-neo flex items-center justify-center overflow-hidden"
          >
            <!-- Badge Diskon jika ada -->
            <span
              v-if="discount > 0"
              class="absolute top-4 left-4 bg-neo-yellow text-black border-2 border-black px-2.5 py-0.5 rounded-[2px] font-outfit font-black text-xs shadow-neo-sm z-10"
            >
              HEMAT {{ discount }}%
            </span>

            <!-- Preview Cover Buku -->
            <div class="w-full max-w-[260px] aspect-[3/3.9] transition-transform duration-300 hover:scale-102">
              <BookCover
                :theme="book.theme"
                :title="book.title"
                :author="book.author"
                :accent="book.accentColor"
              />
            </div>
          </div>

          <!-- Info Ringkas di Bawah Cover -->
          <div class="grid grid-cols-3 gap-3 mt-4 text-center">
            <div class="bg-background border-2 border-black rounded-[2px] p-2.5 shadow-neo-sm">
              <span class="font-sans font-bold text-[10px] text-muted-foreground uppercase block">Format</span>
              <span class="font-outfit font-black text-xs sm:text-sm text-black">{{ selectedFormat }}</span>
            </div>
            <div class="bg-background border-2 border-black rounded-[2px] p-2.5 shadow-neo-sm">
              <span class="font-sans font-bold text-[10px] text-muted-foreground uppercase block">Kondisi</span>
              <span class="font-outfit font-black text-xs sm:text-sm text-black">100% Segel</span>
            </div>
            <div class="bg-background border-2 border-black rounded-[2px] p-2.5 shadow-neo-sm">
              <span class="font-sans font-bold text-[10px] text-muted-foreground uppercase block">Garansi</span>
              <span class="font-outfit font-black text-xs sm:text-sm text-black">Asli / Retur</span>
            </div>
          </div>
        </div>

        <!-- Kolom Kanan: Detail Informasi & Pembelian (7 Kolom) -->
        <div class="lg:col-span-7 space-y-6">
          <!-- Kategori & Rating -->
          <div class="flex items-center gap-3 flex-wrap">
            <span class="bg-black text-white px-2.5 py-1 rounded-[2px] font-outfit font-bold text-xs uppercase tracking-wide">
              {{ book.category }}
            </span>
            <div class="flex items-center gap-1 text-xs font-sans">
              <span class="text-neo-orange font-black text-sm">★</span>
              <span class="font-outfit font-bold text-sm">{{ book.rating }}</span>
              <span class="text-muted-foreground">({{ book.reviews }} ulasan)</span>
              <span class="text-black/30 mx-1">·</span>
              <span class="text-muted-foreground font-semibold">{{ book.sold }} eksemplar terjual</span>
            </div>
          </div>

          <!-- Judul Buku & Penulis -->
          <div>
            <h1 class="font-outfit font-black text-3xl sm:text-4xl md:text-5xl tracking-tight leading-tight text-black">
              {{ book.title }}
            </h1>
            <p v-if="book.subtitle" class="font-sans text-sm sm:text-base font-semibold text-muted-foreground mt-1">
              {{ book.subtitle }}
            </p>
            <p class="font-sans text-sm font-bold text-neo-violet mt-2">
              Karya: <span class="underline text-black">{{ book.author }}</span>
            </p>
          </div>

          <!-- HARGA PRODUK: Font Pas & Rapi (Tanpa Box Card Raksasa) -->
          <div class="py-2 flex items-baseline gap-3">
            <span class="font-outfit font-black text-3xl sm:text-4xl text-black">
              {{ formattedPrice }}
            </span>
            <span v-if="discount > 0" class="font-sans text-base font-bold text-muted-foreground line-through">
              {{ formattedOriginal }}
            </span>
            <span v-if="discount > 0" class="bg-neo-yellow text-black border border-black px-2 py-0.5 rounded-[2px] font-outfit font-bold text-xs">
              Hemat {{ discount }}%
            </span>
          </div>

          <!-- Pilihan Format Edisi -->
          <div class="space-y-2">
            <span class="font-outfit font-bold text-xs text-muted-foreground uppercase tracking-wider block">
              PILIH FORMAT CETAKAN
            </span>
            <div class="flex flex-wrap gap-2.5">
              <button
                v-for="fmt in ['Soft Cover', 'Hard Cover Collector']"
                :key="fmt"
                class="neubrutal-btn border-2 border-black py-2 px-4 rounded-[2px] font-outfit font-black text-xs sm:text-sm shadow-neo-sm transition-all"
                :class="selectedFormat === fmt ? 'bg-neo-yellow text-black' : 'bg-white hover:bg-gray-50 text-black'"
                @click="selectedFormat = fmt"
              >
                {{ fmt }}
              </button>
            </div>
          </div>

          <!-- KONTROL PEMBELIAN: Stepper Kuantitas & Tombol yang Rapi dan Elegan -->
          <div class="space-y-4 pt-2">
            <!-- Stepper Kuantitas Rapi -->
            <div class="flex items-center gap-3">
              <span class="font-outfit font-bold text-xs uppercase text-muted-foreground">Kuantitas:</span>
              <div class="inline-flex items-center border-2 border-black rounded-[2px] bg-white shadow-neo-sm overflow-hidden">
                <button
                  class="w-9 h-9 flex items-center justify-center font-bold text-base hover:bg-gray-100 border-r border-black"
                  aria-label="Kurangi kuantitas"
                  @click="decrement"
                >
                  −
                </button>
                <span class="w-12 text-center font-outfit font-black text-sm">{{ quantity }}</span>
                <button
                  class="w-9 h-9 flex items-center justify-center font-bold text-base hover:bg-gray-100 border-l border-black"
                  aria-label="Tambah kuantitas"
                  @click="increment"
                >
                  +
                </button>
              </div>
              <span class="text-xs font-sans font-semibold text-green-700">✓ Stok Siap Kirim</span>
            </div>

            <!-- Tombol Beli & Tambah Keranjang -->
            <div class="flex flex-col sm:flex-row items-stretch gap-3 pt-1">
              <button
                class="neubrutal-btn flex-1 bg-white text-black border-2 border-black py-3 px-5 rounded-[2px] font-outfit font-black text-sm shadow-neo-sm hover:bg-yellow-50 active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-2"
                @click="handleAddToCart"
              >
                <span>🛒</span>
                <span>Tambah ke Keranjang</span>
              </button>

              <button
                class="neubrutal-btn flex-1 bg-neo-yellow text-black border-2 border-black py-3 px-5 rounded-[2px] font-outfit font-black text-sm shadow-neo-sm hover:bg-yellow-300 active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-2"
                @click="handleBuyNow"
              >
                <span>Beli Sekarang</span>
                <span>→</span>
              </button>
            </div>
          </div>

          <!-- Jaminan Pengiriman Rapi -->
          <div class="pt-3 border-t border-black/10 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs font-sans font-semibold text-muted-foreground">
            <span class="flex items-center gap-1.5 text-black">
              🚚 <span>Free ongkir min. Rp150.000</span>
            </span>
            <span class="flex items-center gap-1.5 text-black">
              🛡️ <span>Garansi tukar baru jika cacat</span>
            </span>
          </div>
        </div>
      </div>

      <!-- ACCORDION: Sinopsis, Spesifikasi Buku, dan Pengiriman -->
      <section class="max-w-4xl mx-auto mb-16 space-y-3">
        <!-- Accordion 1: Sinopsis Buku -->
        <div class="bg-white border-3 border-black rounded-[2px] shadow-neo overflow-hidden">
          <button
            class="w-full p-4 sm:p-5 flex items-center justify-between text-left font-outfit font-black text-base sm:text-lg hover:bg-yellow-50 transition-colors"
            @click="toggleAccordion('sinopsis')"
          >
            <span class="flex items-center gap-2.5">
              <span>📖</span>
              <span>Sinopsis & Ulasan Buku</span>
            </span>
            <span
              class="w-7 h-7 rounded-[2px] bg-background border border-black flex items-center justify-center font-bold text-xs transition-transform duration-200"
              :class="openAccordions.sinopsis ? 'rotate-180 bg-neo-yellow' : ''"
            >
              ▼
            </span>
          </button>

          <div
            v-if="openAccordions.sinopsis"
            class="p-5 sm:p-6 border-t-2 border-black/10 bg-white font-sans text-sm sm:text-base leading-relaxed text-black/85 font-semibold whitespace-pre-line"
          >
            {{ book.description }}
          </div>
        </div>

        <!-- Accordion 2: Spesifikasi Lengkap Buku -->
        <div class="bg-white border-3 border-black rounded-[2px] shadow-neo overflow-hidden">
          <button
            class="w-full p-4 sm:p-5 flex items-center justify-between text-left font-outfit font-black text-base sm:text-lg hover:bg-yellow-50 transition-colors"
            @click="toggleAccordion('spesifikasi')"
          >
            <span class="flex items-center gap-2.5">
              <span>📋</span>
              <span>Spesifikasi & Detail Cetakan</span>
            </span>
            <span
              class="w-7 h-7 rounded-[2px] bg-background border border-black flex items-center justify-center font-bold text-xs transition-transform duration-200"
              :class="openAccordions.spesifikasi ? 'rotate-180 bg-neo-yellow' : ''"
            >
              ▼
            </span>
          </button>

          <div
            v-if="openAccordions.spesifikasi"
            class="p-5 sm:p-6 border-t-2 border-black/10 bg-white"
          >
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                v-for="spec in specItems"
                :key="spec.label"
                class="bg-background border border-black rounded-[2px] p-3 flex items-center justify-between text-xs sm:text-sm font-sans"
              >
                <span class="font-bold text-muted-foreground">{{ spec.label }}</span>
                <span class="font-outfit font-black text-black">{{ spec.value }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Accordion 3: Kebijakan Pengiriman & Keaslian -->
        <div class="bg-white border-3 border-black rounded-[2px] shadow-neo overflow-hidden">
          <button
            class="w-full p-4 sm:p-5 flex items-center justify-between text-left font-outfit font-black text-base sm:text-lg hover:bg-yellow-50 transition-colors"
            @click="toggleAccordion('pengiriman')"
          >
            <span class="flex items-center gap-2.5">
              <span>🛡️</span>
              <span>Jaminan Orisinalitas & Pengiriman Aman</span>
            </span>
            <span
              class="w-7 h-7 rounded-[2px] bg-background border border-black flex items-center justify-center font-bold text-xs transition-transform duration-200"
              :class="openAccordions.pengiriman ? 'rotate-180 bg-neo-yellow' : ''"
            >
              ▼
            </span>
          </button>

          <div
            v-if="openAccordions.pengiriman"
            class="p-5 sm:p-6 border-t-2 border-black/10 bg-white font-sans text-xs sm:text-sm font-semibold text-muted-foreground leading-relaxed space-y-2"
          >
            <p>
              • <strong>100% Edisi Asli:</strong> Setiap buku diperoleh langsung dari penerbit resmi atau distributor tunggal resmi di Indonesia. Kami tidak pernah dan menentang peredaran buku bajakan/repro.
            </p>
            <p>
              • <strong>Kemasan Berlapis Khusus:</strong> Pesanan Anda diproteksi dengan plastik segel anti air, kardus siku kaku, dan 3 lapis bubble wrap tebal untuk mencegah benturan selama pengiriman.
            </p>
            <p>
              • <strong>Garansi Pengembalian 30 Hari:</strong> Jika terdapat cacat cetak pada buku (halaman kosong/terbalik), kami mengganti buku baru secara gratis tanpa biaya tambahan.
            </p>
          </div>
        </div>
      </section>

      <!-- Rekomendasi Buku Terkait -->
      <section v-if="relatedBooks.length > 0" class="pt-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="font-outfit font-black text-2xl sm:text-3xl text-black">
            Buku Serupa Pilihan Editor
          </h2>
          <router-link
            to="/#katalog"
            class="font-outfit font-black text-xs sm:text-sm text-neo-violet underline hover:text-black"
          >
            Lihat Semua →
          </router-link>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          <BookCard v-for="rel in relatedBooks" :key="rel.id" :book="rel" />
        </div>
      </section>
    </template>
  </div>
</template>