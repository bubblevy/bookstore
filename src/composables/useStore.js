import { reactive, readonly } from 'vue'
import router from '@/router'
import { api, session } from '@/lib/api'
import { mapBook, mapBookDetail, mapCartItem, mapCategory } from '@/lib/mappers'
import { shippingLabel, ensureCourierCatalog } from '@/lib/shipping'
import { localizeApiError } from '@/lib/errors'

const BOOK_CACHE_KEY = 'bookstore.book_cache'

function readBookCache() {
  try {
    const raw = localStorage.getItem(BOOK_CACHE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const bookCache = readBookCache()

function persistBookCache() {
  try {
    localStorage.setItem(BOOK_CACHE_KEY, JSON.stringify(bookCache))
  } catch {
    // Cache is a nicety (author/theme in the cart), not a requirement.
  }
}

function rememberBook(book) {
  if (!book || book.id === undefined || book.id === null) return
  bookCache[book.id] = {
    ...(bookCache[book.id] || {}),
    title: book.title,
    slug: book.slug,
    author: book.author,
    theme: book.theme,
    category: book.category,
  }

  const keys = Object.keys(bookCache)
  if (keys.length > 100) delete bookCache[keys[0]]
  persistBookCache()
}

const state = reactive({
  cart: [],

  isCartOpen: false,

  isSidebarOpen: false,

  isLoggedIn: Boolean(session.accessToken),
  userName: '',
  userEmail: '',
  userRole: 'user',

  userProfile: {
    name: '',
    email: '',
    phone: '',
    memberSince: '',
    role: '',
    isActive: true,
    addresses: [],
  },

  activeModal: null,
  modalPayload: null,

  books: [],
  categories: [],
  categoriesLoading: true,

  orders: [],
  ordersLoading: Boolean(session.accessToken),
  wishlist: [],
  wishlistLoading: Boolean(session.accessToken),
  wishlistPending: [],
  cartPending: [],

  catalogLoading: true,
  cartLoading: Boolean(session.accessToken),
  addressesLoading: Boolean(session.accessToken),
})

let toastListeners = new Set()
let toastId = 0
let recentToast = { key: '', at: 0, id: 0 }

function showToast(message, options = {}) {
  const type = options.type || 'info'
  const key = `${type}|${message}`
  const now = Date.now()

  // Parallel requests often fail together; collapse identical back-to-back toasts.
  if (recentToast.key === key && now - recentToast.at < 1500) return recentToast.id

  const id = ++toastId
  const toast = { id, message, type }
  recentToast = { key, at: now, id }
  toastListeners.forEach((fn) => fn(toast))
  return id
}

function onToast(fn) {
  toastListeners.add(fn)
  return () => toastListeners.delete(fn)
}

function errorText(error, fallback) {
  return localizeApiError(error?.message, error?.status) || fallback
}

function clearSession() {
  session.clear()
  state.isLoggedIn = false
  state.userName = ''
  state.userEmail = ''
  state.userRole = 'user'
  state.userProfile.name = ''
  state.userProfile.email = ''
  state.userProfile.phone = ''
  state.userProfile.memberSince = ''
  state.userProfile.role = ''
  state.userProfile.isActive = true
  state.userProfile.addresses = []
  state.cart = []
  state.orders = []
  state.wishlist = []
  state.wishlistPending = []
  state.cartPending = []
  state.cartLoading = false
  state.ordersLoading = false
  state.wishlistLoading = false
  state.addressesLoading = false
}

let authExpiryHandled = false

function expireSession() {
  clearSession()
  if (authExpiryHandled) return
  authExpiryHandled = true

  showToast('Sesi Anda telah berakhir. Silakan masuk kembali.', { type: 'info' })

  const routeName = String(router.currentRoute.value.name || '')
  if (routeName && routeName !== 'home') {
    router.replace({ name: 'home' })
  }

  setTimeout(() => {
    authExpiryHandled = false
  }, 1500)
}

if (typeof window !== 'undefined') {
  window.addEventListener('bookstore:auth-expired', expireSession)
}

function handleAuthFailure(error) {
  if (error?.status !== 401) return false
  expireSession()
  return true
}

function applyUser(user) {
  authExpiryHandled = false
  state.isLoggedIn = true
  state.userName = user?.name || 'Pengguna'
  state.userEmail = user?.email || ''
  const role = user?.role === 'admin' ? 'admin' : 'user'
  state.userRole = role
  session.setRole(role)
  state.userProfile.name = state.userName
  state.userProfile.email = state.userEmail
  state.userProfile.memberSince = user?.created_at ? formatDate(user.created_at) : ''
  state.userProfile.role = user?.role || ''
  state.userProfile.isActive = user?.is_active !== false
  if (user?.phone) state.userProfile.phone = user.phone
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(date)
}

function formatDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function mapOrderStatus(status) {
  switch (status) {
    case 'waiting_payment':
      return 'menunggu'
    case 'paid':
    case 'processing':
      return 'diproses'
    case 'shipped':
      return 'dikirim'
    case 'completed':
      return 'selesai'
    case 'cancelled':
    case 'returned':
      return 'dibatalkan'
    default:
      return status
  }
}

function buildOrderTimeline(detail) {
  const shipping = detail.shipping || {}
  const status = detail.status
  const steps = [
    { title: 'Pesanan Dibuat', time: formatDateTime(detail.created_at), done: true },
    {
      title: 'Pembayaran',
      time: detail.paid_at ? formatDateTime(detail.paid_at) : 'Menunggu pembayaran',
      done: Boolean(detail.paid_at),
    },
    {
      title: 'Pengiriman',
      time: shipping.tracking_number ? `Resi ${shipping.tracking_number}` : 'Menunggu pengiriman',
      done: Boolean(shipping.tracking_number),
    },
    {
      title: 'Pesanan Selesai',
      time:
        status === 'completed'
          ? formatDateTime(detail.updated_at || detail.created_at)
          : 'Belum selesai',
      done: status === 'completed',
    },
  ]

  if (status === 'cancelled' || status === 'returned') {
    steps.push({
      title: status === 'returned' ? 'Pesanan Dikembalikan' : 'Pesanan Dibatalkan',
      time: formatDateTime(detail.cancelled_at || detail.returned_at),
      done: true,
    })
    steps[steps.length - 1].current = true
  } else {
    const currentIndex = steps.findIndex((step) => !step.done)
    if (currentIndex >= 0) steps[currentIndex].current = true
    else steps[steps.length - 1].current = true
  }

  return steps
}

function mapOrder(detail) {
  const recipient = detail.recipient || {}
  const shipping = detail.shipping || {}
  const payment = detail.payment || {}
  const pricing = detail.pricing || {}
  const paymentDeadlineAt = detail.payment_deadline || ''

  const paymentMethod =
    payment.payment_method_name ||
    payment.store ||
    (payment.bank ? String(payment.bank).toUpperCase() : '') ||
    (payment.qr_url ? 'QRIS' : '') ||
    (payment.deeplink_url ? 'E-Wallet' : '') ||
    payment.payment_type ||
    '-'

  return {
    id: detail.invoice_number,
    date: formatDateTime(detail.created_at),
    createdAt: detail.created_at || '',
    status: mapOrderStatus(detail.status),
    rawStatus: detail.status,
    customerName: recipient.name || state.userName,
    customerEmail: state.userEmail,
    customerPhone: recipient.phone || '',
    address: [recipient.address, recipient.city, recipient.postal_code].filter(Boolean).join(', '),
    courier: shippingLabel(shipping.courier, shipping.courier_service),
    trackingNumber: shipping.tracking_number || '',
    paymentMethod,
    methodName: paymentMethod,
    instructions: Array.isArray(payment.instructions) ? payment.instructions : [],
    paymentMethodCode: payment.payment_method || '',
    paymentStatus: payment.status || '',
    paymentDeadline: paymentDeadlineAt ? formatDateTime(paymentDeadlineAt) : '',
    paymentDeadlineAt,
    paymentGatewayTxId:
      payment.va_number ||
      payment.bill_key ||
      payment.payment_code ||
      payment.qr_url ||
      payment.deeplink_url ||
      '',
    bank: payment.bank || '',
    vaNumber: payment.va_number || '',
    qrUrl: payment.qr_url || '',
    billKey: payment.bill_key || '',
    billerCode: payment.biller_code || '',
    paymentCode: payment.payment_code || '',
    store: payment.store || '',
    deeplinkUrl: payment.deeplink_url || '',
    subtotal: Number(pricing.items_subtotal) || 0,
    discount: Number(pricing.discount_amount) || 0,
    shipping: Number(pricing.shipping_cost) || 0,
    adminFee: Number(pricing.admin_fee) || 0,
    total: Number(pricing.total_amount) || 0,
    items: (detail.items || []).map((item) => {
      const book = state.books.find((b) => String(b.id) === String(item.book_id))
      return {
        id: item.book_id,
        title: item.title,
        author: book?.author || '',
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
        coverImage: item.cover_image || '',
        theme: book?.theme || 'violet',
      }
    }),
    timeline: buildOrderTimeline(detail),
  }
}

async function loadOrders() {
  state.ordersLoading = true
  try {
    const [response] = await Promise.all([api.orders(), ensureCourierCatalog()])
    const list = response.data || []
    const details = await Promise.all(
      list.map(async (order) => {
        try {
          const detail = await api.order(order.invoice_number)
          return detail.data
        } catch {
          return null
        }
      }),
    )
    state.orders = details.filter(Boolean).map(mapOrder)
  } catch (error) {
    if (handleAuthFailure(error)) return
    showToast(errorText(error, 'Gagal memuat pesanan'), { type: 'error' })
  } finally {
    state.ordersLoading = false
  }
}

function mapAddress(address = {}) {
  return {
    id: address.id,
    title: address.city_name || 'Alamat',
    recipient: address.receiver_name || '',
    phone: address.phone || '',
    fullAddress: address.address_line || '',
    city: address.city_name || '',
    postalCode: address.postal_code || '',
    province: address.province_name || '',
    district: address.district_name || '',
    subdistrict: address.subdistrict_name || '',
    biteshipAreaId: address.biteship_area_id || '',
    isDefault: Boolean(address.is_primary),
  }
}

async function loadAddresses() {
  state.addressesLoading = true
  try {
    const response = await api.addresses()
    const list = response.data || []
    const details = await Promise.all(
      list.map(async (address) => {
        try {
          const detail = await api.address(address.id)
          return detail.data
        } catch {
          return address
        }
      }),
    )
    state.userProfile.addresses = details.map(mapAddress)
  } catch (error) {
    if (handleAuthFailure(error)) return
    showToast(errorText(error, 'Gagal memuat alamat'), { type: 'error' })
  } finally {
    state.addressesLoading = false
  }
}

async function changePassword(currentPassword, newPassword, confirmPassword) {
  try {
    await api.changePassword(currentPassword, newPassword, confirmPassword, session.refreshToken)
    showToast('Password berhasil diperbarui.', { type: 'success' })
    return true
  } catch (error) {
    showToast(errorText(error, 'Gagal memperbarui password'), { type: 'error' })
    return false
  }
}

async function refreshCart() {
  if (!session.isAuthenticated) {
    state.cart = []
    state.cartLoading = false
    return
  }

  state.cartLoading = true
  try {
    const response = await api.cart()
    state.cart = (response.data?.items || []).map((item) => mapCartItem(item, bookCache))
  } catch (error) {
    if (handleAuthFailure(error)) return
    showToast(errorText(error, 'Gagal memuat keranjang'), { type: 'error' })
  } finally {
    state.cartLoading = false
  }
}

async function loadCategories() {
  state.categoriesLoading = true
  try {
    const response = await api.categories()
    state.categories = (response.data || []).map((category, index) => mapCategory(category, index))
  } catch (error) {
    state.categories = []
    showToast(errorText(error, 'Gagal memuat kategori'), { type: 'error' })
  } finally {
    state.categoriesLoading = false
  }
}

async function loadBooks(params = {}) {
  state.catalogLoading = true
  try {
    // shortcut: fetch up to 100 books once and let the UI filter/paginate
    // client-side; move to server paging when the catalog outgrows one page.
    const response = await api.books({ per_page: 100, ...params })
    state.books = (response.data || []).map(mapBook)
    return state.books
  } catch (error) {
    state.books = []
    showToast(errorText(error, 'Gagal memuat katalog buku'), { type: 'error' })
    return []
  } finally {
    state.catalogLoading = false
  }
}

async function loadBook(slug) {
  try {
    const response = await api.book(slug)
    const book = mapBookDetail(response.data)
    rememberBook(book)
    return book
  } catch (error) {
    if (!handleAuthFailure(error)) {
      showToast(errorText(error, 'Buku tidak dapat dimuat'), { type: 'error' })
    }
    return null
  }
}

let bootstrapPromise = null

function bootstrap() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      await Promise.allSettled([loadCategories(), loadBooks()])

      if (!session.isAuthenticated) return

      try {
        const response = await api.me()
        applyUser(response.data)
        await Promise.allSettled([refreshCart(), loadWishlist()])
      } catch (error) {
        if (!handleAuthFailure(error)) {
          showToast(errorText(error, 'Gagal memuat sesi pengguna'), { type: 'error' })
        }
      }
    })()
  }
  return bootstrapPromise
}

