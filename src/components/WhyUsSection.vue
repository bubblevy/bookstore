<script setup>
import BookArt from './BookArt.vue'
import { whyUsItems } from '@/data/catalog'

const colorMap = {
  0: 'bg-accent',
  1: 'bg-blue-100',
  2: 'bg-yellow-200',
  3: 'bg-pink-200',
}
</script>

<template>
  <section id="kenapa-kami" class="max-w-7xl mx-auto px-4 py-16 scroll-mt-24">
    <div class="text-center space-y-3 mb-12">
      <span class="inline-block bg-blue-100 border-2 border-black px-3 py-1 font-outfit font-black text-xs uppercase tracking-wide shadow-[1.5px_1.5px_0px_0px_#000]">Kenapa BookStore?</span>
      <h2 class="font-outfit font-black text-3xl md:text-4xl">Pengalaman Belanja yang Berbeda</h2>
      <p class="font-sans text-sm md:text-base font-bold text-muted-foreground max-w-2xl mx-auto">
        Kami bukan sekadar toko buku online. BookStore adalah teman perjalanan literasi kamu — dari halaman pertama hingga buku terakhir di rak.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
      <div
        v-for="(item, idx) in whyUsItems"
        :key="item.title"
        class="bg-white border-2 border-black p-6 shadow-[5px_5px_0px_0px_#000] flex flex-col gap-4"
      >
        <div
          class="w-14 h-14 border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_#000] p-2"
          :class="colorMap[idx] || 'bg-accent'"
        >
          <BookArt :name="item.icon" />
        </div>
        <h3 class="font-outfit font-black text-lg md:text-xl leading-tight">{{ item.title }}</h3>
        <p class="font-sans text-xs md:text-sm font-semibold text-muted-foreground leading-relaxed">
          {{ item.description }}
        </p>
      </div>
    </div>
  </section>
</template>
