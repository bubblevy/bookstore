<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'primary', // primary | secondary | yellow | orange | lime | outline
  },
  size: {
    type: String,
    default: 'default', // xs | sm | default
  },
  class: String,
})

const classes = computed(() => {
  const base =
    'inline-flex items-center justify-center font-outfit font-black uppercase tracking-wide border-2 border-black rounded-[2px] shadow-neo-sm'

  const variants = {
    primary: 'bg-neo-violet text-white',
    secondary: 'bg-black text-white',
    yellow: 'bg-neo-yellow text-black',
    orange: 'bg-neo-orange text-white',
    lime: 'bg-neo-lime text-black',
    outline: 'bg-white text-black',
  }

  const sizes = {
    xs: 'h-5 px-1.5 text-[9px]',
    sm: 'h-6 px-2 text-[10px]',
    default: 'h-7 px-3 text-xs',
  }

  return [base, variants[props.variant] || variants.primary, sizes[props.size] || sizes.default, props.class]
    .filter(Boolean)
    .join(' ')
})
</script>

<template>
  <span :class="classes">
    <slot />
  </span>
</template>
