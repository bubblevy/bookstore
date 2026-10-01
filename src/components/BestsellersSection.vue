<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { featuredBooks } from '@/data/catalog'
import { useStore } from '@/composables/useStore'
import BookCover from './BookCover.vue'

const router = useRouter()
const { addToCart, toggleWishlist, isInWishlist } = useStore()

// Take top 4 bestsellers
const bestsellers = computed(() => featuredBooks.slice(0, 4))

function goToBook(id) {
  router.push({ name: 'book-detail', params: { id } })
}
</script>

<template>
  <section id="bestsellers" class="max-w-7xl mx-auto px-4 py-12 md:py-16 scroll-mt-24 select-none">
    <!-- Header matching layout.jpeg ("most wanted / BEST SELLERS.") -->
    <div class="flex items-end justify-between mb-8 md:mb-10">
      <div>
        <span class="font-outfit font-black text-xs md:text-sm text-neo-orange tracking-widest uppercase">
          ✦ MOST WANTED PICKS
        </span>
        <h2 class="font-outfit font-black text-4xl sm:text-5xl md:text-6xl tracking-tight leading-none mt-1">
          BEST SELLERS.
        </h2>
      </div>
      <a
        href="#katalog"
        class="hidden sm:inline-flex items-center gap-1 font-outfit font-black text-sm text-black underline decoration-2 underline-offset-4 hover:text-neo-violet"
      >
        <span>SHOP ALL</span>
        <span>→</span>
      </a>
    </div>

    <!-- 4 Bestseller Cards Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
      <article
        v-for="(book, index) in bestsellers"
        :key="book.id"
        class="bg-white border-4 border-black rounded-2xl shadow-neo md:shadow-neo-md overflow-hidden flex flex-col justify-between cursor-pointer group hover:-translate-y-1 transition-all"
        @click="goToBook(book.id)"
      >
        <!-- Header row of card -->
        <div class="p-3.5 bg-background border-b-3 border-black flex items-center justify-between">
          <span class="bg-black text-neo-yellow border-2 border-black px-2 py-0.5 rounded font-outfit font-black text-xs">
            RANK #0{{ index + 1 }}
          </span>
          <button
            class="w-7 h-7 rounded-full bg-white border-2 border-black flex items-center justify-center text-xs shadow-neo-sm hover:scale-110 active:scale-95 transition-transform"
            :aria-label="isInWishlist(book.id) ? 'Hapus dari wishlist' : 'Tambah ke wishlist'"
            @click.stop="toggleWishlist(book)"
          >
            {{ isInWishlist(book.id) ? '❤️' : '🤍' }}
          </button>
        </div>

        <!-- Cover container -->
        <div class="p-4 flex items-center justify-center bg-white">
          <div class="w-full max-w-[170px] aspect-[3/4] transition-transform duration-300 group-hover:scale-105">
            <BookCover
              :theme="book.theme"
              :title="book.title"
              :author="book.author"
              :badge="book.badge"
              :accent="book.accentColor"
            />
          </div>
        </div>

        <!-- Meta & CTA bar -->
        <div class="p-4 border-t-3 border-black bg-background flex flex-col gap-3">
          <div>
            <span class="font-outfit font-black text-[9px] uppercase tracking-wider text-neo-violet">
              {{ book.category }}
            </span>
            <h3 class="font-outfit font-black text-base leading-tight mt-0.5 group-hover:text-neo-violet transition-colors truncate">
              {{ book.title }}
            </h3>
            <p class="font-sans text-xs font-bold text-muted-foreground truncate">{{ book.author }}</p>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-black/10">
            <span class="font-outfit font-black text-base">
              {{ new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(book.price) }}
            </span>
            <button
              class="neubrutal-btn bg-neo-yellow text-black border-2 border-black py-1.5 px-3 rounded-lg font-outfit font-black text-xs shadow-neo-sm hover:bg-yellow-300 active:translate-x-1 active:translate-y-1"
              @click.stop="addToCart(book)"
            >
              + ADD
            </button>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
