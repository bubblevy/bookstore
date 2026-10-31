<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStore } from '@/composables/useStore'
import { api } from '@/lib/api'
import { getPasswordStrength } from '@/lib/password'
import PasswordValidation from '@/components/PasswordValidation.vue'

const { state, showToast, changePassword } = useStore()

const busy = ref({})
const isBusy = (key) => Boolean(busy.value[key])
const setBusy = (key, value) => {
  busy.value = { ...busy.value, [key]: value }
}

function maskEmail(email) {
  if (!email || typeof email !== 'string') return '—'
  const trimmed = email.trim()
  const parts = trimmed.split('@')
  if (parts.length !== 2) return trimmed
  const [name, domain] = parts
  if (name.length <= 2) {
    return `${name.charAt(0)}***@${domain}`
  }
  const maskedMiddle = '*'.repeat(Math.min(name.length - 2, 4))
  return `${name.charAt(0)}${maskedMiddle}${name.charAt(name.length - 1)}@${domain}`
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
  }).format(date)
}

const adminProfile = ref({
  name: state.userProfile?.name || state.userName || 'Administrator',
  email: state.userProfile?.email || state.userEmail || '',
  role: state.userProfile?.role || state.userRole || 'admin',
  isActive: state.userProfile?.isActive !== false,
  memberSince: state.userProfile?.memberSince || '—',
})

const maskedAdminEmail = computed(() =>
  maskEmail(adminProfile.value.email || state.userProfile?.email || state.userEmail || ''),
)

const passwordForm = ref({
  current: '',
  newPass: '',
  confirmPass: '',
})

const passwordStrength = computed(() => getPasswordStrength(passwordForm.value.newPass))

async function handleChangePassword() {
  if (!passwordForm.value.current || !passwordForm.value.newPass) {
    showToast('Harap isi password saat ini dan password baru.', { type: 'error' })
    return
  }
  if (passwordForm.value.newPass !== passwordForm.value.confirmPass) {
    showToast('Konfirmasi password tidak cocok.', { type: 'error' })
    return
  }
  if (passwordStrength.value.score < 4) {
    showToast('Password belum cukup kuat. Tambahkan variasi karakter.', { type: 'error' })
    return
  }

  if (isBusy('password')) return
  setBusy('password', true)
  try {
    const ok = await changePassword(
      passwordForm.value.current,
      passwordForm.value.newPass,
      passwordForm.value.confirmPass,
    )
    if (ok) {
      passwordForm.value = { current: '', newPass: '', confirmPass: '' }
    }
  } finally {
    setBusy('password', false)
  }
}

async function loadAdminProfile() {
  try {
    const response = await api.me()
    const user = response.data || {}
    adminProfile.value = {
      name: user.name || state.userName || 'Administrator',
      email: user.email || state.userEmail || '',
      role: user.role || 'admin',
      isActive: user.is_active !== false,
      memberSince: user.created_at ? formatDate(user.created_at) : (state.userProfile?.memberSince || '—'),
    }
  } catch {
    adminProfile.value = {
      name: state.userProfile?.name || state.userName || 'Administrator',
      email: state.userProfile?.email || state.userEmail || '',
      role: 'admin',
      isActive: true,
      memberSince: state.userProfile?.memberSince || '—',
    }
  }
}

