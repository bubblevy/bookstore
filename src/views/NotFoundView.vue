<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="min-h-[70vh] flex items-center justify-center px-4 py-16">
    <div
      class="w-full max-w-lg bg-white border-4 border-black shadow-neo-lg p-6 sm:p-8 text-center"
    >
      <span
        class="inline-block bg-neo-yellow border-2 border-black px-3 py-1 font-outfit font-black text-xs uppercase tracking-widest shadow-neo-sm"
      >
        Error 404
      </span>
      <h1 class="font-outfit font-black text-4xl sm:text-5xl tracking-tight mt-4 leading-none">
        Halaman Tidak Ditemukan
      </h1>
      <p class="font-sans text-sm font-semibold text-muted-foreground mt-3 leading-relaxed">
        Alamat yang kamu buka tidak tersedia atau sudah dipindahkan. Kembali ke beranda untuk
        melanjutkan belanja.
      </p>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
        <RouterLink
          to="/"
          class="w-full sm:w-auto neubrutal-btn bg-neo-yellow text-black border-3 border-black px-6 py-3 font-outfit font-black text-sm shadow-neo"
        >
          Kembali ke Beranda
        </RouterLink>
        <RouterLink
          to="/catalog"
          class="w-full sm:w-auto neubrutal-btn bg-white text-black border-3 border-black px-6 py-3 font-outfit font-black text-sm shadow-neo"
        >
          Lihat Katalog
        </RouterLink>
      </div>
    </div>
  </div>
</template>
