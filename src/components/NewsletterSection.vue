<script setup>
import { ref } from 'vue'
import { useStore } from '@/composables/useStore'

const { showToast } = useStore()
const email = ref('')

function handleSubscribe() {
  if (!email.value || !email.value.includes('@')) {
    showToast('Mohon masukkan alamat email yang valid.', { type: 'error' })
    return
  }
  showToast(`Email ${email.value} berhasil didaftarkan! Terima kasih telah berlangganan buletin kami.`, { type: 'success' })
  email.value = ''
}
</script>

<template>
  <!-- Full-width alternating background band (White) -->
  <section class="w-full bg-white border-b-4 border-black py-16 md:py-20">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
      <span class="inline-block bg-neo-yellow border-2 border-black px-3 py-0.5 rounded font-outfit font-black text-xs uppercase tracking-wider shadow-neo-sm">
        BULETIN LITERASI
      </span>

      <h2 class="font-outfit font-black text-3xl sm:text-4xl md:text-5xl tracking-tight leading-tight text-black">
        REKOMENDASI BUKU SETIAP JUMAT.
      </h2>

      <p class="font-sans text-sm sm:text-base font-semibold text-muted-foreground leading-relaxed max-w-xl mx-auto">
        Bergabunglah dengan ribuan pembaca setia. Dapatkan ulasan mendalam, info buku terbitan baru, dan voucher diskon selamat datang 10% untuk pesanan pertama Anda.
      </p>

      <form class="pt-3 flex flex-col sm:flex-row items-stretch justify-center gap-3 max-w-md mx-auto" @submit.prevent="handleSubscribe">
        <input
          v-model="email"
          type="email"
          required
          placeholder="Masukkan alamat email Anda..."
          class="flex-1 bg-background border-3 border-black px-4 py-3 rounded-xl font-outfit font-bold text-sm outline-none shadow-neo-sm focus:shadow-neo transition-shadow placeholder:text-gray-400"
        />
        <button
          type="submit"
          class="neubrutal-btn bg-neo-violet text-white border-3 border-black py-3 px-6 rounded-xl font-outfit font-black text-sm shadow-neo hover:bg-violet-600 active:translate-x-0.5 active:translate-y-0.5 shrink-0"
        >
          Berlangganan →
        </button>
      </form>

      <p class="font-sans text-xs font-semibold text-muted-foreground pt-1">
        Bebas spam. Anda dapat berhenti berlangganan kapan saja dengan sekali klik.
      </p>
    </div>
  </section>
</template>
