<script setup></script>

<template>
  <!-- Full-width alternating background band (Luminous Yellow) with Bookstore Ornaments -->
  <section
    id="vibe-section"
    class="w-full bg-neo-yellow border-b-4 border-black py-16 relative overflow-hidden"
  >
    <!-- Background Bookstore Ornaments & Literary Accents -->
    <div class="absolute inset-0 pointer-events-none select-none overflow-hidden">
      <!-- Subtle dot grid -->
      <div
        class="absolute inset-0 opacity-[0.08] bg-[radial-gradient(#000_1.5px,transparent_1.5px)] [background-size:24px_24px]"
      ></div>

      <!-- Giant Literary Quotation Mark Watermark -->
      <span
        class="absolute -top-10 left-6 text-black/10 font-outfit font-black text-[180px] leading-none select-none"
        >"</span
      >
      <span
        class="absolute -bottom-24 right-10 text-black/10 font-outfit font-black text-[180px] leading-none select-none"
        >"</span
      >

      <!-- Floating literary symbols -->
      <span class="absolute top-12 left-1/3 text-neo-violet text-3xl font-black opacity-50">✦</span>
      <span class="absolute bottom-12 left-1/4 text-neo-orange text-3xl font-black opacity-50"
        >★</span
      >
      <span class="absolute top-8 right-1/4 text-black text-2xl font-black opacity-20">✦</span>

      <!-- reading Bookmark Watermark -->
      <div
        class="absolute bottom-4 right-1/3 opacity-15 border-2 border-black px-2 py-0.5 rounded-[2px] text-[10px] font-outfit font-black uppercase tracking-wider"
      >
        BOOK LOVERS' PHILOSOPHY
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <!-- Books: image first on mobile, second on desktop -->
      <div
        data-aos="zoom-in"
        class="lg:hidden flex justify-center items-center pointer-events-none select-none order-first mb-6"
      >
        <div class="relative w-full max-w-[360px] h-[280px] flex items-center justify-center">
          <!-- Book 1 (Left Behind - Wisdom Violet - Rubah/Fox Illustration) -->
          <div
            class="absolute w-[140px] aspect-[3/4.2] bg-neo-violet text-white border-4 border-black rounded-[2px] p-3 shadow-neo transform -rotate-12 -translate-x-12 translate-y-2 flex flex-col justify-between"
          >
            <div class="flex items-center justify-between border-b-2 border-white/30 pb-1.5">
              <span class="w-2 h-2 bg-neo-yellow border border-black"></span>
              <span class="w-4 h-1 bg-white"></span>
            </div>
            <div class="w-full flex-1 flex items-center justify-center p-1">
              <svg
                viewBox="0 0 100 100"
                class="w-full h-full max-h-[110px]"
                xmlns="http://www.w3.org/2000/svg"
              >
                <polygon points="20,15 35,42 12,38" fill="#FF7B29" stroke="#000" stroke-width="3" />
                <polygon points="80,15 65,42 88,38" fill="#FF7B29" stroke="#000" stroke-width="3" />
                <polygon points="23,22 32,38 18,36" fill="#FFFFFF" />
                <polygon points="77,22 68,38 82,36" fill="#FFFFFF" />
                <polygon
                  points="50,28 85,55 50,90 15,55"
                  fill="#FF7B29"
                  stroke="#000"
                  stroke-width="3.5"
                />
                <polygon points="50,60 82,55 50,88" fill="#FFFFFF" stroke="#000" stroke-width="2" />
                <polygon points="50,60 18,55 50,88" fill="#FFFFFF" stroke="#000" stroke-width="2" />
                <path
                  d="M 32 48 Q 40 45 42 50"
                  stroke="#000"
                  stroke-width="3"
                  fill="none"
                  stroke-linecap="round"
                />
                <path
                  d="M 68 48 Q 60 45 58 50"
                  stroke="#000"
                  stroke-width="3"
                  fill="none"
                  stroke-linecap="round"
                />
                <circle cx="50" cy="84" r="5" fill="#000" />
              </svg>
            </div>
            <div class="border-t-2 border-white/30 pt-1.5 flex justify-between">
              <span class="w-2 h-2 rounded-full bg-neo-yellow"></span>
              <span class="w-2 h-2 rounded-full bg-neo-yellow"></span>
            </div>
          </div>

          <!-- Book 3 (Right Behind - Vibrant Orange - Burung Merpati / Bird in Flight) -->
          <div
            class="absolute w-[140px] aspect-[3/4.2] bg-neo-orange text-white border-4 border-black rounded-[2px] p-3 shadow-neo transform rotate-12 translate-x-12 translate-y-1 flex flex-col justify-between"
          >
            <div class="flex items-center justify-between border-b-2 border-white/30 pb-1.5">
              <span class="w-2 h-2 bg-neo-lime border border-black"></span>
              <span class="w-4 h-1 bg-white"></span>
            </div>
            <div class="w-full flex-1 flex items-center justify-center p-1">
              <svg
                viewBox="0 0 100 100"
                class="w-full h-full max-h-[110px]"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M 22 55 Q 35 48 50 48 Q 45 22 25 20 Q 38 32 60 42 Q 80 38 88 52 Q 78 58 68 56 Q 72 70 82 80 Q 62 70 52 60 Q 32 68 22 55 Z"
                  fill="#FFFFFF"
                  stroke="#000"
                  stroke-width="3.5"
                  stroke-linejoin="round"
                />
                <path d="M 38 30 Q 48 38 58 44" stroke="#000" stroke-width="2.5" fill="none" />
                <path d="M 44 26 Q 52 34 62 42" stroke="#000" stroke-width="2.5" fill="none" />
                <circle cx="80" cy="49" r="2.5" fill="#000" />
                <path d="M 88 52 Q 94 50 96 46" stroke="#000" stroke-width="2" fill="none" />
                <ellipse
                  cx="96"
                  cy="45"
                  rx="3"
                  ry="2"
                  fill="#D8FA00"
                  stroke="#000"
                  stroke-width="1.5"
                />
              </svg>
            </div>
            <div class="border-t-2 border-white/30 pt-1.5 flex justify-between">
              <span class="w-2 h-2 rounded-full bg-neo-lime"></span>
              <span class="w-2 h-2 rounded-full bg-neo-lime"></span>
            </div>
          </div>

          <!-- Book 2 (Center Front - Clean White - Tanaman Daun Monstera / Botanical Leaf) -->
          <div
            class="relative w-[155px] aspect-[3/4.2] bg-white text-black border-4 border-black rounded-[2px] p-4 shadow-neo-lg z-20 flex flex-col justify-between"
          >
            <div class="flex items-center justify-between border-b-3 border-black pb-2">
              <span class="w-3 h-3 bg-neo-yellow border-2 border-black"></span>
              <span class="w-8 h-1.5 bg-black"></span>
              <span class="w-3 h-3 bg-neo-violet border-2 border-black"></span>
            </div>
            <div class="w-full flex-1 flex items-center justify-center p-1">
              <svg
                viewBox="0 0 100 100"
                class="w-full h-full max-h-[120px]"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M 50 92 C 50 75 48 30 50 14"
                  stroke="#000"
                  stroke-width="4"
                  fill="none"
                  stroke-linecap="round"
                />
                <path
                  d="M 50 14 C 75 20 85 45 80 75 C 75 88 60 90 50 90 C 40 90 25 88 20 75 C 15 45 25 20 50 14 Z"
                  fill="#CBFF00"
                  stroke="#000"
                  stroke-width="3.5"
                />
                <ellipse
                  cx="36"
                  cy="40"
                  rx="8"
                  ry="3.5"
                  transform="rotate(-25 36 40)"
                  fill="#FFFFFF"
                  stroke="#000"
                  stroke-width="2.5"
                />
                <ellipse
                  cx="33"
                  cy="54"
                  rx="9"
                  ry="4"
                  transform="rotate(-15 33 54)"
                  fill="#FFFFFF"
                  stroke="#000"
                  stroke-width="2.5"
                />
                <ellipse
                  cx="36"
                  cy="68"
                  rx="8"
                  ry="3.5"
                  transform="rotate(-5 36 68)"
                  fill="#FFFFFF"
                  stroke="#000"
                  stroke-width="2.5"
                />
                <ellipse
                  cx="64"
                  cy="40"
                  rx="8"
                  ry="3.5"
                  transform="rotate(25 64 40)"
                  fill="#FFFFFF"
                  stroke="#000"
                  stroke-width="2.5"
                />
                <ellipse
                  cx="67"
                  cy="54"
                  rx="9"
                  ry="4"
                  transform="rotate(15 67 54)"
                  fill="#FFFFFF"
                  stroke="#000"
                  stroke-width="2.5"
                />
                <ellipse
                  cx="64"
                  cy="68"
                  rx="8"
                  ry="3.5"
                  transform="rotate(5 64 68)"
                  fill="#FFFFFF"
                  stroke="#000"
                  stroke-width="2.5"
                />
                <line x1="50" y1="18" x2="50" y2="88" stroke="#000" stroke-width="2.5" />
              </svg>
            </div>
            <div class="border-t-3 border-black pt-1.5 flex items-center justify-between">
              <div class="flex gap-1">
                <span class="w-2.5 h-1.5 bg-neo-yellow border border-black"></span>
                <span class="w-2.5 h-1.5 bg-neo-violet border border-black"></span>
                <span class="w-2.5 h-1.5 bg-neo-orange border border-black"></span>
              </div>
              <span class="w-2.5 h-2.5 bg-black"></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Desktop layout: text left, books right -->
      <div class="hidden lg:grid grid-cols-12 gap-10 lg:gap-14 items-center">
        <!-- Left: Bookstore Curatorial Philosophy -->
        <div data-aos="fade-right" class="col-span-6 space-y-5">
          <h2
            class="font-outfit font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight leading-[0.98] text-black"
          >
            PENGALAMAN MEMBACA<br />
            <span class="inline-block mt-2">
              <span
                class="bg-neo-violet text-white border-3 md:border-4 border-black px-4 py-1 inline-block -rotate-1 rounded-[2px] shadow-[5px_5px_0px_0px_#000]"
              >
                YANG OTENTIK.
              </span>
            </span>
          </h2>

          <p
            class="font-sans text-sm sm:text-base md:text-lg font-semibold text-black/85 leading-relaxed max-w-xl"
          >
            Di tengah distraksi digital yang serba cepat, buku fisik memberi ruang hening untuk
            merenung dan menyelami ide secara utuh. Dari tekstur lembaran hingga wangi cetakan
            orisinal, kami menjaga martabat setiap buku yang Anda baca.
          </p>

          <div class="pt-2 flex flex-wrap items-center gap-4">
            <a
              href="#katalog"
              class="neubrutal-btn bg-black text-white border-3 border-black py-3.5 px-7 rounded-[2px] font-outfit font-black text-sm shadow-neo hover:bg-neutral-900 active:translate-x-0.5 active:translate-y-0.5"
            >
              Lihat Koleksi Rekomendasi
            </a>
            <span class="font-outfit font-bold text-xs uppercase tracking-wider text-black">
              ✓ Garansi Edisi Asli 100%
            </span>
          </div>
        </div>

        <!-- Right: 3 Large Modern Illustrated Books -->
        <div
          data-aos="fade-left"
          data-aos-delay="150"
          class="col-span-6 flex justify-center items-center py-6 pointer-events-none select-none"
        >
          <div
            class="relative w-full max-w-[520px] lg:max-w-[600px] h-[420px] lg:h-[480px] flex items-center justify-center"
          >
            <!-- Book 1 (Left Behind - Wisdom Violet - Rubah/Fox Illustration) -->
            <div
              class="absolute w-[230px] lg:w-[280px] aspect-[3/4.2] bg-neo-violet text-white border-4 border-black rounded-[2px] p-4 shadow-neo transform -rotate-12 -translate-x-28 translate-y-4 flex flex-col justify-between"
            >
              <div class="flex items-center justify-between border-b-2 border-white/30 pb-2">
                <span class="w-3 h-3 bg-neo-yellow border border-black"></span>
                <span class="w-6 h-1 bg-white"></span>
              </div>
              <div class="w-full flex-1 flex items-center justify-center p-2">
                <svg
                  viewBox="0 0 100 100"
                  class="w-full h-full max-h-[160px]"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <polygon
                    points="20,15 35,42 12,38"
                    fill="#FF7B29"
                    stroke="#000"
                    stroke-width="3"
                  />
                  <polygon
                    points="80,15 65,42 88,38"
                    fill="#FF7B29"
                    stroke="#000"
                    stroke-width="3"
                  />
                  <polygon points="23,22 32,38 18,36" fill="#FFFFFF" />
                  <polygon points="77,22 68,38 82,36" fill="#FFFFFF" />
                  <polygon
                    points="50,28 85,55 50,90 15,55"
                    fill="#FF7B29"
                    stroke="#000"
                    stroke-width="3.5"
                  />
                  <polygon
                    points="50,60 82,55 50,88"
                    fill="#FFFFFF"
                    stroke="#000"
                    stroke-width="2"
                  />
                  <polygon
                    points="50,60 18,55 50,88"
                    fill="#FFFFFF"
                    stroke="#000"
                    stroke-width="2"
                  />
                  <path
                    d="M 32 48 Q 40 45 42 50"
                    stroke="#000"
                    stroke-width="3"
                    fill="none"
                    stroke-linecap="round"
                  />
                  <path
                    d="M 68 48 Q 60 45 58 50"
                    stroke="#000"
                    stroke-width="3"
                    fill="none"
                    stroke-linecap="round"
                  />
                  <circle cx="50" cy="84" r="5" fill="#000" />
                </svg>
              </div>
              <div class="border-t-2 border-white/30 pt-2 flex justify-between">
                <span class="w-2 h-2 rounded-full bg-neo-yellow"></span>
                <span class="w-2 h-2 rounded-full bg-neo-yellow"></span>
              </div>
            </div>

            <!-- Book 3 (Right Behind - Vibrant Orange - Burung Merpati / Bird in Flight) -->
            <div
              class="absolute w-[230px] lg:w-[280px] aspect-[3/4.2] bg-neo-orange text-white border-4 border-black rounded-[2px] p-4 shadow-neo transform rotate-12 translate-x-28 translate-y-2 flex flex-col justify-between"
            >
              <div class="flex items-center justify-between border-b-2 border-white/30 pb-2">
                <span class="w-3 h-3 bg-neo-lime border border-black"></span>
                <span class="w-6 h-1 bg-white"></span>
              </div>
              <div class="w-full flex-1 flex items-center justify-center p-2">
                <svg
                  viewBox="0 0 100 100"
                  class="w-full h-full max-h-[160px]"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M 22 55 Q 35 48 50 48 Q 45 22 25 20 Q 38 32 60 42 Q 80 38 88 52 Q 78 58 68 56 Q 72 70 82 80 Q 62 70 52 60 Q 32 68 22 55 Z"
                    fill="#FFFFFF"
                    stroke="#000"
                    stroke-width="3.5"
                    stroke-linejoin="round"
                  />
                  <path d="M 38 30 Q 48 38 58 44" stroke="#000" stroke-width="2.5" fill="none" />
                  <path d="M 44 26 Q 52 34 62 42" stroke="#000" stroke-width="2.5" fill="none" />
                  <circle cx="80" cy="49" r="2.5" fill="#000" />
                  <path d="M 88 52 Q 94 50 96 46" stroke="#000" stroke-width="2" fill="none" />
                  <ellipse
                    cx="96"
                    cy="45"
                    rx="3"
                    ry="2"
                    fill="#D8FA00"
                    stroke="#000"
                    stroke-width="1.5"
                  />
                </svg>
              </div>
              <div class="border-t-2 border-white/30 pt-2 flex justify-between">
                <span class="w-2 h-2 rounded-full bg-neo-lime"></span>
                <span class="w-2 h-2 rounded-full bg-neo-lime"></span>
              </div>
            </div>

            <!-- Book 2 (Center Front - Clean White - Tanaman Daun Monstera / Botanical Leaf) -->
            <div
              class="relative w-[260px] lg:w-[310px] aspect-[3/4.2] bg-white text-black border-4 border-black rounded-[2px] p-5 shadow-neo-lg z-20 flex flex-col justify-between"
            >
              <div class="flex items-center justify-between border-b-3 border-black pb-2.5">
                <span class="w-3.5 h-3.5 bg-neo-yellow border-2 border-black"></span>
                <span class="w-10 h-2 bg-black"></span>
                <span class="w-3.5 h-3.5 bg-neo-violet border-2 border-black"></span>
              </div>
              <div class="w-full flex-1 flex items-center justify-center p-2">
                <svg
                  viewBox="0 0 100 100"
                  class="w-full h-full max-h-[175px]"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M 50 92 C 50 75 48 30 50 14"
                    stroke="#000"
                    stroke-width="4"
                    fill="none"
                    stroke-linecap="round"
                  />
                  <path
                    d="M 50 14 C 75 20 85 45 80 75 C 75 88 60 90 50 90 C 40 90 25 88 20 75 C 15 45 25 20 50 14 Z"
                    fill="#CBFF00"
                    stroke="#000"
                    stroke-width="3.5"
                  />
                  <ellipse
                    cx="36"
                    cy="40"
                    rx="8"
                    ry="3.5"
                    transform="rotate(-25 36 40)"
                    fill="#FFFFFF"
                    stroke="#000"
                    stroke-width="2.5"
                  />
                  <ellipse
                    cx="33"
                    cy="54"
                    rx="9"
                    ry="4"
                    transform="rotate(-15 33 54)"
                    fill="#FFFFFF"
                    stroke="#000"
                    stroke-width="2.5"
                  />
                  <ellipse
                    cx="36"
                    cy="68"
                    rx="8"
                    ry="3.5"
                    transform="rotate(-5 36 68)"
                    fill="#FFFFFF"
                    stroke="#000"
                    stroke-width="2.5"
                  />
                  <ellipse
                    cx="64"
                    cy="40"
                    rx="8"
                    ry="3.5"
                    transform="rotate(25 64 40)"
                    fill="#FFFFFF"
                    stroke="#000"
                    stroke-width="2.5"
                  />
                  <ellipse
                    cx="67"
                    cy="54"
                    rx="9"
                    ry="4"
                    transform="rotate(15 67 54)"
                    fill="#FFFFFF"
                    stroke="#000"
                    stroke-width="2.5"
                  />
                  <ellipse
                    cx="64"
                    cy="68"
                    rx="8"
                    ry="3.5"
                    transform="rotate(5 64 68)"
                    fill="#FFFFFF"
                    stroke="#000"
                    stroke-width="2.5"
                  />
                  <line x1="50" y1="18" x2="50" y2="88" stroke="#000" stroke-width="2.5" />
                </svg>
              </div>
              <div class="border-t-3 border-black pt-2 flex items-center justify-between">
                <div class="flex gap-1.5">
                  <span class="w-3 h-2 bg-neo-yellow border border-black"></span>
                  <span class="w-3 h-2 bg-neo-violet border border-black"></span>
                  <span class="w-3 h-2 bg-neo-orange border border-black"></span>
                </div>
                <span class="w-3 h-3 bg-black"></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile text content (below the image) -->
      <div class="lg:hidden space-y-5">
        <h2
          class="font-outfit font-black text-3xl sm:text-4xl tracking-tight leading-[0.98] text-black"
        >
          PENGALAMAN MEMBACA<br />
          <span class="inline-block mt-2">
            <span
              class="bg-neo-violet text-white border-3 border-black px-4 py-1 inline-block -rotate-1 rounded-[2px] shadow-[5px_5px_0px_0px_#000]"
            >
              YANG OTENTIK.
            </span>
          </span>
        </h2>

        <p class="font-sans text-sm sm:text-base font-semibold text-black/85 leading-relaxed">
          Di tengah distraksi digital yang serba cepat, buku fisik memberi ruang hening untuk
          merenung dan menyelami ide secara utuh. Dari tekstur lembaran hingga wangi cetakan
          orisinal, kami menjaga martabat setiap buku yang Anda baca.
        </p>

        <div class="pt-2 flex flex-wrap items-center gap-4">
          <a
            href="#katalog"
            class="neubrutal-btn bg-black text-white border-3 border-black py-3.5 px-7 rounded-[2px] font-outfit font-black text-sm shadow-neo hover:bg-neutral-900 active:translate-x-0.5 active:translate-y-0.5"
          >
            Lihat Koleksi Rekomendasi
          </a>
          <span class="font-outfit font-bold text-xs uppercase tracking-wider text-black">
            ✓ Garansi Edisi Asli 100%
          </span>
        </div>
      </div>
    </div>
  </section>
</template>
