<script setup>
import { useRouter } from 'vue-router'

const currentYear = new Date().getFullYear()
const router = useRouter()

function goToSection(hash) {
  router.push({ path: '/', hash })
}
</script>

<template>
  <footer
    id="kontak"
    class="w-full bg-[#111111] text-white border-t-4 border-black pt-12 md:pt-16 pb-8"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div data-aos="fade-up" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
        <div class="lg:col-span-2 space-y-4">
          <div class="flex items-center gap-2.5">
            <div class="flex flex-col">
              <div class="flex items-center gap-1.5">
                <span class="font-outfit font-black text-3xl tracking-tight leading-none text-white"
                  >BOOKSTORE</span
                >
              </div>
              <span
                class="font-sans text-[10px] font-extrabold text-white/50 uppercase tracking-widest mt-0.5"
                >SELALU ADA CERITA BARU</span
              >
            </div>
          </div>

          <p class="font-sans text-sm font-semibold text-white/70 leading-relaxed max-w-sm">
            Menghadirkan Buku-buku pilihan langsung dari penerbit resmi untuk memperkaya pengalaman
            membacamu. Dijamin 100% original dan dikemas ekstra aman sampai ke tanganmu.
          </p>

          <div class="flex items-center gap-2.5 pt-2">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              class="neubrutal-btn w-9 h-9 text-white border-2 border-black rounded-[2px] shadow-neo-sm flex items-center justify-center active:translate-x-0.5 active:translate-y-0.5"
              style="background-color: #ff9ec1"
              aria-label="Instagram"
              title="Instagram"
            >
              <svg
                viewBox="0 0 24 24"
                class="w-5 h-5 fill-current"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
                />
              </svg>
            </a>
            <a
              href="https://wa.me/6281234567890"
              target="_blank"
              rel="noopener noreferrer"
              class="neubrutal-btn w-9 h-9 bg-neo-violet text-white border-2 border-black rounded-[2px] shadow-neo-sm flex items-center justify-center hover:bg-violet-600 active:translate-x-0.5 active:translate-y-0.5"
              aria-label="WhatsApp"
              title="WhatsApp"
            >
              <svg
                viewBox="0 0 24 24"
                class="w-5 h-5 fill-current"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"
                />
              </svg>
            </a>
            <a
              href="https://tiktok.com"
              target="_blank"
              rel="noopener noreferrer"
              class="neubrutal-btn w-9 h-9 bg-neo-orange text-white border-2 border-black rounded-[2px] shadow-neo-sm flex items-center justify-center hover:bg-orange-600 active:translate-x-0.5 active:translate-y-0.5"
              aria-label="TikTok"
              title="TikTok"
            >
              <svg
                viewBox="0 0 24 24"
                class="w-4 h-4 fill-current"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01v8.42c0 1.93-.45 3.94-1.57 5.51-1.48 2.08-3.94 3.32-6.52 3.19-2.22-.09-4.33-1.19-5.63-3-1.39-1.89-1.74-4.42-1.01-6.66.7-2.18 2.45-3.89 4.67-4.47.7-.18 1.42-.26 2.14-.24v4.08c-.76.02-1.54.27-2.09.8-.75.71-.97 1.83-.65 2.79.33.99 1.27 1.69 2.32 1.74 1.12.06 2.26-.52 2.75-1.52.26-.51.35-1.09.34-1.67V.02z"
                />
              </svg>
            </a>
          </div>
        </div>

        <div>
          <h4 class="font-outfit font-black text-sm uppercase tracking-wider mb-4 text-white">
            Koleksi Buku
          </h4>
          <ul class="space-y-2.5 font-sans text-sm font-bold text-white/70">
            <li>
              <a
                href="/#katalog"
                class="hover:text-white transition-colors"
                @click.prevent="goToSection('#katalog')"
                >Semua Buku</a
              >
            </li>
            <li>
              <a
                href="/#kategori"
                class="hover:text-white transition-colors"
                @click.prevent="goToSection('#kategori')"
                >Fiksi Populer</a
              >
            </li>
            <li>
              <a
                href="/#kategori"
                class="hover:text-white transition-colors"
                @click.prevent="goToSection('#kategori')"
                >Pengembangan Diri</a
              >
            </li>
            <li>
              <a
                href="/#kategori"
                class="hover:text-white transition-colors"
                @click.prevent="goToSection('#kategori')"
                >Sci-Fi & Filsafat</a
              >
            </li>
            <li>
              <a
                href="/#kategori"
                class="hover:text-white transition-colors"
                @click.prevent="goToSection('#kategori')"
                >Seni & Desain</a
              >
            </li>
          </ul>
        </div>

        <div>
          <h4 class="font-outfit font-black text-sm uppercase tracking-wider mb-4 text-white">
            Layanan
          </h4>
          <ul class="space-y-2.5 font-sans text-sm font-bold text-white/70">
            <li>
              <a
                href="/#ulasan"
                class="hover:text-white transition-colors"
                @click.prevent="goToSection('#ulasan')"
                >Ulasan Pembeli</a
              >
            </li>
            <li><a href="#" class="hover:text-white transition-colors">Garansi Pengembalian</a></li>
            <li><a href="#" class="hover:text-white transition-colors">Kebijakan Privasi</a></li>
            <li><a href="#" class="hover:text-white transition-colors">Syarat & Ketentuan</a></li>
          </ul>
        </div>

        <div>
          <h4 class="font-outfit font-black text-sm uppercase tracking-wider mb-4 text-white">
            Offline Store
          </h4>
          <div class="space-y-3 font-sans text-sm font-bold text-white/80">
            <div>
              <p class="text-[11px] font-black uppercase tracking-wider text-white/90 mb-0.5">
                Alamat
              </p>
              <p class="leading-relaxed text-white/70">
                Jl. Literasi Nusantara No. 42, Senopati, Jakarta Selatan
              </p>
            </div>
            <div>
              <p class="text-[11px] font-black uppercase tracking-wider text-white/90 mb-0.5">
                Jam Buka
              </p>
              <p class="leading-relaxed text-white/70">Setiap Hari: 09.00 – 22.00 WIB</p>
            </div>
          </div>
        </div>
      </div>

      <div
        class="pt-6 border-t-2 border-white/20 flex flex-col sm:flex-row items-center justify-between gap-1 font-sans text-sm font-bold text-white/70"
      >
        <p>&copy; {{ currentYear }} BookStore Indonesia. All rights reserved.</p>
        <div class="text-white/60">
          Developed by
          <a
            href="https://github.com/bubblevy"
            target="_blank"
            class="underline hover:text-white transition-colors"
            >@ilmi</a
          >
        </div>
      </div>
    </div>
  </footer>
</template>
