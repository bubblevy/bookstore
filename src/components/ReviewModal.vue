<script setup>
import { ref, computed, watch } from 'vue'
import { api } from '@/lib/api'
import { useStore } from '@/composables/useStore'
import { assetUrl } from '@/lib/assets'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  invoiceNumber: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'submitted'])

const { showToast } = useStore()

const loading = ref(false)
const submitting = ref(false)
const eligibility = ref(null)
const error = ref('')

// Form state per book: { [book_id]: { rating: 5, comment: '', is_reviewed: false, review_id: null } }
const formItems = ref({})
const hoverStars = ref({})

const RATING_LABELS = {
  1: 'Sangat Buruk',
  2: 'Buruk',
  3: 'Cukup',
  4: 'Bagus',
  5: 'Sangat Bagus',
}

async function loadEligibility() {
  if (!props.invoiceNumber) return
  loading.value = true
  error.value = ''
  try {
    const res = await api.orderReviewEligibility(props.invoiceNumber)
    eligibility.value = res.data || null

    // Initialize form items
    const forms = {}
    if (res.data?.items) {
      for (const item of res.data.items) {
        forms[item.book_id] = {
          rating: item.rating || 5,
          comment: item.comment || '',
          is_reviewed: Boolean(item.is_reviewed),
          review_id: item.review_id || null,
        }
      }
    }
    formItems.value = forms
  } catch (err) {
    error.value = err?.message || 'Gagal memeriksa kelayakan ulasan'
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.modelValue, props.invoiceNumber],
  ([isOpen, inv]) => {
    if (isOpen && inv) {
      loadEligibility()
    } else {
      eligibility.value = null
      error.value = ''
      formItems.value = {}
      hoverStars.value = {}
    }
  },
  { immediate: true },
)

function setRating(bookId, stars) {
  if (!formItems.value[bookId]) return
  formItems.value[bookId].rating = stars
}

function setHover(bookId, stars) {
  hoverStars.value = { ...hoverStars.value, [bookId]: stars }
}

function clearHover(bookId) {
  const copy = { ...hoverStars.value }
  delete copy[bookId]
  hoverStars.value = copy
}

function getActiveStars(bookId) {
  if (hoverStars.value[bookId] !== undefined) {
    return hoverStars.value[bookId]
  }
  return formItems.value[bookId]?.rating || 5
}

function closeModal() {
  emit('update:modelValue', false)
}

