<script setup>
const props = defineProps({
  class: String,
  hover: {
    type: Boolean,
    default: true,
  },
})
</script>

<template>
  <div
    :class="[
      'bg-card text-card-foreground border-2 border-black rounded-[2px] shadow-[4px_4px_0px_0px_#000]',
      props.hover ? 'transition-all duration-150 hover:-translate-x-[3px] hover:-translate-y-[3px] hover:shadow-[7px_7px_0px_0px_#000] cursor-pointer' : '',
      props.class,
    ].filter(Boolean).join(' ')"
  >
    <slot />
  </div>
</template>
