<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import CartDrawer from '@/components/CartDrawer.vue'
import SearchModal from '@/components/SearchModal.vue'
import QuickViewModal from '@/components/QuickViewModal.vue'
import ToastNotification from '@/components/ToastNotification.vue'
import { useStore } from '@/composables/useStore'

const { state } = useStore()

watch(
  () => state.isCartOpen || state.isSidebarOpen || Boolean(state.activeModal),
  (isLocked) => {
    if (typeof document !== 'undefined') {
      if (isLocked) {
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = ''
      }
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
})

onMounted(() => {
  if (typeof IntersectionObserver === 'undefined') return
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.1 },
  )
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))

  const mo = new MutationObserver(() => {
    document.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => observer.observe(el))
  })
  mo.observe(document.body, { childList: true, subtree: true })
})
</script>

<template>
  <div
    class="min-h-screen flex flex-col bg-background font-sans text-foreground selection:bg-neo-yellow selection:text-black"
  >
    <AppHeader />
    <main class="flex-1">
      <router-view />
    </main>
    <AppFooter />

    <CartDrawer />
    <SearchModal />
    <QuickViewModal />
    <ToastNotification />
  </div>
</template>