async function login(email, password, options = {}) {
  try {
    const response = await api.login(email.trim(), password)
    const tokens = response.data || {}
    session.set(
      { access_token: tokens.access_token, refresh_token: tokens.refresh_token },
      { persist: options.remember !== false },
    )

    const me = await api.me()
    applyUser(me.data)
    await Promise.allSettled([refreshCart(), loadWishlist()])
    showToast(`Selamat datang kembali, ${state.userName}!`, { type: 'success' })
    return true
  } catch (error) {
    session.clear()
    state.isLoggedIn = false
    const message = String(error?.message || '')
    const inactive = /inactive|not active|not activated|verify|activation/i.test(message)
    showToast(
      inactive
        ? 'Akun belum aktif. Cek email atau kirim ulang aktivasi.'
        : error?.status === 401
          ? 'Email atau password salah.'
          : errorText(error, 'Gagal masuk. Periksa email dan password.'),
      { type: 'error' },
    )
    if (inactive) return 'inactive'
    if (error?.status === 401) return 'credentials'
    return 'error'
  }
}

async function register(name, email, password) {
  try {
    await api.register(name.trim(), email.trim(), password)
    showToast('Akun berhasil dibuat. Cek email untuk aktivasi sebelum masuk.', { type: 'success' })
    return true
  } catch (error) {
    const message = error?.message || ''
    const alreadyRegistered = /already (registered|exists)|sudah terdaftar/i.test(message)
    showToast(
      alreadyRegistered
        ? 'Email sudah terdaftar. Gunakan email lain atau masuk.'
        : errorText(error, 'Gagal mendaftar'),
      { type: 'error' },
    )
    return false
  }
}