async function handleSubmit() {
  if (!eligibility.value?.items?.length) return

  // Validate all items have rating between 1 and 5
  for (const item of eligibility.value.items) {
    const r = formItems.value[item.book_id]?.rating
    if (!r || r < 1 || r > 5) {
      showToast(`Silakan pilih rating (1-5) untuk buku "${item.title}"`, { type: 'error' })
      return
    }
  }

  submitting.value = true
  try {
    const newReviews = []
    const updatePromises = []

    for (const item of eligibility.value.items) {
      const state = formItems.value[item.book_id]
      if (item.is_reviewed && item.review_id) {
        // Update existing review
        updatePromises.push(
          api.updateReview(item.review_id, {
            rating: state.rating,
            comment: state.comment?.trim() || '',
          }),
        )
      } else {
        // New review
        newReviews.push({
          book_id: item.book_id,
          rating: state.rating,
          comment: state.comment?.trim() || '',
        })
      }
    }

    if (newReviews.length > 0) {
      await api.submitOrderReviews(props.invoiceNumber, { reviews: newReviews })
    }

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises)
    }

    showToast('Ulasan dan rating Anda berhasil disimpan!', { type: 'success' })
    emit('submitted')
    closeModal()
  } catch (err) {
    showToast(err?.message || 'Gagal menyimpan ulasan', { type: 'error' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
    @click.self="closeModal"
  >
    <div
      class="bg-white border-2 sm:border-3 border-black rounded-[2px] shadow-neo-lg w-full max-w-xl my-8 overflow-hidden animate-scale-up"
    >
      <!-- Header -->
      <div class="bg-neo-yellow border-b-2 sm:border-b-3 border-black p-3.5 sm:p-4 flex items-center justify-between gap-3 shrink-0">
        <div>
          <h3 class="font-outfit font-black text-sm sm:text-base text-black uppercase tracking-tight">
            Beri Ulasan Produk
          </h3>
          <p class="font-mono text-[11px] font-bold text-black/75 mt-0.5">
            Invoice: #{{ invoiceNumber }}
          </p>
        </div>
        <button
          type="button"
          class="w-8 h-8 shrink-0 aspect-square rounded-[2px] bg-white border-2 border-black flex items-center justify-center font-outfit font-black text-sm hover:bg-black hover:text-white transition-colors cursor-pointer"
          aria-label="Tutup modal"
          @click="closeModal"
        >
          ✕
        </button>
      </div>

      <!-- Body -->
      <div class="p-4 sm:p-6 max-h-[70vh] overflow-y-auto space-y-5">
        <!-- Loading -->
        <div v-if="loading" class="py-12 text-center space-y-3">
          <div class="inline-block w-8 h-8 border-3 border-black border-t-neo-yellow rounded-full animate-spin"></div>
          <p class="font-outfit font-bold text-sm text-neutral-600">Memeriksa kelayakan ulasan...</p>
        </div>

        <!-- Error / Ineligible -->
        <div v-else-if="error || (eligibility && !eligibility.is_eligible)" class="p-4 bg-amber-50 border-2 border-black rounded-[2px] space-y-2">
          <div class="flex items-center gap-2 text-amber-900 font-outfit font-black text-sm">
            <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Ulasan Tidak Tersedia</span>
          </div>
          <p class="font-sans text-xs text-neutral-700 leading-relaxed">
            {{ error || (eligibility?.is_expired ? 'Batas waktu ulasan telah berakhir (maksimal 7 hari setelah pesanan diterima).' : 'Pesanan belum selesai atau belum dapat diulas.') }}
          </p>
        </div>

        <!-- Eligible Review Form -->
        <div v-else-if="eligibility" class="space-y-6">
          <!-- Deadline notice -->
          <div v-if="eligibility.remaining_days !== undefined" class="p-3 bg-neutral-100 border border-black rounded-[2px] flex items-center justify-between text-xs">
            <span class="font-sans font-medium text-neutral-700">Batas waktu penilaian ulasan:</span>
            <span class="font-outfit font-black text-black">
              Tersisa {{ eligibility.remaining_days }} hari lagi
            </span>
          </div>

          <!-- Items list -->
          <div class="space-y-5">
            <div
              v-for="item in eligibility.items"
              :key="item.book_id"
              class="border-2 border-black p-4 rounded-[2px] bg-white shadow-neo-sm space-y-3.5"
            >
              <!-- Book info -->
              <div class="flex items-start gap-3">
                <div class="w-12 h-16 shrink-0 border border-black rounded-[1px] bg-neutral-100 overflow-hidden flex items-center justify-center">
                  <img
                    v-if="item.cover_image"
                    :src="assetUrl(item.cover_image)"
                    :alt="item.title"
                    class="w-full h-full object-cover"
                  />
                  <span v-else class="text-[9px] font-bold text-neutral-400">Buku</span>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-2">
                    <h4 class="font-outfit font-black text-sm text-black leading-snug line-clamp-2">
                      {{ item.title }}
                    </h4>
                    <span
                      v-if="item.is_reviewed"
                      class="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-600 rounded-[2px] font-outfit font-bold text-[10px] shrink-0 uppercase"
                    >
                      Sudah Diulas
                    </span>
                  </div>
                  <p class="font-mono text-xs text-neutral-500 mt-1">
                    {{ new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.price) }}
                  </p>
                </div>
              </div>

              <!-- Interactive Star Rating -->
              <div class="pt-2 border-t border-black/10">
                <div class="flex items-center justify-between mb-1.5">
                  <label class="font-outfit font-black text-xs text-black uppercase tracking-wider">
                    Rating Kepuasan
                  </label>
                  <span class="font-outfit font-bold text-xs text-amber-600">
                    {{ RATING_LABELS[getActiveStars(item.book_id)] }}
                  </span>
                </div>
                <div class="flex items-center gap-1.5" @mouseleave="clearHover(item.book_id)">
                  <button
                    v-for="star in 5"
                    :key="star"
                    type="button"
                    class="p-1 hover:scale-115 transition-transform cursor-pointer"
                    @mouseenter="setHover(item.book_id, star)"
                    @click="setRating(item.book_id, star)"
                  >
                    <svg
                      class="w-7 h-7 transition-colors"
                      :class="star <= getActiveStars(item.book_id) ? 'fill-amber-400 text-black' : 'fill-neutral-200 text-neutral-400'"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Written Comment -->
              <div>
                <label class="block font-outfit font-black text-xs text-black uppercase tracking-wider mb-1">
                  Ulasan Tertulis (Opsional)
                </label>
                <textarea
                  v-if="formItems[item.book_id]"
                  v-model="formItems[item.book_id].comment"
                  rows="3"
                  maxlength="1000"
                  placeholder="Bagikan pendapat Anda mengenai kualitas cetak, isi buku, dan pengemasan..."
                  class="w-full p-2.5 bg-neutral-50 border-2 border-black rounded-[2px] font-sans text-xs focus:bg-white focus:outline-none transition-colors"
                ></textarea>
                <div class="text-right text-[10px] text-neutral-400 mt-0.5">
                  {{ (formItems[item.book_id]?.comment || '').length }}/1000 karakter
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="bg-neutral-50 border-t-2 sm:border-t-3 border-black p-4 flex items-center justify-end gap-2.5">
        <button
          type="button"
          class="neubrutal-btn bg-white border-2 border-black px-4 py-2 font-outfit font-bold text-xs shadow-neo-sm hover:bg-neutral-100 cursor-pointer"
          @click="closeModal"
        >
          Batal
        </button>
        <button
          v-if="eligibility && eligibility.is_eligible"
          type="button"
          :disabled="submitting || loading"
          class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-5 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-yellow-300 disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
          @click="handleSubmit"
        >
          <svg v-if="submitting" class="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span>{{ submitting ? 'Menyimpan...' : 'Kirim Ulasan' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

