<script setup>
import { computed } from 'vue'
import { orderStatusClass, orderStatusLabel } from '@/lib/orderStatus'

const props = defineProps({
  status: { type: String, default: '' },
  size: { type: String, default: 'sm' },
})

const label = computed(() => orderStatusLabel(props.status))
const className = computed(() => orderStatusClass(props.status))
</script>

<template>
  <span
    class="inline-block border-2 border-black rounded-[2px] font-outfit font-black capitalize shadow-neo-sm"
    :class="[className, size === 'xs' ? 'text-[10px] py-1 px-2.5' : 'text-xs py-1 px-3']"
  >
    {{ label }}
  </span>
</template>
