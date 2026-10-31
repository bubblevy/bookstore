<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useStore } from '@/composables/useStore'
import { assetUrl } from '@/lib/assets'

const { state, toggleWishlist, clearWishlist, moveWishlistToCart } = useStore()

const busy = ref({})
const isBusy = (key) => Boolean(busy.value[key])
const setBusy = (key, value) => {
  busy.value = { ...busy.value, [key]: value }
}

const failedWishlistCovers = ref({})
const showClearWishlistConfirm = ref(false)
const clearingWishlist = ref(false)

function itemCoverUrl(item) {
  const bookId = item?.bookId || item?.book_id || item?.id
  const matched =
    (bookId ? state.books.find((b) => String(b.id) === String(bookId)) : null) ||
    (item?.title
      ? state.books.find(
          (b) =>
            b.title &&
            b.title.trim().toLowerCase() === String(item.title).trim().toLowerCase(),
        )
      : null)

  if (matched?.coverImage || matched?.cover) {
    return assetUrl(matched.coverImage || matched.cover)
  }

  let url = item?.cover || item?.coverImage || ''
  if (url && url.includes('/static/covers/')) url = ''
  return url ? assetUrl(url) : ''
}

function formatRupiah(val) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(val || 0)
}

async function handleWishlistRemove(item) {
  const key = `wish-remove-${item.bookId}`
  if (isBusy(key)) return
  setBusy(key, true)
  try {
    await toggleWishlist(item)
  } finally {
    setBusy(key, false)
  }
}

async function handleWishlistMove(item) {
  const key = `wish-move-${item.bookId}`
  if (isBusy(key)) return
  setBusy(key, true)
  try {
    await moveWishlistToCart(item.bookId)
  } finally {
    setBusy(key, false)
  }
}

async function handleClearWishlist() {
  if (clearingWishlist.value) return
  clearingWishlist.value = true
  try {
    const cleared = await clearWishlist()
    if (cleared) showClearWishlistConfirm.value = false
  } finally {
    clearingWishlist.value = false
  }
}
</script>