async function logout() {
  const refreshToken = session.refreshToken
  if (refreshToken) {
    try {
      await api.logout(refreshToken)
    } catch {
      // Local logout must still succeed when the network fails.
    }
  }
  clearSession()
  showToast('Anda telah keluar.', { type: 'info' })
}

async function addToCart(book, options = {}) {
  if (!session.isAuthenticated) {
    showToast('Silakan masuk dulu untuk menambahkan buku ke keranjang.', { type: 'info' })
    router.push({
      name: 'login',
      query: { redirect: router.currentRoute.value.fullPath },
    })
    return false
  }

  if (!book?.id) {
    showToast('Buku tidak valid.', { type: 'error' })
    return false
  }

  const quantity = Math.max(1, Number(options.quantity) || 1)
  const stock = Number(book.stock) || 0

  if (stock <= 0) {
    if (!options.quiet) showToast('Stok buku ini sedang habis.', { type: 'error' })
    return false
  }
  if (quantity > stock) {
    if (!options.quiet) showToast(`Stok tersisa ${stock} buku.`, { type: 'error' })
    return false
  }

  try {
    await api.addToCart(book.id, quantity)
    rememberBook(book)
    await refreshCart()
    if (!options.silent && !options.quiet) {
      showToast(`"${book.title}" masuk keranjang!`, { type: 'success' })
    }
    return true
  } catch (error) {
    if (handleAuthFailure(error)) return false
    if (!options.quiet) {
      showToast(errorText(error, 'Gagal menambahkan buku ke keranjang'), { type: 'error' })
    }
    return false
  }
}

