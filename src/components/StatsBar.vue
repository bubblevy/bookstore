<script setup>
const stats = [
  { value: '10.000+', label: 'BUKU TERJUAL', sub: 'Dipercaya oleh ribuan pembaca' },
  { value: '1.500+', label: 'JUDUL BUKU', sub: 'Sastra, sains, filsafat dan banyak lagi' },
  { value: '100%', label: 'EDISI ASLI', sub: 'Penerbit resmi & bergaransi' },
  { value: '24 JAM', label: 'PROSES KILAT', sub: 'Pengiriman aman se-Indonesia' },
]
</script>

<template>
  <!-- Full-width alternating background band (Lime) with Bookstore Ornaments -->
  <section class="w-full bg-neo-lime border-b-4 border-black py-8 sm:py-10 select-none relative overflow-hidden">
    <!-- Background bookstore ornaments -->
    <div class="absolute inset-0 pointer-events-none select-none overflow-hidden">
      <!-- Subtle dot grid -->
      <div class="absolute inset-0 opacity-[0.06] bg-[radial-gradient(#000_1.5px,transparent_1.5px)] [background-size:20px_20px]"></div>

      <!-- Watermark reading glasses / book icon outline -->
      <span class="absolute top-2 left-6 text-black/15 text-3xl font-black">✦</span>
      <span class="absolute bottom-2 right-8 text-black/15 text-4xl font-black">★</span>
      <span class="absolute top-3 right-1/4 text-black/10 text-2xl font-black">✦</span>
      <span class="absolute bottom-2 left-1/3 text-black/10 text-2xl font-black">★</span>

      <!-- Subtle stamp watermark -->
      <div class="absolute top-1/2 left-2 -translate-y-1/2 -rotate-12 opacity-10 font-outfit font-black text-xs border-2 border-black p-1">
        VERIFIED INDIE BOOKSTORE
      </div>
      <div class="absolute top-1/2 right-2 -translate-y-1/2 rotate-12 opacity-10 font-outfit font-black text-xs border-2 border-black p-1">
        OFFICIAL PUBLISHER CODES
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="bg-white border-3 border-black rounded-[2px] p-4 sm:p-5 text-center shadow-neo flex flex-col items-center justify-center hover:-translate-y-0.5 transition-transform"
        >
          <span class="font-outfit font-black text-2xl sm:text-3xl md:text-4xl tracking-tight leading-none text-black">
            {{ stat.value }}
          </span>
          <h4 class="font-outfit font-black text-xs sm:text-sm uppercase tracking-wide text-black mt-2">
            {{ stat.label }}
          </h4>
          <p class="font-sans text-[11px] font-semibold text-muted-foreground mt-0.5">
            {{ stat.sub }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>