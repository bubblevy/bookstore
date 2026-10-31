<script setup>
defineProps({
  show: { type: Boolean, default: true },
  text: { type: String, default: '' },
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade-loader">
      <div
        v-if="show"
        class="fixed inset-0 z-[9999] bg-background backdrop-blur-2xl flex items-center justify-center select-none loader-backdrop"
        aria-live="polite"
        role="status"
      >
                <div class="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                    <svg
            class="w-full h-full animate-spin text-black"
            viewBox="0 0 50 50"
          >
            <circle
              cx="25"
              cy="25"
              r="20"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-dasharray="85 45"
            />
          </svg>

                    <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg
              class="w-6 h-6 sm:w-7 sm:h-7 text-black"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              viewBox="0 0 24 24"
            >
              <path
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.loader-backdrop {
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
}

.fade-loader-enter-active,
.fade-loader-leave-active {
  transition: opacity 0.25s ease;
}
.fade-loader-enter-from,
.fade-loader-leave-to {
  opacity: 0;
}
</style>
