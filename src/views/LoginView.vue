<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useStore } from '@/composables/useStore'
import { api, session } from '@/lib/api'
import AuthLayout from './AuthLayout.vue'
import TurnstileWidget from '@/components/TurnstileWidget.vue'

const router = useRouter()
const route = useRoute()
const { login, showToast } = useStore()

const email = ref('')
const password = ref('')
const rememberMe = ref(true)
const showPassword = ref(false)
const turnstileToken = ref('')
const turnstileRef = ref(null)
const forgotTurnstileToken = ref('')
const forgotTurnstileRef = ref(null)
const resendTurnstileToken = ref('')
const resendTurnstileRef = ref(null)
const errorMessage = ref('')
const isLoading = ref(false)
const showForgotModal = ref(false)
const forgotEmail = ref('')
const forgotLoading = ref(false)
const forgotError = ref('')
const showResendModal = ref(false)
const resendEmail = ref('')
const resendLoading = ref(false)
const resendError = ref('')
const showResendActivation = ref(false)
const resendFromQuery = computed(() => {
  return (
    String(route.query.activation || '').toLowerCase() === 'resend' ||
    String(route.query.resend || '') === '1'
  )
})

async function redirectAfterAuth() {
  const redirect = String(route.query.redirect || '')
  if (redirect.startsWith('/') && !redirect.startsWith('//')) {
    if (session.role === 'admin' && (redirect === '/dashboard' || redirect === '/user/dashboard')) {
      await router.push('/admin')
      return
    }
    if (session.role !== 'admin' && (redirect === '/admin' || redirect === '/admin/dashboard')) {
      await router.push('/dashboard')
      return
    }
    await router.push(redirect)
    return
  }
  await router.push(session.role === 'admin' ? '/admin' : '/dashboard')
}

async function handleLogin() {
  errorMessage.value = ''

  if (!email.value.trim() || !password.value) {
    errorMessage.value = 'Silakan isi email dan password Anda'
    return
  }

  if (!email.value.includes('@') || !email.value.includes('.')) {
    errorMessage.value = 'Format email tidak valid'
    return
  }

  if (password.value.length < 6) {
    errorMessage.value = 'Password minimal 6 karakter'
    return
  }

  isLoading.value = true
  showResendActivation.value = resendFromQuery.value
  const result = await login(email.value.trim(), password.value, {
    remember: rememberMe.value,
    turnstileToken: turnstileToken.value,
  })

  if (result !== true) {
    isLoading.value = false
    turnstileRef.value?.reset()
    turnstileToken.value = ''
    if (result === 'inactive') {
      errorMessage.value = 'Akun belum aktif. Cek email aktivasi Anda.'
      showResendActivation.value = true
    } else if (result === 'credentials') {
      errorMessage.value = 'Email atau password salah.'
    } else if (typeof result === 'string' && /turnstile/i.test(result)) {
      errorMessage.value = 'Verifikasi Cloudflare Turnstile gagal atau kedaluwarsa. Silakan centang kembali.'
    } else {
      errorMessage.value = 'Gagal masuk. Periksa email, password, atau koneksi Anda.'
    }
    return
  }

  await redirectAfterAuth()
  isLoading.value = false
}

function handleGoogleLogin() {
  try {
    sessionStorage.setItem('bookstore.google_oauth_pending', '1')
  } catch {}
  window.location.assign(api.googleLoginUrl())
}

function openForgotModal() {
  forgotEmail.value = email.value.trim()
  forgotError.value = ''
  showForgotModal.value = true
}

async function submitForgot() {
  const target = forgotEmail.value.trim()
  if (!target.includes('@') || !target.includes('.')) {
    forgotError.value = 'Format email tidak valid.'
    return
  }

  forgotLoading.value = true
  forgotError.value = ''
  try {
    await api.forgotPassword(target, forgotTurnstileToken.value)
    showForgotModal.value = false
    forgotTurnstileToken.value = ''
    showToast('Jika email terdaftar, link reset password telah dikirim.', { type: 'success' })
  } catch (error) {
    forgotTurnstileRef.value?.reset()
    forgotTurnstileToken.value = ''
    forgotError.value = error?.message || 'Gagal mengirim link reset password.'
  } finally {
    forgotLoading.value = false
  }
}

