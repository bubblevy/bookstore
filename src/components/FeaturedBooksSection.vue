<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import BookCard from './BookCard.vue'
import { featuredBooks } from '@/data/catalog'
import AOS from 'aos'

const sectionRef = ref(null)
const isSectionVisible = ref(false)
let observer = null

onMounted(() => {
  if ('IntersectionObserver' in window && sectionRef.value) {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          isSectionVisible.value = true
          if (observer) observer.disconnect()
        }
      },
      { threshold: 0.05, rootMargin: '80px 0px -40px 0px' }
    )
    observer.observe(sectionRef.value)
  } else {
    isSectionVisible.value = true
  }
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})

const activeFilter = ref('Semua')
const filters = [
  'Semua',
  'Fiksi Populer',
  'Self-Growth',
  'Sci-Fi & Fantasy',
  'Sejarah & Biografi',
  'Seni & Desain',
]

const visibleCount = ref(8)

const filteredBooks = computed(() => {
  if (activeFilter.value === 'Semua') return featuredBooks
  return featuredBooks.filter((b) => b.category === activeFilter.value)
})

const visibleBooks = computed(() => {
  return filteredBooks.value.slice(0, visibleCount.value)
})

const hasMore = computed(() => {
  return visibleCount.value < filteredBooks.value.length
})

function loadMore() {
  visibleCount.value += 4
}

watch(activeFilter, () => {
  visibleCount.value = 8
  nextTick(() => {
    AOS.refreshHard()
  })
})
</script>