async function removeFromCart(id) {
  if (isCartPending(id)) return
  state.cartPending.push(id)
  try {
    await api.removeCartItem(id)
    state.cart = state.cart.filter((item) => item.id !== id)
    showToast('Item dihapus dari keranjang', { type: 'info' })
  } catch (error) {
    if (handleAuthFailure(error)) return
    showToast(errorText(error, 'Gagal menghapus item dari keranjang'), { type: 'error' })
  } finally {
    state.cartPending = state.cartPending.filter((itemId) => itemId !== id)
  }
}

async function updateQuantity(id, qty) {
  const item = state.cart.find((cartItem) => cartItem.id === id)
  if (!item || isCartPending(id)) return

  const nextQuantity = Math.min(99, Math.floor(Number(qty) || 0))
  if (nextQuantity < 1) return

  if (item.stock > 0 && nextQuantity > item.stock) {
    showToast(`Stok tersisa ${item.stock} buku.`, { type: 'error' })
    return
  }

  const previousQuantity = item.quantity
  item.quantity = nextQuantity
  state.cartPending.push(id)

  try {
    await api.updateCartItem(id, nextQuantity)
    showToast('Jumlah item diperbarui.', { type: 'info' })
  } catch (error) {
    item.quantity = previousQuantity
    if (handleAuthFailure(error)) return
    showToast(errorText(error, 'Gagal memperbarui jumlah item'), { type: 'error' })
  } finally {
    state.cartPending = state.cartPending.filter((itemId) => itemId !== id)
  }
}

