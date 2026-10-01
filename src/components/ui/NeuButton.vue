<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'primary', // primary | secondary | yellow | orange | lime | outline | ghost
  },
  size: {
    type: String,
    default: 'default', // xs | sm | default | lg
  },
  class: String,
})

const classes = computed(() => {
  const base =
    'inline-flex items-center justify-center gap-2 font-outfit font-black rounded-[2px] transition-all duration-100 cursor-pointer border-3 border-black active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'

  const variants = {
    primary:
      'bg-neo-violet text-white shadow-neo hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-violet-600',
    secondary:
      'bg-black text-white shadow-neo hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-neutral-900',
    yellow:
      'bg-neo-yellow text-black shadow-neo hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-yellow-300',
    orange:
      'bg-neo-orange text-white shadow-neo hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-orange-600',
    lime:
      'bg-neo-lime text-black shadow-neo hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-lime-400',
    outline:
      'bg-white text-black shadow-neo hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-yellow-50',
    ghost:
      'bg-transparent text-black border-transparent shadow-none hover:bg-black/5',
  }

  const sizes = {
    xs: 'h-8 px-3 text-xs [&_svg]:size-3',
    sm: 'h-9 px-4 text-xs md:text-sm [&_svg]:size-4',
    default: 'h-11 px-6 text-sm [&_svg]:size-4',
    lg: 'h-12 px-8 text-base [&_svg]:size-5',
  }

  return [base, variants[props.variant] || variants.primary, sizes[props.size] || sizes.default, props.class]
    .filter(Boolean)
    .join(' ')
})
</script>

<template>
  <button :class="classes">
    <slot />
  </button>
</template>
