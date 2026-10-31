<script setup>
import { onMounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import HeroSection from '@/components/HeroSection.vue'
import StatsBar from '@/components/StatsBar.vue'
import FeaturedBooksSection from '@/components/FeaturedBooksSection.vue'
import VibeSection from '@/components/VibeSection.vue'
import CategoriesSection from '@/components/CategoriesSection.vue'
import TestimonialsSection from '@/components/TestimonialsSection.vue'
import { useStore } from '@/composables/useStore'
import AOS from 'aos'

const route = useRoute()
const { loadBooks, loadPopularBooks } = useStore()

function scrollToHash() {
  if (!route.hash) return
  nextTick(() => {
    setTimeout(() => {
      document.querySelector(route.hash)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 60)
  })
}

onMounted(() => {
  loadBooks({ per_page: 100 }).catch(() => {})
  loadPopularBooks({ per_page: 100 }).catch(() => {})
  nextTick(() => {
    setTimeout(() => {
      AOS.refreshHard()
    }, 100)
  })
  scrollToHash()
})

watch(() => route.hash, scrollToHash)
</script>

<template>
  <div class="w-full overflow-x-hidden">
    <HeroSection />
    <CategoriesSection />
    <VibeSection />
    <FeaturedBooksSection />
    <StatsBar />
    <TestimonialsSection />
  </div>
</template>
