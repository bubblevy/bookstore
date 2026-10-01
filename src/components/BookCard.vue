<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import BookCover from './BookCover.vue'

const props = defineProps({
  book: { type: Object, required: true },
})

const router = useRouter()

const formattedPrice = computed(() =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(props.book.price),
)

function goToDetail() {
  router.push({ name: 'book-detail', params: { id: props.book.id } })
}
</script>

<template>
  <article
    class="group bg-white border-3 border-black rounded-[2px] shadow-neo transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo-md flex flex-col justify-between overflow-hidden cursor-pointer"
    @click="goToDetail"
  >
    <!-- Compact cover container (not too tall) -->
    <div
      class="relative w-full aspect-[4/3.4] bg-background border-b-3 border-black p-2.5 sm:p-3 flex items-center justify-center overflow-hidden"
    >
      <div
        class="w-full h-full max-w-[130px] sm:max-w-[145px] transition-transform duration-200 group-hover:scale-103"
      >
        <BookCover
          :theme="book.theme"
          :title="book.title"
          :author="book.author"
          :accent="book.accentColor"
        />
      </div>

      <!-- Clean genre badge -->
      <span
        class="absolute bottom-2 left-2 bg-black text-white px-2 py-0.5 rounded-[2px] font-outfit font-bold text-[9px] uppercase tracking-wide"
      >
        {{ book.category }}
      </span>
    </div>

    <!-- Content / Meta: compact, concise, proportional -->
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
          <span class="text-muted-foreground text-[11px]">{{ book.sold }} terjual</span>
        </div>
      </div>

      <!-- Clean Price only (no buy icon/button on card) -->
      <div class="pt-2 border-t border-black/10 flex items-center justify-between">
        <span class="font-outfit font-black text-sm sm:text-base text-black">
          {{ formattedPrice }}
        </span>
        <span class="font-outfit font-bold text-[11px] text-neo-violet group-hover:underline">
          Detail →
        </span>
      </div>
    </div>
  </article>
</template>
