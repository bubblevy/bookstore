<script setup>
import { computed, ref } from 'vue'
import { useStore } from '@/composables/useStore'
import { assetUrl } from '@/lib/assets'
import BookArt from './BookArt.vue'

const { state } = useStore()
const categories = computed(() => state.categories)
const failedImages = ref({})
</script>

<template>
  <section
    id="kategori"
    class="w-full bg-white border-b-4 border-black py-16 md:py-20 scroll-mt-20 relative overflow-hidden"
  >
    <div class="absolute inset-0 pointer-events-none select-none overflow-hidden">
      <div
        class="absolute inset-0 opacity-[0.05] bg-[radial-gradient(#000_1.5px,transparent_1.5px)] [background-size:24px_24px]"
      ></div>

      <svg
        viewBox="0 0 100 80"
        class="absolute -left-10 top-1/2 -translate-y-1/2 w-72 h-60 opacity-[0.04] text-black"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M 50 20 Q 25 10 5 18 L 5 70 Q 25 62 50 72 Q 75 62 95 70 L 95 18 Q 75 10 50 20 Z" />
        <line x1="50" y1="20" x2="50" y2="72" />
        <path
          d="M 12 28 Q 28 22 45 30 M 12 38 Q 28 32 45 40 M 12 48 Q 28 42 45 50"
          stroke-width="1.5"
        />
        <path
          d="M 88 28 Q 72 22 55 30 M 88 38 Q 72 32 55 40 M 88 48 Q 72 42 55 50"
          stroke-width="1.5"
        />
      </svg>

      <div
        class="absolute top-0 right-16 w-12 h-28 bg-neo-yellow/20 border-b-2 border-x-2 border-black/15 flex flex-col justify-end items-center pb-2"
      >
        <span
          class="font-outfit font-black text-[9px] text-black/30 rotate-90 uppercase tracking-widest whitespace-nowrap"
          >BOOKMARK</span
        >
      </div>

      <span class="absolute top-8 left-[18%] text-neo-violet text-2xl font-black opacity-30"
        >✦</span
      >
      <span class="absolute bottom-10 left-[8%] text-neo-orange text-2xl font-black opacity-30"
        >★</span
      >
      <span class="absolute top-12 right-[25%] text-neo-lime text-3xl font-black opacity-50"
        >✦</span
      >
      <span class="absolute bottom-8 right-[10%] text-neo-yellow text-3xl font-black opacity-50"
        >★</span
      >

      <div
        class="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-20 font-outfit font-black text-[10px] tracking-widest uppercase border border-black/40 px-3 py-0.5 rounded-[2px]"
      >
        ARCHIVE CATALOGUE · SECTION 01 — 06
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <div data-aos="fade-up" class="mb-8 md:mb-12">
        <span
          class="inline-block bg-neo-lime border-2 border-black px-3 py-0.5 rounded-[2px] font-outfit font-black text-xs uppercase tracking-wider shadow-neo-sm mb-3"
        >
          EKSPLORASI GENRE
        </span>
        <h2
          class="font-outfit font-black text-3xl sm:text-4xl md:text-5xl tracking-tight leading-none text-black"
        >
          KATEGORI BUKU.
        </h2>
        <p class="font-sans text-sm md:text-base font-semibold text-muted-foreground mt-2 max-w-lg">
          Jelajahi berbagai disiplin ilmu, karya sastra unggulan, dan bacaan pilihan sesuai minat
          Anda.
        </p>
      </div>

      <div
        v-if="state.categoriesLoading"
        class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5"
      >
        <div
          v-for="n in 6"
          :key="`cat-skeleton-${n}`"
          class="bg-background border-3 border-black rounded-[2px] p-4 shadow-neo flex flex-col items-center text-center gap-3 animate-pulse"
        >
          <div class="w-14 h-14 rounded-[2px] border-2 border-black bg-gray-200"></div>
          <div class="w-20 h-3 bg-gray-200 rounded"></div>
          <div class="w-12 h-2.5 bg-gray-200 rounded"></div>
        </div>
      </div>

      <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5">
        <a
          v-for="(cat, idx) in categories"
          :key="cat.name"
          href="#katalog"
          data-aos="fade-up"
          :data-aos-delay="idx * 150"
          :style="`transition-delay: ${idx * 150}ms !important`"
          class="group bg-background border-3 border-black rounded-[2px] p-4 shadow-neo flex flex-col items-center text-center gap-3 hover:-translate-y-1 hover:shadow-neo-md transition-all"
        >
          <div
            class="w-14 h-14 rounded-[2px] border-2 border-black flex items-center justify-center overflow-hidden shadow-neo-sm group-hover:scale-105 transition-transform bg-white"
          >
            <img
              v-if="cat.image && !failedImages[cat.id]"
              :src="assetUrl(cat.image)"
              :alt="cat.name"
              class="w-full h-full object-cover"
              loading="lazy"
              @error="failedImages[cat.id] = true"
            />
            <BookArt v-else :name="cat.icon" />
          </div>

          <div>
            <h3
              class="font-outfit font-black text-sm sm:text-base leading-tight group-hover:text-neo-violet transition-colors"
            >
              {{ cat.name }}
            </h3>
            <span class="inline-block mt-1 font-sans font-bold text-[11px] text-muted-foreground">
              {{ cat.count }}
            </span>
          </div>
        </a>
      </div>
    </div>
  </section>
</template>
