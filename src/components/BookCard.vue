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
const { state, toggleWishlist, isWishlisted } = useStore()
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
    class="group bg-white border-3 border-black rounded-[2px] shadow-neo transition-all duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo-md flex flex-col justify-between overflow-hidden cursor-pointer"
    @click="goToDetail"
  >
    <div
      class="relative w-full aspect-[4/3.4] bg-background border-b-3 border-black p-2.5 sm:p-3 flex items-center justify-center overflow-hidden"
    >
      <div
        class="w-full h-full max-w-[130px] sm:max-w-[145px] transition-transform duration-200 group-hover:scale-103 flex items-center justify-center"
      >
        <img
          v-if="coverUrl && !imgError"
          :src="coverUrl"
          :alt="book.title"
          class="w-full h-full object-cover border-2 border-black rounded-[2px] shadow-neo-sm"
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
        />
      </div>

      <span
        class="absolute bottom-2 left-2 bg-black text-white px-2 py-0.5 rounded-[2px] font-outfit font-bold text-[9px] uppercase tracking-wide"
      >
        {{ book.category }}
      </span>

      <span
        v-if="hasDiscount"
        class="absolute top-2 left-2 bg-neo-yellow text-black border-2 border-black px-2 py-0.5 rounded-[2px] font-outfit font-black text-[10px] shadow-neo-sm"
      >
        -{{ discount }}%
      </span>

      <button
        v-if="state.isLoggedIn"
        type="button"
        class="absolute top-2 right-2 w-8 h-8 bg-white border-2 border-black rounded-full flex items-center justify-center shadow-neo-sm hover:bg-neo-pink"
        :aria-label="wishlisted ? 'Hapus dari wishlist' : 'Tambah ke wishlist'"
        @click.stop="toggleWishlist(book)"
      >
        <svg
          class="w-4 h-4"
          :class="wishlisted ? 'fill-red-500 text-red-500' : 'fill-none text-black'"
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

    <div class="p-3 sm:p-3.5 flex flex-col flex-1 justify-between gap-2">
      <div>
        <h3
          class="font-outfit font-black text-sm sm:text-base leading-snug line-clamp-1 group-hover:text-neo-violet transition-colors"
        >
          {{ book.title }}
        </h3>
        <p class="font-sans text-xs font-semibold text-muted-foreground truncate mt-0.5">
          {{ book.author }}
        </p>

        <div class="flex items-center gap-1.5 mt-1.5 text-xs font-sans">
          <span class="text-muted-foreground text-[11px]">{{ soldLabel }}</span>
        </div>
      </div>

      <div class="pt-2 border-t border-black/10 flex items-end justify-between gap-2">
        <div class="min-w-0">
          <span class="block font-outfit font-black text-sm sm:text-base text-black">
            {{ formattedPrice }}
          </span>
          <span
            v-if="hasDiscount"
            class="block font-sans text-[11px] font-bold text-muted-foreground line-through"
          >
            {{ formattedOriginal }}
          </span>
        </div>
        <span
          class="font-outfit font-bold text-[11px] text-neo-violet group-hover:underline shrink-0"
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
