<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { POLICIES } from '@/data/policies'

const route = useRoute()
const policy = computed(() => POLICIES[route.meta.policy] || POLICIES.terms)
</script>

<template>
  <div class="min-h-screen bg-background py-8 sm:py-12">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <RouterLink
        to="/"
        class="inline-flex items-center gap-2 font-outfit font-black text-xs uppercase text-muted-foreground hover:text-black mb-6"
      >
        <span aria-hidden="true">←</span>
        Kembali ke Beranda
      </RouterLink>

      <article
        class="bg-white border-3 sm:border-4 border-black rounded-[2px] shadow-neo overflow-hidden"
      >
        <header class="bg-neo-yellow border-b-3 border-black p-5 sm:p-7">
          <p class="font-sans text-[10px] font-extrabold uppercase tracking-[0.16em] text-black/70">
            BookStore Indonesia
          </p>
          <h1 class="font-outfit font-black text-2xl sm:text-3xl leading-tight mt-1">
            {{ policy.title }}
          </h1>
          <p class="font-sans text-xs sm:text-sm font-semibold text-black/70 mt-2">
            {{ policy.intro }}
          </p>
        </header>

        <div class="p-5 sm:p-7 space-y-6">
          <section v-for="(section, index) in policy.sections" :key="section.heading">
            <h2 class="font-outfit font-black text-base sm:text-lg text-black">
              {{ index + 1 }}. {{ section.heading }}
            </h2>
            <p class="font-sans text-sm font-semibold text-gray-700 mt-1 leading-relaxed">
              {{ section.body }}
            </p>
          </section>

          <p
            class="font-sans text-[11px] font-semibold text-muted-foreground border-t-2 border-black/10 pt-4"
          >
            Terakhir diperbarui: 25 Oktober 2026. Pertanyaan dapat disampaikan melalui kanal kontak
            di footer.
          </p>
        </div>
      </article>
    </div>
  </div>
</template>