function openResendModal() {
  resendEmail.value = email.value.trim()
  resendError.value = ''
  resendTurnstileToken.value = ''
  showResendModal.value = true
}

async function submitResend() {
  const target = resendEmail.value.trim()
  if (!target.includes('@') || !target.includes('.')) {
    resendError.value = 'Format email tidak valid.'
    return
  }

  resendLoading.value = true
  resendError.value = ''
  try {
    await api.resendActivation(target, resendTurnstileToken.value)
    showResendModal.value = false
    resendTurnstileToken.value = ''
    showToast('Jika email terdaftar dan belum aktif, link aktivasi telah dikirim.', {
      type: 'success',
    })
  } catch (error) {
    resendTurnstileRef.value?.reset()
    resendTurnstileToken.value = ''
    resendError.value = error?.message || 'Gagal mengirim ulang email aktivasi.'
  } finally {
    resendLoading.value = false
  }
}

let activationInFlight = false

async function activateFromLink(token) {
  if (activationInFlight) return
  activationInFlight = true

  try {
    const response = await api.activateAccount(token)
    const alreadyActive = /already active/i.test(response?.message || '')
    showToast(
      alreadyActive
        ? 'Akun sudah aktif. Silakan masuk.'
        : 'Email berhasil diverifikasi. Silakan masuk.',
      { type: alreadyActive ? 'info' : 'success' },
    )
    router.replace({ name: 'login' })
  } catch (error) {
    const message = String(error?.message || '')

    if (error?.status === 429) {
      showToast('Terlalu banyak percobaan. Coba lagi sebentar.', { type: 'error' })
      return
    }

    if (/expired/i.test(message)) {
      showToast('Link verifikasi sudah kedaluwarsa. Minta link baru.', { type: 'error' })
      router.replace({ name: 'login' })
      return
    }

    if (/invalid|required/i.test(message)) {
      showToast('Link verifikasi tidak valid.', { type: 'error' })
      router.replace({ name: 'login' })
      return
    }

    showToast(message || 'Gagal memverifikasi email. Silakan coba lagi.', { type: 'error' })
  } finally {
    activationInFlight = false
  }
}

watch(
  () => route.query.token,
  (token) => {
    if (token) activateFromLink(String(token))
  },
  { immediate: true },
)

onMounted(() => {
  showResendActivation.value = resendFromQuery.value

  if (route.query.error !== 'oauth_failed') return
  setTimeout(() => {
    showToast('Gagal masuk dengan Google. Silakan coba lagi.', { type: 'error' })
  }, 0)
  router.replace({ name: 'login' })
})
</script>

