<script setup>
defineProps({
  modelValue: String,
  placeholder: String,
  type: {
    type: String,
    default: 'text',
  },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <input
    :value="modelValue"
    :type="type"
    :placeholder="placeholder"
    @input="$emit('update:modelValue', $event.target.value)"
    class="w-full h-11 px-4 bg-white border-2 border-black rounded-[2px] font-sans text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-black transition-all"
  />
</template>
