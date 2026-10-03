import { reactive, readonly } from 'vue'
import { featuredBooks, categories as defaultCategories } from '@/data/catalog'

// Initial book stock mapper
const initialBooks = featuredBooks.map((b, idx) => ({
  ...b,
  stock: b.stock !== undefined ? b.stock : [18, 5, 24, 4, 12, 3, 30, 8][idx % 8] || 10,
}))

const initialCategories = defaultCategories.map((c) => ({
  ...c,
}))

const initialVouchers = [
  {
    id: 'v-1',
    code: 'NEOBOOK',
    name: 'Diskon Spesial Bookstore',
    type: 'percentage', // 'percentage' | 'fixed' | 'shipping'
    value: 10,
    minSpend: 50000,
    quota: 200,
    used: 48,
    validUntil: '2026-12-31',
    active: true,
    desc: 'Diskon 10% untuk semua koleksi buku dengan minimum pembelian Rp 50.000.',
  },
  {
    id: 'v-2',
    code: 'DISKON10',
    name: 'Voucher Pelanggan Baru',
    type: 'percentage',
    value: 10,
    minSpend: 75000,
    quota: 150,
    used: 82,
    validUntil: '2026-11-30',
    active: true,
    desc: 'Potongan 10% untuk pesanan minimal Rp 75.000.',
  },
  {
    id: 'v-3',
    code: 'POTONGAN25K',
    name: 'Cashback Langsung Rp 25.000',
    type: 'fixed',
    value: 25000,
    minSpend: 150000,
    quota: 50,
    used: 21,
    validUntil: '2026-10-31',
    active: true,
    desc: 'Potongan langsung Rp 25.000 dengan minimal belanja Rp 150.000.',
  },
  {
    id: 'v-4',
    code: 'ONGKIRGRATIS',
    name: 'Subsidi Ongkos Kirim',
    type: 'shipping',
    value: 15000,
    minSpend: 100000,
    quota: 300,
    used: 120,
    validUntil: '2026-12-31',
    active: true,
    desc: 'Potongan ongkos kirim Rp 15.000 berlaku untuk semua kurir pengiriman.',
  },
]

