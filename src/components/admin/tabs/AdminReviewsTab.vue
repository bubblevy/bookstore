<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { api } from '@/lib/api'
import { useStore } from '@/composables/useStore'
import { assetUrl } from '@/lib/assets'

const props = defineProps({
  books: { type: Array, default: () => [] },
})

const { showToast } = useStore()

const loading = ref(false)
const reviews = ref([])
const meta = ref({
  page: 1,
  per_page: 10,
  total_items: 0,
  total_pages: 1,
})

// Filters
const filterRating = ref('')
const filterVisibility = ref('') // '' (all) | 'visible' | 'hidden'
const searchQuery = ref('')
const sortBy = ref('newest')
const page = ref(1)

// Moderation Modal State
const showModerateModal = ref(false)
const targetReview = ref(null)
const moderationReason = ref('')
const isHiding = ref(true)
const moderating = ref(false)

// Reply Modal State
const showReplyModal = ref(false)
const replyText = ref('')
const replying = ref(false)

// Delete Confirm Modal State
const showDeleteModal = ref(false)
const deleting = ref(false)

function generatePagination(total, current) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total]
  }
  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  }
  return [1, '...', current - 1, current, current + 1, '...', total]
}

const visibleReviewPages = computed(() =>
  generatePagination(meta.value.total_pages, meta.value.page),
)

async function loadReviews(targetPage = 1) {
  loading.value = true
  page.value = targetPage
  try {
    const params = {
      page: page.value,
      per_page: meta.value.per_page,
      sort_by: sortBy.value,
    }
    if (filterRating.value) {
      params.rating = Number(filterRating.value)
    }
    if (filterVisibility.value === 'hidden') {
      params.is_hidden = 'true'
    } else if (filterVisibility.value === 'visible') {
      params.is_hidden = 'false'
    }
    if (searchQuery.value.trim()) {
      params.search = searchQuery.value.trim()
    }

    const res = await api.adminReviews(params)
    reviews.value = res.data || []
    if (res.meta) {
      meta.value = res.meta
    }
  } catch (err) {
    showToast(err?.message || 'Gagal memuat daftar ulasan', { type: 'error' })
  } finally {
    loading.value = false
  }
}

watch([filterRating, filterVisibility, sortBy], () => {
  loadReviews(1)
})

let searchDebounceTimer = null
function onSearchInput() {
  clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    loadReviews(1)
  }, 400)
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    const dt = new Date(dateStr)
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(dt)
  } catch {
    return dateStr
  }
}

function maskEmail(email) {
  if (!email || typeof email !== 'string') return '—'
  const trimmed = email.trim()
  const parts = trimmed.split('@')
  if (parts.length !== 2) return trimmed
  const [name, domain] = parts
  if (name.length <= 2) {
    return `${name.charAt(0)}***@${domain}`
  }
  const maskedMiddle = '*'.repeat(Math.min(name.length - 2, 4))
  return `${name.charAt(0)}${maskedMiddle}${name.charAt(name.length - 1)}@${domain}`
}

// Open Reply Modal
function openReply(rev) {
  targetReview.value = rev
  replyText.value = rev.seller_reply || ''
  showReplyModal.value = true
}

async function submitReply() {
  if (!targetReview.value) return
  if (!replyText.value.trim()) {
    showToast('Teks balasan tidak boleh kosong', { type: 'error' })
    return
  }
  replying.value = true
  try {
    await api.adminReplyReview(targetReview.value.id, { reply: replyText.value.trim() })
    showToast('Balasan penjual berhasil disimpan', { type: 'success' })
    showReplyModal.value = false
    loadReviews(page.value)
  } catch (err) {
    showToast(err?.message || 'Gagal mengirim balasan', { type: 'error' })
  } finally {
    replying.value = false
  }
}

// Open Moderate Modal (Hide / Unhide)
function openModerate(rev) {
  targetReview.value = rev
  isHiding.value = !rev.is_hidden
  moderationReason.value = rev.hidden_reason || (isHiding.value ? 'Ulasan mengandung konten tidak pantas atau spam' : '')
  showModerateModal.value = true
}

