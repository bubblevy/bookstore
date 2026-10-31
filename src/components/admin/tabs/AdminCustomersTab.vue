<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  customers: {
    type: Array,
    default: () => [],
  },
  orders: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

function formatRupiah(val) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(val || 0)
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

function generatePagination(total, current) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total]
  }
  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  }
  return [1, '...', current - 1, current, current + 1, '...', total]
}

const revenueStatuses = new Set(['paid', 'processing', 'shipped', 'completed'])

const userOrderStats = computed(() => {
  const map = new Map()
  for (const order of props.orders) {
    const email = String(order.customerEmail || '').toLowerCase()
    if (!email) continue
    const stat = map.get(email) || { orders: 0, spent: 0 }
    stat.orders += 1
    if (revenueStatuses.has(order.rawStatus)) stat.spent += order.total
    map.set(email, stat)
  }
  return map
})

const customerRows = computed(() =>
  props.customers.map((customer) => ({
    ...customer,
    ...(userOrderStats.value.get(String(customer.email || '').toLowerCase()) || {
      orders: 0,
      spent: 0,
    }),
  })),
)

const customerPage = ref(1)
const customersPerPage = ref(10)
const totalCustomerPages = computed(() =>
  Math.max(1, Math.ceil(customerRows.value.length / customersPerPage.value)),
)
const paginatedCustomers = computed(() => {
  const start = (customerPage.value - 1) * customersPerPage.value
  return customerRows.value.slice(start, start + customersPerPage.value)
})
const visibleCustomerPages = computed(() =>
  generatePagination(totalCustomerPages.value, customerPage.value),
)

function changeCustomerPage(p) {
  if (p === '...' || p === customerPage.value) return
  if (p < 1 || p > totalCustomerPages.value) return
  customerPage.value = p
}

watch(totalCustomerPages, (newTotal) => {
  if (customerPage.value > newTotal) {
    customerPage.value = newTotal
  }
})
</script>