onMounted(() => {
  loadAdminProfile()
})
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        <section
      class="lg:col-span-7 bg-white border-2 sm:border-3 border-black p-5 sm:p-6 rounded-[2px] shadow-neo-sm space-y-5"
    >
      <div class="border-b-2 border-black pb-3">
        <h2 class="font-outfit font-black text-lg sm:text-xl text-black">Informasi Profil Akun</h2>
        <p class="font-sans text-xs text-muted-foreground mt-0.5">
          Data autentikasi dan profil pengguna tersinkronisasi dengan server.
        </p>
      </div>

      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
        <div class="bg-background border-2 border-black p-3 rounded-[2px]">
          <dt class="font-outfit font-black text-[10px] sm:text-xs uppercase text-muted-foreground">
            Nama Lengkap
          </dt>
          <dd class="font-sans font-bold text-black mt-1 text-sm sm:text-base">
            {{ adminProfile.name || state.userProfile?.name || state.userName || '—' }}
          </dd>
        </div>

        <div class="bg-background border-2 border-black p-3 rounded-[2px]">
          <dt class="font-outfit font-black text-[10px] sm:text-xs uppercase text-muted-foreground">
            Alamat Email
          </dt>
          <dd class="font-sans font-bold text-black mt-1 text-xs sm:text-sm break-all">
            {{ maskedAdminEmail || '—' }}
          </dd>
        </div>

        <div class="bg-background border-2 border-black p-3 rounded-[2px]">
          <dt class="font-outfit font-black text-[10px] sm:text-xs uppercase text-muted-foreground">
            Peran Pengguna
          </dt>
          <dd class="font-sans font-bold text-black mt-1 flex items-center gap-1.5">
            {{ adminProfile.role === 'admin' || state.userRole === 'admin' ? 'Administrator' : 'Pelanggan' }}
          </dd>
        </div>

        <div class="bg-background border-2 border-black p-3 rounded-[2px]">
          <dt class="font-outfit font-black text-[10px] sm:text-xs uppercase text-muted-foreground">
            Status Akun
          </dt>
          <dd class="font-sans font-bold text-black mt-1 flex items-center gap-1.5">
            <span class="text-xs sm:text-sm">{{ adminProfile.isActive || state.userProfile?.isActive ? 'Aktif Terverifikasi' : 'Tidak aktif' }}</span>
          </dd>
        </div>

        <div class="bg-background border-2 border-black p-3 sm:col-span-2 rounded-[2px]">
          <dt class="font-outfit font-black text-[10px] sm:text-xs uppercase text-muted-foreground">
            Terdaftar Sejak
          </dt>
          <dd class="font-sans font-bold text-black mt-1 text-xs sm:text-sm">
            {{ adminProfile.memberSince || state.userProfile?.memberSince || '—' }}
          </dd>
        </div>
      </dl>
    </section>

        <section
      class="lg:col-span-5 bg-white border-2 sm:border-3 border-black p-5 sm:p-6 rounded-[2px] shadow-neo-sm space-y-4"
    >
      <div class="border-b-2 border-black pb-3">
        <h3 class="font-outfit font-black text-lg sm:text-xl text-black">Keamanan Akun</h3>
        <p class="font-sans text-xs text-muted-foreground mt-0.5">
          Perbarui kata sandi akun secara berkala untuk menjaga keamanan.
        </p>
      </div>

      <form class="space-y-3.5" @submit.prevent="handleChangePassword">
        <div>
          <label class="block font-outfit font-black text-xs uppercase mb-1">
            Password Saat Ini
          </label>
          <input
            v-model="passwordForm.current"
            type="password"
            autocomplete="current-password"
            placeholder="Password lama"
            required
            class="w-full bg-background border-2 border-black p-2.5 font-sans text-sm outline-none shadow-neo-sm focus:bg-white transition-colors"
          />
        </div>

        <div>
          <label class="block font-outfit font-black text-xs uppercase mb-1">
            Password Baru
          </label>
          <input
            v-model="passwordForm.newPass"
            type="password"
            autocomplete="new-password"
            placeholder="Minimal 8 karakter"
            required
            class="w-full bg-background border-2 border-black p-2.5 font-sans text-sm outline-none shadow-neo-sm focus:bg-white transition-colors"
          />
          <PasswordValidation
            :password="passwordForm.newPass"
            :confirm="passwordForm.confirmPass"
            class="mt-2"
          />
        </div>

        <div>
          <label class="block font-outfit font-black text-xs uppercase mb-1">
            Konfirmasi Password Baru
          </label>
          <input
            v-model="passwordForm.confirmPass"
            type="password"
            autocomplete="new-password"
            placeholder="Ulangi password baru"
            required
            class="w-full bg-background border-2 border-black p-2.5 font-sans text-sm outline-none shadow-neo-sm focus:bg-white transition-colors"
          />
        </div>

        <button
          type="submit"
          :disabled="isBusy('password')"
          class="w-full neubrutal-btn bg-neo-yellow text-black border-2 border-black py-2.5 font-outfit font-black text-xs sm:text-sm shadow-neo-sm hover:bg-yellow-300 disabled:opacity-60 cursor-pointer transition-all mt-1"
        >
          {{ isBusy('password') ? 'Menyimpan...' : 'Perbarui Password' }}
        </button>
      </form>
    </section>
  </div>
</template>
