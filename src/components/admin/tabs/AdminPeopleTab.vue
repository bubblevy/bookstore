<script setup>
import { ref } from 'vue'
import { api } from '@/lib/api'
import { localizeApiError } from '@/lib/errors'
import { useStore } from '@/composables/useStore'

const props = defineProps({
  authors: {
    type: Array,
    default: () => [],
  },
  publishers: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['refresh'])
const { showToast } = useStore()

const busy = ref({})
const isBusy = (key) => Boolean(busy.value[key])
const setBusy = (key, value) => {
  busy.value = { ...busy.value, [key]: value }
}

function apiErrorText(error, fallback) {
  return localizeApiError(error?.message, error?.status) || fallback
}

const peopleTab = ref('authors')
const showPeopleModal = ref(false)
const isEditPeople = ref(false)
const currentPeopleId = ref(null)
const peopleType = ref('author')
const peopleForm = ref({ name: '', bio: '' })
const peopleToDelete = ref(null)
const showDeletePeopleConfirm = ref(false)

function openAddPeople(type) {
  peopleType.value = type
  isEditPeople.value = false
  currentPeopleId.value = null
  peopleForm.value = { name: '', bio: '' }
  showPeopleModal.value = true
}

async function openEditPeople(type, item) {
  peopleType.value = type
  isEditPeople.value = true
  currentPeopleId.value = item.id
  peopleForm.value = { name: item.name || '', bio: '' }
  showPeopleModal.value = true

  if (type === 'author' && item.slug) {
    try {
      const response = await api.author(item.slug)
      const detail = response.data || {}
      peopleForm.value = {
        name: detail.name || peopleForm.value.name,
        bio: detail.bio || '',
      }
    } catch {
      // Fall back to list data if detail request fails.
    }
  }
}

async function handleSavePeople() {
  const name = peopleForm.value.name.trim()
  if (name.length < 2) {
    showToast('Nama minimal 2 karakter.', { type: 'error' })
    return
  }

  const payload =
    peopleType.value === 'author' ? { name, bio: peopleForm.value.bio.trim() || null } : { name }

  try {
    setBusy('people-save', true)
    if (isEditPeople.value && currentPeopleId.value) {
      if (peopleType.value === 'author') {
        await api.updateAuthor(currentPeopleId.value, payload)
      } else {
        await api.updatePublisher(currentPeopleId.value, payload)
      }
      showToast(`${peopleType.value === 'author' ? 'Penulis' : 'Penerbit'} diperbarui.`, {
        type: 'success',
      })
    } else {
      if (peopleType.value === 'author') {
        await api.createAuthor(payload)
      } else {
        await api.createPublisher(payload)
      }
      showToast(`${peopleType.value === 'author' ? 'Penulis' : 'Penerbit'} ditambahkan.`, {
        type: 'success',
      })
    }
    emit('refresh')
    showPeopleModal.value = false
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal menyimpan data'), { type: 'error' })
  } finally {
    setBusy('people-save', false)
  }
}

function confirmDeletePeople(type, item) {
  peopleToDelete.value = { type, item }
  showDeletePeopleConfirm.value = true
}

async function executeDeletePeople() {
  if (!peopleToDelete.value || isBusy('people-delete')) return
  setBusy('people-delete', true)
  const { type, item } = peopleToDelete.value
  try {
    if (type === 'author') {
      await api.deleteAuthor(item.id)
    } else {
      await api.deletePublisher(item.id)
    }
    emit('refresh')
    showToast(`${type === 'author' ? 'Penulis' : 'Penerbit'} dihapus.`, { type: 'info' })
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal menghapus data'), { type: 'error' })
  } finally {
    setBusy('people-delete', false)
    showDeletePeopleConfirm.value = false
    peopleToDelete.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <div
      class="bg-white border-2 sm:border-3 border-black p-4 rounded-[2px] shadow-neo-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div>
        <h2 class="font-outfit font-black text-lg text-black">Manajemen Penulis & Penerbit</h2>
        <p class="font-sans text-xs text-muted-foreground">
          Data ini dipakai saat menambah atau mengubah buku di katalog.
        </p>
      </div>
      <button
        class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-4 py-2 rounded-[2px] font-outfit font-black text-xs shadow-neo-sm hover:bg-yellow-300 w-full sm:w-auto text-center shrink-0 cursor-pointer"
        @click="openAddPeople(peopleTab === 'authors' ? 'author' : 'publisher')"
      >
        + Tambah {{ peopleTab === 'authors' ? 'Penulis' : 'Penerbit' }}
      </button>
    </div>

    <div class="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
      <button
        type="button"
        class="neubrutal-btn px-4 py-2 border-2 border-black font-outfit font-black text-xs rounded-[2px] cursor-pointer text-center"
        :class="
          peopleTab === 'authors'
            ? 'bg-black text-white shadow-neo-sm'
            : 'bg-white hover:bg-gray-100'
        "
        @click="peopleTab = 'authors'"
      >
        Penulis ({{ authors.length }})
      </button>
      <button
        type="button"
        class="neubrutal-btn px-4 py-2 border-2 border-black font-outfit font-black text-xs rounded-[2px] cursor-pointer text-center"
        :class="
          peopleTab === 'publishers'
            ? 'bg-black text-white shadow-neo-sm'
            : 'bg-white hover:bg-gray-100'
        "
        @click="peopleTab = 'publishers'"
      >
        Penerbit ({{ publishers.length }})
      </button>
    </div>

    <div class="bg-white border-2 sm:border-3 border-black rounded-[2px] shadow-neo-sm overflow-hidden">
      <div class="overflow-x-auto table-scrollbar">
        <table class="w-full min-w-[500px] text-xs font-sans border-collapse">
          <thead>
            <tr class="bg-black text-white font-outfit font-black text-left">
              <th class="p-3 whitespace-nowrap min-w-[180px]">NAMA</th>
              <th class="p-3 whitespace-nowrap min-w-[140px]">SLUG</th>
              <th class="p-3 text-right whitespace-nowrap shrink-0">AKSI</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="3" class="p-8 text-center bg-gray-50/50">
                <div class="inline-flex items-center justify-center gap-2.5">
                  <span
                    class="inline-block w-4 h-4 rounded-[2px] border-2 border-black border-t-transparent animate-spin shrink-0"
                  ></span>
                  <span class="font-outfit font-black text-sm text-black">
                    Memuat data {{ peopleTab === 'authors' ? 'penulis' : 'penerbit' }}...
                  </span>
                </div>
              </td>
            </tr>
            <template v-else-if="(peopleTab === 'authors' ? authors : publishers).length">
              <tr
                v-for="person in peopleTab === 'authors' ? authors : publishers"
                :key="person.id"
                class="border-b border-black/10 hover:bg-gray-50"
              >
                <td class="p-3 font-outfit font-black text-sm text-black min-w-[180px]">{{ person.name }}</td>
                <td class="p-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{{ person.slug }}</td>
                <td class="p-3 text-right whitespace-nowrap shrink-0">
                  <div class="flex items-center justify-end gap-1.5 whitespace-nowrap">
                    <button
                      class="neubrutal-btn bg-white border border-black px-2.5 py-1 font-outfit font-black text-xs shadow-neo-sm hover:bg-neo-yellow cursor-pointer"
                      @click="
                        openEditPeople(peopleTab === 'authors' ? 'author' : 'publisher', person)
                      "
                    >
                      Edit
                    </button>
                    <button
                      class="neubrutal-btn bg-red-100 text-red-700 border border-black px-2.5 py-1 font-outfit font-black text-xs shadow-neo-sm hover:bg-red-200 cursor-pointer"
                      @click="
                        confirmDeletePeople(
                          peopleTab === 'authors' ? 'author' : 'publisher',
                          person,
                        )
                      "
                    >
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            </template>
            <tr v-else>
              <td colspan="3" class="p-8 text-center bg-gray-50/50">
                <p class="font-outfit font-black text-sm text-black">
                  Belum ada data {{ peopleTab === 'authors' ? 'penulis' : 'penerbit' }}
                </p>
                <p class="font-sans text-xs text-muted-foreground mt-1">
                  Data ini dipakai saat menambah atau mengubah buku di katalog.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

        <div
      v-if="showPeopleModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs"
      @click.self="showPeopleModal = false"
    >
      <div
        class="bg-white border-2 sm:border-3 border-black max-w-2xl w-full rounded-[2px] shadow-neo-sm overflow-hidden animate-hero-entrance flex flex-col"
      >
        <div class="bg-neo-yellow border-b-2 sm:border-b-3 border-black p-3.5 sm:p-4 flex items-center justify-between shrink-0">
          <div>
            <h3 class="font-outfit font-black text-sm sm:text-base text-black uppercase tracking-wide">
              {{ isEditPeople ? 'EDIT' : 'TAMBAH' }}
              {{ peopleType === 'author' ? 'PENULIS' : 'PENERBIT' }}
            </h3>
            <p class="font-sans text-[11px] text-black/70 mt-0.5">
              {{ peopleType === 'author' ? 'Kelola profil nama dan biografi penulis untuk katalog buku.' : 'Kelola nama penerbit buku untuk pilihan katalog buku.' }}
            </p>
          </div>
          <button
            type="button"
            class="w-8 h-8 rounded-[2px] bg-white border-2 border-black flex items-center justify-center font-outfit font-black text-sm hover:bg-black hover:text-white transition-colors cursor-pointer"
            @click="showPeopleModal = false"
          >
            ✕
          </button>
        </div>

        <form class="p-4 sm:p-6 space-y-4" @submit.prevent="handleSavePeople">
          <div>
            <label class="block font-outfit font-black text-xs uppercase mb-1">
              Nama {{ peopleType === 'author' ? 'Penulis' : 'Penerbit' }} *
            </label>
            <input
              v-model="peopleForm.name"
              type="text"
              required
              maxlength="150"
              :placeholder="peopleType === 'author' ? 'Contoh: Tere Liye, Andrea Hirata, Dee Lestari...' : 'Contoh: Gramedia Pustaka Utama, Mizan, Erlangga...'"
              class="w-full bg-background border-2 border-black p-2.5 font-outfit font-bold text-sm outline-none focus:border-black shadow-neo-sm rounded-[2px]"
            />
          </div>

          <div v-if="peopleType === 'author'">
            <label class="block font-outfit font-black text-xs uppercase mb-1">Biografi Penulis</label>
            <textarea
              v-model="peopleForm.bio"
              rows="4"
              maxlength="2000"
              placeholder="Tuliskan biografi singkat, profil karya, atau latar belakang penulis..."
              class="w-full bg-background border-2 border-black p-2.5 font-sans text-xs outline-none focus:border-black shadow-neo-sm resize-none rounded-[2px]"
            ></textarea>
          </div>

          <div class="border-t-2 border-black pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
            <button
              type="button"
              class="neubrutal-btn bg-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100 cursor-pointer text-center"
              @click="showPeopleModal = false"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="isBusy('people-save')"
              class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-5 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-yellow-300 disabled:opacity-60 cursor-pointer text-center"
            >
              {{ isBusy('people-save') ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </form>
      </div>
    </div>

        <div
      v-if="showDeletePeopleConfirm && peopleToDelete"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="showDeletePeopleConfirm = false"
    >
      <div
        class="bg-white border-2 sm:border-3 border-black max-w-sm w-full rounded-[2px] shadow-neo-sm p-5 space-y-4 text-center"
      >
        <h3 class="font-outfit font-black text-base text-black">
          Hapus {{ peopleToDelete.type === 'author' ? 'Penulis' : 'Penerbit' }}?
        </h3>
        <p class="font-sans text-xs text-muted-foreground">
          "<strong>{{ peopleToDelete.item.name }}</strong>" akan dihapus dari sistem.
        </p>

        <div class="flex items-center justify-center gap-2 pt-2">
          <button
            class="neubrutal-btn bg-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100"
            @click="showDeletePeopleConfirm = false"
          >
            Batal
          </button>
          <button
            :disabled="isBusy('people-delete')"
            class="neubrutal-btn bg-red-500 text-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-red-600 disabled:opacity-60"
            @click="executeDeletePeople"
          >
            {{ isBusy('people-delete') ? 'Menghapus...' : 'Ya, Hapus' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