const initialOrders = [
  {
    id: 'INV-20261003-8821',
    date: '03 Okt 2026, 14:30 WIB',
    customerName: 'Budi Pratama',
    customerEmail: 'budi.pratama@gmail.com',
    customerPhone: '0812-3456-7890',
    address: 'Jl. Merdeka Barat No. 42, RT 03 / RW 05, Menteng, Jakarta Pusat, 10110',
    courier: 'JNE Express (REG)',
    courierService: 'REG (Reguler 1-2 Hari)',
    trackingNumber: 'JNE88291048123ID',
    paymentMethod: 'Transfer Bank (BCA Virtual Account)',
    paymentGateway: 'Midtrans',
    paymentGatewayTxId: 'MID-TX-20261003-8821',
    paymentStatus: 'settlement', // 'settlement' | 'pending' | 'expire' | 'cancel'
    status: 'dikirim',
    subtotal: 214000,
    discount: 21400,
    shipping: 12000,
    total: 204600,
    timeline: [
      { title: 'Pesanan Berhasil Dibuat', time: '03 Okt 2026, 14:30 WIB', done: true },
      { title: 'Pembayaran Diverifikasi Gateway (Midtrans Settlement)', time: '03 Okt 2026, 14:32 WIB', done: true },
      { title: 'Sedang Dikemas di Gudang Pusat', time: '03 Okt 2026, 16:10 WIB', done: true },
      { title: 'Diserahkan ke Kurir JNE', time: '03 Okt 2026, 18:45 WIB', done: true },
      { title: 'Sedang Dalam Perjalanan ke Alamat Tujuan', time: '03 Okt 2026, 19:20 WIB', done: true, current: true },
      { title: 'Pesanan Diterima Pembeli', time: 'Estimasi Tiba: 04 Okt 2026', done: false },
    ],
    items: [
      {
        id: 'b1',
        title: 'Laskar Pelangi',
        author: 'Andrea Hirata',
        price: 89000,
        theme: 'violet',
        format: 'Soft Cover',
        quantity: 1,
      },
      {
        id: 'b4',
        title: 'Atomic Habits',
        author: 'James Clear',
        price: 125000,
        theme: 'lime',
        format: 'Hard Cover',
        quantity: 1,
      },
    ],
  },
  {
    id: 'INV-20260928-7612',
    date: '28 Sep 2026, 10:15 WIB',
    customerName: 'Budi Pratama',
    customerEmail: 'budi.pratama@gmail.com',
    customerPhone: '0812-3456-7890',
    address: 'Jl. Merdeka Barat No. 42, RT 03 / RW 05, Menteng, Jakarta Pusat, 10110',
    courier: 'SiCepat (BEST)',
    courierService: 'BEST (Besok Sampai Tujuan)',
    trackingNumber: '003928172651',
    paymentMethod: 'QRIS (GoPay / ShopeePay)',
    paymentGateway: 'Midtrans',
    paymentGatewayTxId: 'MID-TX-20260928-7612',
    paymentStatus: 'settlement',
    status: 'selesai',
    subtotal: 145000,
    discount: 0,
    shipping: 14000,
    total: 159000,
    timeline: [
      { title: 'Pesanan Dibuat', time: '28 Sep 2026, 10:15 WIB', done: true },
      { title: 'Pembayaran Lunas via QRIS Realtime', time: '28 Sep 2026, 10:16 WIB', done: true },
      { title: 'Paket Dikirim dari Gudang', time: '28 Sep 2026, 13:00 WIB', done: true },
      { title: 'Pesanan Diterima dengan Selamat', time: '29 Sep 2026, 15:40 WIB', done: true, current: true },
    ],
    items: [
      {
        id: 'b3',
        title: 'Bumi Manusia',
        author: 'Pramoedya Ananta Toer',
        price: 145000,
        theme: 'orange',
        format: 'Soft Cover',
        quantity: 1,
      },
    ],
  },
  {
    id: 'INV-20261002-9102',
    date: '02 Okt 2026, 09:12 WIB',
    customerName: 'Rian Hidayat',
    customerEmail: 'rian.h@outlook.com',
    customerPhone: '0857-1122-3344',
    address: 'Jl. Pemuda No. 12, Surabaya (60271)',
    courier: 'JNE Express (YES)',
    courierService: 'YES (Yakin Esok Sampai)',
    trackingNumber: 'JNE7721890281',
    paymentMethod: 'Transfer Mandiri Virtual Account',
    paymentGateway: 'Midtrans',
    paymentGatewayTxId: 'MID-TX-20261002-9102',
    paymentStatus: 'settlement',
    status: 'diproses',
    subtotal: 98000,
    discount: 0,
    shipping: 22000,
    total: 120000,
    timeline: [
      { title: 'Pesanan Dibuat', time: '02 Okt 2026, 09:12 WIB', done: true },
      { title: 'Pembayaran Terverifikasi Otomatis', time: '02 Okt 2026, 09:15 WIB', done: true },
      { title: 'Sedang Disiapkan & Quality Control', time: '02 Okt 2026, 11:00 WIB', done: true, current: true },
      { title: 'Pengiriman Kurir', time: 'Menunggu penjemputan armada', done: false },
    ],
    items: [
      {
        id: 'b7',
        title: 'Filosofi Teras',
        author: 'Henry Manampiring',
        price: 98000,
        theme: 'yellow',
        format: 'Soft Cover',
        quantity: 1,
      },
    ],
  },
  {
    id: 'INV-20260915-5409',
    date: '15 Sep 2026, 19:40 WIB',
    customerName: 'Siti Nurhaliza',
    customerEmail: 'siti.nur@gmail.com',
    customerPhone: '0813-8877-6655',
    address: 'Jl. Riau No. 88, Bandung Barat (40115)',
    courier: 'J&T Express (EZ)',
    courierService: 'EZ (Regular Service)',
    trackingNumber: 'JT9928172610',
    paymentMethod: 'Bayar di Tempat (COD)',
    paymentGateway: 'COD Manual',
    paymentGatewayTxId: 'COD-TX-20260915-5409',
    paymentStatus: 'settlement',
    status: 'selesai',
    subtotal: 175000,
    discount: 17500,
    shipping: 13000,
    total: 170500,
    timeline: [
      { title: 'Pesanan Dibuat', time: '15 Sep 2026, 19:40 WIB', done: true },
      { title: 'Pesanan Selesai & Diterima', time: '17 Sep 2026, 11:20 WIB', done: true, current: true },
    ],
    items: [
      {
        id: 'b5',
        title: 'Sapiens: Riwayat Singkat',
        author: 'Yuval Noah Harari',
        price: 175000,
        theme: 'violet',
        format: 'Soft Cover',
        quantity: 1,
      },
    ],
  },
]

