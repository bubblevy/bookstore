<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/composables/useStore'

const router = useRouter()
const {
  state,
  cartCount,
  openCart,
  openModal,
  logout,
  openSidebar,
  closeSidebar,
  setUserRole,
} = useStore()
const userMenuOpen = ref(false)
const userMenuRef = ref(null)

const cartBadge = computed(() => cartCount())

function closeMobile() {
  closeSidebar()
}

function openMobile() {
  openSidebar()
}

function handleLogout() {
  userMenuOpen.value = false
  logout()
}

function handleMobileLogout() {
  closeMobile()
  logout()
}

function toggleRole() {
  const nextRole = state.userRole === 'admin' ? 'user' : 'admin'
  setUserRole(nextRole)
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

function handleKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    handleSearchClick()
  }
}

function handleClickOutside(e) {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target)) {
    userMenuOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('click', handleClickOutside)
})

defineExpose({ closeMobile, openMobile })
</script>

<template>
  <div class="sticky top-0 z-40 select-none">
    <header class="bg-white border-b-4 border-black">
      <div
        class="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 md:py-3.5"
      >
        <router-link to="/" class="flex items-center gap-2.5 group" @click="closeMobile">
          <div class="flex flex-col">
            <div class="flex items-center gap-1.5">
              <span
                class="font-outfit font-black text-2xl md:text-2xl tracking-tight leading-none text-black"
                >BOOKSTORE</span
              >
            </div>
            <span
              class="font-sans text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mt-0.5"
              >SELALU ADA CERITA BARU</span
            >
          </div>
        </router-link>

        <nav class="hidden lg:flex items-center gap-7 font-outfit font-black text-sm">
          <a href="#katalog" class="link-under-link hover:text-neo-violet">Katalog Buku</a>
          <a href="#kategori" class="link-under-link hover:text-neo-violet">Kategori</a>
          <a href="#ulasan" class="link-under-link hover:text-neo-violet">Ulasan Pembeli</a>
          <a href="#kontak" class="link-under-link hover:text-neo-violet">Kontak</a>
        </nav>

        <div class="flex items-center gap-2 sm:gap-3">
          <button
            class="neubrutal-btn bg-white border-2 md:border-3 border-black w-10 h-10 md:w-64 lg:w-80 md:px-3.5 rounded-[2px] shadow-neo-sm hover:bg-gray-100 flex items-center justify-center md:justify-between shrink-0 transition-all"
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

            <span
              v-if="cartBadge > 0"
              class="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-black text-white border-2 border-black rounded-full text-[10px] font-outfit font-black flex items-center justify-center leading-none pointer-events-none shadow-[1px_1px_0px_0px_#fff]"
            >
              {{ cartBadge }}
            </span>
          </button>

          <!-- Admin Quick Access Badge (Visible on desktop) -->
          <router-link
            v-if="state.isLoggedIn && state.userRole === 'admin'"
            to="/admin"
            class="hidden md:flex neubrutal-btn bg-neo-violet text-white border-2 md:border-3 border-black px-3 h-10 rounded-[2px] font-outfit font-black text-xs shadow-neo-sm hover:bg-purple-700 items-center gap-1.5 shrink-0"
            title="Buka Panel Admin"
          >
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <span class="hidden xl:inline">Admin Panel</span>
          </router-link>

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
          <div v-else ref="userMenuRef" class="relative hidden md:block">
            <button
              class="neubrutal-btn flex items-center gap-2 bg-white border-2 md:border-3 border-black pl-1.5 pr-3 h-10 rounded-[2px] shadow-neo-sm hover:bg-gray-50 transition-colors"
              @click.stop="userMenuOpen = !userMenuOpen"
            >
              <div
                class="w-7 h-7 rounded-[2px] bg-neo-violet text-white border border-black flex items-center justify-center font-outfit font-black text-xs"
              >
                {{ state.userName.slice(0, 2).toUpperCase() }}
              </div>
              <span class="font-outfit font-extrabold text-xs max-w-[110px] truncate">{{
                state.userName.split(' ')[0]
              }}</span>
              <svg class="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            <div
              v-if="userMenuOpen"
              class="absolute right-0 top-full mt-2 w-64 bg-white border-3 border-black rounded-[2px] p-2.5 z-50 shadow-neo animate-hero-entrance"
            >
              <div class="px-2.5 py-2 bg-neutral-100 border border-black/20 rounded-[2px] mb-2">
                <div class="flex items-center justify-between gap-1">
                  <p class="font-outfit font-black text-xs text-black truncate">{{ state.userName }}</p>
                  <span
                    class="border border-black px-1.5 py-0.2 text-[9px] font-outfit font-black uppercase rounded-[2px]"
                    :class="state.userRole === 'admin' ? 'bg-neo-violet text-white' : 'bg-neo-lime text-black'"
                  >
                    {{ state.userRole === 'admin' ? 'ADMIN' : 'MEMBER' }}
                  </span>
                </div>
                <p class="font-sans text-[10px] text-muted-foreground truncate">{{ state.userEmail }}</p>
              </div>

              <div class="space-y-1">
                <router-link
                  to="/admin"
                  class="flex items-center justify-between px-2.5 py-2 rounded-[2px] font-outfit font-bold text-xs hover:bg-neo-yellow hover:text-black transition-colors group"
                  @click="userMenuOpen = false"
                >
                  <span class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-black" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                    Panel Admin Toko
                  </span>
                  <span class="text-[9px] font-mono bg-neo-violet text-white px-1.5 py-0.2 rounded-[2px]">Admin</span>
                </router-link>

                <router-link
                  to="/dashboard"
                  class="flex items-center gap-2 px-2.5 py-2 rounded-[2px] font-outfit font-bold text-xs hover:bg-neo-yellow hover:text-black transition-colors"
                  @click="userMenuOpen = false"
                >
                  <svg class="w-4 h-4 text-black" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  Dashboard Pembeli
                </router-link>

                <button
                  type="button"
                  class="w-full flex items-center justify-between px-2.5 py-2 rounded-[2px] font-outfit font-bold text-xs text-left bg-gray-50 hover:bg-neo-lime hover:text-black transition-colors border border-black/20"
                  @click="toggleRole"
                >
                  <span class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-black" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    Switch: {{ state.userRole === 'admin' ? 'ke Akun User' : 'ke Akun Admin' }}
                  </span>
                </button>
              </div>

              <div class="border-t border-black my-2"></div>

              <button
                class="w-full flex items-center gap-2 px-2.5 py-2 rounded-[2px] font-outfit font-bold text-xs text-red-600 hover:bg-red-50 transition-colors"
                @click="handleLogout"
              >
                <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                Keluar dari Akun
              </button>
            </div>
          </div>

          <button
            class="lg:hidden neubrutal-btn bg-white w-10 h-10 rounded-[2px] border-2 border-black shadow-neo-sm flex items-center justify-center shrink-0 hover:bg-gray-100 transition-colors"
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

    <transition name="drawer">
      <div
        v-if="state.isSidebarOpen"
        class="fixed inset-y-0 left-0 w-full max-w-[280px] sm:max-w-xs md:max-w-sm bg-background z-50 lg:hidden border-r-3 sm:border-r-4 border-black shadow-[6px_0px_0px_0px_#000] sm:shadow-[8px_0px_0px_0px_#000] flex flex-col"
      >
        <div class="flex items-center justify-between p-4 sm:p-5 border-b-4 border-black bg-white">
          <router-link to="/" class="flex items-center gap-2" @click="closeMobile">
            <div class="flex flex-col">
              <div class="flex items-center gap-1.5">
                <span
                  class="font-outfit font-black text-2xl md:text-xl tracking-tight leading-none text-black"
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
          class="flex flex-col px-6 py-4 gap-1 font-outfit font-black text-base flex-1 overflow-y-auto"
        >
          <a
            href="#katalog"
            class="py-2.5 border-b-2 border-black/10 hover:text-neo-violet flex items-center justify-between"
            @click="navigateToSection('#katalog')"
          >
            <span>Katalog Buku</span>
            <span class="text-xs font-mono text-muted-foreground">→</span>
          </a>
          <a
            href="#kategori"
            class="py-2.5 border-b-2 border-black/10 hover:text-neo-violet flex items-center justify-between"
            @click="navigateToSection('#kategori')"
          >
            <span>Kategori</span>
            <span class="text-xs font-mono text-muted-foreground">→</span>
          </a>
          <a
            href="#ulasan"
            class="py-2.5 border-b-2 border-black/10 hover:text-neo-violet flex items-center justify-between"
            @click="navigateToSection('#ulasan')"
          >
            <span>Ulasan Pembeli</span>
            <span class="text-xs font-mono text-muted-foreground">→</span>
          </a>
          <a
            href="#kontak"
            class="py-2.5 border-b-2 border-black/10 hover:text-neo-violet flex items-center justify-between"
            @click="navigateToSection('#kontak')"
          >
            <span>Kontak</span>
            <span class="text-xs font-mono text-muted-foreground">→</span>
          </a>

          <div class="pt-3 pb-1 text-[11px] font-sans font-extrabold uppercase text-muted-foreground tracking-wider">
            Portal Akun & Manajemen
          </div>

          <router-link
            to="/dashboard"
            class="py-2.5 border-b-2 border-black/10 hover:text-neo-violet flex items-center justify-between"
            @click="closeMobile"
          >
            <span class="flex items-center gap-2">
              <svg class="w-4 h-4 text-black" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              Dashboard Pembeli
            </span>
            <span class="bg-neo-lime text-black text-[9px] font-outfit font-black px-1.5 py-0.5 rounded-[2px] border border-black">User</span>
          </router-link>

          <router-link
            to="/admin"
            class="py-2.5 border-b-2 border-black/10 hover:text-neo-violet flex items-center justify-between"
            @click="closeMobile"
          >
            <span class="flex items-center gap-2">
              <svg class="w-4 h-4 text-neo-violet" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              Panel Admin Toko
            </span>
            <span class="bg-neo-violet text-white text-[9px] font-outfit font-black px-1.5 py-0.5 rounded-[2px] border border-black">Admin</span>
          </router-link>
        </nav>

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
              class="w-full neubrutal-btn bg-white text-black border-3 border-black py-3 rounded-[2px] font-outfit font-black text-center shadow-neo block hover:bg-gray-100"
              @click="closeMobile"
            >
              Daftar Akun Baru
            </router-link>
          </div>
          <div v-else class="flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5 min-w-0">
                <div
                  class="w-8 h-8 rounded-[2px] bg-neo-violet text-white border-2 border-black flex items-center justify-center font-outfit font-black text-xs shadow-neo-sm shrink-0"
                >
                  {{ state.userName.slice(0, 2).toUpperCase() }}
                </div>
                <div class="truncate">
                  <span class="font-outfit font-black text-sm block truncate">{{ state.userName }}</span>
                  <span class="text-[10px] font-mono text-muted-foreground uppercase">{{ state.userRole }}</span>
                </div>
              </div>
              <button
                class="neubrutal-btn bg-red-100 text-red-700 border-2 border-black px-3 py-1.5 rounded-[2px] font-outfit font-black text-xs hover:bg-red-200 shadow-neo-sm shrink-0"
                @click="handleMobileLogout"
              >
                Keluar
              </button>
            </div>
            <button
              class="neubrutal-btn w-full bg-neo-lime text-black border-2 border-black py-2 rounded-[2px] font-outfit font-black text-xs shadow-neo-sm text-center"
              @click="toggleRole"
            >
              Mode: {{ state.userRole === 'admin' ? 'Admin (Klik ubah ke User)' : 'User (Klik ubah ke Admin)' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>
