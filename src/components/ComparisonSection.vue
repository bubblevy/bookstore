<script setup>
import { comparisonData } from '@/data/catalog'
</script>

<template>
  <section id="perbandingan" class="max-w-7xl mx-auto px-4 py-12 md:py-16 scroll-mt-24 select-none">
    <!-- Header matching layout.jpeg ("FOAM VS SNEAKERS.") -->
    <div class="text-center space-y-2 mb-10 md:mb-12">
      <span class="font-outfit font-black text-xs md:text-sm text-neo-orange tracking-widest uppercase">
        ✦ REAL TALK ✦
      </span>
      <h2 class="font-outfit font-black text-4xl sm:text-5xl md:text-6xl tracking-tight leading-none">
        BUKU ASLI VS BACAAN ASAL.
      </h2>
      <p class="font-sans text-sm md:text-base font-bold text-muted-foreground max-w-xl mx-auto">
        Bukan sekadar belanja buku biasa. Kami memastikan setiap rupiah yang kamu keluarkan memberi kepuasan literasi seumur hidup.
      </p>
    </div>

    <!-- Comparison 2-Column Cards -->
    <div class="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
      <!-- Boring Store Card (Left) -->
      <div class="bg-white border-4 border-black rounded-2xl p-6 md:p-8 shadow-neo flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between pb-4 border-b-2 border-black mb-6">
            <span class="font-outfit font-black text-lg md:text-xl text-muted-foreground">
              {{ comparisonData.boring.title }}
            </span>
            <span class="w-8 h-8 rounded-full bg-gray-200 border-2 border-black flex items-center justify-center font-black text-sm">
              ✕
            </span>
          </div>

          <ul class="space-y-4 font-sans text-xs sm:text-sm font-bold text-muted-foreground">
            <li v-for="(item, i) in comparisonData.boring.items" :key="i" class="flex items-start gap-2.5">
              <span>{{ item }}</span>
            </li>
          </ul>
        </div>

        <div class="mt-8 pt-4 border-t-2 border-black/10 text-center">
          <span class="font-outfit font-black text-xs text-muted-foreground uppercase">
            Bikin kecewa & malas baca lagi
          </span>
        </div>
      </div>

      <!-- Bookstore Neubrutal Card (Right - Highlighted in Wisdom Violet / Luminous Yellow) -->
      <div
        class="bg-neo-violet text-white border-4 border-black rounded-2xl p-6 md:p-8 shadow-neo-lg flex flex-col justify-between relative overflow-hidden"
      >
        <!-- Floating badge -->
        <div class="absolute -top-1 -right-1 bg-neo-yellow text-black border-2 border-black px-3 py-1 font-outfit font-black text-[10px] uppercase shadow-neo-sm rotate-6">
          PILIHAN CERDAS ✨
        </div>

        <div>
          <div class="flex items-center justify-between pb-4 border-b-2 border-white/30 mb-6">
            <span class="font-outfit font-black text-lg md:text-xl text-neo-yellow">
              {{ comparisonData.neubrutal.title }}
            </span>
            <span class="w-8 h-8 rounded-full bg-neo-yellow text-black border-2 border-black flex items-center justify-center font-black text-sm shadow-neo-sm">
              ✓
            </span>
          </div>

          <ul class="space-y-4 font-sans text-xs sm:text-sm font-bold text-white">
            <li v-for="(item, i) in comparisonData.neubrutal.items" :key="i" class="flex items-start gap-2.5">
              <span>{{ item }}</span>
            </li>
          </ul>
        </div>

        <div class="mt-8 pt-4 border-t-2 border-white/20 text-center">
          <a
            href="#katalog"
            class="neubrutal-btn inline-block w-full bg-neo-yellow text-black border-3 border-black py-3 rounded-xl font-outfit font-black text-sm shadow-neo hover:bg-yellow-300"
          >
            MULAI BELANJA SEKARANG →
          </a>
        </div>
      </div>
    </div>
  </section>
</template>
