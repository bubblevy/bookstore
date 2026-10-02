<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/composables/useStore'

const router = useRouter()
const { state, cartCount, openCart, openModal, logout, openSidebar, closeSidebar } = useStore()
const userMenuOpen = ref(false)

const cartBadge = computed(() => cartCount())

function closeMobile() {
  closeSidebar()
}

function openMobile() {
  openSidebar()
}

function navigateToSection(hash) {
  closeMobile()
  if (router.currentRoute.value.path !== '/') {
    router.push({ path: '/', hash }).then(() => {
      setTimeout(() => {
        const el = document.querySelector(hash)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      }, 150)
    })
  } else {
    const el = document.querySelector(hash)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }
}

function handleSearchClick() {
  openModal('search')
}

// Global keyboard shortcut for search (Ctrl+K or Cmd+K)
function handleKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    handleSearchClick()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

defineExpose({ closeMobile, openMobile })
</script>

<template>
  <div class="sticky top-0 z-40 select-none">
    <!-- Main Navigation Bar: Consistent Container Width with Footer -->
    <header class="bg-white border-b-4 border-black">
      <div
        class="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 md:py-3.5"
      >
        <!-- Brand -->
        <router-link to="/" class="flex items-center gap-2.5 group" @click="closeMobile">
          <div class="flex flex-col">
            <div class="flex items-center gap-1.5">
              <span class="font-outfit font-black text-2xl md:text-2xl tracking-tight leading-none text-black"
                >BOOKSTORE</span
              >
            </div>
            <span
              class="font-sans text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mt-0.5"
              >SELALU ADA CERITA BARU</span
            >
          </div>
        </router-link>

        <!-- Desktop nav -->
        <nav class="hidden lg:flex items-center gap-7 font-outfit font-black text-sm">
          <a href="#katalog" class="link-under-link hover:text-neo-violet">Katalog Buku</a>
          <a href="#kategori" class="link-under-link hover:text-neo-violet">Kategori</a>
          <a href="#ulasan" class="link-under-link hover:text-neo-violet">Ulasan Pembeli</a>
          <a href="#kontak" class="link-under-link hover:text-neo-violet">Kontak</a>
        </nav>

        <!-- Right actions -->
        <div class="flex items-center gap-2 sm:gap-3">
          <!-- Search trigger: lengthened on desktop, uniform w-10 h-10 on mobile -->
          <button
            class="neubrutal-btn bg-white border-2 md:border-3 border-black w-10 h-10 md:w-64 lg:w-80 md:px-3.5 rounded-[2px] shadow-neo-sm hover:bg-yellow-50 flex items-center justify-center md:justify-between shrink-0 transition-all"
            aria-label="Cari buku"
            @click="handleSearchClick"
          >
            <div class="flex items-center gap-2 min-w-0">
              <svg
                class="w-5 h-5 text-black shrink-0"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
              <span
                class="hidden md:inline font-outfit font-semibold text-xs text-neutral-500 truncate"
              >
                Cari judul buku, penulis...
              </span>
            </div>
            <kbd
              class="hidden md:inline-flex items-center text-[10px] font-mono font-bold bg-neutral-100 text-neutral-600 border border-black/30 px-1.5 py-0.5 rounded-[2px] shrink-0"
            >
              Ctrl K
            </kbd>
          </button>

          <!-- Cart button: new modern cart icon, no CART text on any device, badge flies above icon, uniform w-10 h-10 on mobile -->
          <button
            class="relative neubrutal-btn bg-neo-yellow text-black border-2 md:border-3 border-black w-10 h-10 rounded-[2px] shadow-neo-sm hover:bg-yellow-300 flex items-center justify-center shrink-0"
            aria-label="Buka keranjang belanja"
            @click="openCart"
          >
            <svg
              class="w-5 h-5 text-black"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="8" cy="21" r="1.2" fill="currentColor" />
              <circle cx="19" cy="21" r="1.2" fill="currentColor" />
              <path
                d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"
              />
            </svg>
            <!-- Badge flying above icon -->
            <span
              v-if="cartBadge > 0"
              class="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-black text-white border-2 border-black rounded-full text-[10px] font-outfit font-black flex items-center justify-center leading-none pointer-events-none shadow-[1px_1px_0px_0px_#fff]"
            >
              {{ cartBadge }}
            </span>
          </button>

          <!-- Auth: HIDDEN ON MOBILE to give space to the hamburger menu -->
          <div v-if="!state.isLoggedIn" class="hidden md:flex items-center gap-2">
            <router-link
              to="/login"
              class="neubrutal-btn bg-white text-black border-2 md:border-3 border-black px-3.5 md:px-4 h-10 rounded-[2px] font-outfit font-black text-xs md:text-sm shadow-neo-sm hover:bg-gray-100 flex items-center justify-center"
            >
              Masuk
            </router-link>
            <router-link
              to="/register"
              class="neubrutal-btn bg-neo-yellow text-black border-2 md:border-3 border-black px-3.5 md:px-4 h-10 rounded-[2px] font-outfit font-black text-xs md:text-sm shadow-neo-sm hover:bg-yellow-300 flex items-center justify-center"
            >
              Daftar
            </router-link>
          </div>
          <div v-else class="relative hidden md:block">
            <button
              class="neubrutal-btn flex items-center gap-2 bg-white border-2 md:border-3 border-black pl-1.5 pr-3 h-10 rounded-[2px] shadow-neo-sm"
              @click="userMenuOpen = !userMenuOpen"
            >
              <div
                class="w-7 h-7 rounded-[2px] bg-neo-violet text-white border border-black flex items-center justify-center font-outfit font-black text-xs"
              >
                {{ state.userName.slice(0, 2).toUpperCase() }}
              </div>
              <span class="font-outfit font-extrabold text-xs">{{
                state.userName.split(' ')[0]
              }}</span>
            </button>
            <div
              v-if="userMenuOpen"
              class="absolute right-0 top-full mt-2 w-48 bg-white border-3 border-black rounded-[2px] p-2 z-50 shadow-neo"
            >
              <p class="px-3 py-1 font-outfit font-black text-xs text-muted-foreground">
                Halo, {{ state.userName }}
              </p>
              <div class="border-t border-black my-1"></div>
              <button
                class="w-full text-left px-3 py-2 rounded-[2px] font-outfit font-bold text-xs hover:bg-neo-yellow hover:text-black"
                @click="userMenuOpen = false; logout()"
              >
                Keluar
              </button>
            </div>
          </div>

          <!-- Mobile menu hamburger button: EXACT SAME SIZE w-10 h-10 on mobile -->
          <button
            class="lg:hidden neubrutal-btn bg-white w-10 h-10 rounded-[2px] border-2 border-black shadow-neo-sm flex items-center justify-center shrink-0 hover:bg-neo-yellow transition-colors"
            aria-label="Buka menu navigasi"
            @click="openMobile"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Mobile Drawer Backdrop -->
    <transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="state.isSidebarOpen"
        class="fixed inset-0 bg-black/60 z-50 backdrop-blur-xs lg:hidden"
        @click="closeMobile"
      ></div>
    </transition>

    <!-- Mobile Drawer Panel -->
    <transition name="drawer">
      <div
        v-if="state.isSidebarOpen"
        class="fixed inset-y-0 left-0 w-full max-w-[280px] sm:max-w-xs md:max-w-sm bg-background z-50 lg:hidden border-r-3 sm:border-r-4 border-black shadow-[6px_0px_0px_0px_#000] sm:shadow-[8px_0px_0px_0px_#000] flex flex-col"
      >
        <div class="flex items-center justify-between p-4 sm:p-5 border-b-4 border-black bg-white">
          <router-link to="/" class="flex items-center gap-2" @click="closeMobile">
            <div class="flex flex-col">
              <div class="flex items-center gap-1.5">
                <span class="font-outfit font-black text-2xl md:text-xl tracking-tight leading-none text-black"
                  >BOOKSTORE</span
                >
              </div>
              <span
                class="font-sans text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest mt-0.5"
                >SELALU ADA CERITA BARU</span
              >
            </div>
          </router-link>
          <button
            class="w-9 h-9 border-2 border-black rounded-[2px] bg-white shadow-neo-sm hover:bg-gray-100 flex items-center justify-center"
            aria-label="Tutup menu"
            @click="closeMobile"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav
          class="flex flex-col px-6 py-4 gap-1 font-outfit font-black text-lg flex-1 overflow-y-auto"
        >
          <a
            href="#katalog"
            class="py-3 border-b-2 border-black/10 hover:text-neo-violet"
            @click="navigateToSection('#katalog')"
            >Katalog Buku</a
          >
          <a
            href="#kategori"
            class="py-3 border-b-2 border-black/10 hover:text-neo-violet"
            @click="navigateToSection('#kategori')"
            >Kategori</a
          >
          <a
            href="#ulasan"
            class="py-3 border-b-2 border-black/10 hover:text-neo-violet"
            @click="navigateToSection('#ulasan')"
            >Ulasan Pembeli</a
          >
          <a
            href="#kontak"
            class="py-3 border-b-2 border-black/10 hover:text-neo-violet"
            @click="navigateToSection('#kontak')"
            >Kontak</a
          >
        </nav>

        <!-- Mobile Drawer Footer -->
        <div class="p-5 mt-auto bg-white border-t-4 border-black">
          <div v-if="!state.isLoggedIn" class="flex flex-col gap-2.5">
            <router-link
              to="/login"
              class="w-full neubrutal-btn bg-neo-yellow text-black border-3 border-black py-3 rounded-[2px] font-outfit font-black text-center shadow-neo block hover:bg-yellow-300"
              @click="closeMobile"
            >
              Masuk ke Akun
            </router-link>
            <router-link
              to="/register"
              class="w-full neubrutal-btn bg-white text-black border-3 border-black py-3 rounded-[2px] font-outfit font-black text-center shadow-neo block hover:bg-gray-50"
              @click="closeMobile"
            >
              Daftar Akun Baru
            </router-link>
          </div>
          <div v-else class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div
                class="w-8 h-8 rounded-[2px] bg-neo-violet text-white border-2 border-black flex items-center justify-center font-outfit font-black text-xs shadow-neo-sm"
              >
                {{ state.userName.slice(0, 2).toUpperCase() }}
              </div>
              <span class="font-outfit font-black text-sm">{{ state.userName }}</span>
            </div>
            <button
              class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-3 py-1.5 rounded-[2px] font-outfit font-black text-xs hover:bg-yellow-300 shadow-neo-sm"
              @click="closeMobile(); logout()"
            >
              Keluar
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>