async function clearCart() {
  try {
    await api.clearCart()
    state.cart = []
    showToast('Keranjang dikosongkan.', { type: 'info' })
    return true
  } catch (error) {
    if (handleAuthFailure(error)) return false
    showToast(errorText(error, 'Gagal mengosongkan keranjang'), { type: 'error' })
    return false
  }
}

async function loadWishlist() {
  if (!session.isAuthenticated) {
    state.wishlist = []
    return
  }
  state.wishlistLoading = true
  try {
    const response = await api.wishlist({ per_page: 100 })
    state.wishlist = (response.data || []).map((item) => {
      const book = item.book || {}
      return {
        id: item.id,
        bookId: item.book_id,
        slug: book.slug || '',
        title: book.title || 'Buku',
        author: book.author_name || '',
        category: book.category_name || '',
        price: Number(book.price) || 0,
        originalPrice: Number(book.original_price) || 0,
        discount: Number(book.discount_percentage) || 0,
        cover: book.cover_image || '',
        stock: Number(book.stock) || 0,
        weightGrams: Number(book.weight_grams) || 0,
      }
    })
  } catch (error) {
    if (!handleAuthFailure(error)) {
      showToast(errorText(error, 'Gagal memuat wishlist'), { type: 'error' })
    }
  } finally {
    state.wishlistLoading = false
  }
}

function isWishlisted(bookId) {
  return state.wishlist.some((item) => String(item.bookId) === String(bookId))
}

