<script setup>
import { ref, computed, watch } from 'vue'
import { api } from '@/lib/api'
import { localizeApiError } from '@/lib/errors'
import { useStore } from '@/composables/useStore'
import { assetUrl } from '@/lib/assets'
import { mapBook } from '@/lib/mappers'

const props = defineProps({
  discounts: {
    type: Array,
    default: () => [],
  },
  books: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['refresh'])
const { showToast } = useStore()

const busy = ref({})
const isBusy = (key) => Boolean(busy.value[key])
const setBusy = (key, value) => {
  busy.value = { ...busy.value, [key]: value }
}

function apiErrorText(error, fallback) {
  return localizeApiError(error?.message, error?.status) || fallback
}

function formatRupiah(val) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(val || 0)
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(date)
}

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

const showVoucherModal = ref(false)
const isEditVoucher = ref(false)
const currentVoucherId = ref(null)

function mapVoucherTier(tier = {}) {
  return {
    id: tier.id || null,
    minPurchase: Number(tier.min_spend ?? tier.min_purchase ?? 0),
    rewardType:
      tier.reward_type === 'PERCENTAGE' || tier.reward_type === 'percent'
        ? 'percentage'
        : 'fixed',
    rewardValue: Number(tier.reward_value || 0),
    maxDiscount:
      tier.max_reward !== null && tier.max_reward !== undefined
        ? Number(tier.max_reward)
        : tier.max_discount !== null && tier.max_discount !== undefined
          ? Number(tier.max_discount)
          : null,
  }
}

function mapVoucher(discount) {
  const rawType = discount.discount_type || discount.type || ''
  const type =
    rawType.toUpperCase() === 'PERCENTAGE' || rawType.toLowerCase() === 'percent'
      ? 'percentage'
      : rawType.toUpperCase() === 'TIERED' || rawType.toLowerCase() === 'tiered'
        ? 'tiered'
        : 'fixed'

  const bookIds = Array.isArray(discount.book_ids)
    ? discount.book_ids.map(Number)
    : Array.isArray(discount.books)
      ? discount.books.map((b) => Number(typeof b === 'object' ? b.id : b))
      : []

  return {
    id: discount.id,
    code: discount.code,
    name: discount.name,
    desc: discount.description || '',
    type,
    rawType: discount.discount_type || discount.type,
    value: Number(discount.discount_value || 0),
    minSpend: Number(discount.min_purchase || 0),
    maxDiscount:
      discount.max_discount_amount !== null && discount.max_discount_amount !== undefined
        ? Number(discount.max_discount_amount)
        : discount.max_discount !== null && discount.max_discount !== undefined
          ? Number(discount.max_discount)
          : null,
    quota: Number(discount.quota || 0),
    used: Number(discount.used_count || 0),
    isAllBooks: discount.is_all_books !== false,
    bookIds,
    startDate: discount.start_date ? discount.start_date.slice(0, 10) : '',
    validUntil: discount.end_date ? discount.end_date.slice(0, 10) : '',
    active: Boolean(discount.is_active),
    tiers: Array.isArray(discount.tiers) ? discount.tiers.map(mapVoucherTier) : [],
  }
}

const adminVouchers = computed(() => props.discounts.map(mapVoucher))

const vouchersPage = ref(1)
const vouchersPerPage = ref(10)
const totalVoucherPages = computed(() =>
  Math.max(1, Math.ceil(adminVouchers.value.length / vouchersPerPage.value)),
)

const paginatedVouchers = computed(() => {
  const start = (vouchersPage.value - 1) * vouchersPerPage.value
  return adminVouchers.value.slice(start, start + vouchersPerPage.value)
})

const visibleVoucherPages = computed(() =>
  generatePagination(totalVoucherPages.value, vouchersPage.value),
)

function changeVoucherPage(p) {
  if (p === '...' || p === vouchersPage.value) return
  if (p < 1 || p > totalVoucherPages.value) return
  vouchersPage.value = p
}

watch(totalVoucherPages, (newTotal) => {
  if (vouchersPage.value > newTotal) {
    vouchersPage.value = newTotal
  }
})

function voucherTypeLabel(type) {
  if (type === 'percentage') return 'Persentase'
  if (type === 'tiered') return 'Bertingkat'
  return 'Nominal Tetap'
}

function voucherValueLabel(voucher) {
  if (voucher.type === 'tiered') return `Up To ${voucher.value}%`
  return voucher.type === 'percentage' ? `${voucher.value}%` : formatRupiah(voucher.value)
}

function voucherTierPayload(tiers = []) {
  return tiers.map((tier) => ({
    min_spend: Number(tier.minPurchase) || 0,
    reward_type: tier.rewardType === 'percentage' ? 'PERCENTAGE' : 'FIXED',
    reward_value: Number(tier.rewardValue) || 0,
    max_reward:
      tier.rewardType === 'percentage' && tier.maxDiscount !== null && tier.maxDiscount !== ''
        ? Number(tier.maxDiscount)
        : null,
  }))
}