<template>
  <!-- Full-width alternating background band (Neutral Background) with Bookstore Ornaments -->
  <section
    id="katalog"
    ref="sectionRef"
    class="w-full bg-background border-b-4 border-black py-16 md:py-20 scroll-mt-20 relative overflow-hidden"
  >
    <!-- Background Bookstore Ornaments & Literary Accents -->
    <div class="absolute inset-0 pointer-events-none select-none overflow-hidden">
      <!-- Subtle dot grid -->
      <div
        class="absolute inset-0 opacity-[0.05] bg-[radial-gradient(#000_1.5px,transparent_1.5px)] [background-size:24px_24px]"
      ></div>

      <!-- Left Watermark: Open book outline -->
      <svg
        viewBox="0 0 100 80"
        class="absolute -left-12 top-1/4 w-80 h-64 opacity-[0.035] text-black"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M 50 20 Q 25 10 5 18 L 5 70 Q 25 62 50 72 Q 75 62 95 70 L 95 18 Q 75 10 50 20 Z" />
        <line x1="50" y1="20" x2="50" y2="72" />
      </svg>

      <!-- Right Watermark: Book spine stack -->
      <div
        class="absolute -right-8 bottom-20 opacity-[0.04] text-black flex flex-col gap-2 rotate-6"
      >
        <div class="w-48 h-6 border-2 border-black bg-black"></div>
        <div class="w-56 h-8 border-2 border-black bg-black"></div>
        <div class="w-52 h-7 border-2 border-black bg-black"></div>
        <div class="w-60 h-9 border-2 border-black bg-black"></div>
      </div>

      <!-- Floating literary symbols -->
      <span class="absolute top-10 right-[12%] text-neo-violet text-3xl font-black opacity-40"
        >✦</span
      >
      <span class="absolute bottom-16 left-[5%] text-neo-orange text-3xl font-black opacity-40"
        >★</span
      >
      <span class="absolute top-1/2 left-[2%] text-neo-yellow text-2xl font-black opacity-60"
        >✦</span
      >
      <span class="absolute bottom-1/3 right-[3%] text-neo-lime text-2xl font-black opacity-60"
        >★</span
      >

      <!-- Subtle barcode & ISBN stamp -->
      <div
        class="absolute top-6 right-8 hidden lg:flex items-center gap-2 opacity-25 border border-black px-2 py-0.5 rounded-[2px] text-[10px] font-outfit font-black tracking-widest uppercase"
      >
        <span>||||||| | ||||| |||</span>
        <span>CATALOG-ID · 2026</span>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <!-- Section Header: Professional bookstore editorial -->
      <div data-aos="fade-up" class="mb-8 md:mb-12">
        <div>
          <span
            class="inline-block bg-neo-yellow border-2 border-black px-3 py-0.5 rounded-[2px] font-outfit font-black text-xs uppercase tracking-wider shadow-neo-sm mb-3"
          >
            Original & Terjamin
          </span>
          <h2
            class="font-outfit font-black text-3xl sm:text-4xl md:text-5xl tracking-tight leading-none text-black"
          >
            KATALOG BUKU.
          </h2>
          <p
            class="font-sans text-sm md:text-base font-semibold text-muted-foreground mt-2 max-w-lg"
          >
            Ribuan pilihan bacaan dari berbagai genre dan disiplin ilmu. Siap menemanimu menemukan
            gagasan dan perspektif baru setiap hari.
          </p>
        </div>
      </div>

      <!-- Filter tabs: horizontal scroll, breaks past container edges -->
      <div
        data-aos="fade-up"
        data-aos-delay="80"
        class="relative mb-8 md:mb-10 -mx-4 px-4 sm:-mx-16 sm:px-16 lg:-mx-24 lg:px-24 xl:-mx-36 xl:px-36"
      >
        <div class="overflow-x-auto scrollbar-hide pb-1">
          <div class="flex items-center gap-2 w-max sm:flex-wrap">
            <button
              v-for="filter in filters"
              :key="filter"
              class="neubrutal-btn border-2 border-black px-3.5 py-1.5 rounded-[2px] font-outfit font-black text-xs shadow-neo-sm transition-all whitespace-nowrap"
              :class="
                activeFilter === filter
                  ? 'bg-neo-yellow text-black'
                  : 'bg-white hover:bg-gray-50 text-black'
              "
              @click="activeFilter = filter"
            >
              {{ filter }}
            </button>
          </div>
        </div>
      </div>

      <!-- Books Grid: Clean, Spaced, Uncluttered -->
      <div
        :key="`${activeFilter}-${isSectionVisible}`"
        class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
      >
        <BookCard
          v-for="(book, idx) in visibleBooks"
          :key="`${activeFilter}-${book.id}`"
          :book="book"
          :animate="isSectionVisible"
          :delay="(idx % 8) * 90"
        />
      </div>

      <!-- Load More Button -->
      <div v-if="hasMore" class="mt-10 sm:mt-12 text-center">
        <button
          class="neubrutal-btn bg-neo-yellow text-black border-3 border-black py-3 px-8 rounded-[2px] font-outfit font-black text-xs sm:text-sm shadow-neo hover:bg-yellow-300 active:translate-x-0.5 active:translate-y-0.5 inline-flex items-center gap-2"
          @click="loadMore"
        >
          <span>Muat Lebih Banyak Buku</span>
          <span class="text-base font-bold">↓</span>
        </button>
        <p class="font-sans text-[11px] font-bold text-muted-foreground mt-2.5">
          Menampilkan {{ visibleBooks.length }} dari {{ filteredBooks.length }} judul buku
        </p>
      </div>

      <div
        v-else-if="filteredBooks.length > 8"
        class="mt-10 text-center text-xs font-outfit font-bold text-muted-foreground uppercase tracking-wider"
      >
        ✦ Seluruh {{ filteredBooks.length }} buku dalam kategori ini telah ditampilkan ✦
      </div>

      <!-- Empty state if no books in category -->
      <div
        v-if="filteredBooks.length === 0"
        class="text-center py-16 bg-white border-3 border-black rounded-[2px] shadow-neo p-8 mt-6"
      >
        <div class="text-4xl mb-3">🔍</div>
        <p class="font-outfit font-black text-xl">Koleksi Belum Tersedia</p>
        <p class="font-sans text-xs text-muted-foreground mt-1">
          Belum ada judul untuk kategori ini. Silakan pilih kategori lain.
        </p>
        <button
          class="mt-4 neubrutal-btn bg-neo-yellow text-black border-2 border-black py-2 px-5 rounded-[2px] font-outfit font-black text-xs shadow-neo-sm"
          @click="activeFilter = 'Semua'"
        >
          Tampilkan Semua Buku
        </button>
      </div>
    </div>
  </section>
</template>
