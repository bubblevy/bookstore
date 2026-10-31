<script setup>
import StatusBadge from '@/components/StatusBadge.vue'

const props = defineProps({
  weeklySales: {
    type: Array,
    default: () => [],
  },
  weeklySalesTotal: {
    type: Number,
    default: 0,
  },
  lowStockBooks: {
    type: Array,
    default: () => [],
  },
  reportOrders: {
    type: Array,
    default: () => [],
  },
  reportLoading: {
    type: Boolean,
    default: false,
  },
  downloadingReport: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['switchTab', 'restock', 'downloadReport'])

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
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
            <div
        class="lg:col-span-8 bg-white border-2 sm:border-3 border-black p-4 sm:p-6 rounded-[2px] shadow-neo-sm overflow-hidden"
      >
        <div
          class="border-b-2 border-black pb-3 mb-4 sm:mb-6 flex items-start justify-between gap-3"
        >
          <div>
            <h3 class="font-outfit font-black text-base sm:text-lg text-black">
              Tren Omset Penjualan Mingguan
            </h3>
            <p class="font-sans text-xs text-muted-foreground mt-0.5">
              7 hari terakhir · hanya pesanan lunas/diproses/dikirim/selesai
            </p>
            <p class="font-outfit font-black text-sm text-black mt-1">
              Total {{ formatRupiah(weeklySalesTotal) }}
            </p>
          </div>
          <button
            type="button"
            :disabled="downloadingReport"
            class="neubrutal-btn bg-neo-yellow border-2 border-black px-3 py-1.5 font-outfit font-black text-[11px] shadow-neo-sm hover:bg-yellow-300 shrink-0 disabled:opacity-60 cursor-pointer"
            @click="emit('downloadReport')"
          >
            {{ downloadingReport ? 'Mengunduh...' : 'Laporan PDF' }}
          </button>
        </div>

        <div class="w-full overflow-x-auto pb-2 scrollbar-none">
          <div
            class="h-52 sm:h-60 min-w-[280px] sm:min-w-full flex items-end justify-between gap-2 sm:gap-3 pt-6 px-1"
          >
            <div
              v-for="s in weeklySales"
              :key="s.key"
              class="flex-1 flex flex-col items-center gap-1.5 sm:gap-2 group h-full justify-end"
            >
              <div
                class="opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] whitespace-nowrap shadow-neo-xs pointer-events-none"
              >
                {{ formatRupiah(s.amount) }}
              </div>

              <div
                class="w-full border-2 border-black rounded-[2px] transition-all group-hover:scale-105 shadow-neo-xs"
                :class="s.amount > 0 ? 'bg-neo-violet' : 'bg-gray-200'"
                :style="{ height: s.height }"
                :title="`${s.label}: ${formatRupiah(s.amount)}`"
              ></div>

              <span class="font-outfit font-black text-[11px] sm:text-xs text-black">
                {{ s.label }}
              </span>
            </div>
          </div>
        </div>
      </div>

            <div
        class="lg:col-span-4 bg-white border-2 sm:border-3 border-black p-4 sm:p-6 rounded-[2px] shadow-neo-sm flex flex-col justify-between"
      >
        <div>
          <div class="border-b-2 border-black pb-2 mb-4">
            <h3 class="font-outfit font-black text-base text-black uppercase">
              Peringatan Stok Kritis
            </h3>
            <p class="font-sans text-xs text-muted-foreground mt-0.5">
              Buku dengan sisa stok 5 unit atau kurang.
            </p>
          </div>

          <div v-if="lowStockBooks.length" class="space-y-3">
            <div
              v-for="b in lowStockBooks.slice(0, 4)"
              :key="b.id"
              class="bg-surface border-2 border-black p-2.5 rounded-[2px] flex items-center justify-between gap-2 shadow-neo-xs"
            >
              <div class="min-w-0">
                <h5 class="font-outfit font-black text-xs text-black truncate">
                  {{ b.title }}
                </h5>
                <span class="font-sans text-[10px] text-muted-foreground">{{ b.author }}</span>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <span
                  class="bg-red-500 text-white font-outfit font-black text-xs px-2 py-0.5 rounded-[2px] border border-black shadow-neo-xs"
                >
                  {{ b.stock || 0 }} Unit
                </span>
                <button
                  class="neubrutal-btn bg-neo-yellow text-black border border-black px-2 py-0.5 font-outfit font-black text-[10px] shadow-neo-xs hover:bg-yellow-300 cursor-pointer"
                  title="Restock 10 Unit"
                  @click="emit('restock', b.id, 10)"
                >
                  +10
                </button>
              </div>
            </div>
          </div>
          <div
            v-else
            class="bg-surface border-2 border-dashed border-black/30 p-5 rounded-[2px] text-center my-auto flex flex-col items-center justify-center"
          >
            <div
              class="w-10 h-10 rounded-[2px] bg-neo-lime border-2 border-black flex items-center justify-center text-black mb-2 shadow-neo-xs"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h4 class="font-outfit font-black text-xs text-black uppercase">
              Semua Stok Buku Aman
            </h4>
            <p class="font-sans text-[11px] text-muted-foreground mt-1 max-w-[220px]">
              Tidak ada buku dengan sisa stok kritis (5 unit atau kurang).
            </p>
          </div>
        </div>

        <button
          class="mt-4 w-full neubrutal-btn bg-white text-black border-2 border-black py-2 font-outfit font-black text-xs shadow-neo-sm hover:bg-gray-100 cursor-pointer"
          @click="emit('switchTab', 'books')"
        >
          Kelola Seluruh Katalog
        </button>
      </div>
    </div>

        <div class="bg-white border-2 sm:border-3 border-black p-4 sm:p-6 rounded-[2px] shadow-neo-sm">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b-2 border-black pb-3 mb-4">
        <div>
          <h3 class="font-outfit font-black text-base sm:text-lg text-black">Transaksi Masuk Terbaru</h3>
          <p class="font-sans text-xs text-muted-foreground">
            Pembaruan langsung status transaksi pembeli
          </p>
        </div>
        <button
          class="neubrutal-btn bg-white border-2 border-black px-3 py-1.5 font-outfit font-black text-xs shadow-neo-sm hover:bg-neo-yellow cursor-pointer self-start sm:self-auto shrink-0"
          @click="emit('switchTab', 'orders')"
        >
          Semua Pesanan
        </button>
      </div>

      <div class="overflow-x-auto table-scrollbar">
        <table class="w-full min-w-[720px] text-xs font-sans border-collapse">
          <thead>
            <tr class="bg-black text-white font-outfit font-black text-left">
              <th class="p-3 whitespace-nowrap min-w-[140px]">INVOICE & TANGGAL</th>
              <th class="p-3 whitespace-nowrap min-w-[160px]">PELANGGAN</th>
              <th class="p-3 whitespace-nowrap min-w-[130px]">PEMBAYARAN</th>
              <th class="p-3 whitespace-nowrap min-w-[80px]">BUKU</th>
              <th class="p-3 whitespace-nowrap min-w-[110px]">TOTAL</th>
              <th class="p-3 whitespace-nowrap min-w-[120px]">STATUS PESANAN</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="reportLoading">
              <td colspan="6" class="p-8 text-center bg-gray-50/50">
                <div class="inline-flex items-center justify-center gap-2.5">
                  <span
                    class="inline-block w-4 h-4 rounded-[2px] border-2 border-black border-t-transparent animate-spin shrink-0"
                  ></span>
                  <span class="font-outfit font-black text-sm text-black">
                    Memuat transaksi terbaru...
                  </span>
                </div>
              </td>
            </tr>
            <tr v-else-if="!reportOrders.length">
              <td colspan="6" class="p-8 text-center bg-gray-50/50">
                <p class="font-outfit font-black text-sm text-black">Belum Ada Transaksi</p>
                <p class="font-sans text-xs text-muted-foreground mt-1">
                  Transaksi pesanan pembeli akan muncul di sini.
                </p>
              </td>
            </tr>
            <template v-else>
              <tr
                v-for="order in reportOrders.slice(0, 5)"
                :key="order.id"
                class="border-b border-black/10 hover:bg-gray-50"
              >
                <td class="p-3 whitespace-nowrap">
                  <span class="font-outfit font-black text-black block">#{{ order.id }}</span>
                  <span class="text-muted-foreground text-[10px]">{{ order.date }}</span>
                </td>
                <td class="p-3 min-w-[160px]">
                  <span class="font-outfit font-black text-black block">{{
                    order.customerName
                  }}</span>
                  <span class="text-muted-foreground text-[10px]">{{ maskEmail(order.customerEmail) }}</span>
                </td>
                <td class="p-3 max-w-xs whitespace-nowrap">
                  <span class="font-bold text-black block">{{ order.paymentMethod }}</span>
                </td>
                <td class="p-3 whitespace-nowrap">
                  <span class="text-neutral-800 font-semibold">
                    {{ order.totalQuantity }} item
                  </span>
                </td>
                <td class="p-3 whitespace-nowrap">
                  <span class="font-outfit font-black text-neo-violet text-sm block">
                    {{ formatRupiah(order.total) }}
                  </span>
                </td>
                <td class="p-3 whitespace-nowrap">
                  <StatusBadge :status="order.rawStatus" size="xs" />
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