<template>
  <AuthLayout mode="login">
    <div class="flex flex-col justify-between h-full">
      <div>
        <div class="mb-5">
          <h1
            class="font-outfit font-black text-2xl sm:text-3xl tracking-tight leading-tight text-black"
          >
            Masuk ke Akun
          </h1>
          <p class="font-sans text-xs sm:text-sm font-semibold text-muted-foreground mt-1">
            Akses rak buku impian dan nikmati kemudahan bertransaksi.
          </p>
        </div>

        <button
          type="button"
          :disabled="isLoading"
          class="w-full neubrutal-btn bg-white hover:bg-gray-100 text-black border-3 border-black py-3 px-4 rounded-[2px] font-outfit font-black text-sm shadow-neo-sm flex items-center justify-center gap-3 transition-all active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-60"
          @click="handleGoogleLogin"
        >
          <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
              fill="var(--color-google-blue)"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
            />
            <path
              fill="var(--color-google-green)"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
            />
            <path
              fill="var(--color-google-yellow)"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.97 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
            />
            <path
              fill="var(--color-google-red)"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
            />
          </svg>
          <span>Lanjutkan dengan Google</span>
        </button>

        <div class="relative my-5 flex items-center">
          <div class="flex-1 border-t-2 border-black/15"></div>
          <span
            class="px-3 font-outfit font-black text-[11px] text-muted-foreground uppercase tracking-widest bg-white"
          >
            Atau Masuk dengan Email
          </span>
          <div class="flex-1 border-t-2 border-black/15"></div>
        </div>

        <div
          v-if="errorMessage"
          class="mb-4 bg-red-500 text-white border-3 border-black p-3 rounded-[2px] shadow-neo-sm flex items-center gap-2.5"
        >
          <div
            class="w-6 h-6 rounded-[2px] bg-black text-white border border-black flex items-center justify-center shrink-0"
          >
            <svg
              class="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <span class="font-outfit font-black text-xs">{{ errorMessage }}</span>
        </div>

        <form class="space-y-4" @submit.prevent="handleLogin">
          <label class="block space-y-1.5">
            <span
              class="font-outfit font-black text-xs uppercase tracking-wide flex items-center justify-between"
            >
              <span>Alamat Email</span>
            </span>
            <div class="relative">
              <input
                v-model="email"
                type="email"
                required
                autocomplete="email"
                placeholder="nama@email.com"
                class="w-full bg-white border-3 border-black rounded-[2px] px-3.5 py-2.5 sm:py-3 font-outfit font-bold text-sm outline-none shadow-neo-sm transition-all placeholder:text-gray-400 placeholder:font-medium"
              />
            </div>
          </label>

          <label class="block space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="font-outfit font-black text-xs uppercase tracking-wide">Password</span>
              <a
                href="#"
                class="font-sans text-[11px] font-bold text-neo-violet hover:underline"
                @click.prevent="openForgotModal"
              >
                Lupa password?
              </a>
            </div>
            <div class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="current-password"
                placeholder="Masukkan password Anda"
                class="w-full bg-white border-3 border-black rounded-[2px] px-3.5 py-2.5 sm:py-3 pr-11 font-outfit font-bold text-sm outline-none shadow-neo-sm transition-all placeholder:text-gray-400 placeholder:font-medium"
              />
              <button
                type="button"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-black rounded-[2px]"
                :aria-label="showPassword ? 'Sembunyikan password' : 'Lihat password'"
                @click="showPassword = !showPassword"
              >
                <svg
                  v-if="showPassword"
                  class="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                  />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
                <svg
                  v-else
                  class="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </label>

          <div class="flex items-center justify-between pt-1">
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input
                v-model="rememberMe"
                type="checkbox"
                class="w-4 h-4 rounded-[2px] border-2 border-black accent-black cursor-pointer"
              />
              <span class="font-sans text-xs font-semibold text-gray-700"
                >Ingat saya di perangkat ini</span
              >
            </label>
          </div>

          <TurnstileWidget ref="turnstileRef" v-model="turnstileToken" />

          <button
            type="submit"
            :disabled="isLoading"
            class="w-full neubrutal-btn bg-neo-yellow text-black border-3 border-black py-3 rounded-[2px] font-outfit font-black text-sm shadow-neo-sm hover:bg-yellow-300 flex items-center justify-center gap-2 transition-all active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-60 mt-2"
          >
            <span v-if="!isLoading">Masuk ke Akun</span>
            <span v-else>Memproses...</span>
          </button>

          <button
            v-if="showResendActivation"
            type="button"
            class="w-full text-center font-sans text-[11px] font-bold text-muted-foreground hover:text-black underline mt-2"
            @click="openResendModal"
          >
            Belum menerima email aktivasi? Kirim ulang
          </button>
        </form>
      </div>

      <div class="mt-6 pt-4 bg-surface border-2 border-black/10 rounded-[2px] p-3 text-center">
        <p class="font-sans text-xs font-semibold text-muted-foreground">
          Belum memiliki akun?
          <RouterLink
            to="/register"
            class="font-outfit font-black text-neo-violet hover:text-black underline ml-1"
          >
            Daftar Sekarang
          </RouterLink>
        </p>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="showForgotModal"
        class="fixed inset-0 z-[80] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
        @click.self="showForgotModal = false"
      >
        <div
          class="w-full max-w-sm bg-white border-2 sm:border-3 border-black rounded-[2px] p-5 sm:p-6 shadow-neo-sm sm:shadow-neo"
          role="dialog"
          aria-modal="true"
        >
          <h2 class="font-outfit font-black text-xl text-black">Reset Password</h2>
          <p class="font-sans text-xs font-semibold text-muted-foreground mt-1">
            Masukkan email akun. Kami akan mengirim link reset jika email terdaftar.
          </p>

          <form class="mt-4 space-y-3" @submit.prevent="submitForgot">
            <input
              v-model="forgotEmail"
              type="email"
              required
              autocomplete="email"
              placeholder="nama@email.com"
              class="w-full bg-white border-3 border-black rounded-[2px] px-3.5 py-2.5 font-outfit font-bold text-sm outline-none shadow-neo-sm"
            />
            <TurnstileWidget ref="forgotTurnstileRef" v-model="forgotTurnstileToken" />
            <p v-if="forgotError" class="font-sans text-xs font-bold text-red-600">
              {{ forgotError }}
            </p>
            <div class="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                class="neubrutal-btn bg-white text-black border-2 border-black py-2.5 font-outfit font-black text-xs shadow-neo-sm"
                @click="showForgotModal = false"
              >
                Batal
              </button>
              <button
                type="submit"
                :disabled="forgotLoading"
                class="neubrutal-btn bg-neo-yellow text-black border-2 border-black py-2.5 font-outfit font-black text-xs shadow-neo-sm disabled:opacity-60"
              >
                {{ forgotLoading ? 'Mengirim...' : 'Kirim Link' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div
        v-if="showResendModal"
        class="fixed inset-0 z-[80] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
        @click.self="showResendModal = false"
      >
        <div
          class="w-full max-w-sm bg-white border-2 sm:border-3 border-black rounded-[2px] p-5 sm:p-6 shadow-neo-sm sm:shadow-neo"
          role="dialog"
          aria-modal="true"
        >
          <h2 class="font-outfit font-black text-xl text-black">Kirim Ulang Aktivasi</h2>
          <p class="font-sans text-xs font-semibold text-muted-foreground mt-1">
            Masukkan email akun yang belum aktif. Kami akan mengirim ulang link aktivasi.
          </p>

          <form class="mt-4 space-y-3" @submit.prevent="submitResend">
            <input
              v-model="resendEmail"
              type="email"
              required
              autocomplete="email"
              placeholder="nama@email.com"
              class="w-full bg-white border-3 border-black rounded-[2px] px-3.5 py-2.5 font-outfit font-bold text-sm outline-none shadow-neo-sm"
            />
            <TurnstileWidget ref="resendTurnstileRef" v-model="resendTurnstileToken" />
            <p v-if="resendError" class="font-sans text-xs font-bold text-red-600">
              {{ resendError }}
            </p>
            <div class="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                class="neubrutal-btn bg-white text-black border-2 border-black py-2.5 font-outfit font-black text-xs shadow-neo-sm"
                @click="showResendModal = false"
              >
                Batal
              </button>
              <button
                type="submit"
                :disabled="resendLoading"
                class="neubrutal-btn bg-neo-yellow text-black border-2 border-black py-2.5 font-outfit font-black text-xs shadow-neo-sm disabled:opacity-60"
              >
                {{ resendLoading ? 'Mengirim...' : 'Kirim Ulang' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </AuthLayout>
</template>
