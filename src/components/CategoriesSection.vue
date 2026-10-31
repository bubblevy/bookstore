<script setup>
import { computed, reactive } from 'vue'
import { useStore } from '@/composables/useStore'
import { assetUrl } from '@/lib/assets'

const { state } = useStore()
const categories = computed(() => state.categories)
const failedImages = reactive({})
const loadedImages = reactive({})

const defaultCategoryFallback = '/category-placeholder.jpg'

// Fallback genre images if category image is missing or fails to load.
function getCategoryFallback(cat) {
  const name = String(cat?.name || cat?.slug || '').toLowerCase()
  if (name.includes('fiksi') || name.includes('novel') || name.includes('sastra')) {
    return 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=300&q=80'
  }
  if (name.includes('bisnis') || name.includes('ekonomi') || name.includes('keuangan')) {
    return 'https://images.unsplash.com/photo-1591994843349-f415893b3a6b?auto=format&fit=crop&w=300&q=80'
  }
  if (name.includes('sains') || name.includes('teknologi') || name.includes('tech') || name.includes('it')) {
    return 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=300&q=80'
  }
  if (name.includes('komik') || name.includes('manga') || name.includes('anak')) {
    return 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?auto=format&fit=crop&w=300&q=80'
  }
  if (name.includes('sejarah') || name.includes('biografi')) {
    return 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=300&q=80'
  }
  if (name.includes('agama') || name.includes('spiritual') || name.includes('filsafat')) {
    return 'https://images.unsplash.com/photo-1507842229458-577903823ffb?auto=format&fit=crop&w=300&q=80'
  }
  return defaultCategoryFallback
}

function getCategoryImage(cat) {
  const key = cat.slug || cat.id || cat.name
  if (cat.image && !failedImages[key]) {
    return assetUrl(cat.image)
  }
  return getCategoryFallback(cat)
}

function handleImageError(cat) {
  const key = cat.slug || cat.id || cat.name
  if (!failedImages[key]) {
    failedImages[key] = true
  }
}
</script>

<template>
  <section
    id="kategori"
    class="w-full bg-white border-b-4 border-black py-16 md:py-20 scroll-mt-20 relative overflow-hidden"
  >
    <div class="absolute inset-0 pointer-events-none select-none overflow-hidden">
      <div
        class="absolute inset-0 opacity-[0.05] bg-[radial-gradient(var(--color-black)_1.5px,transparent_1.5px)] [background-size:24px_24px]"
      ></div>

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
        ARCHIVE CATALOGUE · SECTION 01 —
        {{ String(Math.max(1, categories.length)).padStart(2, '0') }}
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
          class="bg-background border-2 sm:border-3 border-black rounded-[2px] p-4 shadow-neo-sm sm:shadow-neo flex flex-col items-center text-center gap-3 animate-pulse"
        >
                    <div class="w-14 h-14 rounded-[2px] border-2 border-black bg-neutral-200 animate-pulse"></div>
                    <div class="w-20 h-3.5 bg-neutral-200 border border-black/15 rounded animate-pulse"></div>
                    <div class="w-12 h-2.5 bg-neutral-200 rounded animate-pulse"></div>
        </div>
      </div>

            <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5">
        <router-link
          v-for="(cat, idx) in categories"
          :key="cat.slug || cat.name"
          :to="{ path: '/catalog', query: { category: cat.slug || cat.name } }"
          data-aos="fade-up"
          :data-aos-delay="idx * 150"
          :style="`transition-delay: ${idx * 150}ms !important`"
          class="group bg-background border-2 sm:border-3 border-black rounded-[2px] p-4 shadow-neo-sm sm:shadow-neo transition-all duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo-md flex flex-col items-center text-center gap-3 cursor-pointer"
        >
                    <div
            class="w-14 h-14 rounded-[2px] border-2 border-black overflow-hidden relative shadow-neo-sm group-hover:scale-105 group-hover:rotate-1 transition-transform bg-neutral-100 flex items-center justify-center shrink-0"
          >
                        <div
              v-if="!loadedImages[cat.slug || cat.id || cat.name]"
              class="absolute inset-0 bg-neutral-200 animate-pulse z-10"
            ></div>

                        <img
              :src="getCategoryImage(cat)"
              :alt="cat.name"
              class="w-full h-full object-cover aspect-square transition-all duration-300"
              :class="loadedImages[cat.slug || cat.id || cat.name] ? 'opacity-100 scale-100' : 'opacity-0 scale-95'"
              loading="lazy"
              @load="loadedImages[cat.slug || cat.id || cat.name] = true"
              @error="handleImageError(cat)"
            />
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
        </router-link>
      </div>
    </div>
  </section>
</template>
