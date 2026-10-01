<script setup>
import { ref, onMounted } from 'vue'
import { onToast } from '@/composables/useStore'

const toasts = ref([])

onMounted(() => {
  onToast((toast) => {
    toasts.value.push(toast)
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== toast.id)
    }, 3800)
  })
})

function dismiss(id) {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

function getStyle(type) {
  switch (type) {
    case 'success':
      return 'bg-neo-yellow text-black border-3 border-black shadow-neo'
    case 'error':
      return 'bg-neo-orange text-white border-3 border-black shadow-neo'
    default:
      return 'bg-neo-violet text-white border-3 border-black shadow-neo'
  }
}
</script>

<template>
  <div class="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none select-none">
    <transition-group name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        :class="['pointer-events-auto p-3.5 rounded-[2px] font-outfit font-black text-xs md:text-sm flex items-center justify-between gap-3 cursor-pointer', getStyle(t.type)]"
        @click="dismiss(t.id)"
      >
        <div class="flex items-center gap-2.5">
          <!-- Clean SVG status icon -->
          <svg v-if="t.type === 'success'" class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <svg v-else-if="t.type === 'error'" class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <svg v-else class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>{{ t.message }}</span>
        </div>
        <button class="font-bold text-xs hover:opacity-75 p-1 shrink-0" aria-label="Tutup" @click.stop="dismiss(t.id)">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </transition-group>
  </div>
</template>
