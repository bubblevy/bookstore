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

const copied = ref(false)
const showGuide = ref(false)
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
  return source
    .map((section) => ({
      title: String(section?.title || '').trim(),
      steps: instructionSteps(section?.content),
    }))
    .filter((section) => section.steps.length)
})

watch(isExpired, (value) => {
  if (value) emit('expired')
})

async function copyValue(value) {
  if (!value) return
  try {
    await navigator.clipboard.writeText(value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 1800)
  } catch {
    copied.value = false
  }
}
</script>

<template>
  <div class="bg-white border-3 border-black shadow-neo-sm overflow-hidden">
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

    <div v-else-if="deadlineAt" class="bg-neo-yellow border-b-3 border-black p-4 sm:p-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="font-sans text-[10px] font-extrabold uppercase tracking-[0.18em] text-black/70">
            {{ isExpired ? 'Waktu pembayaran habis' : 'Selesaikan pembayaran dalam' }}
          </p>
          <p
            v-if="isExpired"
            class="font-outfit font-black text-3xl sm:text-4xl text-red-700 leading-none mt-1"
          >
            WAKTU HABIS
          </p>
          <p
            v-else
            class="font-outfit font-black text-4xl sm:text-5xl leading-none mt-1 tabular-nums"
          >
            {{ countdownLabel }}
          </p>
          <p v-if="deadline" class="font-sans text-[11px] font-bold text-black/70 mt-2">
            Bayar sebelum {{ deadline }}
          </p>
        </div>
        <span
          class="border-2 border-black px-2.5 py-1 font-outfit font-black text-[10px] uppercase"
          :class="isExpired ? 'bg-red-600 text-white' : 'bg-black text-white'"
        >
          {{ isExpired ? 'Kedaluwarsa' : 'Segera bayar' }}
        </span>
      </div>

      <div class="mt-4 flex items-center gap-2.5">
        <span
          class="relative flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-black bg-black"
        >
          <span
            v-if="!isExpired"
            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60"
          ></span>
          <span
            class="relative inline-flex h-2.5 w-2.5 rounded-full border border-white bg-red-500"
          ></span>
        </span>
        <div class="h-2.5 flex-1 overflow-hidden border-2 border-black bg-white">
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

    <div v-else class="bg-neo-yellow border-b-3 border-black p-4">
      <p class="font-outfit font-black text-sm uppercase">Selesaikan Pembayaran</p>
    </div>

    <div v-if="!isPaid" class="p-4 space-y-3">
      <div
        v-if="formattedAmount"
        class="flex items-end justify-between gap-3 border-b-2 border-black/15 pb-3"
      >
        <div>
          <p class="font-sans text-[10px] font-extrabold uppercase text-muted-foreground">
            Total pembayaran
          </p>
          <p class="font-outfit font-black text-2xl sm:text-3xl leading-none">
            {{ formattedAmount }}
          </p>
        </div>
        <span
          class="border-2 border-black bg-black px-2.5 py-1 font-outfit font-black text-[10px] uppercase text-white"
        >
          {{ methodLabel }}
        </span>
      </div>

      <template v-if="!isExpired">
        <div v-if="qrUrl" class="space-y-3">
          <div class="bg-white border-2 border-black p-3 w-full max-w-[260px] mx-auto">
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
          <p class="font-sans text-xs font-semibold text-center">
            Scan QR ini dengan aplikasi e-wallet atau mobile banking yang mendukung QRIS.
          </p>
        </div>

        <div v-else-if="vaNumber" class="space-y-2">
          <p class="font-sans text-[10px] font-extrabold uppercase text-muted-foreground">
            Nomor Virtual Account
          </p>
          <p class="font-mono font-black text-lg sm:text-xl break-all">{{ vaNumber }}</p>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="neubrutal-btn bg-black text-white border-2 border-black px-3.5 py-2 font-outfit font-black text-xs shadow-neo-sm"
              @click="copyValue(vaNumber)"
            >
              {{ copied ? 'Nomor Tersalin' : 'Salin Nomor VA' }}
            </button>
          </div>
        </div>

        <div v-else-if="billKey" class="space-y-2">
          <p class="font-sans text-[10px] font-extrabold uppercase text-muted-foreground">
            Mandiri Bill Payment
          </p>
          <p class="font-sans text-xs font-bold">
            Kode Perusahaan: <span class="font-mono">{{ billerCode || '—' }}</span>
          </p>
          <p class="font-sans text-xs font-bold">
            Kode Bayar: <span class="font-mono">{{ billKey }}</span>
          </p>
          <button
            type="button"
            class="neubrutal-btn bg-black text-white border-2 border-black px-3.5 py-2 font-outfit font-black text-xs shadow-neo-sm"
            @click="copyValue(billKey)"
          >
            {{ copied ? 'Kode Tersalin' : 'Salin Kode Bayar' }}
          </button>
        </div>

        <div v-else-if="paymentCode" class="space-y-2">
          <p class="font-sans text-[10px] font-extrabold uppercase text-muted-foreground">
            Kode Pembayaran {{ methodLabel }}
          </p>
          <p class="font-mono font-black text-lg sm:text-xl break-all">{{ paymentCode }}</p>
          <p class="font-sans text-xs font-semibold">
            Tunjukkan kode ini di kasir {{ methodLabel }} sebelum batas waktu.
          </p>
          <button
            type="button"
            class="neubrutal-btn bg-black text-white border-2 border-black px-3.5 py-2 font-outfit font-black text-xs shadow-neo-sm"
            @click="copyValue(paymentCode)"
          >
            {{ copied ? 'Kode Tersalin' : 'Salin Kode Pembayaran' }}
          </button>
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
            Buka Aplikasi Pembayaran
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

        <div v-if="guideSections.length" class="pt-1">
          <button
            type="button"
            class="neubrutal-btn bg-white text-black border-2 border-black px-3.5 py-2 font-outfit font-black text-xs shadow-neo-sm"
            @click="showGuide = !showGuide"
          >
            {{ showGuide ? 'Tutup Panduan' : 'Panduan Pembayaran' }}
          </button>
          <div v-if="showGuide" class="mt-2 bg-white/60 border-2 border-black p-3 space-y-3">
            <div v-for="section in guideSections" :key="section.title">
              <p
                v-if="section.title"
                class="font-outfit font-black text-[11px] uppercase text-black mb-1"
              >
                {{ section.title }}
              </p>
              <ol class="space-y-1.5 font-sans text-xs font-semibold list-decimal list-inside">
                <li v-for="(step, index) in section.steps" :key="index">{{ step }}</li>
              </ol>
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