async function toggleWishlist(book) {
  if (!session.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
    return false
  }
  const bookId = book?.bookId || book?.id
  if (!bookId || isWishlistPending(bookId)) return false

  state.wishlistPending.push(bookId)
  try {
    if (isWishlisted(bookId)) {
      await api.removeWishlist(bookId)
      state.wishlist = state.wishlist.filter((item) => String(item.bookId) !== String(bookId))
      showToast('Dihapus dari wishlist.', { type: 'info' })
    } else {
      await api.addWishlist(bookId)
      await loadWishlist()
      showToast('Ditambahkan ke wishlist.', { type: 'success' })
    }
    return true
  } catch (error) {
    showToast(errorText(error, 'Gagal memperbarui wishlist'), { type: 'error' })
    return false
  } finally {
    state.wishlistPending = state.wishlistPending.filter(
      (pendingId) => String(pendingId) !== String(bookId),
    )
  }
}

async function moveWishlistToCart(bookId, quantity = 1) {
  try {
    await api.moveWishlistToCart(bookId, quantity)
    await Promise.all([refreshCart(), loadWishlist()])
    showToast('Buku dipindahkan ke keranjang.', { type: 'success' })
    return true
  } catch (error) {
    if (handleAuthFailure(error)) return false
    showToast(errorText(error, 'Gagal memindahkan ke keranjang'), { type: 'error' })
    return false
  }
}

async function clearWishlist() {
  try {
    await api.clearWishlist()
    state.wishlist = []
    showToast('Semua buku dihapus dari wishlist.', { type: 'info' })
    return true
  } catch (error) {
    if (handleAuthFailure(error)) return false
    showToast(errorText(error, 'Gagal mengosongkan wishlist'), { type: 'error' })
    return false
  }
}

async function refreshWishlistStatus(bookId) {
  if (!session.isAuthenticated || !bookId) return
  try {
    const response = await api.checkWishlist(bookId)
    const wishlisted = Boolean(response.data?.is_wishlisted)
    const known = isWishlisted(bookId)
    if (wishlisted && !known) {
      await loadWishlist()
    } else if (!wishlisted && known) {
      state.wishlist = state.wishlist.filter((item) => String(item.bookId) !== String(bookId))
    }
  } catch (error) {
    if (error?.status === 401) handleAuthFailure(error)
  }
}

