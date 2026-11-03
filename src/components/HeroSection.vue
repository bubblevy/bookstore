<script setup></script>

<template>
  <section
    class="w-full bg-neo-violet text-white border-b-4 border-black pt-25 md:pt-20 sm:pt-0 py-14 sm:py-20 lg:py-24 select-none relative overflow-hidden"
    aria-labelledby="hero-title"
  >
    <div class="absolute inset-0 pointer-events-none select-none overflow-hidden">
      <span class="absolute top-8 left-[8%] text-neo-yellow text-3xl font-black opacity-60">✦</span>
      <span class="absolute top-1/4 left-[3%] text-white text-2xl font-black opacity-40">★</span>
      <span class="absolute bottom-12 left-[12%] text-neo-lime text-3xl font-black opacity-60"
        >✦</span
      >
      <span class="absolute top-10 right-[15%] text-neo-orange text-3xl font-black opacity-60"
        >✦</span
      >
      <span class="absolute top-1/2 right-[4%] text-neo-yellow text-3xl font-black opacity-50"
        >★</span
      >
      <span class="absolute bottom-16 right-[22%] text-white text-2xl font-black opacity-50"
        >✦</span
      >
      <div
        class="absolute -top-12 -left-12 w-48 h-48 rounded-full border-4 border-black/20 bg-neo-yellow/10"
      ></div>
      <div
        class="absolute -bottom-16 -right-16 w-60 h-60 rounded-full border-4 border-black/20 bg-neo-orange/10"
      ></div>
      <div
        class="absolute inset-0 opacity-10 bg-[radial-gradient(var(--color-white)_1.5px,transparent_1.5px)] bg-size:24px_24px"
      ></div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-14 items-center">
        <div class="md:col-span-6 space-y-6">
          <h1
            id="hero-title"
            data-aos="fade-up"
            class="font-outfit font-black text-4xl sm:text-5xl md:text-6xl tracking-tight leading-[0.98] text-white"
          >
            BACA LEBIH DALAM.<br />
            <span class="relative inline-block mt-2.5">
              <span
                class="bg-neo-yellow text-black border-3 md:border-4 border-black px-3 sm:px-4 py-1 inline-block -rotate-1 rounded-[2px] shadow-[5px_5px_0px_0px_var(--color-black)]"
              >
                UNTUK IDE YANG LEBIH TAJAM.
              </span>
            </span>
          </h1>

          <p
            data-aos="fade-up"
            data-aos-delay="100"
            class="font-sans text-base sm:text-lg md:text-xl font-semibold text-white/90 leading-relaxed max-w-xl"
          >
            Temukan buku pilihan dari penerbit terkemuka untuk menemani perjalanan belajarmu.
            Jaminan buku edisi asli dengan pengiriman aman ke seluruh Indonesia.
          </p>

          <div
            data-aos="fade-up"
            data-aos-delay="200"
            class="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4"
          >
            <router-link
              to="/catalog"
              class="neubrutal-btn bg-black text-white border-3 border-black py-3.5 px-7 rounded-[2px] font-outfit font-black text-base shadow-neo flex items-center justify-center gap-2 hover:bg-neutral-900 active:translate-x-0.5 active:translate-y-0.5"
            >
              <span>Jelajahi Katalog Buku</span>
            </router-link>

            <a
              href="#kategori"
              class="neubrutal-btn bg-white text-black border-3 border-black py-3.5 px-6 rounded-[2px] font-outfit font-black text-sm md:text-base shadow-neo hover:bg-gray-100 active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center"
            >
              Kategori Pilihan
            </a>
          </div>

          <div
            data-aos="fade-up"
            data-aos-delay="300"
            class="pt-4 border-t-2 border-white/20 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-outfit font-bold text-white/90"
          >
            <span class="flex items-center gap-1.5">
              <span class="text-neo-yellow">✓</span> 100% Edisi Asli Penerbit
            </span>
            <span class="flex items-center gap-1.5">
              <span class="text-neo-yellow">✓</span> Proteksi Kemasan
            </span>
            <span class="flex items-center gap-1.5">
              <span class="text-neo-yellow">✓</span> Pengiriman ke Seluruh Indonesia
            </span>
          </div>
        </div>

        <div
          data-aos="fade-left"
          data-aos-delay="150"
          class="hidden md:flex md:col-span-6 justify-end items-center relative py-4 lg:py-6 pe-1 select-none pointer-events-none"
        >
          <div class="grid grid-cols-2 gap-4 lg:gap-5 w-full max-w-[440px] lg:max-w-[490px]">
            <div class="flex flex-col gap-4 lg:gap-5">
              <div
                class="w-full h-[230px] lg:h-[260px] bg-pink text-black border-3 md:border-4 border-black rounded-[2px] p-3.5 sm:p-4 shadow-neo-md flex flex-col justify-between"
              >
                <div class="flex items-center justify-between border-b-2 border-black pb-2">
                  <div class="flex gap-1.5">
                    <span class="w-2.5 h-2.5 rounded-full bg-black"></span>
                    <span class="w-2.5 h-2.5 rounded-full bg-black"></span>
                  </div>
                  <span
                    class="font-outfit font-black text-[10px] uppercase tracking-widest bg-black text-white px-1.5 py-0.5 rounded-[1px]"
                    >01</span
                  >
                </div>

                <div class="w-full flex-1 flex items-center justify-center p-1">
                  <svg
                    viewBox="0 0 100 100"
                    class="w-full h-full max-h-[135px] lg:max-h-[155px]"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <ellipse
                      cx="50"
                      cy="55"
                      rx="32"
                      ry="36"
                      fill="var(--color-white)"
                      stroke="var(--color-black)"
                      stroke-width="3"
                    />
                    <path
                      d="M 20 45 C 15 65, 25 80, 35 85"
                      fill="var(--color-black)"
                      stroke="var(--color-black)"
                      stroke-width="2"
                    />
                    <path
                      d="M 80 45 C 85 65, 75 80, 65 85"
                      fill="var(--color-black)"
                      stroke="var(--color-black)"
                      stroke-width="2"
                    />
                    <path
                      d="M 40 60 Q 50 65 60 60 M 42 70 Q 50 75 58 70"
                      stroke="var(--color-black)"
                      stroke-width="2.5"
                      fill="none"
                      stroke-linecap="round"
                    />
                    <polygon
                      points="26,30 36,15 45,28"
                      fill="var(--color-violet)"
                      stroke="var(--color-black)"
                      stroke-width="3"
                    />
                    <polygon
                      points="74,30 64,15 55,28"
                      fill="var(--color-violet)"
                      stroke="var(--color-black)"
                      stroke-width="3"
                    />
                    <circle
                      cx="38"
                      cy="38"
                      r="12"
                      fill="var(--color-white)"
                      stroke="var(--color-black)"
                      stroke-width="3"
                    />
                    <circle cx="38" cy="38" r="6" fill="var(--color-black)" />
                    <circle cx="40" cy="36" r="2" fill="var(--color-white)" />
                    <circle
                      cx="62"
                      cy="38"
                      r="12"
                      fill="var(--color-white)"
                      stroke="var(--color-black)"
                      stroke-width="3"
                    />
                    <circle cx="62" cy="38" r="6" fill="var(--color-black)" />
                    <circle cx="64" cy="36" r="2" fill="var(--color-white)" />
                    <polygon
                      points="50,42 45,50 55,50"
                      fill="var(--color-orange)"
                      stroke="var(--color-black)"
                      stroke-width="2.5"
                    />
                    <rect x="15" y="88" width="70" height="5" rx="2" fill="var(--color-black)" />
                  </svg>
                </div>

                <div class="h-2 w-full bg-black rounded-[1px]"></div>
              </div>

              <div
                class="w-full h-[150px] lg:h-[170px] bg-neo-lime text-black border-3 md:border-4 border-black rounded-[2px] p-3 shadow-[6px_6px_0px_0px_var(--color-black)] flex flex-col justify-between"
              >
                <div class="flex items-center justify-between border-b-2 border-black pb-1">
                  <span class="w-8 h-1.5 bg-black"></span>
                  <span
                    class="font-outfit font-black text-[10px] uppercase tracking-widest bg-black text-white px-1.5 py-0.5 rounded-[1px]"
                    >02</span
                  >
                </div>

                <div class="w-full flex-1 flex items-center justify-center p-1">
                  <svg
                    viewBox="0 0 100 65"
                    class="w-full h-full max-h-[85px] lg:max-h-[100px]"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M 40 12 C 38 4, 30 6, 32 10 M 42 10 C 45 2, 53 4, 50 10"
                      stroke="var(--color-black)"
                      stroke-width="2"
                      fill="none"
                      stroke-linecap="round"
                    />
                    <path
                      d="M 15 32 C 18 16, 55 12, 72 28 C 82 34, 86 30, 89 24 C 86 42, 78 44, 70 42 C 55 50, 26 52, 15 32 Z"
                      fill="var(--color-violet)"
                      stroke="var(--color-black)"
                      stroke-width="2.5"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M 20 37 C 28 46, 48 45, 60 40"
                      stroke="var(--color-white)"
                      stroke-width="2.5"
                      fill="none"
                    />
                    <path
                      d="M 38 38 C 41 47, 49 50, 46 41"
                      fill="var(--color-orange)"
                      stroke="var(--color-black)"
                      stroke-width="2"
                    />
                    <circle
                      cx="24"
                      cy="28"
                      r="2.5"
                      fill="var(--color-white)"
                      stroke="var(--color-black)"
                      stroke-width="1.5"
                    />
                    <path
                      d="M 10 58 Q 20 54 30 58 T 50 58 T 70 58 T 90 58"
                      stroke="var(--color-black)"
                      stroke-width="2.5"
                      fill="none"
                      stroke-linecap="round"
                    />
                  </svg>
                </div>

                <div class="flex gap-1">
                  <span class="w-2 h-2 rounded-full bg-black"></span>
                  <span class="w-2 h-2 rounded-full bg-black"></span>
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-4 lg:gap-5">
              <div
                class="w-full h-[150px] lg:h-[170px] bg-white text-black border-3 md:border-4 border-black rounded-[2px] p-3 shadow-[6px_6px_0px_0px_var(--color-black)] flex flex-col justify-between"
              >
                <div class="flex items-center justify-between border-b-2 border-black pb-1">
                  <span
                    class="font-outfit font-black text-[10px] uppercase tracking-widest bg-black text-white px-1.5 py-0.5 rounded-[1px]"
                    >03</span
                  >
                  <span class="w-8 h-1.5 bg-black"></span>
                </div>

                <div class="w-full flex-1 flex items-center justify-center p-1">
                  <svg
                    viewBox="0 0 100 80"
                    class="w-full h-full max-h-[85px] lg:max-h-[100px]"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M 50 16 C 50 8, 48 4, 46 2"
                      stroke="var(--color-black)"
                      stroke-width="3"
                      fill="none"
                      stroke-linecap="round"
                    />
                    <path
                      d="M 50 10 C 62 5, 72 13, 62 17 C 54 19, 50 13, 50 10 Z"
                      fill="var(--color-lime)"
                      stroke="var(--color-black)"
                      stroke-width="2.5"
                      stroke-linejoin="round"
                    />
                    <circle
                      cx="50"
                      cy="46"
                      r="26"
                      fill="var(--color-orange)"
                      stroke="var(--color-black)"
                      stroke-width="3"
                    />
                    <path
                      d="M 35 34 A 20 20 0 0 1 65 34"
                      stroke="var(--color-white)"
                      stroke-width="2.5"
                      fill="none"
                      stroke-linecap="round"
                    />
                    <circle
                      cx="50"
                      cy="46"
                      r="14"
                      fill="var(--color-yellow)"
                      stroke="var(--color-black)"
                      stroke-width="2"
                    />
                    <line
                      x1="50"
                      y1="32"
                      x2="50"
                      y2="60"
                      stroke="var(--color-black)"
                      stroke-width="1.5"
                    />
                    <line
                      x1="36"
                      y1="46"
                      x2="64"
                      y2="46"
                      stroke="var(--color-black)"
                      stroke-width="1.5"
                    />
                    <circle
                      cx="50"
                      cy="46"
                      r="3"
                      fill="var(--color-white)"
                      stroke="var(--color-black)"
                      stroke-width="1.5"
                    />
                  </svg>
                </div>

                <div class="flex gap-1 justify-end">
                  <span class="w-2 h-2 rounded-full bg-black"></span>
                  <span class="w-2 h-2 rounded-full bg-black"></span>
                </div>
              </div>

              <div
                class="w-full h-[230px] lg:h-[260px] bg-neo-orange text-black border-3 md:border-4 border-black rounded-[2px] p-3.5 sm:p-4 shadow-[6px_6px_0px_0px_var(--color-black)] flex flex-col justify-between"
              >
                <div class="flex items-center justify-between border-b-2 border-black pb-2">
                  <span
                    class="font-outfit font-black text-[10px] uppercase tracking-widest bg-black text-white px-1.5 py-0.5 rounded-[1px]"
                    >04</span
                  >
                  <div class="flex gap-1.5">
                    <span class="w-2.5 h-2.5 rounded-full bg-black"></span>
                    <span class="w-2.5 h-2.5 rounded-full bg-black"></span>
                  </div>
                </div>

                <div class="w-full flex-1 flex items-center justify-center p-1">
                  <svg
                    viewBox="0 0 100 100"
                    class="w-full h-full max-h-[135px] lg:max-h-[155px]"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <polygon
                      points="32,24 22,8 42,16"
                      fill="var(--color-violet)"
                      stroke="var(--color-black)"
                      stroke-width="3"
                    />
                    <polygon
                      points="68,24 78,8 58,16"
                      fill="var(--color-violet)"
                      stroke="var(--color-black)"
                      stroke-width="3"
                    />
                    <circle
                      cx="50"
                      cy="34"
                      r="22"
                      fill="var(--color-white)"
                      stroke="var(--color-black)"
                      stroke-width="3"
                    />
                    <path
                      d="M 38 32 Q 43 36 48 32"
                      stroke="var(--color-black)"
                      stroke-width="2.5"
                      fill="none"
                      stroke-linecap="round"
                    />
                    <path
                      d="M 52 32 Q 57 36 62 32"
                      stroke="var(--color-black)"
                      stroke-width="2.5"
                      fill="none"
                      stroke-linecap="round"
                    />
                    <polygon points="50,37 47,40 53,40" fill="var(--color-black)" />
                    <path
                      d="M 50 40 L 50 43 M 47 44 Q 50 46 53 44"
                      stroke="var(--color-black)"
                      stroke-width="2"
                      fill="none"
                      stroke-linecap="round"
                    />
                    <line
                      x1="26"
                      y1="36"
                      x2="36"
                      y2="38"
                      stroke="var(--color-black)"
                      stroke-width="1.5"
                    />
                    <line
                      x1="26"
                      y1="42"
                      x2="36"
                      y2="41"
                      stroke="var(--color-black)"
                      stroke-width="1.5"
                    />
                    <line
                      x1="74"
                      y1="36"
                      x2="64"
                      y2="38"
                      stroke="var(--color-black)"
                      stroke-width="1.5"
                    />
                    <line
                      x1="74"
                      y1="42"
                      x2="64"
                      y2="41"
                      stroke="var(--color-black)"
                      stroke-width="1.5"
                    />
                    <path
                      d="M 24 64 L 50 60 L 76 64 L 76 84 L 50 80 L 24 84 Z"
                      fill="var(--color-lime)"
                      stroke="var(--color-black)"
                      stroke-width="3"
                      stroke-linejoin="round"
                    />
                    <line
                      x1="50"
                      y1="60"
                      x2="50"
                      y2="80"
                      stroke="var(--color-black)"
                      stroke-width="2.5"
                    />
                    <line
                      x1="30"
                      y1="68"
                      x2="45"
                      y2="67"
                      stroke="var(--color-black)"
                      stroke-width="1.5"
                    />
                    <line
                      x1="30"
                      y1="73"
                      x2="45"
                      y2="72"
                      stroke="var(--color-black)"
                      stroke-width="1.5"
                    />
                    <line
                      x1="30"
                      y1="78"
                      x2="42"
                      y2="77"
                      stroke="var(--color-black)"
                      stroke-width="1.5"
                    />
                    <line
                      x1="55"
                      y1="67"
                      x2="70"
                      y2="68"
                      stroke="var(--color-black)"
                      stroke-width="1.5"
                    />
                    <line
                      x1="55"
                      y1="72"
                      x2="70"
                      y2="73"
                      stroke="var(--color-black)"
                      stroke-width="1.5"
                    />
                    <line
                      x1="58"
                      y1="77"
                      x2="70"
                      y2="78"
                      stroke="var(--color-black)"
                      stroke-width="1.5"
                    />
                    <ellipse
                      cx="36"
                      cy="62"
                      rx="5"
                      ry="4"
                      fill="var(--color-white)"
                      stroke="var(--color-black)"
                      stroke-width="2"
                    />
                    <ellipse
                      cx="64"
                      cy="62"
                      rx="5"
                      ry="4"
                      fill="var(--color-white)"
                      stroke="var(--color-black)"
                      stroke-width="2"
                    />
                  </svg>
                </div>

                <div class="h-2 w-full bg-black rounded-[1px]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
