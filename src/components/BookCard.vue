<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/composables/useStore'
import { assetUrl } from '@/lib/assets'
import BookCover from './BookCover.vue'

const props = defineProps({
  book: { type: Object, required: true },
  delay: { type: Number, default: 0 },
  animate: { type: Boolean, default: true },
})

const router = useRouter()
const { state, toggleWishlist, isWishlisted, isWishlistPending } = useStore()
const imgError = ref(false)
const imgLoaded = ref(false)
let imgTimer = null

onMounted(() => {
  imgTimer = setTimeout(() => {
    if (!imgLoaded.value) imgError.value = true
  }, 2500)
})

onUnmounted(() => {
  if (imgTimer) clearTimeout(imgTimer)
})

watch(
  () => props.book.coverImage,
  () => {
    imgError.value = false
    imgLoaded.value = false
  },
)

const coverUrl = computed(() => assetUrl(props.book.coverImage))
const wishlisted = computed(() => isWishlisted(props.book.id))
const discount = computed(() => Number(props.book.discount) || 0)
const hasDiscount = computed(
  () => discount.value > 0 && Number(props.book.originalPrice) > Number(props.book.price),
)

const formattedPrice = computed(() =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(props.book.price),
)
const formattedOriginal = computed(() =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(props.book.originalPrice),
)
const soldLabel = computed(() => `${Number(props.book.sold) || 0} terjual`)

function goToDetail() {
  router.push({ name: 'book-detail', params: { id: props.book.slug || props.book.id } })
}
</script>

<template>
  <article
    :class="animate ? 'book-card-animate' : 'book-card-hidden'"
    :style="animate && delay ? { animationDelay: `${delay}ms` } : {}"
    class="group bg-white border-2 sm:border-3 border-black rounded-[2px] shadow-neo-sm sm:shadow-neo transition-all duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo-md flex flex-col justify-between overflow-hidden cursor-pointer select-none"
    @click="goToDetail"
  >
        <div
      class="relative w-full aspect-[4/3.8] sm:aspect-[4/3.4] bg-background border-b-2 sm:border-b-3 border-black p-2 sm:p-3 flex items-center justify-center overflow-hidden"
    >
      <div
        class="h-full aspect-[5/7] max-w-[115px] sm:max-w-[150px] transition-transform duration-200 group-hover:scale-103 flex items-center justify-center shrink-0"
      >
        <img
          v-if="coverUrl && !imgError"
          :src="coverUrl"
          :alt="book.title"
          class="w-full h-full object-cover border border-black sm:border-2 rounded-[2px] shadow-neo-xs sm:shadow-neo-sm block"
          loading="lazy"
          @load="imgLoaded = true"
          @error="imgError = true"
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

            <span
        class="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 bg-black text-white px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-[1px] font-outfit font-bold text-[8px] sm:text-[9px] uppercase tracking-wide"
      >
        {{ book.category }}
      </span>

            <span
        v-if="(Number(book.stock) || 0) <= 0"
        class="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 bg-red-600 text-white border border-black sm:border-2 px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-[1px] font-outfit font-black text-[8px] sm:text-[9px] uppercase tracking-wide shadow-neo-xs"
      >
        Habis
      </span>

            <span
        v-if="hasDiscount"
        class="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 bg-neo-yellow text-black border border-black sm:border-2 px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-[1px] font-outfit font-black text-[8px] sm:text-[10px] shadow-neo-xs"
      >
        -{{ discount }}%
      </span>

            <button
        type="button"
        :disabled="isWishlistPending(book.id)"
        class="group/btn absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-7 h-7 sm:w-8 sm:h-8 bg-white border border-black sm:border-2 rounded-full flex items-center justify-center shadow-neo-xs sm:shadow-neo-sm hover:bg-red-50 disabled:opacity-50 cursor-pointer transition-all active:scale-125 z-10"
        :aria-label="wishlisted ? 'Hapus dari wishlist' : 'Tambah ke wishlist'"
        :title="wishlisted ? 'Hapus dari wishlist' : 'Tambah ke wishlist'"
        @click.stop="toggleWishlist(book)"
      >
                <svg
          v-if="wishlisted"
          class="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-red-500 text-red-500"
          viewBox="0 0 24 24"
        >
          <path
            d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z"
          />
        </svg>
                <svg
          v-else
          class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black group-hover/btn:text-red-500 transition-colors"
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
    </div>

        <div class="p-2.5 sm:p-3.5 flex flex-col flex-1 justify-between gap-1.5 sm:gap-2">
      <div>
        <h3
          class="font-outfit font-black text-xs sm:text-sm md:text-base leading-snug line-clamp-2 group-hover:text-neo-violet transition-colors"
        >
          {{ book.title }}
        </h3>
        <p class="font-sans text-[10px] sm:text-xs font-semibold text-muted-foreground truncate mt-0.5">
          {{ book.author }}
        </p>

        <div class="flex items-center gap-1.5 mt-1 text-[10px] sm:text-xs font-sans">
          <span class="text-muted-foreground font-semibold text-[10px] sm:text-[11px]">{{ soldLabel }}</span>
        </div>
      </div>

      <div class="pt-1.5 sm:pt-2 border-t border-black/10 flex items-end justify-between gap-1.5">
        <div class="min-w-0">
          <span class="block font-outfit font-black text-xs sm:text-sm md:text-base text-black whitespace-nowrap">
            {{ formattedPrice }}
          </span>
          <span
            v-if="hasDiscount"
            class="block font-sans text-[9px] sm:text-[11px] font-bold text-muted-foreground line-through"
          >
            {{ formattedOriginal }}
          </span>
        </div>
        <span
          class="font-outfit font-bold text-[10px] sm:text-[11px] text-neo-violet group-hover:underline shrink-0"
        >
          Detail →
        </span>
      </div>
    </div>
  </article>
</template>

<style scoped>
@keyframes cardFadeUp {
  0% {
    opacity: 0;
    transform: translateY(24px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.book-card-hidden {
  opacity: 0;
  transform: translateY(24px);
}

.book-card-animate {
  animation: cardFadeUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
}
</style>