const state = reactive({
  cart: [
    {
      id: 'b1',
      title: 'Laskar Pelangi',
      author: 'Andrea Hirata',
      price: 89000,
      originalPrice: 120000,
      theme: 'violet',
      quantity: 1,
      format: 'Soft Cover',
      selected: true,
    },
  ],

  isCartOpen: false,
  isSidebarOpen: false,

  isLoggedIn: true,
  userName: 'Budi Pratama',
  userEmail: 'budi.pratama@gmail.com',
  userRole: 'user', // 'user' or 'admin'

  userProfile: {
    name: 'Budi Pratama',
    email: 'budi.pratama@gmail.com',
    phone: '0812-3456-7890',
    memberSince: '15 Januari 2024',
    bio: 'Pencinta sastra fiksi Indonesia dan pegiat literasi visual.',
    favoriteGenres: ['Fiksi Populer', 'Self-Growth', 'Seni & Desain'],
    addresses: [
      {
        id: 'addr-1',
        title: 'Rumah Utama',
        recipient: 'Budi Pratama',
        phone: '0812-3456-7890',
        fullAddress: 'Jl. Merdeka Barat No. 42, RT 03 / RW 05, Menteng',
        city: 'Jakarta Pusat',
        postalCode: '10110',
        isDefault: true,
      },
      {
        id: 'addr-2',
        title: 'Kantor / Studio Desain',
        recipient: 'Budi Pratama (Divisi Kreatif)',
        phone: '0812-9876-5432',
        fullAddress: 'Gedung Wisma 46 Lantai 12, Jl. Jend. Sudirman Kav. 1',
        city: 'Jakarta Selatan',
        postalCode: '10220',
        isDefault: false,
      },
    ],
  },

  orders: initialOrders,
  wishlist: ['b6', 'b8'],
  books: initialBooks,
  categories: initialCategories,
  vouchers: initialVouchers,

  // Integrations: RajaOngkir & Payment Gateway
  integrations: {
    rajaongkir: {
      apiKey: 'ro_live_8912389472190831aef',
      accountType: 'Pro',
      originCityId: '151',
      originCityName: 'Jakarta Pusat',
      activeCouriers: ['jne', 'sicepat', 'jnt', 'pos'],
      isConnected: true,
      autoCalculateWeight: true,
    },
    paymentGateway: {
      provider: 'Midtrans',
      environment: 'sandbox', // 'sandbox' | 'production'
      merchantId: 'M10928371',
      clientKey: 'SB-Mid-client-88129037190',
      serverKey: 'SB-Mid-server-99120391823',
      snapEnabled: true,
      activeChannels: [
        'qris',
        'bca_va',
        'mandiri_va',
        'bni_va',
        'bri_va',
        'gopay',
        'shopeepay',
      ],
      isConnected: true,
      webhookUrl: 'https://bookstore.id/api/payment/notification',
    },
  },

  activeModal: null,
  modalPayload: null,
  searchQuery: '',
})

let toastListeners = new Set()
let toastId = 0

