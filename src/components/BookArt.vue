<script setup>
defineProps({
  name: { type: String, required: true },
})
</script>

<template>
  <svg v-if="name === 'open-book'" viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="100" cy="148" rx="80" ry="6" fill="#000" opacity="0.12" />

    <path
      d="M 20 40 Q 60 30 100 50 L 100 130 Q 60 115 20 125 Z"
      fill="#FFFFFF"
      stroke="#000"
      stroke-width="3"
    />

    <path
      d="M 180 40 Q 140 30 100 50 L 100 130 Q 140 115 180 125 Z"
      fill="#FFFFFF"
      stroke="#000"
      stroke-width="3"
    />

    <path d="M 100 50 L 100 130" stroke="#000" stroke-width="3" />

    <path
      d="M 35 60 L 90 70 M 35 75 L 90 85 M 35 90 L 90 100"
      stroke="#000"
      stroke-width="2"
      stroke-linecap="round"
    />
    <path
      d="M 110 70 L 165 60 M 110 85 L 165 75 M 110 100 L 165 90"
      stroke="#000"
      stroke-width="2"
      stroke-linecap="round"
    />
  </svg>

  <svg v-else-if="name === 'stack-books'" viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="100" cy="150" rx="80" ry="5" fill="#000" opacity="0.12" />

    <rect
      x="20"
      y="110"
      width="160"
      height="28"
      rx="3"
      fill="#9FA0FF"
      stroke="#000"
      stroke-width="3"
    />
    <rect x="20" y="110" width="20" height="28" fill="#000" />
    <path d="M 50 124 L 170 124" stroke="#000" stroke-width="2" stroke-linecap="round" />

    <rect
      x="30"
      y="82"
      width="140"
      height="28"
      rx="3"
      fill="#FFEAA7"
      stroke="#000"
      stroke-width="3"
    />
    <rect x="30" y="82" width="18" height="28" fill="#000" />
    <circle cx="50" cy="96" r="4" fill="#D4FF00" stroke="#000" stroke-width="2" />
    <path d="M 65 96 L 160 96" stroke="#000" stroke-width="2" stroke-linecap="round" />

    <rect
      x="40"
      y="54"
      width="120"
      height="28"
      rx="3"
      fill="#D4FF00"
      stroke="#000"
      stroke-width="3"
    />
    <rect x="40" y="54" width="16" height="28" fill="#000" />
    <path
      d="M 65 68 L 70 64 M 75 68 L 80 64 M 85 68 L 90 64"
      stroke="#000"
      stroke-width="2"
      stroke-linecap="round"
    />
    <path d="M 100 68 L 150 68" stroke="#000" stroke-width="2" stroke-linecap="round" />
  </svg>

  <svg v-else-if="name === 'bookmark'" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M 15 10 L 85 10 L 85 130 L 50 105 L 15 130 Z"
      fill="#D4FF00"
      stroke="#000"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <path
      d="M 30 30 L 70 30 M 30 45 L 70 45 M 30 60 L 55 60"
      stroke="#000"
      stroke-width="2.5"
      stroke-linecap="round"
    />
  </svg>

  <svg v-else-if="name === 'coffee-book'" viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="100" cy="148" rx="80" ry="6" fill="#000" opacity="0.12" />

    <rect
      x="30"
      y="80"
      width="140"
      height="40"
      rx="3"
      fill="#FFEAA7"
      stroke="#000"
      stroke-width="3"
    />
    <rect x="30" y="80" width="14" height="40" fill="#000" />
    <path
      d="M 55 95 L 155 95 M 55 110 L 130 110"
      stroke="#000"
      stroke-width="2"
      stroke-linecap="round"
    />

    <path
      d="M 105 30 L 155 30 L 150 80 Q 145 88 130 88 Q 115 88 110 80 Z"
      fill="#FFFFFF"
      stroke="#000"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <ellipse cx="130" cy="30" rx="25" ry="6" fill="#6F4E37" stroke="#000" stroke-width="3" />

    <path
      d="M 122 18 Q 118 10 124 4"
      stroke="#000"
      stroke-width="2.5"
      fill="none"
      stroke-linecap="round"
    />
    <path
      d="M 138 18 Q 134 10 140 4"
      stroke="#000"
      stroke-width="2.5"
      fill="none"
      stroke-linecap="round"
    />

    <path d="M 155 40 Q 175 45 175 60 Q 175 75 155 75" stroke="#000" stroke-width="3" fill="none" />
  </svg>

  <svg v-else-if="name === 'reader'" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="55" r="30" fill="#FFEAA7" stroke="#000" stroke-width="3" />

    <path d="M 70 50 Q 100 20 130 50 L 130 35 Q 100 25 70 40 Z" fill="#000" />

    <path
      d="M 85 60 Q 90 65 95 60"
      stroke="#000"
      stroke-width="2.5"
      fill="none"
      stroke-linecap="round"
    />
    <path
      d="M 105 60 Q 110 65 115 60"
      stroke="#000"
      stroke-width="2.5"
      fill="none"
      stroke-linecap="round"
    />

    <path
      d="M 92 75 Q 100 80 108 75"
      stroke="#000"
      stroke-width="2.5"
      fill="none"
      stroke-linecap="round"
    />

    <path
      d="M 60 110 L 140 110 L 150 200 L 50 200 Z"
      fill="#9FA0FF"
      stroke="#000"
      stroke-width="3"
      stroke-linejoin="round"
    />

    <path d="M 70 130 L 50 165" stroke="#000" stroke-width="3" stroke-linecap="round" />
    <path d="M 130 130 L 150 165" stroke="#000" stroke-width="3" stroke-linecap="round" />

    <rect
      x="60"
      y="130"
      width="80"
      height="40"
      rx="3"
      fill="#D4FF00"
      stroke="#000"
      stroke-width="3"
    />
    <path d="M 100 130 L 100 170" stroke="#000" stroke-width="2" />
    <path
      d="M 70 145 L 90 145 M 70 155 L 90 155"
      stroke="#000"
      stroke-width="2"
      stroke-linecap="round"
    />
    <path
      d="M 110 145 L 130 145 M 110 155 L 130 155"
      stroke="#000"
      stroke-width="2"
      stroke-linecap="round"
    />
  </svg>

  <svg v-else-if="name === 'book-cover'" viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg">
    <rect
      x="5"
      y="5"
      width="110"
      height="150"
      rx="4"
      fill="#FFFFFF"
      stroke="#000"
      stroke-width="3"
    />
    <rect x="5" y="5" width="110" height="40" fill="#000" />
    <path
      d="M 15 20 L 105 20 M 15 28 L 85 28"
      stroke="#FFFFFF"
      stroke-width="2"
      stroke-linecap="round"
    />
    <circle cx="60" cy="95" r="22" fill="#D4FF00" stroke="#000" stroke-width="2.5" />
    <path
      d="M 50 95 L 58 103 L 72 87"
      stroke="#000"
      stroke-width="3"
      fill="none"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M 20 135 L 100 135 M 20 145 L 80 145"
      stroke="#000"
      stroke-width="2"
      stroke-linecap="round"
    />
  </svg>

  <svg v-else-if="name === 'sparkle'" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M 50 10 L 55 40 L 85 50 L 55 60 L 50 90 L 45 60 L 15 50 L 45 40 Z"
      fill="#FFEAA7"
      stroke="#000"
      stroke-width="3"
      stroke-linejoin="round"
    />
  </svg>

  <svg v-else-if="name === 'lightning'" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M 55 5 L 25 50 L 45 50 L 35 95 L 75 40 L 55 40 Z"
      fill="#D4FF00"
      stroke="#000"
      stroke-width="3"
      stroke-linejoin="round"
    />
  </svg>

  <svg v-else-if="name === 'heart'" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M 50 30 C 40 10, 10 20, 10 50 C 10 75, 40 85, 50 90 C 60 85, 90 75, 90 50 C 90 20, 60 10, 50 30 Z"
      fill="#FF9EC1"
      stroke="#000"
      stroke-width="3"
      stroke-linejoin="round"
    />
  </svg>

  <svg v-else-if="name === 'quote'" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M 20 20 L 80 20 L 80 65 L 60 65 L 45 85 L 45 65 L 20 65 Z"
      fill="#9FA0FF"
      stroke="#000"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <path
      d="M 35 35 L 50 35 M 35 45 L 65 45 M 35 55 L 55 55"
      stroke="#000"
      stroke-width="2.5"
      stroke-linecap="round"
    />
  </svg>

  <svg v-else-if="name === 'star'" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M 12 2 L 15 9 L 22 10 L 17 15 L 18 22 L 12 18 L 6 22 L 7 15 L 2 10 L 9 9 Z"
      fill="#FFEAA7"
      stroke="#000"
      stroke-width="2"
      stroke-linejoin="round"
    />
  </svg>

  <svg v-else-if="name === 'truck'" viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
    <rect
      x="10"
      y="40"
      width="100"
      height="55"
      rx="3"
      fill="#D4FF00"
      stroke="#000"
      stroke-width="3"
    />
    <path
      d="M 110 55 L 150 55 L 175 80 L 175 95 L 110 95 Z"
      fill="#FFFFFF"
      stroke="#000"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <rect x="120" y="62" width="25" height="18" fill="#CEF6FF" stroke="#000" stroke-width="2.5" />
    <circle cx="50" cy="105" r="10" fill="#FFFFFF" stroke="#000" stroke-width="3" />
    <circle cx="50" cy="105" r="4" fill="#000" />
    <circle cx="145" cy="105" r="10" fill="#FFFFFF" stroke="#000" stroke-width="3" />
    <circle cx="145" cy="105" r="4" fill="#000" />
  </svg>

  <svg v-else-if="name === 'bag'" viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M 25 40 L 75 40 L 70 100 L 30 100 Z"
      fill="#9FA0FF"
      stroke="#000"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <path
      d="M 35 40 Q 35 20 50 20 Q 65 20 65 40"
      stroke="#000"
      stroke-width="3"
      fill="none"
      stroke-linecap="round"
    />
    <path d="M 40 55 L 60 55" stroke="#000" stroke-width="2.5" stroke-linecap="round" />
  </svg>

  <svg v-else-if="name === 'sun'" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="20" fill="#FFEAA7" stroke="#000" stroke-width="3" />
    <g stroke="#000" stroke-width="3" stroke-linecap="round">
      <path d="M 50 10 L 50 20" />
      <path d="M 50 80 L 50 90" />
      <path d="M 10 50 L 20 50" />
      <path d="M 80 50 L 90 50" />
      <path d="M 22 22 L 29 29" />
      <path d="M 71 71 L 78 78" />
      <path d="M 22 78 L 29 71" />
      <path d="M 71 29 L 78 22" />
    </g>
  </svg>

  <svg v-else-if="name === 'mountain'" viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="140" fill="#CEF6FF" />
    <circle cx="160" cy="30" r="14" fill="#FFEAA7" stroke="#000" stroke-width="2.5" />
    <path
      d="M 0 110 L 50 50 L 100 110 Z"
      fill="#FFFFFF"
      stroke="#000"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <path
      d="M 70 110 L 130 30 L 190 110 Z"
      fill="#9FA0FF"
      stroke="#000"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <path
      d="M 0 110 L 200 110 L 200 140 L 0 140 Z"
      fill="#D4FF00"
      stroke="#000"
      stroke-width="3"
      stroke-linejoin="round"
    />
  </svg>

  <svg v-else-if="name === 'rocket'" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M 50 10 Q 70 40 70 80 L 70 110 L 30 110 L 30 80 Q 30 40 50 10 Z"
      fill="#FFFFFF"
      stroke="#000"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <circle cx="50" cy="55" r="10" fill="#CEF6FF" stroke="#000" stroke-width="2.5" />
    <path
      d="M 30 80 L 20 100 L 30 110 Z"
      fill="#9FA0FF"
      stroke="#000"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <path
      d="M 70 80 L 80 100 L 70 110 Z"
      fill="#9FA0FF"
      stroke="#000"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <path
      d="M 40 110 Q 35 125 50 130 Q 65 125 60 110"
      fill="#FFB36B"
      stroke="#000"
      stroke-width="2.5"
      stroke-linejoin="round"
    />
  </svg>

  <svg v-else-if="name === 'brain'" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M 30 20 Q 15 25 15 45 Q 10 55 20 65 Q 15 80 35 85 L 65 85 Q 85 80 80 65 Q 90 55 85 45 Q 85 25 70 20 Q 55 10 50 25 Q 45 10 30 20 Z"
      fill="#FFEAA7"
      stroke="#000"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <path
      d="M 50 25 L 50 85 M 35 40 Q 45 45 35 55 M 65 40 Q 55 45 65 55 M 35 65 Q 45 70 35 75 M 65 65 Q 55 70 65 75"
      stroke="#000"
      stroke-width="2"
      fill="none"
      stroke-linecap="round"
    />
  </svg>

  <svg v-else-if="name === 'compass'" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="40" fill="#FFFFFF" stroke="#000" stroke-width="3" />
    <circle
      cx="50"
      cy="50"
      r="32"
      fill="none"
      stroke="#000"
      stroke-width="2"
      stroke-dasharray="3 3"
    />
    <path
      d="M 50 25 L 60 50 L 50 75 L 40 50 Z"
      fill="#D4FF00"
      stroke="#000"
      stroke-width="2.5"
      stroke-linejoin="round"
    />
    <path d="M 50 25 L 50 50 L 50 75" stroke="#000" stroke-width="1.5" />
    <circle cx="50" cy="50" r="4" fill="#000" />
  </svg>

  <svg v-else-if="name === 'palette'" viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M 30 10 Q 10 10 10 35 Q 10 60 30 75 Q 50 90 80 90 Q 100 90 105 75 Q 110 60 100 50 Q 90 45 95 30 Q 95 15 75 10 Q 50 5 30 10 Z"
      fill="#FFEAA7"
      stroke="#000"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <circle cx="40" cy="35" r="6" fill="#FF9EC1" stroke="#000" stroke-width="2" />
    <circle cx="65" cy="30" r="6" fill="#9FA0FF" stroke="#000" stroke-width="2" />
    <circle cx="80" cy="50" r="6" fill="#D4FF00" stroke="#000" stroke-width="2" />
    <circle cx="35" cy="60" r="6" fill="#FFB36B" stroke="#000" stroke-width="2" />
  </svg>

  <svg v-else-if="name === 'trophy'" viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M 30 20 L 70 20 L 70 50 Q 70 75 50 80 Q 30 75 30 50 Z"
      fill="#FFEAA7"
      stroke="#000"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <path d="M 30 30 L 15 30 L 15 45 Q 15 55 30 55" stroke="#000" stroke-width="3" fill="none" />
    <path d="M 70 30 L 85 30 L 85 45 Q 85 55 70 55" stroke="#000" stroke-width="3" fill="none" />
    <rect x="40" y="85" width="20" height="10" fill="#000" />
    <rect x="30" y="95" width="40" height="10" fill="#D4FF00" stroke="#000" stroke-width="3" />
  </svg>

  <svg v-else-if="name === 'cart'" viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M 10 10 L 25 10 L 35 70 L 95 70"
      stroke="#000"
      stroke-width="3"
      fill="none"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <rect
      x="35"
      y="25"
      width="65"
      height="40"
      rx="3"
      fill="#FFFFFF"
      stroke="#000"
      stroke-width="3"
    />
    <circle cx="50" cy="85" r="7" fill="#FFFFFF" stroke="#000" stroke-width="3" />
    <circle cx="85" cy="85" r="7" fill="#FFFFFF" stroke="#000" stroke-width="3" />
  </svg>

  <svg v-else viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" fill="#FFEAA7" stroke="#000" stroke-width="3" />
    <text x="50" y="55" text-anchor="middle" font-size="14" font-family="Outfit">?</text>
  </svg>
</template>
