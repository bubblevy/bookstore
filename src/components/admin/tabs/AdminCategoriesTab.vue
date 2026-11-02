<script setup>
import { ref } from 'vue'
import { api } from '@/lib/api'
import { assetUrl } from '@/lib/assets'
import { localizeApiError } from '@/lib/errors'
import { useStore } from '@/composables/useStore'

const props = defineProps({
  categories: {
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

const showCategoryModal = ref(false)
const isEditCategory = ref(false)
const currentCategoryId = ref(null)
const categoryImageInput = ref(null)
const uploadingCategoryImage = ref(false)
const categoryDraftImage = ref(null)

const categoryForm = ref({
  name: '',
  imageUrl: '',
})

async function discardCategoryDraft() {
  const draft = categoryDraftImage.value
  categoryDraftImage.value = null
  if (!draft?.key) return
  try {
    await api.deleteUpload({ file_key: draft.key })
  } catch {
      }
}

function closeCategoryModal() {
  discardCategoryDraft()
  showCategoryModal.value = false
}

async function processCategoryImage(file) {
  if (!file) return
  if (!file.type.startsWith('image/')) {
    showToast('Harap pilih berkas gambar yang valid (JPG, PNG, WebP).', { type: 'error' })
    return
  }

  uploadingCategoryImage.value = true
  const previousDraft = categoryDraftImage.value
  categoryDraftImage.value = null
  try {
    const response = await api.uploadImage(file, 'categories')
    const data = response.data || {}
    categoryForm.value.imageUrl = data.file_url || ''
    categoryDraftImage.value = { url: data.file_url || '', key: data.file_key || '' }
    if (previousDraft?.key && previousDraft.url !== categoryForm.value.imageUrl) {
      api.deleteUpload({ file_key: previousDraft.key }).catch(() => {})
    }
  } catch (error) {
    categoryDraftImage.value = previousDraft
    showToast(apiErrorText(error, 'Gagal mengunggah gambar'), { type: 'error' })
  } finally {
    uploadingCategoryImage.value = false
  }
}

function handleCategoryImageChange(event) {
  const file = event.target.files?.[0]
  processCategoryImage(file)
}

async function removeCategoryImage() {
  const draft = categoryDraftImage.value
  categoryForm.value.imageUrl = ''
  categoryDraftImage.value = null
  if (categoryImageInput.value) categoryImageInput.value.value = ''
  if (draft?.key) {
    try {
      await api.deleteUpload({ file_key: draft.key })
    } catch {
          }
  }
}

function openAddCategory() {
  isEditCategory.value = false
  currentCategoryId.value = null
  categoryDraftImage.value = null
  categoryForm.value = { name: '', imageUrl: '' }
  if (categoryImageInput.value) categoryImageInput.value.value = ''
  showCategoryModal.value = true
}

function openEditCategory(cat) {
  isEditCategory.value = true
  currentCategoryId.value = cat.id
  categoryDraftImage.value = null
  categoryForm.value = {
    name: cat.name || '',
    imageUrl: cat.image_url || '',
  }
  if (categoryImageInput.value) categoryImageInput.value.value = ''
  showCategoryModal.value = true
}

async function handleSaveCategory() {
  if (!categoryForm.value.name.trim()) {
    showToast('Nama kategori tidak boleh kosong.', { type: 'error' })
    return
  }

  const imageUrl = categoryForm.value.imageUrl.trim()
  const payload = {
    name: categoryForm.value.name.trim(),
    image_url: imageUrl || null,
  }

  try {
    setBusy('category-save', true)
    if (isEditCategory.value && currentCategoryId.value) {
      await api.updateCategory(currentCategoryId.value, payload)
      showToast('Kategori berhasil diperbarui.', { type: 'success' })
    } else {
      await api.createCategory(payload)
      showToast('Kategori berhasil ditambahkan.', { type: 'success' })
    }
    emit('refresh')
    categoryDraftImage.value = null
    showCategoryModal.value = false
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal menyimpan kategori'), { type: 'error' })
  } finally {
    setBusy('category-save', false)
  }
}

const categoryToDelete = ref(null)
const showDeleteCategoryConfirm = ref(false)

function confirmDeleteCategory(cat) {
  categoryToDelete.value = cat
  showDeleteCategoryConfirm.value = true
}

async function executeDeleteCategory() {
  if (!categoryToDelete.value || isBusy('category-delete')) return
  setBusy('category-delete', true)
  try {
    await api.deleteCategory(categoryToDelete.value.id)
    emit('refresh')
    showToast('Kategori berhasil dihapus.', { type: 'info' })
  } catch (error) {
    showToast(apiErrorText(error, 'Gagal menghapus kategori'), { type: 'error' })
  } finally {
    setBusy('category-delete', false)
    showDeleteCategoryConfirm.value = false
    categoryToDelete.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <div
      class="bg-white border-2 sm:border-3 border-black p-4 rounded-[2px] shadow-neo-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div>
        <h2 class="font-outfit font-black text-lg text-black">Manajemen Kategori Buku</h2>
        <p class="font-sans text-xs text-muted-foreground">
          Kelola kategori etalase, gambar kategori, dan filter koleksi buku.
        </p>
      </div>

      <button
        class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-4 py-2 rounded-[2px] font-outfit font-black text-xs shadow-neo-sm hover:bg-yellow-300 shrink-0 cursor-pointer"
        @click="openAddCategory"
      >
        + Tambah Kategori Baru
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
      <div
        v-if="loading"
        class="col-span-full p-12 text-center bg-white border-2 sm:border-3 border-black rounded-[2px] shadow-neo-sm"
      >
        <div class="inline-flex items-center justify-center gap-2.5">
          <span
            class="inline-block w-4 h-4 rounded-[2px] border-2 border-black border-t-transparent animate-spin shrink-0"
          ></span>
          <span class="font-outfit font-black text-sm text-black">
            Memuat kategori buku...
          </span>
        </div>
      </div>

      <div
        v-else-if="categories.length === 0"
        class="col-span-full p-12 text-center bg-white border-2 sm:border-3 border-black rounded-[2px] shadow-neo-sm"
      >
        <p class="font-outfit font-black text-sm text-black">Belum ada kategori buku</p>
        <p class="font-sans text-xs text-muted-foreground mt-1">
          Tambahkan kategori baru untuk mulai mengelompokkan koleksi buku.
        </p>
      </div>

      <template v-else>
        <div
          v-for="cat in categories"
          :key="cat.id"
          class="bg-white border-2 sm:border-3 border-black p-4 sm:p-5 rounded-[2px] shadow-neo-sm flex flex-col justify-between"
        >
        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <span
              class="border-2 border-black px-2.5 py-1 rounded-[2px] font-outfit font-black text-xs uppercase shadow-neo-xs bg-neo-yellow"
            >
              {{ cat.name }}
            </span>
            <span class="font-mono text-xs text-muted-foreground">#{{ cat.id }}</span>
          </div>
          <div class="flex items-center gap-3 mt-2">
            <div class="w-14 h-14 border-2 border-black bg-background overflow-hidden shrink-0">
              <img
                v-if="cat.image_url"
                :src="assetUrl(cat.image_url)"
                :alt="cat.name"
                class="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <p class="font-sans text-xs text-gray-700">
              {{ cat.total_books || 0 }} buku dalam kategori ini.
            </p>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-black/10 flex items-center justify-between">
          <span class="font-sans text-xs text-muted-foreground">
            Slug: <strong class="font-outfit">{{ cat.slug }}</strong>
          </span>

          <div class="flex items-center gap-1.5">
            <button
              class="neubrutal-btn bg-white border border-black px-2.5 py-1 font-outfit font-black text-xs shadow-neo-sm hover:bg-neo-yellow cursor-pointer"
              @click="openEditCategory(cat)"
            >
              Edit
            </button>
            <button
              class="neubrutal-btn bg-red-100 text-red-700 border border-black px-2.5 py-1 font-outfit font-black text-xs shadow-neo-sm hover:bg-red-200 cursor-pointer"
              @click="confirmDeleteCategory(cat)"
            >
              Hapus
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>

        <div
      v-if="showCategoryModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="closeCategoryModal"
    >
      <div
        class="bg-white border-2 sm:border-3 border-black max-w-md w-full rounded-[2px] shadow-neo-sm overflow-hidden animate-hero-entrance"
      >
        <div class="bg-neo-yellow border-b-3 border-black p-4 flex items-center justify-between gap-3 shrink-0">
          <h3 class="font-outfit font-black text-base text-black uppercase min-w-0 flex-1">
            {{ isEditCategory ? 'EDIT KATEGORI' : 'TAMBAH KATEGORI BARU' }}
          </h3>
          <button
            type="button"
            class="w-8 h-8 shrink-0 aspect-square rounded-[2px] bg-white border-2 border-black flex items-center justify-center font-outfit font-black text-sm hover:bg-black hover:text-white transition-colors cursor-pointer"
            aria-label="Tutup modal kategori"
            @click="closeCategoryModal"
          >
            ✕
          </button>
        </div>

        <form class="p-6 space-y-4" @submit.prevent="handleSaveCategory">
          <div>
            <label class="block font-outfit font-black text-xs uppercase mb-1"
              >Nama Kategori *</label
            >
            <input
              v-model="categoryForm.name"
              type="text"
              required
              placeholder="Contoh: Bisnis & Finansial"
              class="w-full bg-background border-2 border-black p-2.5 font-outfit font-bold text-sm outline-none shadow-neo-sm"
            />
          </div>

          <div class="border-2 border-black p-3 bg-surface space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-outfit font-black text-xs uppercase">Gambar Kategori</span>
              <span
                v-if="categoryForm.imageUrl"
                class="bg-neo-lime border border-black px-2 py-0.5 font-outfit font-black text-[9px] uppercase"
              >
                Terpasang
              </span>
            </div>

            <input
              ref="categoryImageInput"
              type="file"
              accept=".png, .jpg, .jpeg, .webp, image/png, image/jpeg, image/webp"
              class="hidden"
              @change="handleCategoryImageChange"
            />

            <div class="flex items-center gap-3">
              <div
                class="w-16 h-16 border-2 border-black bg-white shrink-0 flex items-center justify-center overflow-hidden"
              >
                <img
                  v-if="categoryForm.imageUrl"
                  :src="assetUrl(categoryForm.imageUrl)"
                  alt="Gambar kategori"
                  class="w-full h-full object-cover"
                />
                <div v-else class="text-neutral-400 flex flex-col items-center justify-center p-1 text-center">
                  <svg class="w-6 h-6 stroke-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                  </svg>
                </div>
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  :disabled="uploadingCategoryImage"
                  class="neubrutal-btn bg-white border-2 border-black px-3 py-1.5 font-outfit font-black text-xs shadow-neo-sm hover:bg-neo-yellow disabled:opacity-60 cursor-pointer"
                  @click="categoryImageInput?.click()"
                >
                  {{ uploadingCategoryImage ? 'Mengunggah...' : 'Unggah Gambar' }}
                </button>
                <button
                  v-if="categoryForm.imageUrl"
                  type="button"
                  class="neubrutal-btn bg-white text-red-600 border-2 border-black px-3 py-1.5 font-outfit font-black text-xs shadow-neo-sm hover:bg-red-50 cursor-pointer"
                  @click="removeCategoryImage"
                >
                  Hapus
                </button>
              </div>
            </div>

            <p class="font-sans text-[11px] text-muted-foreground">
              Format yang didukung: PNG, JPG, JPEG, atau WebP (maks. 2MB).
            </p>
          </div>

          <div class="border-t-2 border-black pt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              class="neubrutal-btn bg-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100"
              @click="closeCategoryModal"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="isBusy('category-save')"
              class="neubrutal-btn bg-neo-yellow text-black border-2 border-black px-5 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-yellow-300 disabled:opacity-60"
            >
              {{
                isBusy('category-save')
                  ? 'Menyimpan...'
                  : isEditCategory
                    ? 'Simpan Kategori'
                    : 'Buat Kategori'
              }}
            </button>
          </div>
        </form>
      </div>
    </div>

        <div
      v-if="showDeleteCategoryConfirm && categoryToDelete"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="showDeleteCategoryConfirm = false"
    >
      <div
        class="bg-white border-2 sm:border-3 border-black max-w-sm w-full rounded-[2px] shadow-neo-sm overflow-hidden animate-hero-entrance p-5 space-y-4 text-center"
      >
        <h3 class="font-outfit font-black text-base text-black">Hapus Kategori?</h3>
        <p class="font-sans text-xs text-muted-foreground">
          Kategori "<strong>{{ categoryToDelete.name }}</strong
          >" akan dihapus dari sistem.
        </p>

        <div class="flex items-center justify-center gap-2 pt-2">
          <button
            class="neubrutal-btn bg-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100"
            @click="showDeleteCategoryConfirm = false"
          >
            Batal
          </button>
          <button
            :disabled="isBusy('category-delete')"
            class="neubrutal-btn bg-red-500 text-white border-2 border-black px-4 py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-red-600 disabled:opacity-60"
            @click="executeDeleteCategory"
          >
            {{ isBusy('category-delete') ? 'Menghapus...' : 'Ya, Hapus Kategori' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
