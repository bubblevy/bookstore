<script setup>
import HeroSection from '@/components/HeroSection.vue'
import StatsBar from '@/components/StatsBar.vue'
import FeaturedBooksSection from '@/components/FeaturedBooksSection.vue'
import VibeSection from '@/components/VibeSection.vue'
import CategoriesSection from '@/components/CategoriesSection.vue'
import TestimonialsSection from '@/components/TestimonialsSection.vue'
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