function showToast(message, options = {}) {
  const id = ++toastId
  const toast = {
    id,
    message,
    type: options.type || 'info',
  }
  toastListeners.forEach((fn) => fn(toast))
  return id
}

function onToast(fn) {
  toastListeners.add(fn)
  return () => toastListeners.delete(fn)
}

function addToCart(book, options = {}) {
  const format = options.format || book.format || 'Soft Cover'
  const qty = options.quantity || 1
  const existing = state.cart.find((item) => item.id === book.id && item.format === format)
  if (existing) {
    existing.quantity += qty
  } else {
    state.cart.push({
      id: book.id,
      title: book.title,
      author: book.author,
      price: book.price,
      originalPrice: book.originalPrice || book.price,
      theme: book.theme || 'violet',
      format: format,
      quantity: qty,
      selected: true,
    })
  }
  showToast(`"${book.title}" (${format}) masuk ke keranjang belanja.`, { type: 'success' })
}

function removeFromCart(id, format) {
  state.cart = state.cart.filter((item) => !(item.id === id && (!format || item.format === format)))
  showToast('Item berhasil dihapus dari keranjang belanja.', { type: 'info' })
}

function updateQuantity(id, qty, format) {
  const item = state.cart.find((item) => item.id === id && (!format || item.format === format))
  if (item) {
    if (qty < 1) return
    item.quantity = Math.min(99, qty)
  }
}

function clearCart() {
  state.cart = []
}

function toggleSelectItem(id, format) {
  const item = state.cart.find((item) => item.id === id && (!format || item.format === format))
  if (item) {
    item.selected = !item.selected
  }
}

function selectAllItems() {
  state.cart.forEach((item) => {
    item.selected = true
  })
}

function deselectAllItems() {
  state.cart.forEach((item) => {
    item.selected = false
  })
}

function openCart() {
  state.isCartOpen = true
}

function closeCart() {
  state.isCartOpen = false
}

function toggleCart() {
  state.isCartOpen = !state.isCartOpen
}

function openSidebar() {
  state.isSidebarOpen = true
}

function closeSidebar() {
  state.isSidebarOpen = false
}

function toggleSidebar() {
  state.isSidebarOpen = !state.isSidebarOpen
}

function openModal(name, payload = null) {
  state.activeModal = name
  state.modalPayload = payload
}

function closeModal() {
  state.activeModal = null
  state.modalPayload = null
}

function login(name, email = '') {
  state.isLoggedIn = true
  state.userName = name
  state.userEmail = email
  state.userProfile.name = name
  state.userProfile.email = email
  showToast(`Selamat datang kembali, ${name}.`, { type: 'success' })
}

function register(name, email) {
  state.isLoggedIn = true
  state.userName = name
  state.userEmail = email
  state.userProfile.name = name
  state.userProfile.email = email
  showToast(`Akun berhasil dibuat. Selamat datang, ${name}.`, { type: 'success' })
}

function loginWithGoogle(name, email) {
  state.isLoggedIn = true
  state.userName = name
  state.userEmail = email
  state.userProfile.name = name
  state.userProfile.email = email
  showToast(`Masuk dengan Google berhasil. Halo, ${name}.`, { type: 'success' })
}

function logout() {
  state.isLoggedIn = false
  state.userName = ''
  state.userEmail = ''
  showToast('Anda telah keluar dari sesi.', { type: 'info' })
}

function setUserRole(role) {
  state.userRole = role
}

// Wishlist methods
function toggleWishlist(bookId) {
  const index = state.wishlist.indexOf(bookId)
  if (index >= 0) {
    state.wishlist.splice(index, 1)
    showToast('Buku telah dihapus dari daftar wishlist.', { type: 'info' })
  } else {
    state.wishlist.push(bookId)
    showToast('Buku berhasil disimpan ke daftar wishlist.', { type: 'success' })
  }
}

function isInWishlist(bookId) {
  return state.wishlist.includes(bookId)
}

