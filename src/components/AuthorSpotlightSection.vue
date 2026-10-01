<script setup>
import { ref } from 'vue'
import { authorSpotlight } from '@/data/catalog'
import BookArt from './BookArt.vue'
import { useStore } from '@/composables/useStore'

const { showToast } = useStore()
const following = ref(false)
const followersCount = ref(128400)

function toggleFollow() {
  following.value = !following.value
  followersCount.value += following.value ? 1 : -1
  showToast(
    following.value
      ? `Kamu mulai mengikuti ${authorSpotlight.name}!`
      : `Berhenti mengikuti ${authorSpotlight.name}.`,
    { type: 'success' },
  )
}
</script>

<template>
  <section id="penulis" class="max-w-7xl mx-auto px-4 py-8 md:py-12 select-none">
    <!-- Bento Box Container with Wisdom Violet Theme -->
    <div
      class="bg-white border-4 border-black rounded-2xl md:rounded-3xl p-6 sm:p-8 md:p-10 shadow-neo md:shadow-neo-lg"
    >
      <div class="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 pb-6 border-b-3 border-black">
        <div class="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <!-- Author Avatar -->
          <div
            class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-3 border-black bg-neo-yellow p-2 shadow-neo-sm shrink-0 flex items-center justify-center overflow-hidden"
          >
            <BookArt name="reader" />
          </div>

          <!-- Author Info -->
          <div class="space-y-1.5 max-w-lg">
            <div class="inline-block bg-neo-violet text-white border-2 border-black px-2.5 py-0.5 rounded font-outfit font-black text-[10px] uppercase shadow-neo-sm">
              {{ authorSpotlight.badge }}
            </div>
            <h3 class="font-outfit font-black text-2xl sm:text-3xl leading-tight">
              {{ authorSpotlight.name }}
            </h3>
            <p class="font-outfit font-bold text-xs text-neo-violet">
              {{ authorSpotlight.handle }} · <span class="text-muted-foreground">{{ authorSpotlight.title }}</span>
            </p>
            <p class="font-sans text-xs sm:text-sm font-semibold text-muted-foreground leading-relaxed pt-1">
              {{ authorSpotlight.bio }}
            </p>
          </div>
        </div>

        <!-- Follow CTA Button -->
        <div class="shrink-0 flex gap-2">
          <button
            class="neubrutal-btn border-3 border-black py-2.5 px-6 rounded-xl font-outfit font-black text-xs sm:text-sm shadow-neo transition-all"
            :class="following ? 'bg-neo-lime text-black' : 'bg-neo-yellow text-black hover:bg-yellow-300'"
            @click="toggleFollow"
          >
            {{ following ? 'Mengikuti ✓' : '+ Ikuti Penulis' }}
          </button>
        </div>
      </div>

      <!-- Stats Numbers Row -->
      <div class="grid grid-cols-3 gap-3 md:gap-6 pt-6">
        <div class="bg-background border-3 border-black rounded-xl p-3 sm:p-4 text-center shadow-neo-sm">
          <span class="block font-outfit font-black text-xl sm:text-3xl leading-none">
            {{ followersCount.toLocaleString('id-ID') }}
          </span>
          <p class="font-sans text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">
            Pengikut Setia
          </p>
        </div>
        <div class="bg-background border-3 border-black rounded-xl p-3 sm:p-4 text-center shadow-neo-sm">
          <span class="block font-outfit font-black text-xl sm:text-3xl leading-none">
            {{ authorSpotlight.books }}
          </span>
          <p class="font-sans text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">
            Buku Terbit
          </p>
        </div>
        <div class="bg-background border-3 border-black rounded-xl p-3 sm:p-4 text-center shadow-neo-sm">
          <span class="block font-outfit font-black text-xl sm:text-3xl leading-none">
            {{ authorSpotlight.awards }}
          </span>
          <p class="font-sans text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">
            Penghargaan
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
