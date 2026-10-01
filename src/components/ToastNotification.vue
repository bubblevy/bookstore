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
        <div class="flex items-center gap-2">
          <span>{{ t.type === 'success' ? '⚡' : t.type === 'error' ? '⚠️' : 'ℹ️' }}</span>
          <span>{{ t.message }}</span>
        </div>
        <button class="font-bold text-xs hover:opacity-75 p-1" @click.stop="dismiss(t.id)">
          ✕
        </button>
      </div>
    </transition-group>
  </div>
</template>