// User Profile & Address methods
function updateUserProfile(payload) {
  Object.assign(state.userProfile, payload)
  if (payload.name) state.userName = payload.name
  if (payload.email) state.userEmail = payload.email
  showToast('Profil akun berhasil diperbarui.', { type: 'success' })
}

function addAddress(address) {
  const newId = `addr-${Date.now()}`
  const newAddr = {
    id: newId,
    ...address,
    isDefault: state.userProfile.addresses.length === 0 || Boolean(address.isDefault),
  }
  if (newAddr.isDefault) {
    state.userProfile.addresses.forEach((a) => {
      a.isDefault = false
    })
  }
  state.userProfile.addresses.push(newAddr)
  showToast('Alamat baru berhasil ditambahkan.', { type: 'success' })
}

function removeAddress(id) {
  state.userProfile.addresses = state.userProfile.addresses.filter((a) => a.id !== id)
  if (state.userProfile.addresses.length > 0 && !state.userProfile.addresses.some((a) => a.isDefault)) {
    state.userProfile.addresses[0].isDefault = true
  }
  showToast('Alamat berhasil dihapus.', { type: 'info' })
}

function setDefaultAddress(id) {
  state.userProfile.addresses.forEach((a) => {
    a.isDefault = a.id === id
  })
  showToast('Alamat utama berhasil diperbarui.', { type: 'success' })
}

// ================= CRUD KATEGORI (ADMIN) =================
function addCategory(cat) {
  const id = cat.id || cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const newCat = {
    id,
    name: cat.name,
    count: cat.count || '0 Buku',
    description: cat.description || '',
    icon: cat.icon || 'book',
    theme: cat.theme || 'violet',
    bg: cat.bg || '#8847F5',
    text: cat.text || '#FFFFFF',
  }
  state.categories.push(newCat)
  showToast(`Kategori "${newCat.name}" berhasil dibuat.`, { type: 'success' })
  return newCat
}

function updateCategory(id, updatedFields) {
  const cat = state.categories.find((c) => c.id === id)
  if (cat) {
    Object.assign(cat, updatedFields)
    showToast(`Kategori "${cat.name}" berhasil diperbarui.`, { type: 'success' })
  }
}

function deleteCategory(id) {
  const idx = state.categories.findIndex((c) => c.id === id)
  if (idx >= 0) {
    const name = state.categories[idx].name
    state.categories.splice(idx, 1)
    showToast(`Kategori "${name}" berhasil dihapus.`, { type: 'info' })
  }
}

// ================= CRUD VOUCHER (ADMIN) =================
function addVoucher(voucher) {
  const newVoucher = {
    id: 'v-' + Date.now(),
    code: voucher.code.toUpperCase().trim(),
    name: voucher.name || voucher.code,
    type: voucher.type || 'percentage', // percentage | fixed | shipping
    value: Number(voucher.value) || 0,
    minSpend: Number(voucher.minSpend) || 0,
    quota: Number(voucher.quota) || 100,
    used: 0,
    validUntil: voucher.validUntil || '2026-12-31',
    active: voucher.active !== undefined ? voucher.active : true,
    desc: voucher.desc || '',
  }
  state.vouchers.unshift(newVoucher)
  showToast(`Voucher "${newVoucher.code}" berhasil diterbitkan.`, { type: 'success' })
  return newVoucher
}

function updateVoucher(id, updatedFields) {
  const voucher = state.vouchers.find((v) => v.id === id)
  if (voucher) {
    if (updatedFields.code) updatedFields.code = updatedFields.code.toUpperCase().trim()
    Object.assign(voucher, updatedFields)
    showToast(`Voucher "${voucher.code}" berhasil diperbarui.`, { type: 'success' })
  }
}

function deleteVoucher(id) {
  const idx = state.vouchers.findIndex((v) => v.id === id)
  if (idx >= 0) {
    const code = state.vouchers[idx].code
    state.vouchers.splice(idx, 1)
    showToast(`Voucher "${code}" telah dihapus.`, { type: 'info' })
  }
}

