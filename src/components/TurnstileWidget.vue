<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  siteKey: {
    type: String,
    default: () => import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAAFwrjgBojiX18Gm0',
  },
  theme: {
    type: String,
    default: 'light',
  },
  size: {
    type: String,
    default: 'normal',
  },
})

const emit = defineEmits(['update:modelValue', 'token', 'error', 'expired', 'ready'])

const containerRef = ref(null)
const widgetId = ref(null)
const isLoaded = ref(false)
const hasError = ref(false)

let scriptPromise = null

function loadTurnstileScript() {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.turnstile) return Promise.resolve(window.turnstile)

  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')
    if (existing) {
      if (window.turnstile) {
        resolve(window.turnstile)
        return
      }
      existing.addEventListener('load', () => resolve(window.turnstile))
      existing.addEventListener('error', reject)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.onload = () => resolve(window.turnstile)
    script.onerror = (err) => {
      hasError.value = true
      reject(err)
    }
    document.head.appendChild(script)
  })

  return scriptPromise
}

function renderWidget() {
  if (!containerRef.value || !window.turnstile) return

  // Remove previous instance if any
  if (widgetId.value !== null) {
    try {
      window.turnstile.remove(widgetId.value)
    } catch {}
    widgetId.value = null
  }

  try {
    widgetId.value = window.turnstile.render(containerRef.value, {
      sitekey: props.siteKey,
      theme: props.theme,
      size: props.size,
      callback: (token) => {
        emit('update:modelValue', token)
        emit('token', token)
      },
      'error-callback': (err) => {
        hasError.value = true
        emit('update:modelValue', '')
        emit('error', err)
      },
      'expired-callback': () => {
        emit('update:modelValue', '')
        emit('expired')
      },
    })
    isLoaded.value = true
    emit('ready')
  } catch {
    hasError.value = true
  }
}

function reset() {
  emit('update:modelValue', '')
  if (widgetId.value !== null && window.turnstile) {
    try {
      window.turnstile.reset(widgetId.value)
    } catch {
      renderWidget()
    }
  }
}

watch(
  () => props.siteKey,
  () => {
    reset()
    renderWidget()
  },
)

onMounted(async () => {
  try {
    await loadTurnstileScript()
    renderWidget()
  } catch {
    hasError.value = true
  }
})

onBeforeUnmount(() => {
  if (widgetId.value !== null && window.turnstile) {
    try {
      window.turnstile.remove(widgetId.value)
    } catch {}
    widgetId.value = null
  }
})

defineExpose({
  reset,
  widgetId,
})
</script>

<template>
  <div class="turnstile-container my-3 flex flex-col items-center sm:items-start justify-center">
    <div ref="containerRef" class="min-h-[65px] flex items-center justify-center"></div>
    <p v-if="hasError" class="font-sans text-[11px] text-red-600 font-bold mt-1">
      Gagal memuat proteksi bot Turnstile. Periksa koneksi internet atau refresh halaman.
    </p>
  </div>
</template>
