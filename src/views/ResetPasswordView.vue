<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { api } from '@/lib/api'
import { useStore } from '@/composables/useStore'
import { getPasswordStrength } from '@/lib/password'
import { localizeApiError } from '@/lib/errors'
import PasswordValidation from '@/components/PasswordValidation.vue'
import AuthLayout from './AuthLayout.vue'

const route = useRoute()
const router = useRouter()
const { showToast } = useStore()

const token = String(route.query.token || '')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const errorMessage = ref('')
const isLoading = ref(false)
const isSuccess = ref(false)

const passwordStrength = computed(() => getPasswordStrength(password.value))
const isSubmitDisabled = computed(() => {
  return (
    isLoading.value ||
    passwordStrength.value.score < 4 ||
    !confirmPassword.value ||
    password.value !== confirmPassword.value
  )
})

onMounted(() => {
  if (!token) {
    showToast('Link sudah tidak valid atau kedaluwarsa.', { type: 'error' })
  }
})

async function handleSubmit() {
  errorMessage.value = ''

  if (!token) {
    showToast('Link sudah tidak valid atau kedaluwarsa.', { type: 'error' })
    return
  }
  if (isSubmitDisabled.value) {
    return
  }

  isLoading.value = true
  try {
    await api.resetPassword(token, password.value, confirmPassword.value)
    isSuccess.value = true
    showToast('Password berhasil direset. Silakan masuk.', { type: 'success' })
    setTimeout(() => router.replace({ name: 'login' }), 1200)
  } catch (error) {
    const message =
      localizeApiError(error?.message, error?.status) ||
      'Link sudah tidak valid atau kedaluwarsa.'
    if (/tidak valid|kedaluwarsa|token/i.test(message) || /token/i.test(error?.message || '')) {
      showToast(message, { type: 'error' })
    } else {
      errorMessage.value = message
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <AuthLayout mode="login">
    <div class="flex flex-col justify-between h-full">
      <div>
        <h1
          class="font-outfit font-black text-2xl sm:text-3xl tracking-tight leading-tight text-black"
        >
          Buat Password Baru
        </h1>
        <p class="font-sans text-xs sm:text-sm font-semibold text-muted-foreground mt-1">
          Link reset password hanya berlaku selama 30 menit.
        </p>

        <div
          v-if="isSuccess"
          class="mt-5 bg-neo-lime border-3 border-black p-3 rounded-[2px] shadow-neo-sm font-sans text-xs font-bold"
        >
          Password berhasil direset. Mengarahkan ke halaman login...
        </div>

        <form v-else class="mt-5 space-y-4" @submit.prevent="handleSubmit">
          <div>
            <label class="block font-outfit font-black text-xs uppercase tracking-wide mb-1.5">
              Password Baru
            </label>
            <div class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="Minimal 8 karakter"
                class="w-full bg-white border-2 border-black px-3.5 py-2.5 pr-11 rounded-[2px] font-sans font-semibold text-sm outline-none shadow-neo-sm transition-shadow"
              />
              <button
                type="button"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-black rounded-[2px] cursor-pointer"
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
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </div>

          <div>
            <label class="block font-outfit font-black text-xs uppercase tracking-wide mb-1.5">
              Konfirmasi Password Baru
            </label>
            <div class="relative">
              <input
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="Ulangi password baru"
                class="w-full bg-white border-2 border-black px-3.5 py-2.5 pr-11 rounded-[2px] font-sans font-semibold text-sm outline-none shadow-neo-sm transition-shadow"
              />
              <button
                type="button"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-black rounded-[2px] cursor-pointer"
                :aria-label="showConfirmPassword ? 'Sembunyikan password' : 'Lihat password'"
                @click="showConfirmPassword = !showConfirmPassword"
              >
                <svg
                  v-if="showConfirmPassword"
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
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </div>

          <PasswordValidation :password="password" :confirm="confirmPassword" />

          <div
            v-if="errorMessage"
            class="bg-red-500 text-white border-3 border-black p-3 rounded-[2px] shadow-neo-sm font-sans text-xs font-bold"
          >
            {{ errorMessage }}
          </div>

          <div :class="isSubmitDisabled ? 'cursor-not-allowed' : ''">
            <button
              type="submit"
              :disabled="isSubmitDisabled"
              class="w-full neubrutal-btn bg-neo-yellow text-black border-3 border-black py-3 rounded-[2px] font-outfit font-black text-sm shadow-neo-sm hover:bg-yellow-300 transition-all active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
            >
              {{ isLoading ? 'Menyimpan...' : 'Simpan Password Baru' }}
            </button>
          </div>
        </form>
      </div>

      <p class="font-sans text-xs font-semibold text-muted-foreground mt-6 text-center">
        <RouterLink to="/login" class="font-outfit font-black text-black underline">
          Kembali ke Login
        </RouterLink>
      </p>
    </div>
  </AuthLayout>
</template>