function voucherTypeCode(type) {
  if (type === 'percentage') return 'PERCENTAGE'
  if (type === 'tiered') return 'TIERED'
  return 'FIXED'
}

const voucherForm = ref({
  code: '',
  name: '',
  desc: '',
  type: 'fixed',
  value: 0,
  minSpend: 0,
  maxDiscount: null,
  quota: 100,
  startDate: '',
  validUntil: '',
  active: true,
  isAllBooks: true,
  bookIds: [],
  tiers: [],
})

const localBooks = ref([])
const booksLoading = ref(false)
const bookSearchQuery = ref('')

const availableBooks = computed(() => {
  if (props.books && props.books.length > 0) return props.books
  return localBooks.value
})

async function ensureBooksLoaded() {
  if (availableBooks.value.length > 0) return
  booksLoading.value = true
  try {
    const res = await api.books({ per_page: 10, is_active: 'all' })
    localBooks.value = (res.data || []).map(mapBook)
  } catch {
  } finally {
    booksLoading.value = false
  }
}

const filteredBookList = computed(() => {
  const q = bookSearchQuery.value.trim().toLowerCase()
  if (!q) return availableBooks.value
  return availableBooks.value.filter((b) => {
    const title = String(b.title || '').toLowerCase()
    const author = String(b.author || '').toLowerCase()
    const isbn = String(b.isbn || '').toLowerCase()
    return title.includes(q) || author.includes(q) || isbn.includes(q)
  })
})

function toggleBookSelection(id) {
  const numId = Number(id)
  const index = voucherForm.value.bookIds.indexOf(numId)
  if (index >= 0) {
    voucherForm.value.bookIds.splice(index, 1)
  } else {
    voucherForm.value.bookIds.push(numId)
  }
}

function selectAllFilteredBooks() {
  const currentSet = new Set(voucherForm.value.bookIds)
  filteredBookList.value.forEach((b) => currentSet.add(Number(b.id)))
  voucherForm.value.bookIds = Array.from(currentSet)
}

function getBookTitle(id) {
  const b = availableBooks.value.find((item) => Number(item.id) === Number(id))
  return b ? b.title : `Buku #${id}`
}

watch(
  () => voucherForm.value.isAllBooks,
  (val) => {
    if (!val) {
      ensureBooksLoaded()
    }
  },
)

function openAddVoucher() {
  isEditVoucher.value = false
  currentVoucherId.value = null
  bookSearchQuery.value = ''
  voucherForm.value = {
    code: '',
    name: '',
    desc: '',
    type: 'fixed',
    value: 0,
    minSpend: 0,
    maxDiscount: null,
    quota: 100,
    startDate: new Date().toISOString().slice(0, 10),
    validUntil: '',
    active: true,
    isAllBooks: true,
    bookIds: [],
    tiers: [],
  }
  showVoucherModal.value = true
}

async function openEditVoucher(v) {
  isEditVoucher.value = true
  currentVoucherId.value = v.id
  bookSearchQuery.value = ''
  let detail = v

  try {
    const response = await api.discount(v.id)
    if (response?.data) {
      detail = mapVoucher(response.data)
    }
  } catch {
    // Keep detail from prop if detail call fails
  }

  voucherForm.value = {
    code: detail.code,
    name: detail.name || '',
    desc: detail.desc || '',
    type: detail.type,
    value: detail.value,
    minSpend: detail.minSpend,
    maxDiscount: detail.maxDiscount,
    quota: detail.quota,
    startDate: detail.startDate || '',
    validUntil: detail.validUntil,
    active: detail.active,
    isAllBooks: detail.isAllBooks !== false,
    bookIds: Array.isArray(detail.bookIds) ? [...detail.bookIds] : [],
    tiers: (detail.tiers || []).map((tier) => ({ ...tier })),
  }

  if (!voucherForm.value.isAllBooks) {
    ensureBooksLoaded()
  }

  showVoucherModal.value = true
}

function addVoucherTier() {
  voucherForm.value.tiers.push({
    minPurchase: 0,
    rewardType: 'percentage',
    rewardValue: 0,
    maxDiscount: null,
  })
}

function removeVoucherTier(index) {
  voucherForm.value.tiers.splice(index, 1)
}

