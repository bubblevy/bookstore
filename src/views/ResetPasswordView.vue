<script setup>
import { ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { api } from '@/lib/api'
import { useStore } from '@/composables/useStore'
import AuthLayout from './AuthLayout.vue'

const route = useRoute()
const router = useRouter()
const { showToast } = useStore()

const token = String(route.query.token || '')
const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const isLoading = ref(false)
const isSuccess = ref(false)

async function handleSubmit() {
  errorMessage.value = ''

  if (!token) {
    errorMessage.value = 'Link reset password tidak valid.'
    return
  }
  if (password.value.length < 8) {
    errorMessage.value = 'Password baru minimal 8 karakter.'
    return
  }
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password.value)) {
    errorMessage.value = 'Password harus mengandung huruf besar, huruf kecil, angka, dan simbol.'
    return
  }
  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Konfirmasi password tidak cocok.'
    return
  }

  isLoading.value = true
  try {
    await api.resetPassword(token, password.value, confirmPassword.value)
    isSuccess.value = true
    showToast('Password berhasil direset. Silakan masuk.', { type: 'success' })
    setTimeout(() => router.replace({ name: 'login' }), 1200)
  } catch (error) {
    errorMessage.value = error?.message || 'Gagal mereset password. Link mungkin sudah kedaluwarsa.'
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
          v-if="!token"
          class="mt-5 bg-red-500 text-white border-3 border-black p-3 rounded-[2px] shadow-neo-sm font-sans text-xs font-bold"
        >
          Link reset password tidak valid. Minta link baru dari halaman login.
        </div>

        <div
          v-else-if="isSuccess"
          class="mt-5 bg-neo-lime border-3 border-black p-3 rounded-[2px] shadow-neo-sm font-sans text-xs font-bold"
        >
          Password berhasil direset. Mengarahkan ke halaman login...
        </div>

        <form v-else class="mt-5 space-y-4" @submit.prevent="handleSubmit">
          <div>
            <label class="block font-outfit font-black text-xs uppercase tracking-wide mb-1.5">
              Password Baru
            </label>
            <input
              v-model="password"
              type="password"
              autocomplete="new-password"
              placeholder="Minimal 8 karakter, huruf besar/kecil, angka, simbol"
              class="w-full bg-white border-2 border-black px-3.5 py-2.5 rounded-[2px] font-sans font-semibold text-sm outline-none shadow-neo-sm focus:shadow-neo transition-shadow"
            />
          </div>

          <div>
            <label class="block font-outfit font-black text-xs uppercase tracking-wide mb-1.5">
              Konfirmasi Password Baru
            </label>
            <input
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
              placeholder="Ulangi password baru"
              class="w-full bg-white border-2 border-black px-3.5 py-2.5 rounded-[2px] font-sans font-semibold text-sm outline-none shadow-neo-sm focus:shadow-neo transition-shadow"
            />
          </div>

          <div
            v-if="errorMessage"
            class="bg-red-500 text-white border-3 border-black p-3 rounded-[2px] shadow-neo-sm font-sans text-xs font-bold"
          >
            {{ errorMessage }}
          </div>

          <button
            type="submit"
            :disabled="isLoading"
            class="w-full neubrutal-btn bg-neo-yellow text-black border-3 border-black py-3 rounded-[2px] font-outfit font-black text-sm shadow-neo hover:bg-yellow-300 transition-all active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-60"
          >
            {{ isLoading ? 'Menyimpan...' : 'Simpan Password Baru' }}
          </button>
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
