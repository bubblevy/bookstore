<script setup>
import { ref } from 'vue'
import { useStore } from '@/composables/useStore'

const { state, closeModal, login } = useStore()
const name = ref('')
const email = ref('')

function handleLogin() {
  if (!name.value.trim()) return
  login(name.value.trim())
  closeModal()
  name.value = ''
  email.value = ''
}
</script>

<template>
  <transition name="modal-fade">
    <div
      v-if="state.activeModal === 'login'"
      class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs select-none"
      @click.self="closeModal"
    >
      <transition name="modal-pop" appear>
        <div class="w-full max-w-[420px] bg-background border-4 border-black rounded-[2px] p-6 md:p-8 shadow-[8px_8px_0px_0px_#000]">
          <!-- Header -->
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <span class="w-8 h-8 rounded-[2px] bg-neo-yellow border-2 border-black flex items-center justify-center font-outfit font-black text-sm shadow-neo-sm">
                📚
              </span>
              <h3 class="font-outfit font-black text-2xl">Masuk Akun</h3>
            </div>
            <button
              class="neubrutal-btn border-2 border-black p-1.5 rounded-[2px] bg-white shadow-neo-sm hover:bg-gray-100"
              aria-label="Tutup"
              @click="closeModal"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p class="font-sans text-xs font-bold text-muted-foreground mb-6">
            Akses rak buku impianmu, kelola pesanan, dan dapatkan penawaran literasi eksklusif setiap checkout!
          </p>

          <form class="space-y-4 mb-5" @submit.prevent="handleLogin">
            <label class="block space-y-1.5">
              <span class="font-outfit font-black text-xs uppercase tracking-wide">Nama Lengkap</span>
              <input
                v-model="name"
                type="text"
                required
                placeholder="Contoh: Raden Saleh"
                class="w-full bg-white border-3 border-black rounded-[2px] px-4 py-3 font-outfit font-bold text-sm outline-none shadow-neo-sm focus:shadow-neo transition-shadow placeholder:text-gray-400"
              />
            </label>
            <label class="block space-y-1.5">
              <span class="font-outfit font-black text-xs uppercase tracking-wide">Email</span>
              <input
                v-model="email"
                type="email"
                placeholder="kamu@email.com"
                class="w-full bg-white border-3 border-black rounded-[2px] px-4 py-3 font-outfit font-bold text-sm outline-none shadow-neo-sm focus:shadow-neo transition-shadow placeholder:text-gray-400"
              />
            </label>

            <button
              type="submit"
              class="w-full neubrutal-btn bg-neo-yellow text-black border-3 border-black py-3 rounded-[2px] font-outfit font-black text-base shadow-neo hover:bg-yellow-300 active:translate-x-1 active:translate-y-1"
            >
              Masuk Sekarang →
            </button>
          </form>

          <div class="text-center pt-2 border-t-2 border-black/10">
            <p class="font-sans text-xs font-bold text-muted-foreground">
              Belum punya akun?
              <button
                type="button"
                class="font-outfit font-black text-neo-violet underline hover:text-black ml-1"
                @click="name = 'Pembaca Baru'; handleLogin()"
              >
                Masuk Cepat sebagai Tamu
              </button>
            </p>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>
