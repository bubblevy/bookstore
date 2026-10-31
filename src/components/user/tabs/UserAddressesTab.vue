<script setup>
import { ref } from 'vue'
import { useStore } from '@/composables/useStore'
import { api } from '@/lib/api'
import { formatFullAddress } from '@/lib/mappers'

const { state, showToast, addAddress, updateAddress, removeAddress, setDefaultAddress } = useStore()

const busy = ref({})
const isBusy = (key) => Boolean(busy.value[key])
const setBusy = (key, value) => {
  busy.value = { ...busy.value, [key]: value }
}

const addressSaving = ref(false)
const showAddAddressModal = ref(false)
const showDeleteAddressConfirm = ref(false)
const addressToDelete = ref(null)
const deletingAddress = ref(false)
const editingAddressId = ref(null)

function emptyAddressForm() {
  return {
    recipient: state.userProfile.name || '',
    phone: state.userProfile.phone || '',
    fullAddress: '',
    city: '',
    postalCode: '',
    isDefault: false,
  }
}

function extractAddressFormData(addr = {}) {
  const line = (
    addr.fullAddress ||
    addr.address_line ||
    addr.address ||
    addr.full_address ||
    addr.street ||
    ''
  )
    .replace(/^[\s,.-]+/, '')
    .replace(/[\s,.-]+$/, '')
    .trim()

  const city = (
    addr.city ||
    addr.city_name ||
    addr.administrative_division_level_2_name ||
    ''
  )
    .replace(/^[\s,.-]+/, '')
    .replace(/[\s,.-]+$/, '')
    .trim()

  const recipient = (
    addr.recipient ||
    addr.receiver_name ||
    addr.recipient_name ||
    addr.name ||
    state.userProfile.name ||
    ''
  ).trim()

  const phone = (
    addr.phone ||
    addr.phone_number ||
    state.userProfile.phone ||
    ''
  ).trim()

  const postal = String(
    addr.postalCode ||
    addr.postal_code ||
    addr.zip_code ||
    ''
  ).trim()

  return {
    recipient,
    phone,
    fullAddress: line,
    city,
    postalCode: postal,
    isDefault: Boolean(addr.isDefault ?? addr.is_primary),
  }
}

const newAddressForm = ref(emptyAddressForm())

function openAddAddress() {
  editingAddressId.value = null
  newAddressForm.value = emptyAddressForm()
  showAddAddressModal.value = true
}

function closeAddAddressModal() {
  showAddAddressModal.value = false
  editingAddressId.value = null
  newAddressForm.value = emptyAddressForm()
}

async function openEditAddress(addr) {
  if (!addr) return
  editingAddressId.value = addr.id
  newAddressForm.value = extractAddressFormData(addr)
  showAddAddressModal.value = true

  if (addr.id) {
    try {
      const res = await api.address(addr.id)
      const data = res?.data
      if (data && editingAddressId.value === addr.id) {
        const detailData = extractAddressFormData(data)
        newAddressForm.value = {
          recipient: detailData.recipient || newAddressForm.value.recipient,
          phone: detailData.phone || newAddressForm.value.phone,
          fullAddress: detailData.fullAddress || newAddressForm.value.fullAddress,
          city: detailData.city || newAddressForm.value.city,
          postalCode: detailData.postalCode || newAddressForm.value.postalCode,
          isDefault: detailData.isDefault ?? newAddressForm.value.isDefault,
        }
        const detailed = {
          ...addr,
          address_line: detailData.fullAddress,
          fullAddress: detailData.fullAddress,
          address: detailData.fullAddress,
          recipient: detailData.recipient,
          receiver_name: detailData.recipient,
          phone: detailData.phone,
          city: detailData.city,
          city_name: detailData.city,
          postalCode: detailData.postalCode,
          postal_code: detailData.postalCode,
          province: data.province_name || addr.province,
          province_name: data.province_name || addr.province_name,
          district: data.district_name || addr.district,
          district_name: data.district_name || addr.district_name,
          subdistrict: data.subdistrict_name || addr.subdistrict,
          subdistrict_name: data.subdistrict_name || addr.subdistrict_name,
        }
        state.userProfile.addresses = state.userProfile.addresses.map((a) =>
          a.id === addr.id ? { ...a, ...detailed } : a,
        )
      }
    } catch {
          }
  }
}

