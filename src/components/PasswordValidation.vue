<script setup>
import { computed } from 'vue'
import { getPasswordStrength } from '@/lib/password'

const props = defineProps({
  password: { type: String, default: '' },
  confirm: { type: String, default: null },
})

const strength = computed(() => getPasswordStrength(props.password))
const matched = computed(() => Boolean(props.confirm) && props.confirm === props.password)
</script>

<template>
  <div class="border-2 border-black bg-white p-3">
    <div class="flex items-center justify-between mb-2">
      <span class="font-outfit font-black text-[10px] uppercase text-muted-foreground">
        Validasi password
      </span>
      <span
        class="font-outfit font-black text-[10px] uppercase border border-black px-1.5 py-0.5"
        :class="
          strength.score === 4
            ? 'bg-green-600 text-white'
            : strength.score >= 2
              ? 'bg-neo-yellow text-black'
              : 'bg-gray-200 text-black'
        "
      >
        {{ strength.label }}
      </span>
    </div>

    <div class="h-1.5 border border-black bg-gray-200 overflow-hidden mb-2.5">
      <div
        class="h-full transition-all duration-300"
        :class="strength.color"
        :style="{ width: `${strength.percent}%` }"
      ></div>
    </div>

    <ul class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
      <li v-for="rule in strength.rules" :key="rule.key" class="flex items-center gap-1.5">
        <span
          class="w-3.5 h-3.5 border border-black flex items-center justify-center shrink-0 transition-colors"
          :class="rule.ok ? 'bg-green-600' : 'bg-white'"
        >
          <svg
            v-if="rule.ok"
            class="w-2.5 h-2.5 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <span
          class="font-sans text-[10px] font-semibold"
          :class="rule.ok ? 'text-green-700' : 'text-muted-foreground'"
        >
          {{ rule.label }}
        </span>
      </li>
    </ul>

    <p
      v-if="confirm !== null && confirm"
      class="mt-2 flex items-center gap-1.5 font-sans text-[10px] font-semibold"
      :class="matched ? 'text-green-700' : 'text-red-600'"
    >
      <span
        class="w-3.5 h-3.5 border border-black flex items-center justify-center shrink-0 transition-colors"
        :class="matched ? 'bg-green-600' : 'bg-red-500'"
      >
        <svg
          v-if="matched"
          class="w-2.5 h-2.5 text-white"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="4"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
        <svg
          v-else
          class="w-2.5 h-2.5 text-white"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="4"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </span>
      {{ matched ? 'Password cocok' : 'Password belum cocok' }}
    </p>
  </div>
</template>
