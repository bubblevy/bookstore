<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import BookCard from './BookCard.vue'
import { useStore } from '@/composables/useStore'

const { state } = useStore()

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
      { threshold: 0.05, rootMargin: '80px 0px -40px 0px' },
    )
    observer.observe(sectionRef.value)
  } else {
    isSectionVisible.value = true
  }
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})

const popularBooks = computed(() => {
  if (state.popularBooks && state.popularBooks.length > 0) {
    return state.popularBooks
  }
  return [...state.books].sort(
    (a, b) =>
      (Number(b.sold) || 0) - (Number(a.sold) || 0) ||
      String(a.title).localeCompare(String(b.title)),
  )
})

const isPopularLoading = computed(() => {
  return state.popularBooksLoading || (state.catalogLoading && !popularBooks.value.length)
})

const visibleBooks = computed(() => {
  return popularBooks.value.slice(0, 4)
})
</script>

<template>
  <section
    id="populer"
    ref="sectionRef"
    class="w-full bg-background border-b-4 border-black py-16 md:py-20 scroll-mt-20 relative overflow-hidden"
  >
    <div class="absolute inset-0 pointer-events-none select-none overflow-hidden">
      <div
        class="absolute inset-0 opacity-[0.05] bg-[radial-gradient(var(--color-black)_1.5px,transparent_1.5px)] [background-size:24px_24px]"
      ></div>

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

      <div
        class="absolute -right-8 bottom-20 opacity-[0.04] text-black flex flex-col gap-2 rotate-6"
      >
        <div class="w-48 h-6 border-2 border-black bg-black"></div>
        <div class="w-56 h-8 border-2 border-black bg-black"></div>
        <div class="w-52 h-7 border-2 border-black bg-black"></div>
        <div class="w-60 h-9 border-2 border-black bg-black"></div>
      </div>

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

      <div
        class="absolute top-6 right-8 hidden lg:flex items-center gap-2 opacity-25 border border-black px-2 py-0.5 rounded-[2px] text-[10px] font-outfit font-black tracking-widest uppercase"
      >
        <span>||||||| | ||||| |||</span>
        <span>POPULAR · 2026</span>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <div data-aos="fade-up" class="mb-8 md:mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span
            class="inline-block bg-neo-yellow border-2 border-black px-3 py-0.5 rounded-[2px] font-outfit font-black text-xs uppercase tracking-wider shadow-neo-sm mb-3"
          >
            Pilihan Populer
          </span>
          <h2
            class="font-outfit font-black text-3xl sm:text-4xl md:text-5xl tracking-tight leading-none text-black"
          >
            BUKU POPULER.
          </h2>
          <p
            class="font-sans text-sm md:text-base font-semibold text-muted-foreground mt-2 max-w-lg"
          >
            Pilihan buku paling diminati dan paling banyak dibaca. Temukan karya-karya best-seller dari penulis favoritmu.
          </p>
        </div>

                <router-link
          :to="{ path: '/catalog', query: { sort: 'popular' } }"
          class="font-outfit font-black text-xs sm:text-sm text-black hover:text-neo-violet transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0 group py-1"
        >
          <span class="underline decoration-2 underline-offset-4 group-hover:text-neo-violet">Lihat Semua Buku</span>
          <span class="text-sm sm:text-base font-bold transition-transform group-hover:translate-x-1">→</span>
        </router-link>
      </div>

            <div
        v-if="isPopularLoading"
        class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
      >
        <div
          v-for="n in 4"
          :key="`book-skeleton-${n}`"
          class="bg-white border-3 border-black rounded-[2px] shadow-neo overflow-hidden animate-pulse"
        >
          <div class="aspect-[4/3.4] bg-gray-200 border-b-3 border-black"></div>
          <div class="p-3.5 space-y-2.5">
            <div class="h-3.5 bg-gray-200 rounded w-4/5"></div>
            <div class="h-3 bg-gray-200 rounded w-2/5"></div>
            <div class="h-3 bg-gray-200 rounded w-1/3"></div>
            <div class="h-5 bg-gray-200 rounded w-1/2 mt-3"></div>
          </div>
        </div>
      </div>

      <div
        v-else
        class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
      >
        <BookCard
          v-for="(book, idx) in visibleBooks"
          :key="book.id"
          :book="book"
          :animate="isSectionVisible"
          :delay="(idx % 4) * 90"
        />
      </div>
    </div>
  </section>
</template>