async function handleSaveAddress() {
  if (addressSaving.value) return
  if (
    !newAddressForm.value.recipient ||
    !newAddressForm.value.fullAddress ||
    !newAddressForm.value.city
  ) {
    showToast('Harap lengkapi semua kolom alamat wajib.', { type: 'error' })
    return
  }
  newAddressForm.value.fullAddress = newAddressForm.value.fullAddress.replace(/^[\s,.-]+/, '').trim()
  addressSaving.value = true
  try {
    const payload = { ...newAddressForm.value }
    const ok = editingAddressId.value
      ? await updateAddress(editingAddressId.value, payload)
      : await addAddress(payload)
    if (!ok) return
    showAddAddressModal.value = false
    editingAddressId.value = null
    newAddressForm.value = emptyAddressForm()
  } finally {
    addressSaving.value = false
  }
}

function openDeleteAddressConfirm(addr) {
  if (!addr) return
  addressToDelete.value = addr
  showDeleteAddressConfirm.value = true
}

function closeDeleteAddressConfirm() {
  if (deletingAddress.value) return
  showDeleteAddressConfirm.value = false
  addressToDelete.value = null
}

async function handleConfirmDeleteAddress() {
  if (!addressToDelete.value?.id || deletingAddress.value) return
  const addrId = addressToDelete.value.id
  const key = `addr-delete-${addrId}`
  deletingAddress.value = true
  setBusy(key, true)
  try {
    await removeAddress(addrId)
    showDeleteAddressConfirm.value = false
    addressToDelete.value = null
  } finally {
    setBusy(key, false)
    deletingAddress.value = false
  }
}

async function handleSetPrimary(addr) {
  const key = `addr-primary-${addr.id}`
  if (isBusy(key)) return
  setBusy(key, true)
  try {
    await setDefaultAddress(addr.id)
  } finally {
    setBusy(key, false)
  }
}
</script>

