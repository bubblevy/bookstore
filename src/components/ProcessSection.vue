<script setup>
const steps = [
  {
    num: '01',
    title: 'PILIH BUKU',
    desc: 'Telusuri ribuan judul pilihan terbaik dari penulis lokal & mancanegara dengan kurasi kualitas tanpa kompromi.',
    bg: 'bg-white',
    badge: 'bg-neo-yellow',
  },
  {
    num: '02',
    title: 'KEMAS PRIMA',
    desc: 'Dibungkus rapat dengan plastik segel, pelindung siku kardus kaku, dan 3 lapis bubble wrap anti-penyok.',
    bg: 'bg-white',
    badge: 'bg-neo-violet text-white',
  },
  {
    num: '03',
    title: 'KIRIM KILAT',
    desc: 'Diproses dalam hitungan jam dengan kurir prioritas. Free ongkir & tracking paket real-time sampai tujuan.',
    bg: 'bg-white',
    badge: 'bg-neo-lime',
  },
]
</script>

<template>
  <section class="max-w-7xl mx-auto px-4 py-8 md:py-12 select-none">
    <!-- Vibrant Orange container from layout.jpeg ("HOW A CLOG IS BORN") -->
    <div
      class="bg-neo-orange border-4 border-black rounded-2xl md:rounded-3xl p-6 sm:p-10 md:p-12 shadow-[8px_8px_0px_0px_#000] md:shadow-[12px_12px_0px_0px_#000]"
    >
      <div class="text-center space-y-2 mb-8 md:mb-10 text-white">
        <span class="font-outfit font-black text-xs md:text-sm uppercase tracking-widest text-white/90">
          ✦ 3 LANGKAH MUDAH ✦
        </span>
        <h2 class="font-outfit font-black text-3xl sm:text-4xl md:text-5xl tracking-tight leading-tight">
          BAGAIMANA BUKU SAMPAI KE RAKMU.
        </h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
        <div
          v-for="step in steps"
          :key="step.num"
          class="bg-white border-4 border-black rounded-xl p-5 md:p-6 shadow-neo flex flex-col justify-between"
        >
          <div>
            <div class="flex items-center justify-between pb-3 border-b-2 border-black mb-4">
              <span class="font-outfit font-black text-2xl md:text-3xl text-black">
                {{ step.num }}
              </span>
              <span
                :class="['border-2 border-black px-2.5 py-0.5 rounded font-outfit font-black text-[10px] uppercase shadow-neo-sm', step.badge]"
              >
                STEP {{ step.num }}
              </span>
            </div>

            <h3 class="font-outfit font-black text-lg md:text-xl text-black mb-2">
              {{ step.title }}
            </h3>
            <p class="font-sans text-xs sm:text-sm font-semibold text-muted-foreground leading-relaxed">
              {{ step.desc }}
            </p>
          </div>

          <div class="mt-6 pt-3 border-t border-black/10 flex items-center justify-between text-xs font-outfit font-bold">
            <span class="text-neo-orange">✓ Terjamin Aman</span>
            <span>100% Puas</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