function toggleVoucher(id) {
  const voucher = state.vouchers.find((v) => v.id === id)
  if (voucher) {
    voucher.active = !voucher.active
    showToast(`Voucher "${voucher.code}" ${voucher.active ? 'diaktifkan' : 'dinonaktifkan'}.`, {
      type: 'info',
    })
  }
}

function validateVoucher(code, subtotal) {
  const cleanCode = code ? code.toUpperCase().trim() : ''
  const voucher = state.vouchers.find((v) => v.code === cleanCode && v.active)

  if (!voucher) {
    return { valid: false, message: 'Kode voucher tidak ditemukan atau sudah tidak aktif.' }
  }

  if (voucher.quota > 0 && voucher.used >= voucher.quota) {
    return { valid: false, message: 'Kuota penggunaan voucher ini telah habis.' }
  }

  if (subtotal < voucher.minSpend) {
    const minStr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(voucher.minSpend)
    return { valid: false, message: `Minimum belanja untuk voucher ini adalah ${minStr}.` }
  }

  let discountAmount = 0
  if (voucher.type === 'percentage') {
    discountAmount = Math.round((subtotal * voucher.value) / 100)
  } else if (voucher.type === 'fixed') {
    discountAmount = Math.min(subtotal, voucher.value)
  } else if (voucher.type === 'shipping') {
    discountAmount = voucher.value
  }

  return {
    valid: true,
    voucher,
    discountAmount,
    message: `Voucher "${voucher.code}" berhasil dipasang.`,
  }
}

// ================= INTEGRASI: RAJAONGKIR & PAYMENT GATEWAY =================
function updateRajaOngkir(config) {
  Object.assign(state.integrations.rajaongkir, config)
  showToast('Pengaturan integrasi RajaOngkir berhasil disimpan.', { type: 'success' })
}

function updatePaymentGateway(config) {
  Object.assign(state.integrations.paymentGateway, config)
  showToast('Pengaturan integrasi Payment Gateway berhasil disimpan.', { type: 'success' })
}

// Simulasi tarif otomatis RajaOngkir berdasarkan kota dan kurir
function calculateShippingRates(destinationCity = 'Jakarta Pusat', totalWeightGram = 1000) {
  const weightKg = Math.max(1, Math.ceil(totalWeightGram / 1000))
  const isJabodetabek = /(jakarta|bogor|depok|tangerang|bekasi)/i.test(destinationCity)
  const isJava = /(bandung|semarang|surabaya|yogyakarta|solo|malang)/i.test(destinationCity)

  const multiplier = isJabodetabek ? 1 : (isJava ? 1.4 : 2.2)

  return [
    {
      courier: 'JNE Express',
      service: 'REG (Reguler)',
      etd: isJabodetabek ? '1-2 Hari' : (isJava ? '2-3 Hari' : '3-5 Hari'),
      cost: Math.round(12000 * weightKg * multiplier),
      code: 'jne-reg',
    },
    {
      courier: 'JNE Express',
      service: 'YES (Yakin Esok Sampai)',
      etd: '1 Hari',
      cost: Math.round(22000 * weightKg * multiplier),
      code: 'jne-yes',
    },
    {
      courier: 'SiCepat',
      service: 'BEST (Besok Sampai)',
      etd: '1-2 Hari',
      cost: Math.round(14000 * weightKg * multiplier),
      code: 'sicepat-best',
    },
    {
      courier: 'J&T Express',
      service: 'EZ (Regular Standard)',
      etd: isJabodetabek ? '1-2 Hari' : '2-3 Hari',
      cost: Math.round(13000 * weightKg * multiplier),
      code: 'jnt-ez',
    },
    {
      courier: 'Pos Indonesia',
      service: 'Kilat Khusus',
      etd: '2-4 Hari',
      cost: Math.round(11000 * weightKg * multiplier),
      code: 'pos-kilat',
    },
  ]
}

