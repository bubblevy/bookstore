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
    <!-- Band 1: Hero Section (Wisdom Violet full-width) -->
    <HeroSection />

    <!-- Band 2: Book Categories (White full-width, right after Hero) -->
    <CategoriesSection />

    <!-- Band 3: Stats Metrics Bar (Lime full-width) -->
    <StatsBar />

    <!-- Band 4: Main Book Catalog (Neutral Background full-width) -->
    <FeaturedBooksSection />

    <!-- Band 5: The Vibe / Curatorial Philosophy (Luminous Yellow full-width) -->
    <VibeSection />

    <!-- Band 6: Reader Testimonials (Vibrant Orange full-width) -->
    <TestimonialsSection />
  </div>
</template>