<template>
  <div class="space-y-5 sm:space-y-6">
        <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border-2 sm:border-3 border-black p-4 rounded-[2px] shadow-neo-sm"
    >
      <div>
        <h2 class="font-outfit font-black text-base sm:text-lg text-black">Wishlist Saya</h2>
        <p class="font-sans text-xs text-muted-foreground font-semibold mt-0.5">
          Daftar buku yang disimpan untuk dibeli berikutnya.
        </p>
      </div>

      <div class="flex items-center gap-2 self-start sm:self-auto shrink-0">
        <span
          class="bg-neo-lime border-2 border-black px-2.5 py-1 font-outfit font-black text-xs shadow-neo-xs"
        >
          {{ state.wishlist.length }} Buku
        </span>

        <button
          v-if="state.wishlist.length"
          type="button"
          class="neubrutal-btn bg-white text-red-600 border-2 border-black px-3 py-1 font-outfit font-black text-xs shadow-neo-xs hover:bg-red-50 cursor-pointer"
          @click="showClearWishlistConfirm = true"
        >
          Hapus Semua
        </button>
      </div>
    </div>

        <div
      v-if="state.wishlistLoading"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
    >
      <div
        v-for="n in 4"
        :key="`wish-skeleton-${n}`"
        class="h-44 bg-gray-100 border-2 sm:border-3 border-black animate-pulse rounded-[2px]"
      ></div>
    </div>

        <div
      v-else-if="state.wishlist.length === 0"
      class="bg-white border-2 sm:border-3 border-black p-8 sm:p-12 text-center rounded-[2px] shadow-neo-sm"
    >
      <h3 class="font-outfit font-black text-lg sm:text-xl text-black">Wishlist Masih Kosong</h3>
      <p class="font-sans text-xs sm:text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
        Klik ikon hati pada detail buku manapun untuk menyimpannya ke daftar wishlist favoritmu.
      </p>
      <RouterLink
        to="/catalog"
        class="inline-block mt-5 neubrutal-btn bg-neo-yellow text-black border-2 border-black px-6 py-2.5 font-outfit font-black text-xs sm:text-sm shadow-neo-sm hover:bg-yellow-300"
      >
        Jelajahi Katalog Buku
      </RouterLink>
    </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <article
        v-for="item in state.wishlist"
        :key="item.id"
        class="bg-white border-2 sm:border-3 border-black rounded-[2px] shadow-neo-sm p-3.5 sm:p-4 flex gap-3 transition-all hover:bg-neutral-50/50"
      >
                <RouterLink
          v-if="itemCoverUrl(item) && !failedWishlistCovers[item.id]"
          :to="`/book/${item.slug || item.bookId}`"
          class="w-20 h-28 shrink-0 border-2 border-black bg-background flex items-center justify-center overflow-hidden shadow-neo-xs hover:opacity-95"
        >
          <img
            :src="itemCoverUrl(item)"
            :alt="item.title"
            class="w-full h-full object-cover"
            loading="lazy"
            @error="failedWishlistCovers[item.id] = true"
          />
        </RouterLink>

        <div class="min-w-0 flex-1 flex flex-col justify-between">
          <div>
            <RouterLink
              :to="`/book/${item.slug || item.bookId}`"
              class="font-outfit font-black text-xs sm:text-sm leading-snug hover:text-neo-violet line-clamp-2"
            >
              {{ item.title }}
            </RouterLink>
            <p class="font-sans text-[11px] font-semibold text-muted-foreground truncate mt-0.5">
              {{ item.author }}
            </p>
            <p class="font-outfit font-black text-xs sm:text-sm mt-1.5 text-neo-violet">
              {{ formatRupiah(item.price) }}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-1.5 mt-2.5">
            <button
              type="button"
              :disabled="isBusy(`wish-move-${item.bookId}`)"
              class="flex-1 neubrutal-btn bg-neo-yellow text-black border-2 border-black px-2 py-1.5 font-outfit font-black text-[10px] shadow-neo-xs hover:bg-yellow-300 disabled:opacity-60 flex items-center justify-center gap-1 cursor-pointer truncate"
              @click="handleWishlistMove(item)"
            >
              <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              <span>{{ isBusy(`wish-move-${item.bookId}`) ? '...' : 'Ke Keranjang' }}</span>
            </button>

            <button
              type="button"
              :disabled="isBusy(`wish-remove-${item.bookId}`)"
              class="neubrutal-btn bg-white text-red-600 border-2 border-black p-1.5 font-outfit font-black text-[10px] shadow-neo-xs hover:bg-red-50 disabled:opacity-60 shrink-0 cursor-pointer"
              title="Hapus dari wishlist"
              @click="handleWishlistRemove(item)"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          </div>
        </div>
      </article>
    </div>

        <div
      v-if="showClearWishlistConfirm"
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs"
      @click.self="showClearWishlistConfirm = false"
    >
      <div
        class="bg-white border-2 sm:border-3 border-black max-w-sm w-full rounded-[2px] shadow-neo-sm p-5 sm:p-6 space-y-4 text-center animate-hero-entrance"
      >
        <div>
          <h3 class="font-outfit font-black text-base sm:text-lg text-black">Hapus Semua Wishlist?</h3>
          <p class="font-sans text-xs text-muted-foreground mt-1">
            Sebanyak {{ state.wishlist.length }} buku akan dihapus dari daftar wishlist kamu.
          </p>
        </div>

        <div class="flex items-center justify-center gap-2.5 pt-2">
          <button
            type="button"
            class="flex-1 neubrutal-btn bg-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100 cursor-pointer"
            @click="showClearWishlistConfirm = false"
          >
            Batal
          </button>
          <button
            type="button"
            :disabled="clearingWishlist"
            class="flex-1 neubrutal-btn bg-red-500 text-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-red-600 disabled:opacity-60 cursor-pointer"
            @click="handleClearWishlist"
          >
            {{ clearingWishlist ? 'Menghapus...' : 'Ya, Hapus' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
