<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/composables/useStore'

const router = useRouter()
const { state, cartCount, openCart, openModal, logout } = useStore()
const mobileOpen = ref(false)
const userMenuOpen = ref(false)

const cartBadge = computed(() => cartCount())

function closeMobile() {
  mobileOpen.value = false
}

function handleSearchClick() {
  openModal('search')
}

defineExpose({ closeMobile })
</script>

<template>
  <div class="sticky top-0 z-40 select-none">
    <!-- Main Navigation Bar: Consistent Container Width with Footer -->
    <header class="bg-white border-b-4 border-black">
      <div class="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 md:py-3.5">
        <!-- Brand -->
        <router-link to="/" class="flex items-center gap-2.5 group" @click="closeMobile">
          <div class="w-10 h-10 rounded-[2px] bg-neo-violet text-white border-3 border-black flex items-center justify-center shadow-neo-sm group-hover:rotate-6 transition-transform">
            <svg viewBox="0 0 24 24" class="w-5 h-5 fill-white">
              <path d="M4 4 L4 20 L11 18 L11 5 Z M13 5 L18 4 L20 6 L20 20 L13 19 Z" stroke="white" stroke-width="1.5" stroke-linejoin="round" />
            </svg>
          </div>
          <div class="flex flex-col">
            <div class="flex items-center gap-1.5">
              <span class="font-outfit font-black text-xl md:text-2xl tracking-tight leading-none">BOOKSTORE</span>
            </div>
            <span class="font-sans text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mt-0.5">CURATED READS</span>
          </div>
        </router-link>

        <!-- Desktop nav -->
        <nav class="hidden lg:flex items-center gap-7 font-outfit font-black text-sm">
          <a href="#katalog" class="link-under-link hover:text-neo-violet">Katalog Buku</a>
          <a href="#kategori" class="link-under-link hover:text-neo-violet">Kategori</a>
          <a href="#vibe-section" class="link-under-link hover:text-neo-violet">Filosofi Membaca</a>
          <a href="#ulasan" class="link-under-link hover:text-neo-violet">Ulasan Pembeli</a>
          <a href="#kontak" class="link-under-link hover:text-neo-violet">Kontak</a>
        </nav>

        <!-- Right actions: Clean mobile design without crowded buttons -->
        <div class="flex items-center gap-2 sm:gap-3">
          <!-- Search trigger -->
          <button
            class="neubrutal-btn bg-white border-2 md:border-3 border-black p-2 rounded-[2px] shadow-neo-sm hover:bg-yellow-50 flex items-center gap-1.5"
            aria-label="Cari buku"
            @click="handleSearchClick"
          >
            <svg class="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <span class="hidden md:inline font-outfit font-extrabold text-xs pr-1">Cari...</span>
          </button>

          <!-- Cart button with counter -->
          <button
            class="relative neubrutal-btn bg-neo-yellow text-black border-2 md:border-3 border-black px-2.5 sm:px-3 py-2 rounded-[2px] shadow-neo-sm hover:bg-yellow-300 flex items-center gap-1.5 sm:gap-2"
            aria-label="Buka keranjang belanja"
            @click="openCart"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.372" />
            </svg>
            <span class="hidden sm:inline font-outfit font-black text-xs">CART</span>
            <span
              v-if="cartBadge > 0"
              class="w-5 h-5 bg-black text-white border border-black rounded-[2px] text-[10px] font-outfit font-black flex items-center justify-center"
            >
              {{ cartBadge }}
            </span>
          </button>

          <!-- Auth: HIDDEN ON MOBILE to give space to the hamburger menu -->
          <button
            v-if="!state.isLoggedIn"
            class="hidden md:inline-flex neubrutal-btn bg-neo-violet text-white border-2 md:border-3 border-black px-3.5 md:px-4 py-2 rounded-[2px] font-outfit font-black text-xs md:text-sm shadow-neo-sm hover:bg-violet-600"
            @click="openModal('login')"
          >
            Masuk
          </button>
          <div v-else class="relative hidden md:block">
            <button
              class="neubrutal-btn flex items-center gap-2 bg-white border-2 md:border-3 border-black pl-1.5 pr-3 py-1 rounded-[2px] shadow-neo-sm"
              @click="userMenuOpen = !userMenuOpen"
            >
              <div class="w-7 h-7 rounded-[2px] bg-neo-violet text-white border border-black flex items-center justify-center font-outfit font-black text-xs">
                {{ state.userName.slice(0, 2).toUpperCase() }}
              </div>
              <span class="font-outfit font-extrabold text-xs">{{ state.userName.split(' ')[0] }}</span>
            </button>
            <div
              v-if="userMenuOpen"
              class="absolute right-0 top-full mt-2 w-48 bg-white border-3 border-black rounded-[2px] p-2 z-50 shadow-neo"
            >
              <p class="px-3 py-1 font-outfit font-black text-xs text-muted-foreground">Halo, {{ state.userName }}</p>
              <div class="border-t border-black my-1"></div>
              <button
                class="w-full text-left px-3 py-2 rounded-[2px] font-outfit font-bold text-xs hover:bg-neo-yellow hover:text-black"
                @click="userMenuOpen = false; logout()"
              >
                Keluar
              </button>
            </div>
          </div>

          <!-- Mobile menu hamburger button: ALWAYS VISIBLE on mobile & spacious -->
          <button
            class="lg:hidden neubrutal-btn bg-white p-2 rounded-[2px] border-2 border-black shadow-neo-sm flex items-center justify-center shrink-0 hover:bg-neo-yellow transition-colors"
            aria-label="Buka menu navigasi"
            @click="mobileOpen = true"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Mobile Drawer -->
    <transition name="drawer">
      <div
        v-if="mobileOpen"
        class="fixed inset-0 bg-background z-50 lg:hidden border-r-4 border-black shadow-[8px_0_0_0_#000] flex flex-col"
      >
        <div class="flex items-center justify-between p-5 border-b-4 border-black bg-white">
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 bg-neo-violet text-white border-2 border-black rounded-[2px] flex items-center justify-center shadow-neo-sm">
              <svg viewBox="0 0 24 24" class="w-4 h-4 fill-white">
                <path d="M4 4 L4 20 L11 18 L11 5 Z M13 5 L18 4 L20 6 L20 20 L13 19 Z" stroke="white" stroke-width="1.5" stroke-linejoin="round" />
              </svg>
            </div>
            <span class="font-outfit font-black text-xl">BOOKSTORE</span>
          </div>
          <button
            class="border-2 border-black p-1.5 rounded-[2px] bg-white shadow-neo-sm hover:bg-gray-100"
            aria-label="Tutup menu"
            @click="closeMobile"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav class="flex flex-col px-6 py-4 gap-1 font-outfit font-black text-lg flex-1 overflow-y-auto">
          <a href="#katalog" class="py-3 border-b-2 border-black/10 hover:text-neo-violet" @click="closeMobile">Katalog Buku</a>
          <a href="#kategori" class="py-3 border-b-2 border-black/10 hover:text-neo-violet" @click="closeMobile">Kategori</a>
          <a href="#vibe-section" class="py-3 border-b-2 border-black/10 hover:text-neo-violet" @click="closeMobile">Filosofi Membaca</a>
          <a href="#ulasan" class="py-3 border-b-2 border-black/10 hover:text-neo-violet" @click="closeMobile">Ulasan Pembeli</a>
          <a href="#kontak" class="py-3 border-b-2 border-black/10 hover:text-neo-violet" @click="closeMobile">Kontak</a>
        </nav>

        <div class="p-5 mt-auto space-y-3 bg-white border-t-4 border-black">
          <button
            v-if="!state.isLoggedIn"
            class="w-full neubrutal-btn bg-neo-yellow text-black border-3 border-black py-3.5 rounded-[2px] font-outfit font-black shadow-neo"
            @click="openModal('login'); closeMobile()"
          >
            Masuk / Buat Akun
          </button>
          <button
            class="w-full neubrutal-btn bg-neo-violet text-white border-3 border-black py-3 rounded-[2px] font-outfit font-black shadow-neo"
            @click="openCart(); closeMobile()"
          >
            Lihat Keranjang ({{ cartBadge }})
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>
