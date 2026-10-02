<script setup>
import { RouterLink } from 'vue-router'

defineProps({
  mode: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pe-5 lg:pe-9 py-6 md:py-10">
    <div class="mb-5">
      <RouterLink
        to="/"
        class="neubrutal-btn inline-flex items-center gap-2 bg-white border-2 border-black px-3.5 py-1.5 rounded-[2px] font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100 transition-all active:translate-x-0.5 active:translate-y-0.5"
      >
        <svg
          class="w-4 h-4 text-black shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        <span>Kembali ke Beranda</span>
      </RouterLink>
    </div>

    <div
      class="w-full bg-white border-3 md:border-4 border-black rounded-[2px] shadow-neo grid grid-cols-1 lg:grid-cols-12 overflow-hidden items-stretch"
    >
      <div class="lg:col-span-6 p-6 sm:p-8 md:p-10 flex flex-col justify-between">
        <slot />
      </div>

      <div
        class="hidden lg:flex lg:col-span-6 bg-neo-violet text-white p-6 sm:p-8 md:p-10 border-t-4 lg:border-t-0 lg:border-l-4 border-black flex-col justify-between relative overflow-hidden"
      >
        <div
          class="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(#fff_1.5px,transparent_1.5px)] [background-size:18px_18px]"
        ></div>

        <div class="relative z-10">
          <div class="mb-4">
            <span
              class="inline-flex items-center gap-1.5 bg-neo-yellow text-black border-2 border-black px-3 py-0.5 rounded-[2px] font-outfit font-black text-[11px] uppercase tracking-wider shadow-neo-sm"
            >
              <svg
                class="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polygon
                  points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                />
              </svg>
              {{ mode === 'login' ? 'PORTAL PEMBACA RESMI' : 'GABUNG KOMUNITAS KAMI' }}
            </span>
          </div>

          <h2
            class="font-outfit font-black text-2xl sm:text-3xl xl:text-4xl tracking-tight leading-tight mb-3"
          >
            {{
              mode === 'login' ? 'Koleksi Terbaik Menanti Dibaca.' : 'Mulai Petualangan Literasimu.'
            }}
          </h2>
          <p
            class="font-sans text-xs sm:text-sm md:text-base font-semibold text-white/90 leading-relaxed mb-6"
          >
            {{
              mode === 'login'
                ? 'Masuk ke akunmu untuk mengelola rak buku impian, melacak status pesanan, dan menikmati diskon eksklusif member.'
                : 'Bergabunglah dengan puluhan ribu pembaca di Indonesia. Akses kurasi buku pilihan dengan garansi 100% cetakan asli.'
            }}
          </p>

          <div class="space-y-3">
            <div class="flex items-center gap-3.5 bg-black/20 p-3 rounded-[2px] backdrop-blur-xs">
              <div
                class="w-8 h-8 rounded-[2px] bg-neo-yellow text-black border border-black flex items-center justify-center shrink-0"
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
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <div>
                <p class="font-outfit font-black text-sm text-white leading-tight">
                  100% Buku Asli Penerbit
                </p>
                <p class="font-sans text-xs text-white/75 leading-tight mt-0.5">
                  Bebas buku bajakan/repro, garansi ganti baru jika cacat.
                </p>
              </div>
            </div>

            <div class="flex items-center gap-3.5 bg-black/20 p-3 rounded-[2px] backdrop-blur-xs">
              <div
                class="w-8 h-8 rounded-[2px] bg-neo-lime text-black border border-black flex items-center justify-center shrink-0"
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
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <div>
                <p class="font-outfit font-black text-sm text-white leading-tight">
                  Pengiriman Ekstra Aman
                </p>
                <p class="font-sans text-xs text-white/75 leading-tight mt-0.5">
                  Karton tebal kaku dan bubble wrap pelindung sudut.
                </p>
              </div>
            </div>

            <div class="flex items-center gap-3.5 bg-black/20 p-3 rounded-[2px] backdrop-blur-xs">
              <div
                class="w-8 h-8 rounded-[2px] bg-neo-pink text-black border border-black flex items-center justify-center shrink-0"
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
                  <path
                    d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"
                  />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
              </div>
              <div>
                <p class="font-outfit font-black text-sm text-white leading-tight">
                  Poin & Diskon Khusus
                </p>
                <p class="font-sans text-xs text-white/75 leading-tight mt-0.5">
                  Poin reward transaksi untuk potongan belanja berikutnya.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          class="relative z-10 border-t-2 border-white/20 pt-4 mt-6 flex items-center justify-between text-xs sm:text-sm text-white/80 font-sans"
        >
          <span class="font-medium">"Kurasi dan pengemasan terbaik di Indonesia."</span>
          <span class="font-outfit font-black text-neo-yellow shrink-0 ml-2">★ 4.9/5 RATING</span>
        </div>
      </div>
    </div>
  </div>
</template>