async function submitModerate() {
  if (!targetReview.value) return
  moderating.value = true
  try {
    await api.adminModerateReview(targetReview.value.id, {
      is_hidden: isHiding.value,
      reason: moderationReason.value.trim() || undefined,
    })
    showToast(
      isHiding.value ? 'Ulasan berhasil disembunyikan dari publik' : 'Ulasan berhasil ditampilkan kembali',
      { type: 'success' },
    )
    showModerateModal.value = false
    loadReviews(page.value)
  } catch (err) {
    showToast(err?.message || 'Gagal mengubah visibilitas ulasan', { type: 'error' })
  } finally {
    moderating.value = false
  }
}

// Open Delete Modal
function openDelete(rev) {
  targetReview.value = rev
  showDeleteModal.value = true
}

async function submitDelete() {
  if (!targetReview.value) return
  deleting.value = true
  try {
    await api.adminDeleteReview(targetReview.value.id)
    showToast('Ulasan berhasil dihapus secara permanen', { type: 'success' })
    showDeleteModal.value = false
    loadReviews(page.value)
  } catch (err) {
    showToast(err?.message || 'Gagal menghapus ulasan', { type: 'error' })
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  loadReviews(1)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Toolbar / Filter Bar (Same as AdminBooksTab & AdminOrdersTab) -->
    <div
      class="bg-white border-2 sm:border-3 border-black p-3 sm:p-4 rounded-[2px] shadow-neo-sm flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4"
    >
      <div class="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
        <!-- Search Input -->
        <div class="relative w-full sm:flex-1 sm:max-w-md">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari judul buku, pembeli, atau kata ulasan..."
            class="w-full bg-background border-2 border-black p-2 pl-3 rounded-[2px] font-outfit font-bold text-xs outline-none shadow-neo-sm focus:border-black"
            @input="onSearchInput"
          />
        </div>

        <div class="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-2">
          <!-- Rating Filter -->
          <div class="relative w-full sm:w-auto">
            <select
              v-model="filterRating"
              class="w-full appearance-none bg-white border-2 border-black rounded-[2px] pl-3 pr-8 py-2 font-outfit font-bold text-xs shadow-neo-sm hover:bg-neutral-50 focus:outline-none focus:border-black cursor-pointer transition-all"
            >
              <option value="">Semua Rating</option>
              <option value="5">5 Bintang (★ 5)</option>
              <option value="4">4 Bintang (★ 4)</option>
              <option value="3">3 Bintang (★ 3)</option>
              <option value="2">2 Bintang (★ 2)</option>
              <option value="1">1 Bintang (★ 1)</option>
            </select>
            <div class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-black">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>

          <!-- Visibility Filter -->
          <div class="relative w-full sm:w-auto">
            <select
              v-model="filterVisibility"
              class="w-full appearance-none bg-white border-2 border-black rounded-[2px] pl-3 pr-8 py-2 font-outfit font-bold text-xs shadow-neo-sm hover:bg-neutral-50 focus:outline-none focus:border-black cursor-pointer transition-all"
            >
              <option value="">Semua Status</option>
              <option value="visible">Publik</option>
              <option value="hidden">Disembunyikan</option>
            </select>
            <div class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-black">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>

          <!-- Sort Filter -->
          <div class="relative col-span-2 sm:col-auto w-full sm:w-auto">
            <select
              v-model="sortBy"
              class="w-full appearance-none bg-white border-2 border-black rounded-[2px] pl-3 pr-8 py-2 font-outfit font-bold text-xs shadow-neo-sm hover:bg-neutral-50 focus:outline-none focus:border-black cursor-pointer transition-all"
            >
              <option value="newest">Ulasan Terbaru</option>
              <option value="oldest">Ulasan Terlama</option>
              <option value="highest_rating">Rating Tertinggi</option>
              <option value="lowest_rating">Rating Terendah</option>
            </select>
            <div class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-black">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Badge counter like in AdminCustomersTab -->
      <span
        class="bg-neo-yellow border-2 border-black px-3 py-1.5 rounded-[2px] font-outfit font-black text-xs shadow-neo-xs self-start md:self-auto shrink-0"
      >
        Total {{ meta.total_items }} Ulasan
      </span>
    </div>

    <!-- Table View (Standard layout as other tabs) -->
    <div class="bg-white border-2 sm:border-3 border-black rounded-[2px] shadow-neo-sm overflow-hidden">
      <div class="overflow-x-auto table-scrollbar">
        <table class="w-full min-w-[880px] text-xs font-sans border-collapse">
          <thead>
            <tr class="bg-black text-white font-outfit font-black text-left">
              <th class="p-3 w-16 whitespace-nowrap">COVER</th>
              <th class="p-3 whitespace-nowrap min-w-[180px]">BUKU</th>
              <th class="p-3 whitespace-nowrap min-w-[160px]">PELANGGAN</th>
              <th class="p-3 whitespace-nowrap min-w-[110px]">RATING</th>
              <th class="p-3 whitespace-nowrap min-w-[250px]">KOMENTAR & BALASAN</th>
              <th class="p-3 whitespace-nowrap min-w-[120px]">TANGGAL</th>
              <th class="p-3 text-center whitespace-nowrap min-w-[100px]">STATUS</th>
              <th class="p-3 text-right whitespace-nowrap shrink-0 min-w-[130px]">AKSI</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading -->
            <tr v-if="loading">
              <td colspan="8" class="p-8 text-center bg-gray-50/50">
                <div class="inline-flex items-center justify-center gap-2.5">
                  <span
                    class="inline-block w-4 h-4 rounded-[2px] border-2 border-black border-t-transparent animate-spin shrink-0"
                  ></span>
                  <span class="font-outfit font-black text-sm text-black">
                    Memuat data ulasan...
                  </span>
                </div>
              </td>
            </tr>

            <!-- Empty -->
            <tr v-else-if="reviews.length === 0">
              <td colspan="8" class="p-8 text-center bg-gray-50/50">
                <p class="font-outfit font-black text-sm text-black">Tidak Ada Ulasan Ditemukan</p>
                <p class="font-sans text-xs text-muted-foreground mt-1">
                  Coba sesuaikan kata kunci pencarian atau filter status ulasan.
                </p>
              </td>
            </tr>

            <!-- Rows -->
            <template v-else>
              <tr
                v-for="rev in reviews"
                :key="rev.id"
                class="border-b border-black/10 hover:bg-gray-50 transition-colors"
                :class="rev.is_hidden ? 'bg-amber-50/30' : ''"
              >
                <!-- Cover -->
                <td class="p-3 w-16 shrink-0">
                  <div
                    class="w-12 h-16 bg-white border-2 border-black rounded-[2px] shadow-neo-sm overflow-hidden flex items-center justify-center"
                  >
                    <img
                      v-if="rev.book_cover"
                      :src="assetUrl(rev.book_cover)"
                      :alt="rev.book_title"
                      class="w-full h-full object-cover"
                    />
                    <span v-else class="text-[9px] font-bold text-neutral-400">Buku</span>
                  </div>
                </td>

                <!-- Book Title -->
                <td class="p-3 min-w-[180px]">
                  <p class="font-outfit font-black text-sm text-black line-clamp-2 leading-snug">
                    {{ rev.book_title || 'Buku' }}
                  </p>
                </td>

                <!-- Customer -->
                <td class="p-3 min-w-[160px]">
                  <span class="block font-outfit font-bold text-xs text-black">{{ rev.user_name || 'Pembeli' }}</span>
                  <span v-if="rev.user_email" class="text-muted-foreground text-[11px] font-mono block">
                    {{ maskEmail(rev.user_email) }}
                  </span>
                </td>

                <!-- Rating -->
                <td class="p-3 whitespace-nowrap">
                  <div class="inline-flex items-center gap-1 font-outfit font-black text-xs text-black">
                    <svg class="w-3.5 h-3.5 fill-amber-400 text-black" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" stroke-width="1.5"/>
                    </svg>
                    <span>{{ rev.rating }}.0</span>
                  </div>
                </td>

                <!-- Comment & Seller Reply -->
                <td class="p-3 min-w-[250px] max-w-sm">
                  <p v-if="rev.comment" class="line-clamp-2 text-neutral-800 text-xs leading-relaxed font-sans">
                    "{{ rev.comment }}"
                  </p>
                  <p v-else class="text-neutral-400 italic text-xs font-sans">
                    (Hanya memberi rating bintang)
                  </p>

                  <div v-if="rev.seller_reply" class="mt-1.5 text-[11px] text-neutral-800 bg-neo-yellow/20 border border-black/20 px-2 py-1 rounded-[1px] line-clamp-1">
                    <strong class="font-outfit font-bold text-black">Balasan Toko:</strong> {{ rev.seller_reply }}
                  </div>

                  <div v-if="rev.is_hidden && rev.hidden_reason" class="mt-1.5 text-[11px] text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-[1px] line-clamp-1">
                    <strong>Alasan Moderasi:</strong> {{ rev.hidden_reason }}
                  </div>
                </td>

                <!-- Date -->
                <td class="p-3 text-muted-foreground whitespace-nowrap text-xs">
                  {{ formatDate(rev.created_at) }}
                </td>

                <!-- Status Badge -->
                <td class="p-3 text-center whitespace-nowrap">
                  <span
                    v-if="rev.is_hidden"
                    class="border-2 border-black px-2.5 py-0.5 rounded-[2px] font-outfit font-black text-[10px] uppercase shadow-neo-xs inline-block bg-red-100 text-red-800"
                  >
                    Disembunyikan
                  </span>
                  <span
                    v-else
                    class="border-2 border-black px-2.5 py-0.5 rounded-[2px] font-outfit font-black text-[10px] uppercase shadow-neo-xs inline-block bg-emerald-100 text-emerald-800"
                  >
                    Publik
                  </span>
                </td>

                <!-- Actions -->
                <td class="p-3 text-right whitespace-nowrap shrink-0">
                  <div class="inline-flex items-center gap-1.5 justify-end">
                    <button
                      type="button"
                      class="neubrutal-btn bg-white border border-black sm:border-2 p-1.5 rounded-[2px] hover:bg-neutral-100 shadow-neo-xs cursor-pointer"
                      :title="rev.seller_reply ? 'Ubah Balasan Toko' : 'Balas Ulasan'"
                      @click="openReply(rev)"
                    >
                      <svg class="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a.75.75 0 0 1-.974-.94 5.942 5.942 0 0 0 .974-2.82A8.066 8.066 0 0 1 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="neubrutal-btn border border-black sm:border-2 p-1.5 rounded-[2px] shadow-neo-xs cursor-pointer"
                      :class="rev.is_hidden ? 'bg-emerald-300 hover:bg-emerald-400' : 'bg-amber-100 hover:bg-amber-200'"
                      :title="rev.is_hidden ? 'Tampilkan ke Publik' : 'Sembunyikan dari Publik'"
                      @click="openModerate(rev)"
                    >
                      <svg v-if="rev.is_hidden" class="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                      <svg v-else class="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="neubrutal-btn bg-red-100 text-red-800 border border-black sm:border-2 p-1.5 rounded-[2px] shadow-neo-xs hover:bg-red-200 cursor-pointer"
                      title="Hapus Ulasan"
                      @click="openDelete(rev)"
                    >
                      <svg class="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Pagination footer (Identical to AdminBooksTab & AdminOrdersTab) -->
      <div
        v-if="meta.total_pages > 1 || meta.total_items > 0"
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 border-t-2 border-black bg-neutral-50"
      >
        <div class="text-xs font-sans font-bold text-neutral-600 text-center sm:text-left">
          Halaman <span class="font-outfit font-black text-black">{{ meta.page }}</span> dari
          <span class="font-outfit font-black text-black">{{ meta.total_pages }}</span>
          <span class="text-neutral-400 mx-1">·</span>
          Total {{ meta.total_items }} ulasan
        </div>

        <div v-if="meta.total_pages > 1" class="flex flex-wrap items-center justify-center sm:justify-end gap-1.5">
          <button
            type="button"
            :disabled="meta.page <= 1 || loading"
            class="neubrutal-btn px-2.5 sm:px-3 py-1.5 rounded-[2px] border-2 border-black font-outfit font-black text-xs transition-all flex items-center gap-1 cursor-pointer"
            :class="[
              meta.page <= 1 || loading
                ? 'bg-neutral-100 text-neutral-400 border-neutral-300 cursor-not-allowed shadow-none'
                : 'bg-white text-black hover:bg-neo-yellow shadow-neo-xs hover:shadow-neo-sm',
            ]"
            @click="loadReviews(meta.page - 1)"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            <span>Prev</span>
          </button>

          <button
            v-for="p in visibleReviewPages"
            :key="`review-page-${p}`"
            type="button"
            :disabled="p === '...' || loading"
            class="w-8 h-8 rounded-[2px] border-2 border-black font-outfit font-black text-xs transition-all flex items-center justify-center cursor-pointer"
            :class="[
              p === meta.page
                ? 'bg-black text-white shadow-neo-xs'
                : p === '...'
                  ? 'border-transparent text-neutral-400 cursor-default shadow-none'
                  : 'bg-white text-black hover:bg-neutral-100 shadow-neo-xs hover:shadow-neo-sm',
            ]"
            @click="p !== '...' && loadReviews(p)"
          >
            {{ p }}
          </button>

          <button
            type="button"
            :disabled="meta.page >= meta.total_pages || loading"
            class="neubrutal-btn px-2.5 sm:px-3 py-1.5 rounded-[2px] border-2 border-black font-outfit font-black text-xs transition-all flex items-center gap-1 cursor-pointer"
            :class="[
              meta.page >= meta.total_pages || loading
                ? 'bg-neutral-100 text-neutral-400 border-neutral-300 cursor-not-allowed shadow-none'
                : 'bg-white text-black hover:bg-neo-yellow shadow-neo-xs hover:shadow-neo-sm',
            ]"
            @click="loadReviews(meta.page + 1)"
          >
            <span>Next</span>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Reply Modal -->
    <div
      v-if="showReplyModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="showReplyModal = false"
    >
      <div class="bg-white border-2 sm:border-3 border-black rounded-[2px] shadow-neo-lg w-full max-w-lg overflow-hidden animate-scale-up">
        <div class="bg-neo-yellow border-b-2 sm:border-b-3 border-black p-4 flex items-center justify-between">
          <h3 class="font-outfit font-black text-base sm:text-lg text-black">
            Balas Ulasan Pembeli
          </h3>
          <button
            type="button"
            class="w-7 h-7 rounded-full border-2 border-black bg-white hover:bg-neutral-100 flex items-center justify-center cursor-pointer shadow-neo-xs"
            @click="showReplyModal = false"
          >
            ✕
          </button>
        </div>

        <div class="p-4 sm:p-5 space-y-4">
          <div v-if="targetReview" class="p-3 bg-neutral-100 border border-black rounded-[2px] text-xs space-y-1">
            <div class="font-outfit font-bold text-black flex items-center justify-between">
              <span>{{ targetReview.book_title }}</span>
              <span class="text-amber-600 font-black">★ {{ targetReview.rating }}.0</span>
            </div>
            <p class="font-sans text-neutral-600 italic">
              "{{ targetReview.comment || 'Tanpa komentar tertulis' }}"
            </p>
          </div>

          <div>
            <label class="block font-outfit font-black text-xs text-black uppercase tracking-wider mb-1">
              Teks Balasan Resmi Toko
            </label>
            <textarea
              v-model="replyText"
              rows="4"
              maxlength="1000"
              placeholder="Tuliskan ucapan terima kasih atau solusi untuk pelanggan..."
              class="w-full p-2.5 bg-neutral-50 border-2 border-black rounded-[2px] font-sans text-xs focus:bg-white focus:outline-none"
            ></textarea>
            <div class="text-right text-[10px] text-neutral-400 mt-0.5">
              {{ replyText.length }}/1000 karakter
            </div>
          </div>
        </div>

        <div class="bg-neutral-50 border-t-2 border-black p-3.5 flex items-center justify-end gap-2">
          <button
            type="button"
            class="neubrutal-btn bg-white border-2 border-black px-4 py-1.5 font-outfit font-bold text-xs shadow-neo-xs hover:bg-neutral-100 cursor-pointer"
            @click="showReplyModal = false"
          >
            Batal
          </button>
          <button
            type="button"
            :disabled="replying"
            class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-4 py-1.5 font-outfit font-black text-xs shadow-neo-xs hover:bg-yellow-300 disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
            @click="submitReply"
          >
            <span>{{ replying ? 'Menyimpan...' : 'Simpan Balasan' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Moderate Visibility Modal -->
    <div
      v-if="showModerateModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="showModerateModal = false"
    >
      <div class="bg-white border-2 sm:border-3 border-black rounded-[2px] shadow-neo-lg w-full max-w-md overflow-hidden animate-scale-up">
        <div
          class="border-b-2 sm:border-b-3 border-black p-4 flex items-center justify-between"
          :class="isHiding ? 'bg-amber-300' : 'bg-emerald-300'"
        >
          <h3 class="font-outfit font-black text-base sm:text-lg text-black">
            {{ isHiding ? 'Sembunyikan Ulasan' : 'Tampilkan Ulasan' }}
          </h3>
          <button
            type="button"
            class="w-7 h-7 rounded-full border-2 border-black bg-white hover:bg-neutral-100 flex items-center justify-center cursor-pointer shadow-neo-xs"
            @click="showModerateModal = false"
          >
            ✕
          </button>
        </div>

        <div class="p-4 sm:p-5 space-y-4">
          <p class="font-sans text-xs text-neutral-700 leading-relaxed">
            <span v-if="isHiding">
              Ulasan yang disembunyikan tidak akan tampil di halaman buku publik dan dikecualikan dari perhitungan nilai rata-rata rating.
            </span>
            <span v-else>
              Ulasan akan kembali tampil secara publik di halaman buku dan dimasukkan kembali ke perhitungan rata-rata rating.
            </span>
          </p>

          <div v-if="isHiding">
            <label class="block font-outfit font-black text-xs text-black uppercase tracking-wider mb-1">
              Alasan Moderasi
            </label>
            <textarea
              v-model="moderationReason"
              rows="3"
              placeholder="Contoh: Mengandung kata-kata kasar / spam"
              class="w-full p-2.5 bg-neutral-50 border-2 border-black rounded-[2px] font-sans text-xs focus:bg-white focus:outline-none"
            ></textarea>
          </div>
        </div>

        <div class="bg-neutral-50 border-t-2 border-black p-3.5 flex items-center justify-end gap-2">
          <button
            type="button"
            class="neubrutal-btn bg-white border-2 border-black px-4 py-1.5 font-outfit font-bold text-xs shadow-neo-xs hover:bg-neutral-100 cursor-pointer"
            @click="showModerateModal = false"
          >
            Batal
          </button>
          <button
            type="button"
            :disabled="moderating"
            class="neubrutal-btn border-2 border-black px-4 py-1.5 font-outfit font-black text-xs shadow-neo-xs cursor-pointer flex items-center gap-1.5"
            :class="isHiding ? 'bg-amber-400 text-black hover:bg-amber-500' : 'bg-emerald-400 text-black hover:bg-emerald-500'"
            @click="submitModerate"
          >
            <span>{{ moderating ? 'Memproses...' : (isHiding ? 'Sembunyikan' : 'Tampilkan Ulang') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirm Modal -->
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="showDeleteModal = false"
    >
      <div class="bg-white border-2 sm:border-3 border-black rounded-[2px] shadow-neo-lg w-full max-w-sm overflow-hidden animate-scale-up">
        <div class="bg-red-400 border-b-2 sm:border-b-3 border-black p-4 flex items-center justify-between">
          <h3 class="font-outfit font-black text-base text-black">
            Hapus Ulasan Permanen?
          </h3>
          <button
            type="button"
            class="w-7 h-7 rounded-full border-2 border-black bg-white hover:bg-neutral-100 flex items-center justify-center cursor-pointer shadow-neo-xs"
            @click="showDeleteModal = false"
          >
            ✕
          </button>
        </div>

        <div class="p-4 sm:p-5 space-y-2">
          <p class="font-sans text-xs text-neutral-800 leading-relaxed">
            Apakah Anda yakin ingin menghapus ulasan ini secara permanen? Data yang telah dihapus tidak dapat dipulihkan kembali.
          </p>
        </div>

        <div class="bg-neutral-50 border-t-2 border-black p-3.5 flex items-center justify-end gap-2">
          <button
            type="button"
            class="neubrutal-btn bg-white border-2 border-black px-4 py-1.5 font-outfit font-bold text-xs shadow-neo-xs hover:bg-neutral-100 cursor-pointer"
            @click="showDeleteModal = false"
          >
            Batal
          </button>
          <button
            type="button"
            :disabled="deleting"
            class="neubrutal-btn bg-red-500 text-white border-2 border-black px-4 py-1.5 font-outfit font-black text-xs shadow-neo-xs hover:bg-red-600 disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
            @click="submitDelete"
          >
            <span>{{ deleting ? 'Menghapus...' : 'Ya, Hapus' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
