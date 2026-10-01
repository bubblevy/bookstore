<script setup>
import { computed } from 'vue'

const props = defineProps({
  // Visual theme: violet | yellow | orange | lime | black
  theme: { type: String, default: 'violet' },
  // Title shown on the cover
  title: { type: String, default: 'BOOK' },
  // Author or subtitle shown at the bottom
  author: { type: String, default: 'AUTHOR' },
  // Badge text shown at the top right
  badge: { type: String, default: '' },
  // Accent color for the central illustration (hex)
  accent: { type: String, default: '' },
})

const themeMap = {
  violet: { bg: '#8847F5', text: '#FFFFFF', subText: '#D8FA00', spine: '#6F2ED6', accent: '#D8FA00' },
  yellow: { bg: '#D8FA00', text: '#000000', subText: '#000000', spine: '#BCE000', accent: '#8847F5' },
  orange: { bg: '#FF7B29', text: '#FFFFFF', subText: '#CBFF00', spine: '#E86312', accent: '#CBFF00' },
  lime: { bg: '#CBFF00', text: '#000000', subText: '#000000', spine: '#B5E600', accent: '#8847F5' },
  black: { bg: '#000000', text: '#D8FA00', subText: '#FFFFFF', spine: '#222222', accent: '#FF7B29' },
}

const colors = computed(() => themeMap[props.theme] || themeMap.violet)
const accentColor = computed(() => props.accent || colors.value.accent)
</script>

<template>
  <svg viewBox="0 0 200 250" xmlns="http://www.w3.org/2000/svg" class="w-full h-full block select-none">
    <!-- Book outer cover -->
    <rect x="4" y="4" width="192" height="242" rx="10" :fill="colors.bg" stroke="#000" stroke-width="4" />

    <!-- Spine with brutalist lines -->
    <rect x="4" y="4" width="18" height="242" rx="6" :fill="colors.spine" stroke="#000" stroke-width="4" />
    <line x1="12" y1="12" x2="12" y2="238" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-dasharray="8 6" />

    <!-- Top decorative pill stamp -->
    <rect x="32" y="16" width="60" height="16" rx="4" fill="#000" />
    <text x="62" y="28" text-anchor="middle" font-family="Outfit, sans-serif" font-weight="900" font-size="8" fill="#D8FA00" letter-spacing="1.5">
      EDISI RESMI
    </text>

    <!-- Optional top-right badge -->
    <g v-if="badge" transform="translate(136, 14)">
      <rect x="0" y="0" width="52" height="20" rx="4" fill="#D8FA00" stroke="#000" stroke-width="2" />
      <text x="26" y="13" text-anchor="middle" font-family="Outfit, sans-serif" font-weight="900" font-size="8" fill="#000" letter-spacing="0.5">
        {{ badge.slice(0, 8) }}
      </text>
    </g>

    <!-- Title block -->
    <g transform="translate(108, 68)">
      <!-- Line 1 -->
      <text
        x="0"
        y="0"
        text-anchor="middle"
        font-family="Outfit, sans-serif"
        font-weight="900"
        font-size="15"
        :fill="colors.text"
        letter-spacing="1"
      >
        {{ title.length > 13 ? title.slice(0, 13).toUpperCase() : title.toUpperCase() }}
      </text>
      <!-- Line 2 (if long) -->
      <text
        v-if="title.length > 13"
        x="0"
        y="18"
        text-anchor="middle"
        font-family="Outfit, sans-serif"
        font-weight="900"
        font-size="14"
        :fill="colors.text"
        letter-spacing="1"
      >
        {{ title.slice(13, 26).toUpperCase() }}
      </text>
    </g>

    <!-- Central graphic: Neubrutalist geometric book emblem -->
    <g transform="translate(56, 108)">
      <!-- Backdrop block shadow -->
      <rect x="6" y="6" width="94" height="66" rx="6" fill="#000" />
      <!-- Main card -->
      <rect x="0" y="0" width="94" height="66" rx="6" fill="#FFFFFF" stroke="#000" stroke-width="3" />

      <!-- Center icon / shape -->
      <circle cx="47" cy="33" r="22" :fill="accentColor" stroke="#000" stroke-width="2.5" />
      <!-- Stylized star / diamond symbol -->
      <path d="M 47 18 L 51 29 L 62 33 L 51 37 L 47 48 L 43 37 L 32 33 L 43 29 Z" fill="#000" />
      <circle cx="47" cy="33" r="3" fill="#FFFFFF" />

      <!-- Corner ticks -->
      <line x1="8" y1="8" x2="16" y2="8" stroke="#000" stroke-width="2" />
      <line x1="8" y1="8" x2="8" y2="16" stroke="#000" stroke-width="2" />
      <line x1="86" y1="58" x2="78" y2="58" stroke="#000" stroke-width="2" />
      <line x1="86" y1="58" x2="86" y2="50" stroke="#000" stroke-width="2" />
    </g>

    <!-- Divider bar -->
    <line x1="32" y1="202" x2="186" y2="202" stroke="#000" stroke-width="2.5" />

    <!-- Author block (bottom) -->
    <text
      x="109"
      y="222"
      text-anchor="middle"
      font-family="Outfit, sans-serif"
      font-weight="800"
      font-size="10.5"
      :fill="colors.text"
      letter-spacing="1.5"
    >
      {{ author.toUpperCase() }}
    </text>

    <!-- Barcode / detail line (bottom right) -->
    <g transform="translate(142, 230)">
      <line x1="0" y1="0" x2="0" y2="8" stroke="#000" stroke-width="1.5" />
      <line x1="3" y1="0" x2="3" y2="8" stroke="#000" stroke-width="2.5" />
      <line x1="8" y1="0" x2="8" y2="8" stroke="#000" stroke-width="1" />
      <line x1="12" y1="0" x2="12" y2="8" stroke="#000" stroke-width="3" />
      <line x1="18" y1="0" x2="18" y2="8" stroke="#000" stroke-width="1.5" />
      <line x1="24" y1="0" x2="24" y2="8" stroke="#000" stroke-width="2" />
      <line x1="30" y1="0" x2="30" y2="8" stroke="#000" stroke-width="1.5" />
      <line x1="36" y1="0" x2="36" y2="8" stroke="#000" stroke-width="2.5" />
      <line x1="42" y1="0" x2="42" y2="8" stroke="#000" stroke-width="1" />
    </g>
  </svg>
</template>