async function handleSaveVoucher() {
  if (!voucherForm.value.code.trim() || !voucherForm.value.value) {
    showToast('Harap lengkapi kode voucher dan nilai diskon.', { type: 'error' })
    return
  }
  if (!voucherForm.value.validUntil) {
    showToast('Tentukan tanggal berakhir voucher.', { type: 'error' })
    return
  }

  const value = Number(voucherForm.value.value) || 0
  if (voucherForm.value.type === 'percentage' && (value <= 0 || value > 100)) {
    showToast('Diskon persentase harus berada di antara 1% - 100%.', { type: 'error' })
    return
  }

  if (voucherForm.value.type === 'tiered') {
    if (!voucherForm.value.tiers.length) {
      showToast('Tambahkan minimal satu tier untuk voucher bertingkat.', { type: 'error' })
      return
    }
    if (voucherForm.value.tiers.some((tier) => Number(tier.rewardValue) <= 0)) {
      showToast('Nilai reward tier harus lebih besar dari 0.', { type: 'error' })
      return
    }
  }

  if (!voucherForm.value.isAllBooks && (!voucherForm.value.bookIds || !voucherForm.value.bookIds.length)) {
    showToast('Pilih minimal satu buku jika voucher dibatasi untuk buku tertentu.', { type: 'error' })
    return
  }

  const code = voucherForm.value.code
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .trim()
  if (code.length < 3) {
    showToast('Kode voucher minimal 3 karakter huruf dan angka.', { type: 'error' })
    return
  }

  const startDate = voucherForm.value.startDate
    ? new Date(`${voucherForm.value.startDate}T00:00:00`).toISOString()
    : new Date().toISOString()
  const endDate = new Date(`${voucherForm.value.validUntil}T23:59:59`).toISOString()

  const payload = {
    code,
    name: voucherForm.value.name.trim() || `Voucher ${code}`,
    description: voucherForm.value.desc ? voucherForm.value.desc.trim() : null,
    discount_type: voucherTypeCode(voucherForm.value.type),
    discount_value: value,
    min_purchase: Number(voucherForm.value.minSpend) || 0,
    quota: Number(voucherForm.value.quota) || 0,
    max_discount_amount:
      (voucherForm.value.type === 'percentage' || voucherForm.value.type === 'tiered') &&
      voucherForm.value.maxDiscount !== null &&
      voucherForm.value.maxDiscount !== ''
        ? Number(voucherForm.value.maxDiscount)
        : null,
    is_all_books: voucherForm.value.isAllBooks !== false,
    is_active: Boolean(voucherForm.value.active),
    start_date: startDate,
    end_date: endDate,
  }

  if (!voucherForm.value.isAllBooks) {
    payload.book_ids = voucherForm.value.bookIds.map(Number)
  }

  if (voucherForm.value.type === 'tiered') {
    payload.tiers = voucherTierPayload(voucherForm.value.tiers).sort(
      (a, b) => a.min_spend - b.min_spend,
    )
  }

  try {
    setBusy('voucher-save', true)
    if (isEditVoucher.value && currentVoucherId.value) {
      await api.updateDiscount(currentVoucherId.value, payload)
      showToast('Voucher berhasil diperbarui.', { type: 'success' })
    } else {
      await api.createDiscount(payload)
      showToast('Voucher berhasil ditambahkan.', { type: 'success' })
    }
    emit('refresh')
    showVoucherModal.value = false
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal menyimpan voucher'), { type: 'error' })
  } finally {
    setBusy('voucher-save', false)
  }
}

const voucherToDelete = ref(null)
const showDeleteVoucherConfirm = ref(false)

function confirmDeleteVoucher(v) {
  voucherToDelete.value = v
  showDeleteVoucherConfirm.value = true
}

async function executeDeleteVoucher() {
  if (!voucherToDelete.value || isBusy('voucher-delete')) return
  setBusy('voucher-delete', true)
  try {
    await api.deleteDiscount(voucherToDelete.value.id)
    emit('refresh')
    showToast('Voucher berhasil dihapus.', { type: 'info' })
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal menghapus voucher'), { type: 'error' })
  } finally {
    setBusy('voucher-delete', false)
    showDeleteVoucherConfirm.value = false
    voucherToDelete.value = null
  }
}

async function toggleVoucher(voucher) {
  const key = `voucher-toggle-${voucher.id}`
  if (isBusy(key)) return

  try {
    setBusy(key, true)
    const discountType = voucherTypeCode(voucher.type)
    const payload = {
      code: voucher.code,
      name: voucher.name,
      description: voucher.desc || null,
      discount_type: discountType,
      discount_value: Number(voucher.value) || 0,
      min_purchase: Number(voucher.minSpend) || 0,
      quota: Number(voucher.quota) || 0,
      max_discount_amount: voucher.maxDiscount,
      is_all_books: voucher.isAllBooks !== false,
      is_active: !voucher.active,
      start_date: voucher.startDate
        ? new Date(`${voucher.startDate}T00:00:00`).toISOString()
        : new Date().toISOString(),
      end_date: new Date(`${voucher.validUntil}T23:59:59`).toISOString(),
    }
    if (!voucher.isAllBooks && voucher.bookIds?.length) {
      payload.book_ids = voucher.bookIds.map(Number)
    }
    if (voucher.type === 'tiered') {
      payload.tiers = voucherTierPayload(voucher.tiers).sort((a, b) => a.min_spend - b.min_spend)
    }
    await api.updateDiscount(voucher.id, payload)
    emit('refresh')
    showToast('Status voucher diperbarui.', { type: 'success' })
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal mengubah status voucher'), { type: 'error' })
  } finally {
    setBusy(key, false)
  }
}
</script>