function toggleSelectItem(id) {
  const item = state.cart.find((cartItem) => cartItem.id === id)
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

function openSidebar() {
  state.isSidebarOpen = true
}

function closeSidebar() {
  state.isSidebarOpen = false
}

function openModal(name, payload = null) {
  state.activeModal = name
  state.modalPayload = payload
}

function closeModal() {
  state.activeModal = null
  state.modalPayload = null
}

async function resolveAddressArea(city, postalCode) {
  const response = await api.areas(city)
  const areas = response.data || []
  return (
    (postalCode && areas.find((item) => String(item.postal_code) === postalCode)) ||
    areas.find(
      (item) =>
        String(item.administrative_division_level_2_name || '').toLowerCase() ===
        city.toLowerCase(),
    ) ||
    areas[0] ||
    null
  )
}

async function resolveAddressPayload(address) {
  const city = String(address.city || '').trim()
  if (city.length < 3) throw new Error('Kota/Kabupaten minimal 3 karakter.')

  const postalCode = String(address.postalCode || '').trim()
  const area = await resolveAddressArea(city, postalCode)
  if (!area) throw new Error(`Area "${city}" tidak ditemukan.`)

  return {
    receiver_name: String(address.recipient || '').trim(),
    phone: String(address.phone || '').trim(),
    address_line: String(address.fullAddress || '').trim(),
    biteship_area_id: area.id,
    province_name: area.administrative_division_level_1_name || '',
    city_name: area.administrative_division_level_2_name || city,
    district_name: area.administrative_division_level_3_name || city,
    subdistrict_name: area.administrative_division_level_4_name || '',
    postal_code: postalCode || String(area.postal_code || ''),
    is_primary: Boolean(address.isDefault),
  }
}

async function addAddress(address) {
  try {
    const payload = await resolveAddressPayload(address)
    if (state.userProfile.addresses.length === 0) payload.is_primary = true

    const response = await api.createAddress(payload)

    if (response.data) {
      const saved = mapAddress(response.data)
      const others = state.userProfile.addresses.filter((item) => item.id !== saved.id)
      state.userProfile.addresses = [
        ...others.map((item) => (saved.isDefault ? { ...item, isDefault: false } : item)),
        saved,
      ]
    } else {
      await loadAddresses()
    }
    showToast('Alamat baru berhasil ditambahkan.', { type: 'success' })
    return true
  } catch (error) {
    showToast(errorText(error, 'Gagal menambahkan alamat'), { type: 'error' })
    return false
  }
}

async function updateAddress(id, address) {
  if (!id) return false
  try {
    const payload = await resolveAddressPayload(address)
    await api.updateAddress(id, payload)
    await loadAddresses()
    showToast('Alamat berhasil diperbarui.', { type: 'success' })
    return true
  } catch (error) {
    showToast(errorText(error, 'Gagal memperbarui alamat'), { type: 'error' })
    return false
  }
}

async function removeAddress(id) {
  try {
    await api.deleteAddress(id)
    await loadAddresses()
    showToast('Alamat berhasil dihapus.', { type: 'info' })
    return true
  } catch (error) {
    showToast(errorText(error, 'Gagal menghapus alamat'), { type: 'error' })
    return false
  }
}

async function setDefaultAddress(id) {
  try {
    await api.setPrimaryAddress(id)
    await loadAddresses()
    showToast('Alamat utama berhasil diperbarui.', { type: 'success' })
    return true
  } catch (error) {
    showToast(errorText(error, 'Gagal mengubah alamat utama'), { type: 'error' })
    return false
  }
}

async function reorderBook(order) {
  if (!order || !Array.isArray(order.items)) return

  const available = order.items
    .map((item) => ({
      book: state.books.find((book) => String(book.id) === String(item.id)),
      quantity: Number(item.quantity) || 1,
    }))
    .filter((entry) => entry.book)

  if (!available.length) {
    showToast('Buku di pesanan ini tidak tersedia di katalog.', { type: 'error' })
    return
  }

  let added = 0
  for (const entry of available) {
    const ok = await addToCart(entry.book, {
      quantity: entry.quantity,
      quiet: true,
    })
    if (ok) added += 1
  }

  if (!added) {
    showToast('Buku pesanan ini sedang tidak bisa ditambahkan. Cek stok katalog.', {
      type: 'error',
    })
    return
  }

  openCart()
  const skipped = available.length - added
  showToast(
    skipped
      ? `${added} buku masuk keranjang, ${skipped} dilewati karena stok.`
      : 'Item pesanan yang tersedia telah dimasukkan kembali ke keranjang.',
    { type: skipped ? 'info' : 'success' },
  )
}

const cartCount = () => state.cart.length
const isWishlistPending = (bookId) =>
  state.wishlistPending.some((id) => String(id) === String(bookId))
const isCartPending = (id) => state.cartPending.some((itemId) => String(itemId) === String(id))
const selectedCount = () => state.cart.filter((item) => item.selected).length
const selectedTotal = () =>
  state.cart
    .filter((item) => item.selected)
    .reduce((sum, item) => sum + item.price * item.quantity, 0)

export { showToast, onToast }

export function useStore() {
  return {
    state: readonly(state),
    showToast,
    onToast,
    bootstrap,
    refreshCart,
    loadCategories,
    loadBooks,
    loadBook,
    loadOrders,
    loadAddresses,
    loadWishlist,
    toggleWishlist,
    isWishlisted,
    refreshWishlistStatus,
    moveWishlistToCart,
    clearWishlist,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    toggleSelectItem,
    selectAllItems,
    deselectAllItems,
    openCart,
    closeCart,
    openSidebar,
    closeSidebar,
    openModal,
    closeModal,
    login,
    register,
    logout,
    changePassword,
    addAddress,
    updateAddress,
    removeAddress,
    setDefaultAddress,
    reorderBook,
    cartCount,
    isWishlistPending,
    isCartPending,
    selectedCount,
    selectedTotal,
  }
}