<template>
  <div class="space-y-5 sm:space-y-6">
        <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border-2 sm:border-3 border-black p-4 rounded-[2px] shadow-neo-sm"
    >
      <div>
        <h2 class="font-outfit font-black text-base sm:text-lg text-black">Alamat Pengiriman Tersimpan</h2>
        <p class="font-sans text-xs text-muted-foreground font-semibold mt-0.5">
          Kelola alamat pengiriman untuk perhitungan ongkir otomatis saat checkout.
        </p>
      </div>

      <button
        type="button"
        class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-yellow-300 shrink-0 self-start sm:self-auto flex items-center gap-1.5 cursor-pointer"
        @click="openAddAddress"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        <span>Tambah Alamat Baru</span>
      </button>
    </div>

        <div v-if="state.addressesLoading" class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
      <div
        v-for="n in 2"
        :key="`address-skeleton-${n}`"
        class="h-44 bg-gray-100 border-2 sm:border-3 border-black animate-pulse rounded-[2px]"
      ></div>
    </div>

        <div
      v-else-if="state.userProfile.addresses.length === 0"
      class="bg-white border-2 sm:border-3 border-black p-8 sm:p-12 text-center rounded-[2px] shadow-neo-sm"
    >
      <h3 class="font-outfit font-black text-lg sm:text-xl text-black">Belum Ada Alamat Pengiriman</h3>
      <p class="font-sans text-xs sm:text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
        Tambahkan alamat utama untuk memudahkan pengiriman pesanan buku langsung ke rumahmu.
      </p>
      <button
        type="button"
        class="mt-5 neubrutal-btn bg-neo-yellow text-black border-2 border-black px-6 py-2.5 font-outfit font-black text-xs sm:text-sm shadow-neo-sm hover:bg-yellow-300 cursor-pointer"
        @click="openAddAddress"
      >
        + Tambah Alamat Sekarang
      </button>
    </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
      <article
        v-for="addr in state.userProfile.addresses"
        :key="addr.id"
        class="bg-white border-2 sm:border-3 border-black p-4 sm:p-5 rounded-[2px] shadow-neo-sm flex flex-col justify-between transition-all hover:bg-neutral-50/50"
        :class="addr.isDefault ? 'border-neo-violet ring-2 ring-neo-violet/30' : ''"
      >
        <div>
                    <div class="flex items-center justify-between gap-2 mb-2.5">
            <div class="flex items-center gap-2">
              <h3 class="font-outfit font-black text-sm sm:text-base text-black">
                {{ addr.city || addr.title || 'Alamat' }}
              </h3>
              <span
                v-if="addr.isDefault"
                class="bg-neo-lime border border-black px-2 py-0.5 rounded-[2px] font-outfit font-black text-[9px] uppercase shadow-neo-xs"
              >
                UTAMA
              </span>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                class="text-xs font-outfit font-bold hover:text-neo-violet underline cursor-pointer"
                @click="openEditAddress(addr)"
              >
                Edit
              </button>
              <button
                v-if="!addr.isDefault"
                type="button"
                :disabled="isBusy(`addr-delete-${addr.id}`)"
                class="text-xs font-outfit font-bold text-red-600 hover:text-red-700 underline disabled:opacity-50 cursor-pointer"
                @click="openDeleteAddressConfirm(addr)"
              >
                {{ isBusy(`addr-delete-${addr.id}`) ? 'Menghapus...' : 'Hapus' }}
              </button>
            </div>
          </div>

                    <div class="space-y-0.5">
            <p class="font-outfit font-black text-sm text-black">{{ addr.recipient }}</p>
            <p class="font-sans text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
              <svg class="w-3 h-3 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
              </svg>
              <span>{{ addr.phone }}</span>
            </p>
          </div>

                    <p
            class="font-sans text-xs text-neutral-800 mt-2.5 bg-background p-2.5 sm:p-3 border-2 border-black rounded-[2px] leading-relaxed break-words"
          >
            {{ formatFullAddress(addr) }}
          </p>
        </div>

                <div class="mt-4 pt-3 border-t border-black/10 flex items-center justify-between">
          <button
            v-if="!addr.isDefault"
            type="button"
            :disabled="isBusy(`addr-primary-${addr.id}`)"
            class="neubrutal-btn bg-white border-2 border-black px-3 py-1.5 font-outfit font-black text-xs shadow-neo-sm hover:bg-neo-yellow disabled:opacity-60 cursor-pointer"
            @click="handleSetPrimary(addr)"
          >
            {{ isBusy(`addr-primary-${addr.id}`) ? 'Memproses...' : 'Jadikan Alamat Utama' }}
          </button>
          <span v-else class="text-xs font-sans font-bold text-emerald-700 flex items-center gap-1">
            <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clip-rule="evenodd" />
            </svg>
            Alamat pengiriman utama aktif
          </span>
        </div>
      </article>
    </div>

        <div
      v-if="showAddAddressModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs"
      @click.self="closeAddAddressModal"
    >
      <div
        class="bg-white border-2 sm:border-3 border-black max-w-md w-full rounded-[2px] shadow-neo-sm overflow-hidden animate-hero-entrance flex flex-col max-h-[90vh]"
      >
        <div class="bg-neo-yellow border-b-2 sm:border-b-3 border-black p-3.5 sm:p-4 flex items-center justify-between shrink-0">
          <h3 class="font-outfit font-black text-sm sm:text-base text-black uppercase tracking-tight">
            {{ editingAddressId ? 'EDIT ALAMAT PENGIRIMAN' : 'TAMBAH ALAMAT PENGIRIMAN' }}
          </h3>
          <button
            type="button"
            class="w-8 h-8 rounded-[2px] bg-white border-2 border-black flex items-center justify-center font-outfit font-black text-sm hover:bg-black hover:text-white transition-colors cursor-pointer"
            aria-label="Tutup modal"
            @click="closeAddAddressModal"
          >
            ✕
          </button>
        </div>

        <form class="p-4 sm:p-5 space-y-3.5 overflow-y-auto overscroll-contain" @submit.prevent="handleSaveAddress">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">
                Nama Penerima *
              </label>
              <input
                v-model="newAddressForm.recipient"
                type="text"
                required
                placeholder="Nama lengkap"
                class="w-full bg-background border-2 border-black p-2.5 font-outfit font-bold text-xs sm:text-sm outline-none shadow-neo-sm focus:bg-white"
              />
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">
                Nomor Telepon *
              </label>
              <input
                v-model="newAddressForm.phone"
                type="tel"
                required
                placeholder="08xxxxxxxxxx"
                class="w-full bg-background border-2 border-black p-2.5 font-outfit font-bold text-xs sm:text-sm outline-none shadow-neo-sm focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label class="block font-outfit font-black text-xs uppercase mb-1">
              Alamat Lengkap *
            </label>
            <textarea
              v-model="newAddressForm.fullAddress"
              rows="2"
              required
              placeholder="Nama jalan, nomor rumah, RT/RW, patokan..."
              class="w-full bg-background border-2 border-black p-2.5 font-sans text-xs sm:text-sm outline-none shadow-neo-sm focus:bg-white resize-none"
            ></textarea>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">
                Kota / Kabupaten *
              </label>
              <input
                v-model="newAddressForm.city"
                type="text"
                required
                placeholder="Contoh: Jakarta Pusat"
                class="w-full bg-background border-2 border-black p-2.5 font-outfit font-bold text-xs sm:text-sm outline-none shadow-neo-sm focus:bg-white"
              />
            </div>
            <div>
              <label class="block font-outfit font-black text-xs uppercase mb-1">
                Kode Pos
              </label>
              <input
                v-model="newAddressForm.postalCode"
                type="text"
                placeholder="10110"
                class="w-full bg-background border-2 border-black p-2.5 font-outfit font-bold text-xs sm:text-sm outline-none shadow-neo-sm focus:bg-white"
              />
            </div>
          </div>

          <label class="flex items-center gap-2 pt-1 cursor-pointer select-none">
            <input
              v-model="newAddressForm.isDefault"
              type="checkbox"
              class="w-4 h-4 border-2 border-black accent-black rounded-[2px]"
            />
            <span class="font-sans text-xs font-bold text-black">Jadikan sebagai alamat pengiriman utama</span>
          </label>

          <button
            type="submit"
            :disabled="addressSaving"
            class="w-full neubrutal-btn bg-neo-yellow text-black border-2 border-black py-2.5 font-outfit font-black text-xs sm:text-sm shadow-neo-sm hover:bg-yellow-300 mt-2 disabled:opacity-60 cursor-pointer"
          >
            {{
              addressSaving
                ? 'Menyimpan...'
                : editingAddressId
                  ? 'Simpan Perubahan'
                  : 'Simpan Alamat Baru'
            }}
          </button>
        </form>
      </div>
    </div>

        <div
      v-if="showDeleteAddressConfirm && addressToDelete"
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs"
      @click.self="closeDeleteAddressConfirm"
    >
      <div
        class="bg-white border-2 sm:border-3 border-black max-w-sm w-full rounded-[2px] shadow-neo-sm p-5 sm:p-6 space-y-4 text-center animate-hero-entrance"
      >
        <div
          class="w-12 h-12 bg-red-100 border-2 border-black rounded-[2px] mx-auto flex items-center justify-center text-red-600 shadow-neo-xs"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
            />
          </svg>
        </div>

        <div>
          <h3 class="font-outfit font-black text-base sm:text-lg text-black">Hapus Alamat Ini?</h3>
          <p class="font-sans text-xs text-muted-foreground mt-1">
            Alamat untuk <span class="font-bold text-black">{{ addressToDelete.recipient }}</span> ({{ addressToDelete.city || 'Alamat' }}) akan dihapus secara permanen.
          </p>
        </div>

        <div class="flex items-center justify-center gap-2.5 pt-2">
          <button
            type="button"
            :disabled="deletingAddress"
            class="flex-1 neubrutal-btn bg-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100 disabled:opacity-60 cursor-pointer"
            @click="closeDeleteAddressConfirm"
          >
            Batal
          </button>
          <button
            type="button"
            :disabled="deletingAddress"
            class="flex-1 neubrutal-btn bg-red-600 text-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-1.5 cursor-pointer"
            @click="handleConfirmDeleteAddress"
          >
            <svg
              v-if="deletingAddress"
              class="w-3.5 h-3.5 animate-spin"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            <span>{{ deletingAddress ? 'Menghapus...' : 'Ya, Hapus' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