// ================= ORDER MANAGEMENT =================
function addOrder(orderData) {
  const now = new Date()
  const dateFormatted =
    now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) + `, ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`

  const randomInv =
    'INV-' +
    now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    '-' +
    Math.floor(1000 + Math.random() * 9000)

  // Otomatisasi generate resi & transaksi gateway
  const trackingNumber =
    orderData.trackingNumber ||
    (orderData.courierName?.includes('J&T')
      ? 'JT' + Math.floor(1000000000 + Math.random() * 9000000000)
      : 'JNE' + Math.floor(1000000000 + Math.random() * 9000000000))

  const newOrder = {
    id: randomInv,
    date: dateFormatted,
    customerName: orderData.name || state.userName || 'Budi Pratama',
    customerEmail: state.userEmail || 'budi.pratama@gmail.com',
    customerPhone: orderData.phone || '0812-3456-7890',
    address: `${orderData.address || ''}, ${orderData.city || ''} (${orderData.postalCode || ''})`,
    courier: orderData.courierName || 'JNE Express (REG)',
    courierService: orderData.courierService || 'REG (Reguler 1-2 Hari)',
    trackingNumber: trackingNumber,
    paymentMethod: orderData.paymentName || 'QRIS Realtime (Midtrans)',
    paymentGateway: state.integrations.paymentGateway.provider,
    paymentGatewayTxId: 'MID-' + Math.floor(10000000 + Math.random() * 90000000),
    paymentStatus: orderData.paymentStatus || 'settlement',
    status: 'diproses',
    subtotal: orderData.subtotal || 0,
    discount: orderData.discount || 0,
    shipping: orderData.shipping || 0,
    total: orderData.total || 0,
    timeline: [
      { title: 'Pesanan Dibuat', time: dateFormatted, done: true },
      { title: 'Pembayaran Terverifikasi via Payment Gateway', time: dateFormatted, done: true },
      { title: 'Sedang Disiapkan di Gudang', time: dateFormatted, done: true, current: true },
      { title: 'Penjemputan Ekspedisi Kurir', time: 'Dalam antrean', done: false },
    ],
    items: orderData.items ? [...orderData.items] : [],
  }

  state.orders.unshift(newOrder)

  // Potong stok otomatis
  newOrder.items.forEach((item) => {
    const book = state.books.find((b) => b.id === item.id)
    if (book && book.stock !== undefined) {
      book.stock = Math.max(0, book.stock - item.quantity)
    }
  })

  // Tambahkan penggunaan kupon jika ada
  if (orderData.voucherCode) {
    const voucher = state.vouchers.find((v) => v.code === orderData.voucherCode)
    if (voucher) voucher.used += 1
  }

  return newOrder
}

function updateOrderStatus(orderId, newStatus, trackingNumber = null) {
  const order = state.orders.find((o) => o.id === orderId)
  if (order) {
    order.status = newStatus
    if (trackingNumber) order.trackingNumber = trackingNumber

    const now = new Date()
    const timeStr = `${now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}, ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`

    if (newStatus === 'dikirim') {
      order.timeline.forEach((t) => (t.current = false))
      order.timeline.push({
        title: `Diserahkan ke Kurir (${order.courier}) - No Resi: ${order.trackingNumber}`,
        time: timeStr,
        done: true,
        current: true,
      })
    } else if (newStatus === 'selesai') {
      order.timeline.forEach((t) => {
        t.done = true
        t.current = false
      })
      order.timeline.push({
        title: 'Pesanan Diterima & Transaksi Selesai',
        time: timeStr,
        done: true,
        current: true,
      })
    } else if (newStatus === 'dibatalkan') {
      order.timeline.forEach((t) => (t.current = false))
      order.timeline.push({
        title: 'Pesanan Dibatalkan',
        time: timeStr,
        done: true,
        current: true,
      })
    }

    showToast(`Status pesanan ${orderId} diubah menjadi: ${newStatus.toUpperCase()}.`, {
      type: 'success',
    })
  }
}

function cancelOrder(orderId) {
  const order = state.orders.find((o) => o.id === orderId)
  if (order) {
    order.status = 'dibatalkan'
    showToast(`Pesanan ${orderId} berhasil dibatalkan.`, { type: 'info' })
  }
}