<template>
  <div class="space-y-6">
    <div
      class="bg-white border-2 sm:border-3 border-black p-4 rounded-[2px] shadow-neo-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div>
        <h2 class="font-outfit font-black text-lg text-black">
          Manajemen Kupon & Voucher Diskon
        </h2>
        <p class="font-sans text-xs text-muted-foreground">
          Voucher yang dibuat di sini otomatis aktif dan dapat divalidasi langsung oleh pembeli
          saat checkout.
        </p>
      </div>

      <button
        class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-4 py-2 rounded-[2px] font-outfit font-black text-xs shadow-neo-sm hover:bg-yellow-300 w-full sm:w-auto text-center shrink-0 cursor-pointer"
        @click="openAddVoucher"
      >
        + Tambah Voucher
      </button>
    </div>

    <div class="bg-white border-2 sm:border-3 border-black rounded-[2px] shadow-neo-sm overflow-hidden">
      <div class="overflow-x-auto table-scrollbar">
        <table class="w-full min-w-[850px] text-xs font-sans border-collapse">
          <thead>
            <tr class="bg-black text-white font-outfit font-black text-left">
              <th class="p-3 whitespace-nowrap min-w-[130px]">KODE VOUCHER</th>
              <th class="p-3 whitespace-nowrap min-w-[200px]">NAMA & DESKRIPSI</th>
              <th class="p-3 whitespace-nowrap min-w-[120px]">TIPE & NILAI</th>
              <th class="p-3 whitespace-nowrap min-w-[120px]">MINIMAL BELANJA</th>
              <th class="p-3 text-center whitespace-nowrap min-w-[120px]">KUOTA / TERPAKAI</th>
              <th class="p-3 whitespace-nowrap min-w-[130px]">BERLAKU SAMPAI</th>
              <th class="p-3 text-center whitespace-nowrap min-w-[90px]">STATUS</th>
              <th class="p-3 text-right whitespace-nowrap shrink-0">AKSI</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="8" class="p-8 text-center bg-gray-50/50">
                <div class="inline-flex items-center justify-center gap-2.5">
                  <span
                    class="inline-block w-4 h-4 rounded-[2px] border-2 border-black border-t-transparent animate-spin shrink-0"
                  ></span>
                  <span class="font-outfit font-black text-sm text-black">
                    Memuat voucher diskon...
                  </span>
                </div>
              </td>
            </tr>
            <tr v-else-if="paginatedVouchers.length === 0">
              <td colspan="8" class="p-8 text-center bg-gray-50/50">
                <p class="font-outfit font-black text-sm text-black">Belum Ada Voucher</p>
                <p class="font-sans text-xs text-muted-foreground mt-1">
                  Belum ada voucher diskon yang dibuat.
                </p>
              </td>
            </tr>
            <template v-else>
              <tr
                v-for="v in paginatedVouchers"
                :key="v.id"
                class="border-b border-black/10 hover:bg-gray-50"
              >
                <td class="p-3 whitespace-nowrap">
                  <span
                    class="font-mono font-black text-sm bg-neo-yellow border-2 border-black px-2.5 py-0.5 rounded-[2px] shadow-neo-sm inline-block"
                  >
                    {{ v.code }}
                  </span>
                </td>
                <td class="p-3 min-w-[200px]">
                  <h5 class="font-outfit font-black text-sm text-black">{{ v.name }}</h5>
                  <p class="font-sans text-xs text-muted-foreground mt-0.5">{{ v.desc }}</p>
                  <div class="mt-1 flex items-center gap-1.5 flex-wrap">
                    <span
                      v-if="v.isAllBooks"
                      class="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-800 border border-black font-outfit font-bold text-[10px] rounded-[2px]"
                    >
                      Semua Buku
                    </span>
                    <span
                      v-else
                      class="inline-block px-1.5 py-0.5 bg-purple-100 text-purple-800 border border-black font-outfit font-bold text-[10px] rounded-[2px]"
                    >
                      {{ v.bookIds?.length ? `${v.bookIds.length} Buku Tertentu` : 'Buku Tertentu' }}
                    </span>
                  </div>
                </td>
                <td class="p-3 whitespace-nowrap">
                  <span class="font-outfit font-black text-sm text-green-700">
                    {{ voucherValueLabel(v) }}
                  </span>
                  <span class="block text-[10px] text-muted-foreground uppercase font-bold">
                    {{ voucherTypeLabel(v.type) }}
                  </span>
                  <span
                    v-if="v.type === 'tiered' && v.tiers.length"
                    class="block text-[10px] text-muted-foreground"
                  >
                    {{ v.tiers.length }} tier
                  </span>
                </td>
                <td class="p-3 font-outfit font-bold whitespace-nowrap">
                  {{ formatRupiah(v.minSpend) }}
                </td>
                <td class="p-3 text-center font-mono text-xs whitespace-nowrap">
                  <strong>{{ v.used }}</strong> / {{ v.quota }}
                </td>
                <td class="p-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                  {{ v.validUntil }}
                </td>
                <td class="p-3 text-center whitespace-nowrap">
                  <button
                    :disabled="isBusy(`voucher-toggle-${v.id}`)"
                    class="border-2 border-black px-2.5 py-0.5 rounded-[2px] font-outfit font-black text-[10px] uppercase shadow-neo-sm cursor-pointer disabled:opacity-50"
                    :class="
                      v.active
                        ? 'bg-neo-lime text-black hover:bg-red-100'
                        : 'bg-gray-200 text-gray-600 hover:bg-neo-lime'
                    "
                    @click="toggleVoucher(v)"
                  >
                    {{
                      isBusy(`voucher-toggle-${v.id}`) ? '...' : v.active ? 'Aktif' : 'Nonaktif'
                    }}
                  </button>
                </td>
                <td class="p-3 text-right whitespace-nowrap shrink-0">
                  <div class="flex items-center justify-end gap-1.5 whitespace-nowrap">
                    <button
                      class="neubrutal-btn bg-white border border-black px-2.5 py-1 font-outfit font-black text-xs shadow-neo-sm hover:bg-neo-yellow cursor-pointer"
                      @click="openEditVoucher(v)"
                    >
                      Edit
                    </button>
                    <button
                      class="neubrutal-btn bg-red-100 text-red-700 border border-black px-2.5 py-1 font-outfit font-black text-xs shadow-neo-sm hover:bg-red-200 cursor-pointer"
                      @click="confirmDeleteVoucher(v)"
                    >
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

            <div
        v-if="adminVouchers.length > 0"
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 border-t-2 border-black bg-neutral-50"
      >
        <div class="text-xs font-sans text-neutral-600">
          Menampilkan
          <strong class="font-outfit text-black">
            {{ (vouchersPage - 1) * vouchersPerPage + 1 }}
          </strong>
          -
          <strong class="font-outfit text-black">
            {{ Math.min(vouchersPage * vouchersPerPage, adminVouchers.length) }}
          </strong>
          dari
          <strong class="font-outfit text-black">{{ adminVouchers.length }}</strong>
          voucher
        </div>

        <div v-if="totalVoucherPages > 1" class="flex items-center gap-1.5 self-center sm:self-auto flex-wrap justify-center">
          <button
            type="button"
            :disabled="vouchersPage <= 1"
            class="neubrutal-btn px-2.5 sm:px-3 py-1.5 rounded-[2px] border-2 border-black font-outfit font-black text-xs transition-all flex items-center gap-1 cursor-pointer"
            :class="[
              vouchersPage <= 1
                ? 'bg-neutral-100 text-neutral-400 border-neutral-300 cursor-not-allowed shadow-none'
                : 'bg-white text-black hover:bg-neo-yellow shadow-neo-xs hover:shadow-neo-sm',
            ]"
            @click="changeVoucherPage(vouchersPage - 1)"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            <span>Prev</span>
          </button>

          <button
            v-for="p in visibleVoucherPages"
            :key="`voucher-page-${p}`"
            type="button"
            :disabled="p === '...'"
            class="w-8 h-8 rounded-[2px] border-2 border-black font-outfit font-black text-xs transition-all flex items-center justify-center cursor-pointer"
            :class="[
              p === vouchersPage
                ? 'bg-black text-white shadow-neo-xs'
                : p === '...'
                  ? 'border-transparent text-neutral-400 cursor-default shadow-none'
                  : 'bg-white text-black hover:bg-neutral-100 shadow-neo-xs hover:shadow-neo-sm',
            ]"
            @click="p !== '...' && changeVoucherPage(p)"
          >
            {{ p }}
          </button>

          <button
            type="button"
            :disabled="vouchersPage >= totalVoucherPages"
            class="neubrutal-btn px-2.5 sm:px-3 py-1.5 rounded-[2px] border-2 border-black font-outfit font-black text-xs transition-all flex items-center gap-1 cursor-pointer"
            :class="[
              vouchersPage >= totalVoucherPages
                ? 'bg-neutral-100 text-neutral-400 border-neutral-300 cursor-not-allowed shadow-none'
                : 'bg-white text-black hover:bg-neo-yellow shadow-neo-xs hover:shadow-neo-sm',
            ]"
            @click="changeVoucherPage(vouchersPage + 1)"
          >
            <span>Next</span>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>

        <div
      v-if="showVoucherModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs"
      @click.self="showVoucherModal = false"
    >
      <div
        class="bg-white border-2 sm:border-3 border-black max-w-2xl w-full rounded-[2px] shadow-neo-sm overflow-hidden animate-hero-entrance flex flex-col max-h-[90vh]"
      >
        <div class="bg-neo-yellow border-b-2 sm:border-b-3 border-black p-3.5 sm:p-4 flex items-center justify-between gap-3 shrink-0">
          <div class="min-w-0 flex-1">
            <h3 class="font-outfit font-black text-sm sm:text-base text-black uppercase tracking-wide">
              {{ isEditVoucher ? 'EDIT VOUCHER DISKON' : 'TAMBAH VOUCHER BARU' }}
            </h3>
            <p class="font-sans text-[11px] text-black/70">
              Konfigurasi kupon promo, potongan harga, kuota, dan masa berlaku voucher.
            </p>
          </div>
          <button
            type="button"
            class="w-8 h-8 shrink-0 aspect-square rounded-[2px] bg-white border-2 border-black flex items-center justify-center font-outfit font-black text-sm hover:bg-black hover:text-white transition-colors cursor-pointer"
            aria-label="Tutup modal voucher"
            @click="showVoucherModal = false"
          >
            ✕
          </button>
        </div>

        <form
          class="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto"
          @submit.prevent="handleSaveVoucher"
        >
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">
                Kode Voucher *
              </label>
              <input
                v-model="voucherForm.code"
                type="text"
                required
                placeholder="Contoh: HEMAT10"
                class="w-full bg-background border-2 border-black p-2.5 font-mono font-bold text-xs uppercase outline-none focus:border-black shadow-neo-sm rounded-[2px]"
              />
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">
                Nama Voucher
              </label>
              <input
                v-model="voucherForm.name"
                type="text"
                placeholder="Contoh: Promo Tanggal Kembar"
                class="w-full bg-background border-2 border-black p-2.5 font-outfit font-bold text-xs outline-none focus:border-black shadow-neo-sm rounded-[2px]"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Tipe Diskon</label>
              <div class="relative">
                <select
                  v-model="voucherForm.type"
                  class="w-full appearance-none bg-white border-2 border-black rounded-[2px] p-2.5 pr-9 font-outfit font-bold text-xs outline-none focus:border-black shadow-neo-sm cursor-pointer transition-all"
                >
                  <option value="fixed">Nominal Tetap (Rp)</option>
                  <option value="percentage">Persentase (%)</option>
                  <option value="tiered">Bertingkat (Multi-tier)</option>
                </select>
                <div class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </div>
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">
                {{
                  voucherForm.type === 'tiered'
                    ? 'Maksimal Diskon Tier (%) *'
                    : voucherForm.type === 'percentage'
                      ? 'Nilai Diskon (%) *'
                      : 'Nilai Diskon (Rp) *'
                }}
              </label>
              <input
                v-model.number="voucherForm.value"
                type="number"
                min="0"
                :max="voucherForm.type === 'fixed' ? undefined : 100"
                required
                @wheel.prevent
                class="w-full bg-background border-2 border-black p-2.5 font-mono font-bold text-xs outline-none focus:border-black shadow-neo-sm rounded-[2px]"
              />
            </div>
          </div>

          <div
            v-if="voucherForm.type === 'tiered'"
            class="space-y-3 border-2 border-black p-3.5 bg-neutral-50 rounded-[2px]"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="font-outfit font-black text-xs uppercase text-black">Tier Diskon Bertingkat</p>
                <p class="font-sans text-[11px] text-muted-foreground">
                  Beri reward lebih tinggi ketika nominal belanja pembeli bertambah.
                </p>
              </div>
              <button
                type="button"
                class="neubrutal-btn bg-white border border-black px-2.5 py-1 font-outfit font-black text-[11px] shadow-neo-xs hover:bg-neo-yellow cursor-pointer"
                @click="addVoucherTier"
              >
                + Tambah Tier
              </button>
            </div>

            <div
              v-for="(tier, tIndex) in voucherForm.tiers"
              :key="`tier-${tIndex}`"
              class="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-white border border-black p-2.5 rounded-[2px] items-end"
            >
              <div class="sm:col-span-4">
                <label class="block font-outfit font-black text-[10px] uppercase mb-1">Min. Belanja</label>
                <input
                  v-model.number="tier.minPurchase"
                  type="number"
                  min="0"
                  @wheel.prevent
                  class="w-full bg-background border border-black p-1.5 font-mono text-xs rounded-[2px]"
                />
              </div>
              <div class="sm:col-span-3">
                <label class="block font-outfit font-black text-[10px] uppercase mb-1">Reward</label>
                <select
                  v-model="tier.rewardType"
                  class="w-full bg-background border border-black p-1.5 font-outfit text-xs rounded-[2px]"
                >
                  <option value="percentage">Persen (%)</option>
                  <option value="fixed">Nominal (Rp)</option>
                </select>
              </div>
              <div class="sm:col-span-2">
                <label class="block font-outfit font-black text-[10px] uppercase mb-1">Nilai</label>
                <input
                  v-model.number="tier.rewardValue"
                  type="number"
                  min="0"
                  @wheel.prevent
                  class="w-full bg-background border border-black p-1.5 font-mono text-xs rounded-[2px]"
                />
              </div>
              <div class="sm:col-span-2">
                <label class="block font-outfit font-black text-[10px] uppercase mb-1">Maks (Opsional)</label>
                <input
                  v-model.number="tier.maxDiscount"
                  type="number"
                  min="0"
                  :disabled="tier.rewardType !== 'percentage'"
                  @wheel.prevent
                  class="w-full bg-background border border-black p-1.5 font-mono text-xs rounded-[2px] disabled:bg-neutral-100"
                />
              </div>
              <div class="sm:col-span-1 flex justify-end">
                <button
                  type="button"
                  class="w-7 h-7 border border-black bg-red-100 text-red-700 hover:bg-red-200 rounded-[2px] font-outfit font-black text-xs flex items-center justify-center cursor-pointer"
                  @click="removeVoucherTier(tIndex)"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">
                Minimal Belanja (Rp)
              </label>
              <input
                v-model.number="voucherForm.minSpend"
                type="number"
                min="0"
                @wheel.prevent
                class="w-full bg-background border-2 border-black p-2.5 font-mono font-bold text-xs outline-none focus:border-black shadow-neo-sm rounded-[2px]"
              />
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">
                Maksimal Potongan (Rp)
              </label>
              <input
                v-model.number="voucherForm.maxDiscount"
                type="number"
                min="0"
                :disabled="voucherForm.type === 'fixed'"
                placeholder="Kosongkan jika tidak dibatasi"
                @wheel.prevent
                class="w-full bg-background border-2 border-black p-2.5 font-mono font-bold text-xs outline-none focus:border-black shadow-neo-sm rounded-[2px] disabled:bg-neutral-100 disabled:text-neutral-400"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Kuota Pemakaian</label>
              <input
                v-model.number="voucherForm.quota"
                type="number"
                min="1"
                required
                @wheel.prevent
                class="w-full bg-background border-2 border-black p-2.5 font-mono font-bold text-xs outline-none focus:border-black shadow-neo-sm rounded-[2px]"
              />
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Mulai Berlaku</label>
              <input
                v-model="voucherForm.startDate"
                type="date"
                class="w-full bg-background border-2 border-black p-2.5 font-mono text-xs outline-none focus:border-black shadow-neo-sm rounded-[2px]"
              />
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Berlaku Sampai *</label>
              <input
                v-model="voucherForm.validUntil"
                type="date"
                required
                class="w-full bg-background border-2 border-black p-2.5 font-mono text-xs outline-none focus:border-black shadow-neo-sm rounded-[2px]"
              />
            </div>
          </div>

          <div>
            <label class="block font-outfit font-black text-xs uppercase mb-1">Deskripsi Voucher</label>
            <textarea
              v-model="voucherForm.desc"
              rows="2"
              placeholder="Catatan ketentuan pemakaian untuk pembeli..."
              class="w-full bg-background border-2 border-black p-2.5 font-sans text-xs outline-none focus:border-black shadow-neo-sm resize-none rounded-[2px]"
            ></textarea>
          </div>

          <!-- Cakupan Buku (Semua Buku vs Buku Tertentu) -->
          <div class="space-y-3 border-2 border-black p-3.5 bg-neutral-50 rounded-[2px]">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <input
                  id="voucherAllBooks"
                  v-model="voucherForm.isAllBooks"
                  type="checkbox"
                  class="w-4 h-4 rounded-[2px] border-2 border-black text-black focus:ring-0 cursor-pointer accent-black"
                />
                <label for="voucherAllBooks" class="font-outfit font-black text-xs uppercase cursor-pointer text-black">
                  Berlaku untuk semua buku di katalog
                </label>
              </div>
              <span
                v-if="!voucherForm.isAllBooks"
                class="text-[11px] font-outfit font-black px-2 py-0.5 rounded-[2px] border border-black shadow-neo-xs"
                :class="voucherForm.bookIds.length ? 'bg-neo-lime text-black' : 'bg-red-100 text-red-700'"
              >
                {{ voucherForm.bookIds.length ? `${voucherForm.bookIds.length} buku dipilih` : 'Belum ada buku dipilih' }}
              </span>
            </div>

            <!-- Jika Hanya Berlaku untuk Buku Tertentu: Tampilkan Book Picker -->
            <div v-if="!voucherForm.isAllBooks" class="space-y-3 pt-2.5 border-t-2 border-black/10">
              <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5">
                <p class="font-sans text-[11px] text-neutral-600">
                  Pilih buku tertentu yang memenuhi syarat voucher ini:
                </p>
                <div class="flex items-center gap-2 text-[11px]">
                  <button
                    v-if="filteredBookList.length"
                    type="button"
                    class="font-outfit font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                    @click="selectAllFilteredBooks"
                  >
                    Pilih Semua Hasil ({{ filteredBookList.length }})
                  </button>
                  <span v-if="filteredBookList.length && voucherForm.bookIds.length">·</span>
                  <button
                    v-if="voucherForm.bookIds.length"
                    type="button"
                    class="font-outfit font-bold text-red-600 hover:text-red-800 underline cursor-pointer"
                    @click="voucherForm.bookIds = []"
                  >
                    Hapus Pilihan ({{ voucherForm.bookIds.length }})
                  </button>
                </div>
              </div>

              <!-- Input Pencarian Buku -->
              <div class="relative">
                <input
                  v-model="bookSearchQuery"
                  type="text"
                  placeholder="Cari buku berdasarkan judul, penulis, atau ISBN..."
                  class="w-full bg-white border-2 border-black p-2 pl-8 font-sans text-xs outline-none focus:border-black shadow-neo-xs rounded-[2px]"
                />
                <svg
                  class="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <button
                  v-if="bookSearchQuery"
                  type="button"
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black text-xs font-bold p-1 cursor-pointer"
                  @click="bookSearchQuery = ''"
                >
                  ✕
                </button>
              </div>

              <!-- Selected Books Chips -->
              <div
                v-if="voucherForm.bookIds.length"
                class="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 border border-black rounded-[2px] bg-white shadow-neo-xs"
              >
                <span
                  v-for="bId in voucherForm.bookIds"
                  :key="`selected-chip-${bId}`"
                  class="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-black border border-black rounded-[2px] font-sans text-[11px] font-medium"
                >
                  <span class="max-w-[160px] truncate">{{ getBookTitle(bId) }}</span>
                  <button
                    type="button"
                    class="hover:text-red-700 font-black ml-0.5 cursor-pointer text-xs leading-none"
                    title="Hapus buku ini"
                    @click="toggleBookSelection(bId)"
                  >
                    ✕
                  </button>
                </span>
              </div>

              <!-- Daftar Buku Scrollable dengan Thumbnail & Info -->
              <div class="border-2 border-black rounded-[2px] max-h-60 overflow-y-auto divide-y divide-black/10 bg-white">
                <div v-if="booksLoading" class="p-4 text-center font-outfit text-xs text-neutral-500">
                  <span class="inline-block w-3.5 h-3.5 border-2 border-black border-t-transparent animate-spin mr-1.5 align-middle"></span>
                  Memuat daftar buku...
                </div>
                <div v-else-if="!filteredBookList.length" class="p-4 text-center font-sans text-xs text-neutral-500">
                  Tidak ada buku yang sesuai dengan pencarian.
                </div>
                <div
                  v-for="book in filteredBookList"
                  :key="`book-item-${book.id}`"
                  class="flex items-center gap-3 p-2 hover:bg-neutral-50 cursor-pointer transition-colors"
                  :class="{ 'bg-neo-yellow/20': voucherForm.bookIds.includes(book.id) }"
                  @click="toggleBookSelection(book.id)"
                >
                  <input
                    type="checkbox"
                    :checked="voucherForm.bookIds.includes(book.id)"
                    class="w-4 h-4 rounded-[2px] border-2 border-black text-black focus:ring-0 cursor-pointer accent-black shrink-0"
                    @click.stop="toggleBookSelection(book.id)"
                  />
                  <img
                    v-if="book.coverImage || book.cover"
                    :src="assetUrl(book.coverImage || book.cover)"
                    :alt="book.title"
                    class="w-8 h-11 object-cover border border-black rounded-[1px] shrink-0 bg-neutral-200"
                    @error="(e) => (e.target.style.display = 'none')"
                  />
                  <div
                    v-else
                    class="w-8 h-11 bg-neutral-200 border border-black rounded-[1px] shrink-0 flex items-center justify-center text-[9px] font-bold text-neutral-400"
                  >
                    N/A
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-outfit font-black text-xs text-black truncate leading-tight">
                      {{ book.title }}
                    </p>
                    <p class="font-sans text-[11px] text-neutral-500 truncate mt-0.5">
                      {{ book.author || 'Tanpa Penulis' }} · {{ book.category || 'Umum' }}
                    </p>
                  </div>
                  <div class="text-right shrink-0">
                    <p class="font-mono font-bold text-xs text-black">
                      {{ formatRupiah(book.price) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <input
              id="voucherActive"
              v-model="voucherForm.active"
              type="checkbox"
              class="w-4 h-4 rounded-[2px] border-2 border-black text-black focus:ring-0 cursor-pointer accent-black"
            />
            <label for="voucherActive" class="font-outfit font-bold text-xs cursor-pointer">
              Aktifkan voucher ini segera setelah disimpan
            </label>
          </div>

          <div class="border-t-2 border-black pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
            <button
              type="button"
              class="neubrutal-btn bg-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100 cursor-pointer text-center"
              @click="showVoucherModal = false"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="isBusy('voucher-save')"
              class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-5 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-yellow-300 disabled:opacity-60 cursor-pointer text-center"
            >
              {{
                isBusy('voucher-save')
                  ? 'Menyimpan...'
                  : isEditVoucher
                    ? 'Simpan Perubahan'
                    : 'Tambah Voucher'
              }}
            </button>
          </div>
        </form>
      </div>
    </div>

        <div
      v-if="showDeleteVoucherConfirm && voucherToDelete"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="showDeleteVoucherConfirm = false"
    >
      <div
        class="bg-white border-2 sm:border-3 border-black max-w-sm w-full rounded-[2px] shadow-neo-sm overflow-hidden animate-hero-entrance p-5 space-y-4 text-center"
      >
        <h3 class="font-outfit font-black text-base text-black">Hapus Voucher?</h3>
        <p class="font-sans text-xs text-muted-foreground">
          Voucher promo "<strong>{{ voucherToDelete.code }}</strong>" akan dihapus permanen.
        </p>

        <div class="flex items-center justify-center gap-2 pt-2">
          <button
            class="neubrutal-btn bg-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100"
            @click="showDeleteVoucherConfirm = false"
          >
            Batal
          </button>
          <button
            :disabled="isBusy('voucher-delete')"
            class="neubrutal-btn bg-red-500 text-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-red-600 disabled:opacity-60"
            @click="executeDeleteVoucher"
          >
            {{ isBusy('voucher-delete') ? 'Menghapus...' : 'Ya, Hapus Voucher' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
