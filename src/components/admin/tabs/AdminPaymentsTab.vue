<script setup>
import { ref, computed } from 'vue'
import { api } from '@/lib/api'
import { assetUrl } from '@/lib/assets'
import { localizeApiError } from '@/lib/errors'
import { useStore } from '@/composables/useStore'

const props = defineProps({
  paymentMethods: {
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

const showPaymentModal = ref(false)
const savingPayment = ref(false)
const uploadingPaymentLogo = ref(false)
const currentPaymentId = ref(null)
const currentPaymentImage = ref('')
const paymentDraftLogo = ref(null)
const paymentLogoInput = ref(null)

const paymentForm = ref({
  code: '',
  name: '',
  category: '',
  description: '',
  image: '',
  feeType: 'fixed',
  feeAmount: 0,
  feePercent: 0,
  isActive: true,
  instructions: [],
})

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function instructionTextToHtml(value) {
  const items = String(value || '')
    .split('\n')
    .map((step) => step.trim())
    .filter(Boolean)
    .map((step) => `<li><p>${escapeHtml(step.replace(/^\d+[\.\)]\s*/, ''))}</p></li>`)
    .join('')
  return items ? `<ol>${items}</ol>` : ''
}

function instructionHtmlToText(value) {
  if (!value) return ''
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === 'string'
          ? item.trim()
          : String(item?.step || item?.text || item?.content || '').trim(),
      )
      .filter(Boolean)
      .join('\n')
  }

  const str = String(value).trim()
  if (!str) return ''

  // Jika berupa teks biasa tanpa tag HTML
  if (!/<[a-z][\s\S]*>/i.test(str)) {
    return str
  }

  const doc = new DOMParser().parseFromString(str, 'text/html')
  const items = Array.from(doc.querySelectorAll('li'))
    .map((node) => node.textContent.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  if (items.length) {
    return items.join('\n')
  }

  const fallback = Array.from(doc.querySelectorAll('p'))
    .map((node) => node.textContent.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  if (fallback.length) {
    return fallback.join('\n')
  }

  return (doc.body?.textContent || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
}

function extractInstructionList(source) {
  if (!source) return []
  let guides = source
  if (typeof guides === 'string') {
    try {
      guides = JSON.parse(guides)
    } catch {
      return []
    }
  }
  if (!Array.isArray(guides) && typeof guides === 'object' && guides !== null) {
    guides = Object.values(guides)
  }
  if (!Array.isArray(guides)) return []

  return guides
    .map((g) => {
      if (!g) return null
      const title = String(g.title || g.name || '').trim()
      const rawSteps =
        g.content !== undefined
          ? g.content
          : g.steps !== undefined
            ? g.steps
            : g.instruction || g.instructions || g.body || ''
      const steps = instructionHtmlToText(rawSteps)
      return { title, steps }
    })
    .filter(Boolean)
    .filter((g) => g.title || g.steps)
}

const showInstructionPreview = ref(false)
const loadingPaymentDetail = ref(false)

const instructionTemplates = [
  {
    name: 'ATM',
    title: 'ATM Bank',
    steps: `1. Masukkan kartu ATM dan 6 digit PIN Anda.
2. Pilih menu Transaksi Lainnya > Transfer > ke Rekening Virtual Account.
3. Masukkan nomor Virtual Account pesanan Anda.
4. Periksa kesesuaian nama pelanggan dan total nominal pembayaran.
5. Pilih Ya / Benar dan simpan struk transaksi sebagai bukti sah.`,
  },
  {
    name: 'm-Banking',
    title: 'Mobile Banking (m-Banking)',
    steps: `1. Buka aplikasi Mobile Banking dan lakukan Login.
2. Pilih menu Pembayaran atau Transfer > Virtual Account.
3. Masukkan atau salin nomor Virtual Account pesanan Anda.
4. Pastikan rincian tagihan dan nominal pembayaran sudah sesuai.
5. Masukkan PIN transaksi Mobile Banking Anda untuk menyelesaikan pembayaran.`,
  },
  {
    name: 'i-Banking',
    title: 'Internet Banking (i-Banking)',
    steps: `1. Login ke akun Internet Banking resmi bank Anda.
2. Pilih menu Pembayaran Tagihan > Virtual Account.
3. Masukkan nomor Virtual Account pesanan Anda.
4. Cek rincian pembayaran pada layar dan masukkan kode otentikasi token.
5. Simpan bukti transaksi berhasil untuk arsip Anda.`,
  },
  {
    name: 'QRIS',
    title: 'Panduan QRIS (Semua E-Wallet & M-Banking)',
    steps: `1. Buka aplikasi e-wallet (GoPay, OVO, DANA, ShopeePay) atau Mobile Banking.
2. Pilih menu Bayar atau Scan QR.
3. Arahkan kamera smartphone ke kode QR di layar.
4. Periksa nama toko dan total nominal pembayaran pada aplikasi.
5. Konfirmasi dan masukkan PIN untuk menyelesaikan transaksi.`,
  },
  {
    name: 'Gerai Retail',
    title: 'Gerai Retail (Indomaret / Alfamart)',
    steps: `1. Kunjungi kasir gerai retail terdekat.
2. Informasikan ke kasir bahwa Anda ingin membayar tagihan pesanan online.
3. Tunjukkan Kode Pembayaran pesanan Anda kepada kasir.
4. Bayar tagihan sesuai nominal yang disebutkan oleh kasir.
5. Simpan struk resmi dari kasir sebagai bukti pembayaran yang sah.`,
  },
]

function applyInstructionTemplate(index, tpl) {
  if (!paymentForm.value.instructions[index]) return
  paymentForm.value.instructions[index].title = tpl.title
  paymentForm.value.instructions[index].steps = tpl.steps
}

function formatNumberList(index) {
  if (!paymentForm.value.instructions[index]) return
  const current = paymentForm.value.instructions[index].steps || ''
  const lines = current
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  paymentForm.value.instructions[index].steps = lines
    .map((line, i) => `${i + 1}. ${line.replace(/^\d+[\.\)]\s*/, '')}`)
    .join('\n')
}

function cleanEmptyLines(index) {
  if (!paymentForm.value.instructions[index]) return
  const current = paymentForm.value.instructions[index].steps || ''
  paymentForm.value.instructions[index].steps = current
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n')
}

function moveInstruction(index, direction) {
  const target = index + direction
  if (target < 0 || target >= paymentForm.value.instructions.length) return
  const item = paymentForm.value.instructions.splice(index, 1)[0]
  paymentForm.value.instructions.splice(target, 0, item)
}

function duplicateInstruction(index) {
  const source = paymentForm.value.instructions[index]
  if (!source) return
  paymentForm.value.instructions.splice(index + 1, 0, {
    title: source.title ? `${source.title} (Salinan)` : '',
    steps: source.steps,
  })
}

function countInstructionSteps(steps) {
  if (!steps) return 0
  return String(steps)
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean).length
}

const previewGuideSections = computed(() => {
  if (!paymentForm.value.instructions) return []
  return paymentForm.value.instructions
    .map((section) => ({
      title: String(section.title || '').trim(),
      steps: String(section.steps || '')
        .split('\n')
        .map((s) => s.trim().replace(/^\d+[\.\)]\s*/, ''))
        .filter(Boolean),
    }))
    .filter((section) => section.title || section.steps.length)
})

function paymentFeeText(method) {
  if (method.fee_type === 'percentage') {
    const percent = Number((Number(method.fee_percent) * 100).toFixed(2))
    return `${percent}%`
  }
  return formatRupiah(Number(method.fee_amount) || 0)
}

async function discardPaymentDraftLogo() {
  const draft = paymentDraftLogo.value
  paymentDraftLogo.value = null
  if (!draft?.key) return
  try {
    await api.deleteUpload({ file_key: draft.key })
  } catch {
      }
}

async function processPaymentLogo(file) {
  if (!file) return
  if (!file.type.startsWith('image/')) {
    showToast('Harap pilih berkas gambar yang valid (PNG, JPG, WebP).', { type: 'error' })
    return
  }
  uploadingPaymentLogo.value = true
  const previousDraft = paymentDraftLogo.value
  paymentDraftLogo.value = null
  try {
    const response = await api.uploadImage(file, 'payments')
    const data = response.data || {}
    paymentForm.value.image = data.file_url || ''
    paymentDraftLogo.value = { url: data.file_url || '', key: data.file_key || '' }
    if (previousDraft?.key && previousDraft.url !== paymentForm.value.image) {
      api.deleteUpload({ file_key: previousDraft.key }).catch(() => {})
    }
  } catch (error) {
    paymentDraftLogo.value = previousDraft
    showToast(apiErrorText(error, 'Gagal mengunggah logo pembayaran'), { type: 'error' })
  } finally {
    uploadingPaymentLogo.value = false
  }
}

function handlePaymentLogoChange(event) {
  const file = event.target.files?.[0]
  processPaymentLogo(file)
}

async function removePaymentLogo() {
  const draft = paymentDraftLogo.value
  paymentForm.value.image = ''
  paymentDraftLogo.value = null
  if (paymentLogoInput.value) paymentLogoInput.value.value = ''
  if (draft?.key) {
    try {
      await api.deleteUpload({ file_key: draft.key })
    } catch {
          }
  }
}

async function openEditPayment(method) {
  currentPaymentId.value = method.id
  currentPaymentImage.value = method.image || ''
  paymentDraftLogo.value = null

  const initialGuides = extractInstructionList(method.instructions || method.instruction)
  paymentForm.value = {
    code: method.code || '',
    name: method.name || '',
    category: method.category || '',
    description: method.description || '',
    image: method.image || '',
    feeType: method.fee_type || 'fixed',
    feeAmount: Number(method.fee_amount) || 0,
    feePercent: Number(method.fee_percent) || 0,
    isActive: method.is_active !== false,
    instructions: initialGuides,
  }
  showPaymentModal.value = true
  loadingPaymentDetail.value = true

  try {
    const response = await api.paymentMethod(method.id)
    const detail = response?.data || response || {}
    const detailGuides = extractInstructionList(
      detail.instructions !== undefined
        ? detail.instructions
        : detail.instruction !== undefined
          ? detail.instruction
          : method.instructions || method.instruction,
    )

    currentPaymentImage.value = detail.image || currentPaymentImage.value
    paymentForm.value = {
      ...paymentForm.value,
      name: detail.name || paymentForm.value.name,
      category: detail.category || paymentForm.value.category,
      description: detail.description || paymentForm.value.description,
      image: detail.image || paymentForm.value.image,
      feeType: detail.fee_type || paymentForm.value.feeType,
      feeAmount: Number(detail.fee_amount) || 0,
      feePercent: Number(detail.fee_percent) || 0,
      isActive: detail.is_active !== false,
      instructions: detailGuides.length ? detailGuides : paymentForm.value.instructions,
    }
  } catch (error) {
    console.error('Failed to load payment method detail:', error)
  } finally {
    loadingPaymentDetail.value = false
  }
}

function addInstructionSection() {
  paymentForm.value.instructions.push({ title: '', steps: '' })
}

function closePaymentModal() {
  discardPaymentDraftLogo()
  showPaymentModal.value = false
}

function removeInstructionSection(index) {
  paymentForm.value.instructions.splice(index, 1)
}

async function handleSavePayment() {
  if (!currentPaymentId.value) return
  if (!paymentForm.value.name.trim()) {
    showToast('Nama metode pembayaran wajib diisi.', { type: 'error' })
    return
  }

  try {
    savingPayment.value = true
    const instructions = paymentForm.value.instructions
      .map((item) => {
        const html = instructionTextToHtml(item.steps)
        return {
          title: item.title.trim(),
          content: html,
          steps: html,
        }
      })
      .filter((item) => item.title && (item.content || item.steps))

    const payload = {
      name: paymentForm.value.name.trim(),
      category: paymentForm.value.category,
      fee_type: paymentForm.value.feeType,
      fee_amount: Number(paymentForm.value.feeAmount) || 0,
      fee_percent: Number(paymentForm.value.feePercent) || 0,
      feePercent: Number(paymentForm.value.feePercent) || 0,
      description: paymentForm.value.description.trim(),
      instructions,
      is_active: Boolean(paymentForm.value.isActive),
    }
    if (paymentForm.value.image !== currentPaymentImage.value) {
      payload.image = paymentForm.value.image
    }

    await api.updatePaymentMethod(currentPaymentId.value, payload)
    emit('refresh')
    paymentDraftLogo.value = null
    showPaymentModal.value = false
    showToast('Metode pembayaran berhasil diperbarui.', { type: 'success' })
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal menyimpan metode pembayaran'), { type: 'error' })
  } finally {
    savingPayment.value = false
  }
}

async function togglePayment(method) {
  const key = `payment-toggle-${method.id}`
  if (isBusy(key)) return

  try {
    setBusy(key, true)
    await api.updatePaymentMethod(method.id, { is_active: method.is_active === false })
    emit('refresh')
    showToast('Status metode pembayaran diperbarui.', { type: 'success' })
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal mengubah status metode pembayaran'), { type: 'error' })
  } finally {
    setBusy(key, false)
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="bg-white border-2 sm:border-3 border-black p-4 rounded-[2px] shadow-neo-sm">
      <h2 class="font-outfit font-black text-lg text-black">Metode Pembayaran</h2>
      <p class="font-sans text-xs text-muted-foreground mt-0.5">
        Kode metode bersifat tetap dari gateway. Admin hanya dapat mengubah nama, logo, biaya,
        instruksi, dan status aktif.
      </p>
    </div>

    <div class="bg-white border-2 sm:border-3 border-black rounded-[2px] shadow-neo-sm overflow-hidden">
      <div class="overflow-x-auto table-scrollbar">
        <table class="w-full min-w-[650px] text-xs font-sans border-collapse">
          <thead>
            <tr class="bg-black text-white font-outfit font-black text-left">
              <th class="p-3 whitespace-nowrap min-w-[200px]">METODE</th>
              <th class="p-3 whitespace-nowrap min-w-[120px]">KATEGORI</th>
              <th class="p-3 whitespace-nowrap min-w-[120px]">BIAYA</th>
              <th class="p-3 text-center whitespace-nowrap min-w-[90px]">STATUS</th>
              <th class="p-3 text-right whitespace-nowrap shrink-0">AKSI</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="p-8 text-center bg-gray-50/50">
                <div class="inline-flex items-center justify-center gap-2.5">
                  <span
                    class="inline-block w-4 h-4 rounded-[2px] border-2 border-black border-t-transparent animate-spin shrink-0"
                  ></span>
                  <span class="font-outfit font-black text-sm text-black">
                    Memuat metode pembayaran...
                  </span>
                </div>
              </td>
            </tr>
            <tr v-else-if="!paymentMethods.length">
              <td colspan="5" class="p-8 text-center bg-gray-50/50">
                <p class="font-outfit font-black text-sm text-black">Belum Ada Metode Pembayaran</p>
                <p class="font-sans text-xs text-muted-foreground mt-1">
                  Tambahkan metode transfer bank, e-wallet, atau gerai ritel untuk opsi pembayaran pelanggan.
                </p>
              </td>
            </tr>
            <template v-else>
              <tr
                v-for="method in paymentMethods"
                :key="method.id"
                class="border-b border-black/10 hover:bg-gray-50"
              >
                <td class="p-3 min-w-[200px]">
                  <div class="flex items-center gap-2">
                    <div
                      class="w-10 h-10 border-2 border-black bg-white shrink-0 flex items-center justify-center overflow-hidden"
                    >
                      <img
                        v-if="method.image"
                        :src="assetUrl(method.image)"
                        :alt="method.name"
                        class="w-full h-full object-contain p-0.5"
                        loading="lazy"
                      />
                    </div>
                    <div class="min-w-0">
                      <span class="font-outfit font-black text-sm text-black block truncate">
                        {{ method.name }}
                      </span>
                      <span class="font-mono text-[10px] text-muted-foreground">
                        {{ method.code }}
                      </span>
                    </div>
                  </div>
                </td>
                <td class="p-3 font-semibold whitespace-nowrap">{{ method.categoryName }}</td>
                <td class="p-3 font-outfit font-black whitespace-nowrap">{{ paymentFeeText(method) }}</td>
                <td class="p-3 text-center whitespace-nowrap">
                  <button
                    :disabled="isBusy(`payment-toggle-${method.id}`)"
                    class="border-2 border-black px-2.5 py-0.5 rounded-[2px] font-outfit font-black text-[10px] uppercase shadow-neo-sm disabled:opacity-50 cursor-pointer"
                    :class="
                      method.is_active !== false
                        ? 'bg-neo-lime text-black hover:bg-red-100'
                        : 'bg-gray-200 text-gray-600 hover:bg-neo-lime'
                    "
                    @click="togglePayment(method)"
                  >
                    {{
                      isBusy(`payment-toggle-${method.id}`)
                        ? '...'
                        : method.is_active !== false
                          ? 'Aktif'
                          : 'Nonaktif'
                    }}
                  </button>
                </td>
                <td class="p-3 text-right whitespace-nowrap shrink-0">
                  <button
                    class="neubrutal-btn bg-white border border-black px-2.5 py-1 font-outfit font-black text-xs shadow-neo-sm hover:bg-neo-yellow cursor-pointer"
                    @click="openEditPayment(method)"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

        <div
      v-if="showPaymentModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs"
      @click.self="closePaymentModal"
    >
      <div
        class="bg-white border-2 sm:border-3 border-black max-w-3xl w-full rounded-[2px] shadow-neo-sm overflow-hidden max-h-[90vh] flex flex-col animate-hero-entrance"
      >
        <div class="bg-neo-yellow border-b-2 sm:border-b-3 border-black p-3.5 sm:p-4 flex items-center justify-between gap-3 shrink-0">
          <div class="min-w-0 flex-1">
            <h3 class="font-outfit font-black text-sm sm:text-base text-black uppercase tracking-wide">
              EDIT METODE PEMBAYARAN
            </h3>
            <p class="font-sans text-[11px] text-black/70 mt-0.5">
              Atur nama tampilan, tarif biaya transaksi, logo, dan panduan instruksi pembayaran pelanggan.
            </p>
          </div>
          <button
            type="button"
            class="w-8 h-8 shrink-0 aspect-square rounded-[2px] bg-white border-2 border-black flex items-center justify-center font-outfit font-black text-sm hover:bg-black hover:text-white transition-colors cursor-pointer"
            aria-label="Tutup modal metode pembayaran"
            @click="closePaymentModal"
          >
            ✕
          </button>
        </div>

        <form class="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5" @submit.prevent="handleSavePayment">
          <div>
            <label class="block font-outfit font-black text-xs uppercase mb-1">
              Nama Tampilan *
            </label>
            <input
              v-model="paymentForm.name"
              type="text"
              required
              maxlength="150"
              placeholder="Contoh: BCA Virtual Account"
              class="w-full bg-background border-2 border-black p-2.5 font-outfit font-bold text-sm outline-none focus:border-black shadow-neo-sm rounded-[2px]"
            />
          </div>

          <div>
            <label class="block font-outfit font-black text-xs uppercase mb-1">
              Deskripsi Singkat
            </label>
            <textarea
              v-model="paymentForm.description"
              rows="2"
              placeholder="Contoh: Bayar praktis melalui ATM, m-BCA, atau KlikBCA tanpa konfirmasi manual..."
              class="w-full bg-background border-2 border-black p-2.5 font-sans text-xs outline-none focus:border-black shadow-neo-sm resize-none rounded-[2px]"
            ></textarea>
          </div>

          <div class="border-2 border-black p-3.5 bg-surface space-y-3 rounded-[2px] shadow-neo-xs">
            <div class="flex items-center justify-between border-b border-black/15 pb-2">
              <div>
                <span class="font-outfit font-black text-xs uppercase text-black">Logo Pembayaran</span>
                <p class="font-sans text-[11px] text-muted-foreground">
                  Gunakan icon gambar format PNG, JPG, atau WebP logo bank/e-wallet.
                </p>
              </div>
              <span
                v-if="paymentForm.image"
                class="bg-neo-lime border border-black px-2 py-0.5 font-outfit font-black text-[9px] uppercase rounded-[2px]"
              >
                Terpasang
              </span>
            </div>

            <input
              ref="paymentLogoInput"
              type="file"
              accept=".png, .jpg, .jpeg, .webp, image/png, image/jpeg, image/webp"
              class="hidden"
              @change="handlePaymentLogoChange"
            />

            <div class="flex flex-col sm:flex-row items-center gap-3">
              <div
                class="w-20 h-16 border-2 border-black bg-white shrink-0 flex items-center justify-center overflow-hidden rounded-[2px] shadow-neo-xs"
              >
                <img
                  v-if="paymentForm.image"
                  :src="assetUrl(paymentForm.image)"
                  alt="Logo pembayaran"
                  class="w-full h-full object-contain p-1.5"
                />
                <span v-else class="font-outfit font-bold text-[10px] text-neutral-400">Tanpa Logo</span>
              </div>
              <div class="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  :disabled="uploadingPaymentLogo"
                  class="neubrutal-btn bg-white border-2 border-black px-3.5 py-1.5 font-outfit font-black text-xs shadow-neo-sm hover:bg-neo-yellow disabled:opacity-60 cursor-pointer"
                  @click="paymentLogoInput?.click()"
                >
                  {{ uploadingPaymentLogo ? 'Mengunggah...' : 'Unggah File Logo' }}
                </button>
                <button
                  v-if="paymentForm.image"
                  type="button"
                  class="neubrutal-btn bg-white text-red-600 border-2 border-black px-3 py-1.5 font-outfit font-black text-xs shadow-neo-sm hover:bg-red-50 cursor-pointer"
                  @click="removePaymentLogo"
                >
                  Hapus Logo
                </button>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">Tipe Biaya Transaksi</label>
              <div class="relative">
                <select
                  v-model="paymentForm.feeType"
                  class="w-full bg-background border-2 border-black p-2.5 pr-8 font-outfit font-bold text-xs outline-none focus:border-black shadow-neo-sm cursor-pointer appearance-none rounded-[2px]"
                >
                  <option value="fixed">Nominal Tetap (Rp)</option>
                  <option value="percentage">Persentase (%)</option>
                </select>
                <div
                  class="absolute inset-y-0 right-0 flex items-center px-2.5 pointer-events-none text-black"
                >
                  <svg
                    class="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </div>
            </div>
            <div v-if="paymentForm.feeType === 'fixed'">
              <label class="block font-outfit font-black text-xs uppercase mb-1">
                Nominal Biaya (Rp)
              </label>
              <input
                v-model="paymentForm.feeAmount"
                type="number"
                min="0"
                placeholder="Contoh: 2500 (0 jika gratis)"
                @wheel.prevent
                class="w-full bg-background border-2 border-black p-2.5 font-outfit font-bold text-xs outline-none focus:border-black shadow-neo-sm rounded-[2px]"
              />
            </div>
            <div v-else>
              <label class="block font-outfit font-black text-xs uppercase mb-1">
                Persentase Biaya (Desimal)
              </label>
              <input
                v-model="paymentForm.feePercent"
                type="number"
                min="0"
                step="0.0001"
                placeholder="Contoh: 0.007 untuk 0,7%"
                @wheel.prevent
                class="w-full bg-background border-2 border-black p-2.5 font-outfit font-bold text-xs outline-none focus:border-black shadow-neo-sm rounded-[2px]"
              />
              <p class="font-sans text-[10px] text-muted-foreground mt-1">
                Gunakan format desimal, contoh: 0.007 untuk 0,7% atau 0.015 untuk 1,5%.
              </p>
            </div>
          </div>

          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input
              v-model="paymentForm.isActive"
              type="checkbox"
              class="w-4 h-4 border-2 border-black accent-black rounded-[2px]"
            />
            <span class="font-sans text-xs font-bold">Aktif untuk pilihan metode saat checkout</span>
          </label>

                    <div class="border-t-2 border-black pt-4 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b-2 border-black pb-3">
              <div>
                <h4 class="font-outfit font-black text-sm uppercase text-black flex items-center gap-2">
                  <svg class="w-4 h-4 text-black" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                  Panduan & Instruksi Pembayaran
                </h4>
                <p class="font-sans text-xs text-muted-foreground mt-0.5">
                  Langkah-langkah yang akan tampil sebagai accordion interaktif bagi pembeli di halaman checkout dan rincian pesanan.
                </p>
              </div>
              <div class="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  class="neubrutal-btn border-2 border-black px-3 py-1.5 font-outfit font-black text-xs shadow-neo-sm transition-colors cursor-pointer"
                  :class="showInstructionPreview ? 'bg-neo-lime text-black hover:bg-lime-300' : 'bg-white text-black hover:bg-neutral-100'"
                  @click="showInstructionPreview = !showInstructionPreview"
                >
                  {{ showInstructionPreview ? 'Mode Edit' : 'Pratinjau Hasil' }}
                </button>
                <button
                  type="button"
                  class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-3 py-1.5 font-outfit font-black text-xs shadow-neo-sm hover:bg-yellow-300 cursor-pointer"
                  @click="addInstructionSection"
                >
                  + Tambah Bagian
                </button>
              </div>
            </div>

                        <div v-if="showInstructionPreview" class="border-2 border-black p-4 bg-surface rounded-[2px] space-y-3">
              <div class="flex items-center justify-between">
                <span class="font-outfit font-black text-xs uppercase text-neutral-700">
                  Pratinjau Tampilan Checkout (Accordion Pelanggan):
                </span>
                <span class="font-outfit font-bold text-[10px] bg-neo-lime text-black border border-black px-2 py-0.5 rounded-[2px] uppercase">
                  Live Preview
                </span>
              </div>

              <div v-if="previewGuideSections.length === 0" class="p-6 text-center bg-white border-2 border-dashed border-black">
                <p class="font-outfit font-bold text-xs text-neutral-500">
                  Belum ada instruksi pembayaran yang diisi. Klik "Mode Edit" lalu tambahkan panduan.
                </p>
              </div>

              <div v-else class="space-y-2">
                <div
                  v-for="(section, idx) in previewGuideSections"
                  :key="idx"
                  class="border-2 border-black bg-white overflow-hidden shadow-neo-sm rounded-[2px]"
                >
                  <div class="p-3 bg-neutral-50 border-b border-black flex items-center justify-between font-outfit font-black text-xs uppercase">
                    <span>{{ section.title || `Panduan ${idx + 1}` }}</span>
                    <span class="text-[10px] font-bold bg-neutral-200 border border-black/30 px-2 py-0.5 rounded-[2px]">
                      {{ section.steps.length }} Langkah
                    </span>
                  </div>
                  <div class="p-3.5 bg-white">
                    <ol class="space-y-1.5 font-sans text-xs font-semibold text-neutral-800 list-decimal list-inside leading-relaxed">
                      <li v-for="(step, sIdx) in section.steps" :key="sIdx">{{ step }}</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

                        <div v-else class="space-y-4">
              <div
                v-if="loadingPaymentDetail"
                class="p-8 text-center bg-white border-2 border-dashed border-black rounded-[2px] flex items-center justify-center gap-2"
              >
                <div class="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                <span class="font-outfit font-bold text-xs text-black">Memuat panduan instruksi...</span>
              </div>

              <div
                v-else-if="!paymentForm.instructions.length"
                class="p-6 text-center bg-surface border-2 border-dashed border-black rounded-[2px] space-y-2"
              >
                <p class="font-outfit font-bold text-sm text-black">Belum Ada Panduan Pembayaran</p>
                <p class="font-sans text-xs text-muted-foreground">
                  Tambahkan instruksi pembayaran agar pembeli mengetahui langkah-langkah transfer yang benar.
                </p>
                <button
                  type="button"
                  class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-yellow-300 mt-2 cursor-pointer"
                  @click="addInstructionSection"
                >
                  + Buat Panduan Pertama
                </button>
              </div>

              <div
                v-for="(section, index) in paymentForm.instructions"
                :key="index"
                class="border-2 border-black bg-white rounded-[2px] shadow-neo-sm overflow-hidden"
              >
                                <div class="bg-neutral-100 border-b-2 border-black p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div class="flex items-center gap-2 flex-1 min-w-0">
                    <span class="font-outfit font-black text-[11px] uppercase bg-black text-white px-2 py-1 rounded-[2px] shrink-0">
                      Bagian #{{ index + 1 }}
                    </span>
                    <input
                      v-model="section.title"
                      type="text"
                      placeholder="Judul bagian (Contoh: Melalui ATM BCA / Livin by Mandiri)"
                      class="w-full bg-white border-2 border-black px-3 py-1.5 font-outfit font-bold text-xs outline-none focus:border-black shadow-neo-xs rounded-[2px]"
                    />
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      :disabled="index === 0"
                      class="w-7 h-7 border-2 border-black bg-white text-black font-outfit font-black text-xs hover:bg-neutral-200 disabled:opacity-30 disabled:hover:bg-white flex items-center justify-center rounded-[2px] cursor-pointer"
                      title="Pindah ke Atas"
                      @click="moveInstruction(index, -1)"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      :disabled="index === paymentForm.instructions.length - 1"
                      class="w-7 h-7 border-2 border-black bg-white text-black font-outfit font-black text-xs hover:bg-neutral-200 disabled:opacity-30 disabled:hover:bg-white flex items-center justify-center rounded-[2px] cursor-pointer"
                      title="Pindah ke Bawah"
                      @click="moveInstruction(index, 1)"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      class="w-7 h-7 border-2 border-black bg-white text-black font-outfit font-bold text-xs hover:bg-neo-yellow flex items-center justify-center rounded-[2px] cursor-pointer"
                      title="Duplikasi Bagian"
                      @click="duplicateInstruction(index)"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                        <rect width="12" height="12" x="9" y="9" rx="1.5" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="w-7 h-7 border-2 border-black bg-red-100 text-red-700 font-outfit font-black text-xs hover:bg-red-200 flex items-center justify-center rounded-[2px] cursor-pointer"
                      title="Hapus Bagian"
                      @click="removeInstructionSection(index)"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                                <div class="p-2 sm:px-3 bg-yellow-50/70 border-b border-black/15 flex flex-wrap items-center gap-1.5 text-xs">
                  <span class="font-outfit font-black text-[10px] uppercase text-black/70 mr-1 flex items-center gap-1">
                    Template Cepat:
                  </span>
                  <button
                    v-for="tpl in instructionTemplates"
                    :key="tpl.name"
                    type="button"
                    class="px-2 py-0.5 border border-black bg-white font-outfit font-bold text-[10px] rounded-[2px] shadow-neo-xs hover:bg-neo-yellow transition-all cursor-pointer"
                    @click="applyInstructionTemplate(index, tpl)"
                  >
                    + {{ tpl.name }}
                  </button>
                </div>

                                <div class="px-3 pt-2.5 pb-1 flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 bg-white">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="font-outfit font-bold text-[11px] text-neutral-600">Alat Editor:</span>
                    <button
                      type="button"
                      class="px-2 py-1 border border-black bg-white font-outfit font-bold text-[10px] rounded-[2px] hover:bg-neutral-100 shadow-neo-xs cursor-pointer"
                      title="Nomori setiap baris otomatis"
                      @click="formatNumberList(index)"
                    >
                      1. 2. 3. Format Nomor
                    </button>
                    <button
                      type="button"
                      class="px-2 py-1 border border-black bg-white font-outfit font-bold text-[10px] rounded-[2px] hover:bg-neutral-100 shadow-neo-xs cursor-pointer"
                      title="Hapus baris kosong yang tidak perlu"
                      @click="cleanEmptyLines(index)"
                    >
                      Bersihkan Baris Kosong
                    </button>
                  </div>
                  <div class="text-[10px] font-mono font-bold bg-neutral-100 border border-black/20 px-2 py-0.5 rounded-[2px] text-black">
                    {{ countInstructionSteps(section.steps) }} langkah terdeteksi
                  </div>
                </div>

                                <div class="p-3 bg-white">
                  <textarea
                    v-model="section.steps"
                    rows="5"
                    placeholder="Tuliskan langkah-langkah pembayaran di sini, satu baris per langkah...&#10;Contoh:&#10;1. Buka aplikasi Mobile Banking dan lakukan Login&#10;2. Pilih menu Transfer atau Pembayaran > Virtual Account&#10;3. Masukkan nomor Virtual Account pesanan Anda&#10;4. Pastikan rincian tagihan dan nominal pembayaran sudah sesuai&#10;5. Masukkan PIN transaksi Anda untuk menyelesaikan pembayaran"
                    class="w-full bg-background border-2 border-black p-3 font-sans text-xs leading-relaxed outline-none focus:border-black shadow-neo-sm resize-y rounded-[2px]"
                  ></textarea>
                  <p class="font-sans text-[11px] text-muted-foreground mt-1.5 flex items-start gap-1">
                    <span class="font-bold text-black shrink-0">Catatan:</span>
                    <span>Setiap baris baru otomatis dijadikan satu urutan nomor pada accordion pelanggan di checkout. Awalan nomor (1., 2., dst) otomatis dirapikan sistem.</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="border-t-2 border-black pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
            <button
              type="button"
              class="neubrutal-btn bg-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100 cursor-pointer text-center"
              @click="closePaymentModal"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="savingPayment"
              class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-5 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-yellow-300 disabled:opacity-60 cursor-pointer text-center"
            >
              {{ savingPayment ? 'Menyimpan...' : 'Simpan Perubahan' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
