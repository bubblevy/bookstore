<script setup>
import { computed } from 'vue'

const props = defineProps({
  theme: { type: String, default: 'violet' },

  title: { type: String, default: 'BOOK' },

  author: { type: String, default: 'AUTHOR' },

  badge: { type: String, default: '' },

  accent: { type: String, default: '' },
})

const themeMap = {
  violet: {
    bg: 'var(--color-violet)',
    text: 'var(--color-white)',
    subText: 'var(--color-yellow)',
    spine: 'var(--color-violet-dark)',
    accent: 'var(--color-yellow)',
    tagText: 'var(--color-yellow)',
    badgeBg: 'var(--color-yellow)',
    badgeText: 'var(--color-black)',
  },
  yellow: {
    bg: 'var(--color-yellow)',
    text: 'var(--color-black)',
    subText: 'var(--color-black)',
    spine: 'var(--color-yellow-dark)',
    accent: 'var(--color-violet)',
    tagText: 'var(--color-yellow)',
    badgeBg: 'var(--color-violet)',
    badgeText: 'var(--color-white)',
  },
  orange: {
    bg: 'var(--color-orange)',
    text: 'var(--color-white)',
    subText: 'var(--color-lime)',
    spine: 'var(--color-orange-dark)',
    accent: 'var(--color-lime)',
    tagText: 'var(--color-lime)',
    badgeBg: 'var(--color-lime)',
    badgeText: 'var(--color-black)',
  },
  lime: {
    bg: 'var(--color-lime)',
    text: 'var(--color-black)',
    subText: 'var(--color-black)',
    spine: 'var(--color-lime-dark)',
    accent: 'var(--color-violet)',
    tagText: 'var(--color-black)',
    badgeBg: 'var(--color-black)',
    badgeText: 'var(--color-white)',
  },
  black: {
    bg: 'var(--color-zinc-900)',
    text: 'var(--color-white)',
    subText: 'var(--color-zinc-300)',
    spine: 'var(--color-zinc-800)',
    accent: 'var(--color-zinc-200)',
    tagText: 'var(--color-white)',
    badgeBg: 'var(--color-white)',
    badgeText: 'var(--color-black)',
  },
}

const colors = computed(() => themeMap[props.theme] || themeMap.black)
const accentColor = computed(() => props.accent || colors.value.accent)
</script>

<template>
  <svg
    viewBox="0 0 200 250"
    xmlns="http://www.w3.org/2000/svg"
    class="w-full h-full block select-none"
  >
    <rect
      x="4"
      y="4"
      width="192"
      height="242"
      rx="10"
      :fill="colors.bg"
      stroke="var(--color-black)"
      stroke-width="4"
    />

    <rect
      x="4"
      y="4"
      width="18"
      height="242"
      rx="6"
      :fill="colors.spine"
      stroke="var(--color-black)"
      stroke-width="4"
    />
    <line
      x1="12"
      y1="12"
      x2="12"
      y2="238"
      stroke="var(--color-white)"
      stroke-width="2"
      stroke-linecap="round"
      stroke-dasharray="8 6"
    />

    <rect x="32" y="16" width="60" height="16" rx="4" fill="var(--color-black)" />
    <text
      x="62"
      y="28"
      text-anchor="middle"
      font-family="Outfit, sans-serif"
      font-weight="900"
      font-size="8"
      :fill="colors.tagText || 'var(--color-yellow)'"
      letter-spacing="1.5"
    >
      EDISI RESMI
    </text>

    <g v-if="badge" transform="translate(136, 14)">
      <rect
        x="0"
        y="0"
        width="52"
        height="20"
        rx="4"
        :fill="colors.badgeBg || 'var(--color-yellow)'"
        stroke="var(--color-black)"
        stroke-width="2"
      />
      <text
        x="26"
        y="13"
        text-anchor="middle"
        font-family="Outfit, sans-serif"
        font-weight="900"
        font-size="8"
        :fill="colors.badgeText || 'var(--color-black)'"
        letter-spacing="0.5"
      >
        {{ badge.slice(0, 8) }}
      </text>
    </g>

    <g transform="translate(108, 68)">
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

    <g transform="translate(56, 108)">
      <rect x="6" y="6" width="94" height="66" rx="6" fill="var(--color-black)" />

      <rect
        x="0"
        y="0"
        width="94"
        height="66"
        rx="6"
        fill="var(--color-white)"
        stroke="var(--color-black)"
        stroke-width="3"
      />

      <circle
        cx="47"
        cy="33"
        r="22"
        :fill="accentColor"
        stroke="var(--color-black)"
        stroke-width="2.5"
      />

      <path
        d="M 47 18 L 51 29 L 62 33 L 51 37 L 47 48 L 43 37 L 32 33 L 43 29 Z"
        fill="var(--color-black)"
      />
      <circle cx="47" cy="33" r="3" fill="var(--color-white)" />

      <line x1="8" y1="8" x2="16" y2="8" stroke="var(--color-black)" stroke-width="2" />
      <line x1="8" y1="8" x2="8" y2="16" stroke="var(--color-black)" stroke-width="2" />
      <line x1="86" y1="58" x2="78" y2="58" stroke="var(--color-black)" stroke-width="2" />
      <line x1="86" y1="58" x2="86" y2="50" stroke="var(--color-black)" stroke-width="2" />
    </g>

    <line x1="32" y1="202" x2="186" y2="202" stroke="var(--color-black)" stroke-width="2.5" />

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

    <g transform="translate(142, 230)">
      <line x1="0" y1="0" x2="0" y2="8" stroke="var(--color-black)" stroke-width="1.5" />
      <line x1="3" y1="0" x2="3" y2="8" stroke="var(--color-black)" stroke-width="2.5" />
      <line x1="8" y1="0" x2="8" y2="8" stroke="var(--color-black)" stroke-width="1" />
      <line x1="12" y1="0" x2="12" y2="8" stroke="var(--color-black)" stroke-width="3" />
      <line x1="18" y1="0" x2="18" y2="8" stroke="var(--color-black)" stroke-width="1.5" />
      <line x1="24" y1="0" x2="24" y2="8" stroke="var(--color-black)" stroke-width="2" />
      <line x1="30" y1="0" x2="30" y2="8" stroke="var(--color-black)" stroke-width="1.5" />
      <line x1="36" y1="0" x2="36" y2="8" stroke="var(--color-black)" stroke-width="2.5" />
      <line x1="42" y1="0" x2="42" y2="8" stroke="var(--color-black)" stroke-width="1" />
    </g>
  </svg>
</template>