<template>
  <div class="space-y-6">
    <div
      class="bg-white border-2 sm:border-3 border-black p-3 sm:p-4 rounded-[2px] shadow-neo-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
    >
      <div>
        <h2 class="font-outfit font-black text-lg text-black">
          Data Akun Pengguna
        </h2>
        <p class="font-sans text-xs text-muted-foreground">
          Daftar pengguna terdaftar di toko BookStore
        </p>
      </div>
      <span
        class="bg-neo-yellow border-2 border-black px-3 py-1 rounded-[2px] font-outfit font-black text-xs shadow-neo-xs self-start sm:self-auto shrink-0"
      >
        Total {{ customers.length }} Pengguna
      </span>
    </div>

    <div class="bg-white border-2 sm:border-3 border-black rounded-[2px] shadow-neo-sm overflow-hidden">
      <div class="overflow-x-auto table-scrollbar">
        <table class="w-full min-w-[760px] text-xs font-sans border-collapse">
          <thead>
            <tr class="bg-black text-white font-outfit font-black text-left">
              <th class="p-3 whitespace-nowrap min-w-[150px]">NAMA PENGGUNA</th>
              <th class="p-3 whitespace-nowrap min-w-[180px]">KONTAK</th>
              <th class="p-3 text-center whitespace-nowrap min-w-[110px]">TOTAL PESANAN</th>
              <th class="p-3 whitespace-nowrap min-w-[120px]">TOTAL BELANJA</th>
              <th class="p-3 whitespace-nowrap min-w-[130px]">TANGGAL BERGABUNG</th>
              <th class="p-3 text-center whitespace-nowrap min-w-[100px]">STATUS AKUN</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="p-8 text-center bg-gray-50/50">
                <div class="inline-flex items-center justify-center gap-2.5">
                  <span
                    class="inline-block w-4 h-4 rounded-[2px] border-2 border-black border-t-transparent animate-spin shrink-0"
                  ></span>
                  <span class="font-outfit font-black text-sm text-black">
                    Memuat data pengguna...
                  </span>
                </div>
              </td>
            </tr>
            <tr v-else-if="customers.length === 0">
              <td colspan="6" class="p-8 text-center bg-gray-50/50">
                <p class="font-outfit font-black text-sm text-black">Belum Ada Pengguna</p>
                <p class="font-sans text-xs text-muted-foreground mt-1">
                  Data akan tampil setelah pengguna terdaftar.
                </p>
              </td>
            </tr>
            <template v-else>
              <tr
                v-for="c in paginatedCustomers"
                :key="c.id"
                class="border-b border-black/10 hover:bg-gray-50"
              >
                <td class="p-3 font-outfit font-black text-sm text-black min-w-[150px]">
                  {{ c.name }}
                </td>
                <td class="p-3 min-w-[180px]">
                  <span class="block text-black font-semibold">{{ maskEmail(c.email) }}</span>
                  <span class="text-muted-foreground text-xs">{{ c.role }}</span>
                </td>
                <td class="p-3 text-center font-outfit font-black text-sm whitespace-nowrap">
                  {{ c.orders }}
                </td>
                <td class="p-3 font-outfit font-black text-black whitespace-nowrap">
                  {{ formatRupiah(c.spent) }}
                </td>
                <td class="p-3 text-muted-foreground whitespace-nowrap">{{ c.joinDate }}</td>
                <td class="p-3 text-center whitespace-nowrap">
                  <span
                    class="border-2 border-black px-2.5 py-0.5 rounded-[2px] font-outfit font-black text-[10px] uppercase shadow-neo-xs inline-block"
                    :class="
                      c.isActive
                        ? 'bg-neo-lime text-black'
                        : 'bg-red-300 text-black'
                    "
                  >
                    {{ c.status }}
                  </span>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

            <div
        v-if="customerRows.length > 0"
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 border-t-2 border-black bg-neutral-50"
      >
        <div class="text-xs font-sans text-neutral-600">
          Menampilkan
          <strong class="font-outfit text-black">
            {{ (customerPage - 1) * customersPerPage + 1 }}
          </strong>
          -
          <strong class="font-outfit text-black">
            {{ Math.min(customerPage * customersPerPage, customerRows.length) }}
          </strong>
          dari
          <strong class="font-outfit text-black">{{ customerRows.length }}</strong>
          pengguna
        </div>

        <div v-if="totalCustomerPages > 1" class="flex items-center gap-1.5 self-center sm:self-auto flex-wrap justify-center">
          <button
            type="button"
            :disabled="customerPage <= 1"
            class="neubrutal-btn px-2.5 sm:px-3 py-1.5 rounded-[2px] border-2 border-black font-outfit font-black text-xs transition-all flex items-center gap-1 cursor-pointer"
            :class="[
              customerPage <= 1
                ? 'bg-neutral-100 text-neutral-400 border-neutral-300 cursor-not-allowed shadow-none'
                : 'bg-white text-black hover:bg-neo-yellow shadow-neo-xs hover:shadow-neo-sm',
            ]"
            @click="changeCustomerPage(customerPage - 1)"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            <span>Prev</span>
          </button>

          <button
            v-for="p in visibleCustomerPages"
            :key="`cust-page-${p}`"
            type="button"
            :disabled="p === '...'"
            class="w-8 h-8 rounded-[2px] border-2 border-black font-outfit font-black text-xs transition-all flex items-center justify-center cursor-pointer"
            :class="[
              p === customerPage
                ? 'bg-black text-white shadow-neo-xs'
                : p === '...'
                  ? 'border-transparent text-neutral-400 cursor-default shadow-none'
                  : 'bg-white text-black hover:bg-neutral-100 shadow-neo-xs hover:shadow-neo-sm',
            ]"
            @click="p !== '...' && changeCustomerPage(p)"
          >
            {{ p }}
          </button>

          <button
            type="button"
            :disabled="customerPage >= totalCustomerPages"
            class="neubrutal-btn px-2.5 sm:px-3 py-1.5 rounded-[2px] border-2 border-black font-outfit font-black text-xs transition-all flex items-center gap-1 cursor-pointer"
            :class="[
              customerPage >= totalCustomerPages
                ? 'bg-neutral-100 text-neutral-400 border-neutral-300 cursor-not-allowed shadow-none'
                : 'bg-white text-black hover:bg-neo-yellow shadow-neo-xs hover:shadow-neo-sm',
            ]"
            @click="changeCustomerPage(customerPage + 1)"
          >
            <span>Next</span>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