function reorderBook(order) {
  if (!order || !order.items) return
  order.items.forEach((item) => {
    addToCart(item, { format: item.format, quantity: item.quantity })
  })
  openCart()
  showToast('Semua item pesanan telah dimasukkan kembali ke keranjang.', { type: 'success' })
}

// Book Catalog CRUD (Admin)
function addBook(newBook) {
  const id = 'b' + (state.books.length + 1)
  const fullBook = {
    id,
    title: newBook.title || 'Buku Baru',
    subtitle: newBook.subtitle || '',
    author: newBook.author || 'Penulis',
    price: Number(newBook.price) || 50000,
    originalPrice: Number(newBook.originalPrice) || Number(newBook.price) || 60000,
    rating: 5.0,
    reviews: 0,
    sold: '0',
    stock: Number(newBook.stock) || 10,
    category: newBook.category || 'Fiksi Populer',
    coverImage: newBook.coverImage || '',
    theme: newBook.theme || 'black',
    accentColor: newBook.accentColor || '#18181B',
    tagColor: '#FFFFFF',
    badge: newBook.badge || 'BARU',
    description: newBook.description || 'Deskripsi buku baru...',
    details: {
      publisher: newBook.publisher || 'BookStore Publishing',
      publishDate: '2026',
      isbn: newBook.isbn || '9786020000000',
      pages: newBook.pages || 250,
      language: 'Indonesia',
    },
  }
  state.books.unshift(fullBook)
  showToast(`Buku "${fullBook.title}" berhasil ditambahkan ke katalog.`, { type: 'success' })
  return fullBook
}

function updateBook(bookId, updatedFields) {
  const book = state.books.find((b) => b.id === bookId)
  if (book) {
    Object.assign(book, updatedFields)
    showToast(`Buku "${book.title}" berhasil diperbarui.`, { type: 'success' })
  }
}

function deleteBook(bookId) {
  const idx = state.books.findIndex((b) => b.id === bookId)
  if (idx >= 0) {
    const title = state.books[idx].title
    state.books.splice(idx, 1)
    showToast(`Buku "${title}" telah dihapus dari katalog.`, { type: 'info' })
  }
}

function updateBookStock(bookId, amount) {
  const book = state.books.find((b) => b.id === bookId)
  if (book) {
    book.stock = Math.max(0, (book.stock || 0) + amount)
    showToast(`Stok "${book.title}" diperbarui: ${book.stock} unit.`, { type: 'success' })
  }
}

const cartCount = () => state.cart.reduce((sum, item) => sum + item.quantity, 0)
const cartTotal = () => state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
const selectedCount = () => state.cart.filter((item) => item.selected).length
const selectedTotal = () =>
  state.cart
    .filter((item) => item.selected)
    .reduce((sum, item) => sum + item.price * item.quantity, 0)
const selectedItems = () => state.cart.filter((item) => item.selected)

export { showToast, onToast }

export function useStore() {
  return {
    state: readonly(state),
    showToast,
    onToast,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    toggleSelectItem,
    selectAllItems,
    deselectAllItems,
    openCart,
    closeCart,
    toggleCart,
    openSidebar,
    closeSidebar,
    toggleSidebar,
    openModal,
    closeModal,
    login,
    register,
    loginWithGoogle,
    logout,
    setUserRole,
    toggleWishlist,
    isInWishlist,
    updateUserProfile,
    addAddress,
    removeAddress,
    setDefaultAddress,
    addOrder,
    updateOrderStatus,
    cancelOrder,
    reorderBook,
    addBook,
    updateBook,
    deleteBook,
    updateBookStock,
    addCategory,
    updateCategory,
    deleteCategory,
    addVoucher,
    updateVoucher,
    deleteVoucher,
    toggleVoucher,
    validateVoucher,
    updateRajaOngkir,
    updatePaymentGateway,
    calculateShippingRates,
    cartCount,
    cartTotal,
    selectedCount,
    selectedTotal,
    selectedItems,
  }
}
