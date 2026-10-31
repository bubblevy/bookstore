<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  payment: { type: Object, default: () => ({}) },
  amount: { type: [Number, String], default: 0 },
  deadline: { type: String, default: '' },
  deadlineAt: { type: String, default: '' },
  startedAt: { type: [String, Number], default: '' },
  status: { type: String, default: '' },
})

const emit = defineEmits(['expired'])

const copiedKey = ref('')
const openSections = ref({})
const qrError = ref(false)
const now = ref(Date.now())
let timer = null

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const bank = computed(() => String(props.payment?.bank || '').toUpperCase())
const vaNumber = computed(() => props.payment?.vaNumber || props.payment?.va_number || '')
const qrUrl = computed(() => props.payment?.qrUrl || props.payment?.qr_url || '')
const billKey = computed(() => props.payment?.billKey || props.payment?.bill_key || '')
const billerCode = computed(() => props.payment?.billerCode || props.payment?.biller_code || '')
const paymentCode = computed(() => props.payment?.paymentCode || props.payment?.payment_code || '')
const storeName = computed(() => props.payment?.store || '')
const deeplinkUrl = computed(() => props.payment?.deeplinkUrl || props.payment?.deeplink_url || '')
const paymentType = computed(
  () =>
    props.payment?.paymentType ||
    props.payment?.payment_type ||
    (qrUrl.value ? 'qris' : vaNumber.value ? 'bank_transfer' : paymentCode.value ? 'cstore' : ''),
)
const isPaid = computed(() => {
  const paymentStatuses = [
    'settlement',
    'capture',
    'pending',
    'deny',
    'expire',
    'cancel',
    'failure',
    'paid',
    'lunas',
  ]
  const rawPaymentStatus = String(props.payment?.status || '').toLowerCase()
  const candidate =
    props.payment?.payment_status ||
    props.payment?.paymentStatus ||
    (paymentStatuses.includes(rawPaymentStatus) ? rawPaymentStatus : '') ||
    props.status ||
    ''
  const value = String(candidate).toLowerCase()
  return ['settlement', 'capture', 'paid', 'lunas', 'success', 'completed'].includes(value)
})
const remainingMs = computed(() => {
  if (!props.deadlineAt || isPaid.value) return 0
  const target = new Date(props.deadlineAt).getTime()
  return Number.isNaN(target) ? 0 : target - now.value
})
const isExpired = computed(
  () => Boolean(props.deadlineAt) && !isPaid.value && remainingMs.value <= 0,
)
const countdownLabel = computed(() => {
  if (!props.deadlineAt || isPaid.value) return ''
  if (remainingMs.value <= 0) return '00:00'
  const total = Math.floor(remainingMs.value / 1000)
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (value) => String(value).padStart(2, '0')
  if (days > 0) return `${days} hari ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  return `${pad(minutes)}:${pad(seconds)}`
})
const progressPercent = computed(() => {
  if (!props.deadlineAt || isPaid.value) return 0
  if (isExpired.value) return 100
  const deadline = new Date(props.deadlineAt).getTime()
  const started = new Date(props.startedAt).getTime()
  if (!Number.isFinite(deadline) || !Number.isFinite(started) || deadline <= started) return 0
  const windowMs = deadline - started
  const elapsed = Math.max(0, windowMs - remainingMs.value)
  return Math.max(0, Math.min(100, (elapsed / windowMs) * 100))
})
const formattedAmount = computed(() => {
  const value = Number(props.amount)
  if (!Number.isFinite(value) || value <= 0) return ''
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value)
})
const methodLabel = computed(() => {
  const label = props.payment?.methodName
  if (label) return label
  if (qrUrl.value) return 'QRIS'
  if (vaNumber.value) return bank.value || 'Virtual Account'
  if (paymentCode.value) return storeName.value ? titleCase(storeName.value) : 'Convenience Store'
  if (deeplinkUrl.value) return titleCase(paymentType.value || 'E-Wallet')
  return titleCase(paymentType.value) || 'Pembayaran'
})

function titleCase(value) {
  const text = String(value || '').replace(/[_-]+/g, ' ')
  return text.replace(/\b\w/g, (char) => char.toUpperCase())
}

function instructionSteps(html) {
  if (!html) return []
  const doc = new DOMParser().parseFromString(String(html), 'text/html')
  const items = Array.from(doc.querySelectorAll('li'))
    .map((node) => node.textContent.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  if (items.length) return items
  return Array.from(doc.querySelectorAll('p'))
    .map((node) => node.textContent.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

const guideSections = computed(() => {
  const source = Array.isArray(props.payment?.instructions) ? props.payment.instructions : []
  const parsed = source
    .map((section) => ({
      title: String(section?.title || '').trim(),
      steps: instructionSteps(section?.content),
    }))
    .filter((section) => section.steps.length)

  if (parsed.length) return parsed

  if (vaNumber.value) {
    return [
      {
        title: `ATM / Mobile Banking (${bank.value || 'Bank Transfer'})`,
        steps: [
          'Buka aplikasi Mobile Banking atau kunjungi ATM terdekat.',
          'Pilih menu Transfer atau Pembayaran > Virtual Account.',
          `Masukkan nomor Virtual Account: ${vaNumber.value}.`,
          `Pastikan nama dan nominal pembayaran ${formattedAmount.value || ''} sudah sesuai.`,
          'Konfirmasi dan masukkan PIN untuk menyelesaikan transaksi.',
        ],
      },
      {
        title: 'Internet Banking',
        steps: [
          'Login ke akun Internet Banking Anda.',
          'Pilih menu Pembayaran > Virtual Account.',
          `Masukkan nomor Virtual Account: ${vaNumber.value}.`,
          'Periksa rincian pembayaran dan selesaikan otentikasi transaksi.',
        ],
      },
    ]
  }

  if (qrUrl.value) {
    return [
      {
        title: 'Panduan QRIS (Semua E-Wallet & Mobile Banking)',
        steps: [
          'Buka aplikasi e-wallet (GoPay, OVO, DANA, LinkAja) atau Mobile Banking pilihan Anda.',
          'Pilih menu "Scan" atau "Bayar dengan QR".',
          'Arahkan kamera smartphone ke kode QR di layar.',
          `Periksa nama BookStore dan total pembayaran ${formattedAmount.value || ''}.`,
          'Masukkan PIN Anda untuk menyelesaikan pembayaran.',
        ],
      },
    ]
  }

  if (billKey.value) {
    return [
      {
        title: 'Mandiri ATM / Livin by Mandiri',
        steps: [
          'Pilih menu Bayar/Beli > Multi Payment.',
          `Masukkan Biller Code: ${billerCode.value || '—'}.`,
          `Masukkan Bill Key: ${billKey.value}.`,
          `Konfirmasi nominal ${formattedAmount.value || ''} dan selesaikan transaksi.`,
        ],
      },
    ]
  }

  if (paymentCode.value) {
    return [
      {
        title: `Gerai ${methodLabel.value || 'Convenience Store'}`,
        steps: [
          `Kunjungi kasir gerai ${methodLabel.value || 'terdekat'}.`,
          'Sampaikan kepada kasir ingin melakukan pembayaran pesanan buku.',
          `Tunjukkan kode pembayaran: ${paymentCode.value}.`,
          'Bayar sesuai nominal yang tertera dan simpan struk pembayaran sebagai bukti.',
        ],
      },
    ]
  }

  if (deeplinkUrl.value) {
    return [
      {
        title: `Panduan Pembayaran ${methodLabel.value}`,
        steps: [
          'Klik tombol "Bayar Sekarang" di atas.',
          'Aplikasi pembayaran akan otomatis terbuka di perangkat Anda.',
          'Periksa nominal transaksi dan selesaikan pembayaran.',
        ],
      },
    ]
  }

  return []
})

function toggleSection(idx) {
  openSections.value[idx] = !openSections.value[idx]
}

watch(isExpired, (value) => {
  if (value) emit('expired')
})

async function copyValue(value, key = 'default') {
  if (!value) return
  try {
    await navigator.clipboard.writeText(value)
    copiedKey.value = key
    setTimeout(() => {
      if (copiedKey.value === key) {
        copiedKey.value = ''
      }
    }, 1800)
  } catch {
    copiedKey.value = ''
  }
}
</script>

<template>
  <div class="bg-white border-2 border-black shadow-neo-sm overflow-hidden">
    <div
      v-if="isPaid"
      class="payment-pop bg-neo-lime border-b-3 border-black p-4 sm:p-5 flex items-start gap-3"
    >
      <div
        class="w-11 h-11 shrink-0 bg-white border-2 border-black flex items-center justify-center"
      >
        <svg
          class="w-6 h-6 text-black"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <p class="font-outfit font-black text-xl uppercase leading-none">Pembayaran Lunas</p>
        <p class="font-sans text-xs font-semibold text-black/70 mt-1">
          Pembayaran untuk pesanan ini sudah diterima.
        </p>
      </div>
    </div>

    <div v-else-if="deadlineAt" class="bg-neo-yellow border-b-3 border-black p-3 sm:p-4">
      <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div class="min-w-0">
          <p class="font-sans text-[10px] font-extrabold uppercase tracking-wider text-black/70">
            {{ isExpired ? 'Waktu pembayaran habis' : 'Selesaikan pembayaran dalam' }}
          </p>
          <p
            v-if="isExpired"
            class="font-outfit font-black text-lg sm:text-xl md:text-2xl text-red-700 leading-tight mt-0.5"
          >
            WAKTU HABIS
          </p>
          <p
            v-else
            class="font-outfit font-black text-lg sm:text-xl md:text-2xl leading-tight mt-0.5 tabular-nums break-words"
          >
            {{ countdownLabel }}
          </p>
          <p v-if="deadline" class="font-sans text-[10px] sm:text-[11px] font-bold text-black/70 mt-0.5">
            Bayar sebelum {{ deadline }}
          </p>
        </div>
        <span
          v-if="isExpired"
          class="border-2 border-black px-2 py-0.5 font-outfit font-black text-[10px] uppercase bg-red-600 text-white shadow-neo-sm shrink-0 self-start"
        >
          Kedaluwarsa
        </span>
      </div>

      <div class="mt-2.5 flex items-center gap-2">
        <div class="h-2 flex-1 overflow-hidden border border-black bg-white">
          <div
            class="h-full bg-red-500 transition-[width] duration-1000 ease-linear"
            :style="{ width: `${progressPercent}%` }"
          ></div>
        </div>
        <span class="font-mono font-black text-[10px]">
          {{ isExpired ? '100%' : `${Math.ceil(progressPercent)}%` }}
        </span>
      </div>
    </div>

    <div v-else class="bg-neo-yellow border-b-3 border-black p-3 sm:p-3.5">
      <p class="font-outfit font-black text-xs sm:text-sm uppercase">Selesaikan Pembayaran</p>
    </div>

    <div v-if="!isPaid" class="p-3.5 sm:p-4 space-y-3">
      <div
        v-if="formattedAmount"
        class="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-black/15 pb-2.5"
      >
        <div>
          <p class="font-sans text-[10px] font-extrabold uppercase text-muted-foreground">
            Total pembayaran
          </p>
          <p class="font-outfit font-black text-base sm:text-lg leading-tight">
            {{ formattedAmount }}
          </p>
        </div>
        <span
          class="border-2 border-black bg-black px-2 py-0.5 font-outfit font-black text-[10px] uppercase text-white shadow-neo-sm"
        >
          {{ methodLabel }}
        </span>
      </div>

      <template v-if="!isExpired">
        <div v-if="qrUrl" class="space-y-2.5">
          <div class="bg-white border-2 border-black p-2.5 w-full max-w-[220px] mx-auto shadow-neo-sm">
            <img
              v-if="!qrError"
              :src="qrUrl"
              alt="QRIS pembayaran"
              class="w-full h-auto"
              @error="qrError = true"
            />
            <p v-else class="font-sans text-xs font-bold text-red-600 text-center">
              QR tidak dapat dimuat. Hubungi admin untuk mendapatkan QR pembayaran.
            </p>
          </div>
          <p class="font-sans text-xs text-neutral-600 text-center">
            Scan QR ini dengan aplikasi e-wallet atau mobile banking yang mendukung QRIS.
          </p>
        </div>

        <div v-else-if="vaNumber" class="space-y-1">
          <p class="font-sans text-[10px] font-bold uppercase text-neutral-500 tracking-wider">
            Nomor Virtual Account
          </p>
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-mono font-bold text-xs sm:text-sm text-black select-all tracking-wider break-all">
              {{ vaNumber }}
            </span>
            <button
              type="button"
              class="p-1 hover:bg-neutral-100 active:scale-90 transition-all cursor-pointer inline-flex items-center justify-center shrink-0 rounded"
              :title="copiedKey === 'va' ? 'Nomor VA Disalin' : 'Salin Nomor VA'"
              aria-label="Salin Nomor Virtual Account"
              @click="copyValue(vaNumber, 'va')"
            >
              <svg v-if="copiedKey === 'va'" class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <svg v-else class="w-4 h-4 text-neutral-600 hover:text-black" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <rect width="13" height="13" x="9" y="9" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
          </div>
        </div>

        <div v-else-if="billKey" class="space-y-1">
          <p class="font-sans text-[10px] font-bold uppercase text-neutral-500 tracking-wider">
            Mandiri Bill Payment
          </p>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <div class="flex items-center gap-1.5">
              <span class="text-neutral-500">Biller Code:</span>
              <span class="font-mono font-bold text-xs sm:text-sm text-black break-all">{{ billerCode || '—' }}</span>
              <button
                v-if="billerCode"
                type="button"
                class="p-1 hover:bg-neutral-100 active:scale-90 transition-all cursor-pointer inline-flex items-center justify-center shrink-0 rounded"
                :title="copiedKey === 'billerCode' ? 'Biller Code Disalin' : 'Salin Biller Code'"
                aria-label="Salin Biller Code"
                @click="copyValue(billerCode, 'billerCode')"
              >
                <svg v-if="copiedKey === 'billerCode'" class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <svg v-else class="w-3.5 h-3.5 text-neutral-600 hover:text-black" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <rect width="13" height="13" x="9" y="9" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-neutral-500">Bill Key:</span>
              <span class="font-mono font-bold text-xs sm:text-sm text-black break-all">{{ billKey }}</span>
              <button
                type="button"
                class="p-1 hover:bg-neutral-100 active:scale-90 transition-all cursor-pointer inline-flex items-center justify-center shrink-0 rounded"
                :title="copiedKey === 'billKey' ? 'Bill Key Disalin' : 'Salin Bill Key'"
                aria-label="Salin Bill Key"
                @click="copyValue(billKey, 'billKey')"
              >
                <svg v-if="copiedKey === 'billKey'" class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <svg v-else class="w-3.5 h-3.5 text-neutral-600 hover:text-black" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <rect width="13" height="13" x="9" y="9" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div v-else-if="paymentCode" class="space-y-1">
          <p class="font-sans text-[10px] font-bold uppercase text-neutral-500 tracking-wider">
            Kode Pembayaran {{ methodLabel }}
          </p>
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-mono font-bold text-xs sm:text-sm text-black select-all tracking-wider break-all">{{ paymentCode }}</span>
            <button
              type="button"
              class="p-1 hover:bg-neutral-100 active:scale-90 transition-all cursor-pointer inline-flex items-center justify-center shrink-0 rounded"
              :title="copiedKey === 'paymentCode' ? 'Kode Pembayaran Disalin' : 'Salin Kode Pembayaran'"
              aria-label="Salin Kode Pembayaran"
              @click="copyValue(paymentCode, 'paymentCode')"
            >
              <svg v-if="copiedKey === 'paymentCode'" class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <svg v-else class="w-3.5 h-3.5 text-neutral-600 hover:text-black" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <rect width="13" height="13" x="9" y="9" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
          </div>
          <p class="font-sans text-xs text-neutral-600">
            Tunjukkan kode ini di kasir {{ methodLabel }} sebelum batas waktu.
          </p>
        </div>

        <div v-else-if="deeplinkUrl" class="space-y-2">
          <p class="font-sans text-[10px] font-extrabold uppercase text-muted-foreground">
            {{ methodLabel }}
          </p>
          <a
            :href="deeplinkUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-block neubrutal-btn bg-black text-white border-2 border-black px-3.5 py-2 font-outfit font-black text-xs shadow-neo-sm"
          >
            Bayar Sekarang
          </a>
        </div>

        <div v-else class="space-y-2">
          <p class="font-sans text-xs font-bold uppercase text-muted-foreground">
            {{ methodLabel }}
          </p>
          <p class="font-sans text-sm font-semibold">
            Instruksi pembayaran belum tersedia. Silakan buka dashboard pesanan atau hubungi admin.
          </p>
        </div>

        <div v-if="guideSections.length" class="pt-3 border-t-2 border-black/15 space-y-2.5">
          <p class="font-outfit font-black text-xs uppercase tracking-wider text-black">
            Panduan Pembayaran
          </p>

          <div class="space-y-2">
            <div
              v-for="(section, idx) in guideSections"
              :key="section.title || idx"
              class="border-2 border-black bg-white overflow-hidden shadow-neo-sm"
            >
              <button
                type="button"
                class="w-full flex items-center justify-between p-3 text-left bg-neutral-50 hover:bg-neutral-100 font-outfit font-black text-xs uppercase cursor-pointer select-none transition-colors"
                @click="toggleSection(idx)"
              >
                <span>{{ section.title || `Panduan ${idx + 1}` }}</span>
                <svg
                  class="w-4 h-4 shrink-0 transform transition-transform duration-200"
                  :class="{ 'rotate-180': openSections[idx] }"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div v-show="openSections[idx]" class="p-3.5 border-t-2 border-black bg-white">
                <ol class="space-y-1.5 font-sans text-xs font-semibold text-neutral-800 list-decimal list-inside leading-relaxed">
                  <li v-for="(step, stepIndex) in section.steps" :key="stepIndex">{{ step }}</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </template>

      <div v-else class="border-2 border-red-700 bg-red-50 p-3">
        <p class="font-outfit font-black text-sm uppercase text-red-700">Waktu pembayaran habis</p>
        <p class="font-sans text-xs font-semibold text-red-700 mt-1">
          Buat pesanan baru untuk mendapatkan kode pembayaran yang masih berlaku.
        </p>
      </div>
    </div>
  </div>
</template>
