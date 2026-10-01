<script setup>
import { ref } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useStore } from '@/composables/useStore'
import AuthLayout from './AuthLayout.vue'

const router = useRouter()
const route = useRoute()
const { register, loginWithGoogle } = useStore()

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const agreeTerms = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const errorMessage = ref('')
const isLoading = ref(false)

function redirectAfterAuth() {
  const redirect = route.query.redirect || '/'
  router.push(redirect)
}

function handleRegister() {
  errorMessage.value = ''

  if (!name.value.trim() || !email.value.trim() || !password.value || !confirmPassword.value) {
    errorMessage.value = 'Semua kolom wajib diisi'
    return
  }

  if (name.value.trim().length < 3) {
    errorMessage.value = 'Nama lengkap minimal 3 karakter'
    return
  }

  if (!email.value.includes('@') || !email.value.includes('.')) {
    errorMessage.value = 'Format email tidak valid'
    return
  }

  if (password.value.length < 8) {
    errorMessage.value = 'Password minimal 8 karakter'
    return
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Konfirmasi password tidak cocok'
    return
  }

  if (!agreeTerms.value) {
    errorMessage.value = 'Anda harus menyetujui Syarat & Ketentuan'
    return
  }

  isLoading.value = true
  setTimeout(() => {
    register(name.value.trim(), email.value.trim())
    isLoading.value = false
    redirectAfterAuth()
  }, 400)
}

function handleGoogleRegister() {
  isLoading.value = true
  setTimeout(() => {
    loginWithGoogle('Budi Pratama', 'budi.pratama@gmail.com')
    isLoading.value = false
    redirectAfterAuth()
  }, 400)
}
</script>

<template>
  <AuthLayout mode="register">
    <div class="flex flex-col justify-between h-full">
      <div>
        <!-- Header -->
        <div class="mb-5">
          <h1
            class="font-outfit font-black text-2xl sm:text-3xl tracking-tight leading-tight text-black"
          >
            Buat Akun Baru
          </h1>
          <p class="font-sans text-xs sm:text-sm font-semibold text-muted-foreground mt-1">
            Daftar sekarang dan nikmati penawaran eksklusif pembaca.
          </p>
        </div>

        <!-- Google Button -->
        <button
          type="button"
          :disabled="isLoading"
          class="w-full neubrutal-btn bg-white hover:bg-gray-50 text-black border-3 border-black py-3 px-4 rounded-[2px] font-outfit font-black text-sm shadow-neo-sm flex items-center justify-center gap-3 transition-all active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-60"
          @click="handleGoogleRegister"
        >
          <!-- Official Google SVG Icon -->
          <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.97 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
            />
          </svg>
          <span>Daftar dengan Google</span>
        </button>

        <!-- Clean Divider -->
        <div class="relative my-4 flex items-center">
          <div class="flex-1 border-t-2 border-black/15"></div>
          <span
            class="px-3 font-outfit font-black text-[11px] text-muted-foreground uppercase tracking-widest bg-white"
          >
            Atau Daftar dengan Form
          </span>
          <div class="flex-1 border-t-2 border-black/15"></div>
        </div>

        <!-- Error Alert -->
        <div
          v-if="errorMessage"
          class="mb-4 bg-red-50 border-2 border-red-600 p-3 rounded-[2px] flex items-center gap-2.5 text-red-700"
        >
          <svg
            class="w-4 h-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span class="font-outfit font-bold text-xs">{{ errorMessage }}</span>
        </div>

        <!-- Form -->
        <form class="space-y-3.5" @submit.prevent="handleRegister">
          <!-- Name -->
          <label class="block space-y-1">
            <span class="font-outfit font-black text-xs uppercase tracking-wide">Nama Lengkap</span>
            <input
              v-model="name"
              type="text"
              required
              autocomplete="name"
              placeholder="Contoh: Raden Saleh"
              class="w-full bg-white border-3 border-black rounded-[2px] px-3.5 py-2.5 font-outfit font-bold text-sm outline-none shadow-neo-sm focus:shadow-neo transition-all placeholder:text-gray-400 placeholder:font-medium"
            />
          </label>

          <!-- Email -->
          <label class="block space-y-1">
            <span class="font-outfit font-black text-xs uppercase tracking-wide">Alamat Email</span>
            <input
              v-model="email"
              type="email"
              required
              autocomplete="email"
              placeholder="nama@email.com"
              class="w-full bg-white border-3 border-black rounded-[2px] px-3.5 py-2.5 font-outfit font-bold text-sm outline-none shadow-neo-sm focus:shadow-neo transition-all placeholder:text-gray-400 placeholder:font-medium"
            />
          </label>

          <!-- Password -->
          <label class="block space-y-1">
            <span class="font-outfit font-black text-xs uppercase tracking-wide"
              >Password (Min. 8 Karakter)</span
            >
            <div class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="new-password"
                placeholder="Minimal 8 karakter kombinasi"
                class="w-full bg-white border-3 border-black rounded-[2px] px-3.5 py-2.5 pr-11 font-outfit font-bold text-sm outline-none shadow-neo-sm focus:shadow-neo transition-all placeholder:text-gray-400 placeholder:font-medium"
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

          <!-- Confirm Password -->
          <label class="block space-y-1">
            <span class="font-outfit font-black text-xs uppercase tracking-wide"
              >Ulangi Password</span
            >
            <div class="relative">
              <input
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                required
                autocomplete="new-password"
                placeholder="Ketik ulang password Anda"
                class="w-full bg-white border-3 border-black rounded-[2px] px-3.5 py-2.5 pr-11 font-outfit font-bold text-sm outline-none shadow-neo-sm focus:shadow-neo transition-all placeholder:text-gray-400 placeholder:font-medium"
              />
              <button
                type="button"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-black rounded-[2px]"
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
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </label>

          <!-- Agree Terms Checkbox -->
          <label class="flex items-start gap-2 cursor-pointer select-none pt-1">
            <input
              v-model="agreeTerms"
              type="checkbox"
              class="w-4 h-4 mt-0.5 rounded-[2px] border-2 border-black accent-neo-violet cursor-pointer shrink-0"
            />
            <span class="font-sans text-xs text-gray-700 leading-snug">
              Saya menyetujui
              <span class="font-bold text-black underline">Syarat & Ketentuan</span>
              serta
              <span class="font-bold text-black underline">Kebijakan Privasi</span>
              BookStore Indonesia.
            </span>
          </label>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full neubrutal-btn bg-neo-yellow text-black border-3 border-black py-3.5 rounded-[2px] font-outfit font-black text-sm sm:text-base shadow-neo hover:bg-yellow-300 flex items-center justify-center gap-2 transition-all active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-60 mt-2"
          >
            <span v-if="!isLoading">Daftar Akun Baru</span>
            <span v-else>Mendaftarkan...</span>
          </button>
        </form>
      </div>

      <!-- Footer switch to Login -->
      <div class="mt-5 pt-4 bg-[#F8F8F6] border-2 border-black/10 rounded-[2px] p-3 text-center">
        <p class="font-sans text-xs font-semibold text-muted-foreground">
          Sudah memiliki akun?
          <RouterLink
            to="/login"
            class="font-outfit font-black text-neo-violet hover:text-black underline ml-1"
          >
            Masuk di Sini
          </RouterLink>
        </p>
      </div>
    </div>
  </AuthLayout>
</template>
