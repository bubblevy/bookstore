<script setup>
const testimonials = [
  {
    id: 1,
    name: 'Dr. Hendra Gunawan',
    role: 'Dosen & Peneliti Sastra',
    initials: 'HG',
    tag: 'PEMBACA TERVERIFIKASI',
    quote: 'KURASI BUKUNYA SANGAT BERBOBOT DAN LENGKAP.',
    text: 'Sangat jarang menemukan toko buku daring yang konsisten menyediakan edisi orisinal dengan kurasi karya sastra dan humaniora yang begitu teliti. Pengemasan sangat aman dengan kardus kaku.',
  },
  {
    id: 2,
    name: 'Siti Sarah, M.Psi',
    role: 'Psikolog & Pengajar',
    initials: 'SS',
    tag: 'PEMBACA SETIA',
    quote: 'KUALITAS BUKU TERJAGA DENGAN HARGA KOMPETITIF.',
    text: 'Sudah berulang kali memesan buku referensi untuk bahan ajar dan bacaan pribadi. Koleksi buku pengembangan diri dan psikologinya up-to-date dan 100% cetakan resmi penerbit.',
  },
  {
    id: 3,
    name: 'Farhan Pratama',
    role: 'Penulis & Desainer Grafis',
    initials: 'FP',
    tag: 'BOOK CLUB HOST',
    quote: 'PENGALAMAN BELANJA YANG MENYENANGKAN DAN ELEGAN.',
    text: 'Tampilan antarmukanya berkarakter kuat dan navigasinya sangat intuitif. Pengiriman kilat, buku selalu sampai dalam kondisi mulus tanpa ada lekukan pada sampul.',
  },
]
</script>

<template>
  <!-- Full-width alternating background band (White matching Categories Section) with Bookstore Ornaments -->
  <section id="ulasan" class="w-full bg-white text-black border-b-4 border-black py-16 md:py-20 scroll-mt-20 select-none relative overflow-hidden">
    <!-- Subtle background bookstore decorative elements -->
    <div class="absolute inset-0 pointer-events-none select-none overflow-hidden">
      <!-- Subtle dot grid -->
      <div class="absolute inset-0 opacity-[0.05] bg-[radial-gradient(#000_1.5px,transparent_1.5px)] [background-size:24px_24px]"></div>

      <span class="absolute top-8 left-[5%] text-neo-violet text-3xl font-black opacity-30">✦</span>
      <span class="absolute bottom-10 right-[6%] text-neo-orange text-3xl font-black opacity-30">★</span>
      <span class="absolute top-1/2 right-[3%] text-neo-lime text-2xl font-black opacity-40">✦</span>
      <span class="absolute bottom-12 left-[8%] text-neo-yellow text-3xl font-black opacity-40">★</span>

      <!-- Giant Quotation watermark -->
      <span class="absolute -top-12 right-20 text-black/5 font-outfit font-black text-[160px] leading-none select-none">“</span>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <!-- Section Header -->
      <div class="text-center space-y-2 mb-10 md:mb-14">
        <span class="inline-block bg-neo-orange text-white border-2 border-black px-3.5 py-1 rounded-[2px] font-outfit font-black text-xs uppercase tracking-wider shadow-neo-sm">
          TESTIMONI PEMBACA
        </span>
        <h2 class="font-outfit font-black text-3xl sm:text-4xl md:text-5xl tracking-tight leading-none text-black">
          DIPERCAYA RIBUAN PECINTA BUKU.
        </h2>
        <p class="font-sans text-sm sm:text-base font-semibold text-muted-foreground max-w-xl mx-auto">
          Kepuasan para akademisi, profesional, dan pencinta literasi dalam setiap pesanan buku.
        </p>
      </div>

      <!-- Testimonial Cards: Clean, High-Contrast Neubrutalist Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        <article
          v-for="t in testimonials"
          :key="t.id"
          class="bg-background text-black border-3 border-black rounded-[2px] p-6 shadow-neo hover:-translate-y-1 hover:shadow-neo-md transition-all flex flex-col justify-between"
        >
          <div>
            <div class="flex items-center justify-between pb-3 border-b border-black/10 mb-4">
              <div class="flex gap-1 text-neo-orange text-sm font-black">
                <span v-for="star in 5" :key="star">★</span>
              </div>
              <span class="bg-neo-yellow text-black border border-black px-2 py-0.5 rounded-[2px] font-outfit font-bold text-[9px] uppercase tracking-wider">
                {{ t.tag }}
              </span>
            </div>

            <!-- Quote Header -->
            <h3 class="font-outfit font-black text-sm sm:text-base leading-snug uppercase mb-2.5">
              "{{ t.quote }}"
            </h3>

            <!-- Text -->
            <p class="font-sans text-xs sm:text-sm font-semibold text-muted-foreground leading-relaxed">
              {{ t.text }}
            </p>
          </div>

          <!-- Author Info -->
          <div class="mt-6 pt-4 border-t-2 border-dashed border-black/15 flex items-center gap-3">
            <div class="w-9 h-9 rounded-[2px] bg-neo-violet text-white border-2 border-black flex items-center justify-center font-outfit font-black text-xs shadow-neo-sm shrink-0">
              {{ t.initials }}
            </div>
            <div>
              <h4 class="font-outfit font-black text-sm leading-tight">{{ t.name }}</h4>
              <p class="font-sans text-[11px] font-bold text-muted-foreground mt-0.5">{{ t.role }}</p>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
