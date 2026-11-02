import { reactive, readonly } from 'vue'
import router from '@/router'
import { api, session } from '@/lib/api'
import {
  mapBook,
  mapBookDetail,
  mapCartItem,
  mapCategory,
  formatFullAddress,
  formatPaymentMethodName,
} from '@/lib/mappers'
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
  } catch {}
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
  popularBooks: [],
  popularBooksLoading: false,
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

  // Prevent duplicate back-to-back toast notifications.
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
  bootstrapPromise = null
  hasFullBootstrapRun = false
}

let authExpiryHandled = false

function expireSession() {
  clearSession()
  if (authExpiryHandled) return
  authExpiryHandled = true

  showToast('Sesi Anda telah berakhir. Silakan masuk kembali.', { type: 'info' })

  const routeName = String(router.currentRoute.value.name || '')
  if (routeName !== 'login') {
    router.replace({ name: 'login' })
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

let ordersPromise = null
let addressesPromise = null
let wishlistPromise = null
let booksPromise = null
let booksPromiseKey = ''
let popularBooksPromise = null
let popularBooksPromiseKey = ''

function mapOrder(detail) {
  const recipient = detail.recipient || {}
  const shipping = detail.shipping || {}
  const payment = detail.payment || {}
  const pricing = detail.pricing || {}
  const paymentDeadlineAt = detail.payment_deadline || ''

  const rawPaymentMethod =
    payment.payment_method_name ||
    payment.payment_method ||
    payment.paymentMethod ||
    payment.name ||
    payment.method ||
    payment.store ||
    (payment.bank ? `${String(payment.bank).toUpperCase()} Virtual Account` : '') ||
    (payment.qr_url ? 'QRIS' : '') ||
    (payment.deeplink_url ? 'E-Wallet' : '') ||
    payment.payment_type ||
    detail.payment_method_name ||
    detail.payment_method ||
    detail.paymentMethod ||
    detail.payment_type ||
    detail.store ||
    (detail.bank ? `${String(detail.bank).toUpperCase()} Virtual Account` : '') ||
    ''

  const paymentMethod = formatPaymentMethodName(rawPaymentMethod, { ...detail, payment })

  const hasItems = Array.isArray(detail.items) && detail.items.length > 0
  const items = hasItems
    ? detail.items.map((item) => {
        const bookId = item.book_id || item.bookId || item.id
        const book =
          state.books.find((b) => String(b.id) === String(bookId)) ||
          bookCache[bookId] ||
          state.books.find(
            (b) =>
              b.title &&
              item.title &&
              b.title.trim().toLowerCase() === String(item.title).trim().toLowerCase(),
          )
        const cover =
          book?.coverImage ||
          book?.cover ||
          (item.cover_image && !item.cover_image.includes('/static/covers/')
            ? item.cover_image
            : item.cover && !item.cover.includes('/static/covers/')
              ? item.cover
              : '')
        return {
          id: bookId,
          title: item.title || book?.title || 'Buku',
          author:
            item.author ||
            (typeof book?.author === 'object' ? book.author?.name : book?.author) ||
            '',
          price: Number(item.price) || Number(book?.price) || 0,
          quantity: Number(item.quantity) || 1,
          coverImage: cover,
          cover: cover,
          theme: book?.theme || 'violet',
        }
      })
    : (() => {
        const matchedBook = detail.first_item_title
          ? state.books.find(
              (b) =>
                b.title &&
                b.title.trim().toLowerCase() ===
                  String(detail.first_item_title).trim().toLowerCase(),
            )
          : null
        const cover =
          matchedBook?.coverImage ||
          matchedBook?.cover ||
          (detail.first_item_cover && !detail.first_item_cover.includes('/static/covers/')
            ? detail.first_item_cover
            : detail.first_item_cover_image || '')
        const qty = Number(detail.total_quantity) || 1
        const bookPrice =
          Number(detail.first_item_price) ||
          Number(matchedBook?.price) ||
          (detail.items_subtotal ? Math.round(Number(detail.items_subtotal) / qty) : null) ||
          (detail.shipping_cost || detail.shipping?.cost
            ? Math.max(
                0,
                Math.round(
                  (Number(detail.total_amount || 0) -
                    Number(detail.shipping_cost || detail.shipping?.cost || 0) -
                    Number(detail.admin_fee || detail.payment?.admin_fee || 0)) /
                    qty,
                ),
              )
            : null) ||
          Math.round((Number(detail.total_amount) || 0) / qty)

        return [
          {
            id: matchedBook?.id || detail.id || detail.invoice_number,
            title: detail.first_item_title || matchedBook?.title || 'Buku Pesanan',
            author:
              (matchedBook
                ? typeof matchedBook.author === 'object'
                  ? matchedBook.author.name
                  : matchedBook.author
                : '') ||
              (detail.extra_item_count > 0 ? `+${detail.extra_item_count} buku lainnya` : ''),
            price: bookPrice,
            quantity: qty,
            coverImage: cover,
            cover: cover,
            theme: matchedBook?.theme || 'violet',
            isEstimated: !detail.first_item_price && !matchedBook?.price,
          },
        ]
      })()

  const courierLabel = shipping.courier
    ? shippingLabel(shipping.courier, shipping.courier_service)
    : detail.courier
      ? shippingLabel(detail.courier)
      : 'Reguler'

  return {
    id: detail.invoice_number,
    date: formatDateTime(detail.created_at),
    createdAt: detail.created_at || '',
    status: mapOrderStatus(detail.status),
    rawStatus: detail.status,
    customerName: recipient.name || state.userName,
    customerEmail: state.userEmail,
    customerPhone: recipient.phone || '',
    address: formatFullAddress(recipient),
    courier: courierLabel,
    trackingNumber: shipping.tracking_number || detail.tracking_number || '',
    paymentMethod,
    methodName: paymentMethod,
    instructions: Array.isArray(payment.instructions) ? payment.instructions : [],
    paymentMethodCode: payment.payment_method || '',
    paymentStatus:
      payment.status ||
      (['paid', 'processing', 'shipped', 'completed'].includes(detail.status)
        ? 'settlement'
        : detail.status === 'waiting_payment'
          ? 'pending'
          : ''),
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
    subtotal: Number(pricing.items_subtotal ?? detail.total_amount) || 0,
    discount: Number(pricing.discount_amount) || 0,
    shipping: Number(pricing.shipping_cost) || 0,
    adminFee: Number(pricing.admin_fee) || 0,
    total: Number(pricing.total_amount ?? detail.total_amount) || 0,
    items,
    timeline: buildOrderTimeline(detail),
  }
}

async function loadOrders(status, options = {}) {
  const isSilent = Boolean(options.silent)
  if (ordersPromise && !status) return ordersPromise

  if (!isSilent) state.ordersLoading = true
  ordersPromise = (async () => {
    try {
      if (!state.books.length) {
        await loadBooks().catch(() => {})
      }
      ensureCourierCatalog().catch(() => {})
      const response = await api.orders(status)
      const list = response.data || []

      const existingMap = new Map(state.orders.map((o) => [o.id, o]))
      state.orders = list.map((raw) => {
        const mapped = mapOrder(raw)
        const existing = existingMap.get(mapped.id)
        if (
          existing &&
          Array.isArray(existing.items) &&
          existing.items.length > 0 &&
          (!raw.items || raw.items.length === 0)
        ) {
          return {
            ...mapped,
            items: existing.items,
            subtotal: existing.subtotal,
            discount: existing.discount,
            shipping: existing.shipping,
            adminFee: existing.adminFee,
            total: existing.total || mapped.total,
            paymentMethod:
              mapped.paymentMethod && mapped.paymentMethod !== '—' && mapped.paymentMethod !== '-'
                ? mapped.paymentMethod
                : existing.paymentMethod,
          }
        }
        return mapped
      })

      // Asynchronously hydrate orders that don't have detailed items yet
      const needsDetail = state.orders.filter(
        (o) => !o.items || o.items.length === 0 || o.items[0]?.isEstimated,
      )
      if (needsDetail.length > 0) {
        Promise.allSettled(
          needsDetail.slice(0, 5).map((o) => loadOrderDetail(o.id)),
        ).catch(() => {})
      }

      return state.orders
    } catch (error) {
      if (handleAuthFailure(error)) return []
      if (!isSilent) showToast(errorText(error, 'Gagal memuat pesanan'), { type: 'error' })
      return []
    } finally {
      if (!isSilent) state.ordersLoading = false
      ordersPromise = null
    }
  })()

  return ordersPromise
}

async function loadOrderDetail(invoice) {
  if (!invoice) return null
  const response = await api.order(invoice)
  if (!response?.data) return null
  const detailed = mapOrder(response.data)
  state.orders = state.orders.map((order) =>
    order.id === detailed.id ? { ...order, ...detailed } : order,
  )
  return detailed
}

function applyOrderPaymentUpdate(event) {
  if (!event || !event.invoice_number) return null
  const invoice = String(event.invoice_number).trim()
  const orderIndex = state.orders.findIndex((o) => o.id === invoice)
  if (orderIndex !== -1) {
    const prev = state.orders[orderIndex]
    const nextStatus = event.order_status ? mapOrderStatus(event.order_status) : prev.status
    const updated = {
      ...prev,
      rawStatus: event.order_status || prev.rawStatus,
      status: nextStatus,
      paymentStatus: event.payment_status || prev.paymentStatus,
    }
    state.orders[orderIndex] = updated
    return updated
  }
  return null
}

function applyOrderShippingUpdate(event) {
  if (!event || !event.invoice_number) return null
  const invoice = String(event.invoice_number).trim()
  const orderIndex = state.orders.findIndex((o) => o.id === invoice)
  if (orderIndex !== -1) {
    const prev = state.orders[orderIndex]
    const nextStatus = event.order_status ? mapOrderStatus(event.order_status) : prev.status
    const updated = {
      ...prev,
      rawStatus: event.order_status || prev.rawStatus,
      status: nextStatus,
      trackingNumber: event.waybill_number || prev.trackingNumber,
    }
    state.orders[orderIndex] = updated
    return updated
  }
  return null
}

function mapAddress(address = {}) {
  const line = (
    address.address_line ||
    address.address ||
    address.fullAddress ||
    address.full_address ||
    address.street ||
    ''
  )
    .replace(/^[\s,.-]+/, '')
    .replace(/[\s,.-]+$/, '')
    .trim()

  const city = (
    address.city_name ||
    address.city ||
    address.administrative_division_level_2_name ||
    ''
  )
    .replace(/^[\s,.-]+/, '')
    .replace(/[\s,.-]+$/, '')
    .trim()

  const province = (
    address.province_name ||
    address.province ||
    address.administrative_division_level_1_name ||
    ''
  )
    .replace(/^[\s,.-]+/, '')
    .replace(/[\s,.-]+$/, '')
    .trim()

  const district = (
    address.district_name ||
    address.district ||
    address.administrative_division_level_3_name ||
    ''
  )
    .replace(/^[\s,.-]+/, '')
    .replace(/[\s,.-]+$/, '')
    .trim()

  const subdistrict = (
    address.subdistrict_name ||
    address.subdistrict ||
    address.administrative_division_level_4_name ||
    ''
  )
    .replace(/^[\s,.-]+/, '')
    .replace(/[\s,.-]+$/, '')
    .trim()

  const postal = String(address.postal_code || address.postalCode || address.zip_code || '').trim()

  const recipient = (
    address.receiver_name ||
    address.recipient ||
    address.recipient_name ||
    address.name ||
    ''
  ).trim()

  const phone = (address.phone || address.phone_number || '').trim()

  return {
    id: address.id,
    title: city || 'Alamat',
    recipient,
    receiver_name: recipient,
    phone,
    fullAddress: line,
    address_line: line,
    address: line,
    city,
    city_name: city,
    postalCode: postal,
    postal_code: postal,
    province,
    province_name: province,
    district,
    district_name: district,
    subdistrict,
    subdistrict_name: subdistrict,
    biteshipAreaId: address.biteship_area_id || address.biteshipAreaId || '',
    isDefault: Boolean(address.is_primary ?? address.isDefault),
    is_primary: Boolean(address.is_primary ?? address.isDefault),
  }
}

async function enrichAddresses(list) {
  if (!Array.isArray(list) || !list.length) return
  await Promise.allSettled(
    list.map(async (item) => {
      if (!item?.id || (item.address_line && item.biteshipAreaId)) return
      try {
        const res = await api.address(item.id)
        if (res?.data) {
          const detailed = mapAddress(res.data)
          state.userProfile.addresses = state.userProfile.addresses.map((a) =>
            a.id === item.id ? { ...a, ...detailed } : a,
          )
        }
      } catch {
        // Keep the list data when the detail request fails.
      }
    }),
  )
}

async function enrichAddressDetails() {
  await enrichAddresses(state.userProfile.addresses)
  return state.userProfile.addresses
}

async function loadAddresses(force = false, options = {}) {
  if (addressesPromise && !force) return addressesPromise

  state.addressesLoading = true
  addressesPromise = (async () => {
    try {
      const response = await api.addresses()
      const list = response.data || []
      state.userProfile.addresses = list.map(mapAddress)
      if (options.enrich) await enrichAddresses(state.userProfile.addresses)
      return state.userProfile.addresses
    } catch (error) {
      if (handleAuthFailure(error)) return []
      showToast(errorText(error, 'Gagal memuat alamat'), { type: 'error' })
      return state.userProfile.addresses
    } finally {
      state.addressesLoading = false
      addressesPromise = null
    }
  })()

  return addressesPromise
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
    const rawList = [...(response.data || [])].sort((a, b) => {
      if (a.created_at && b.created_at) {
        const timeDiff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        if (timeDiff !== 0) return timeDiff
      }
      return (Number(a.id) || 0) - (Number(b.id) || 0)
    })
    state.categories = rawList.map((category, index) => mapCategory(category, index))
  } catch (error) {
    showToast(errorText(error, 'Gagal memuat kategori'), { type: 'error' })
  } finally {
    state.categoriesLoading = false
  }
}

// shortcut: catalog is loaded up to 10 pages (1000 books) so client-side
// filters keep working; move to server paging when the catalog grows beyond it.
const MAX_CATALOG_PAGES = 10

async function loadBooks(params = {}) {
  const key = JSON.stringify({ per_page: 100, ...params })
  if (booksPromise && booksPromiseKey === key) return booksPromise

  state.catalogLoading = true
  const promise = (async () => {
    try {
      const first = await api.books({ per_page: 100, ...params })
      const items = [...(first.data || [])]
      const totalPages = Math.min(
        Math.max(1, Number(first.meta?.total_pages) || 1),
        MAX_CATALOG_PAGES,
      )

      if (!params.page && totalPages > 1) {
        const pageResults = await Promise.allSettled(
          Array.from({ length: totalPages - 1 }, (_, index) =>
            api.books({ per_page: 100, ...params, page: index + 2 }),
          ),
        )
        pageResults.forEach((result) => {
          if (result.status === 'fulfilled') items.push(...(result.value.data || []))
        })
      }

      const fetchedBooks = items.map(mapBook)
      const existingMap = new Map(state.books.map((b) => [String(b.id), b]))
      state.books = fetchedBooks.map((b) => {
        const prev = existingMap.get(String(b.id))
        return prev
          ? {
              ...prev,
              ...b,
              sold: Number(b.sold) || 0,
              stock: Number(b.stock) || 0,
            }
          : b
      })
      return state.books
    } catch (error) {
      showToast(errorText(error, 'Gagal memuat katalog buku'), { type: 'error' })
      return state.books
    } finally {
      state.catalogLoading = false
      if (booksPromise === promise) {
        booksPromise = null
        booksPromiseKey = ''
      }
    }
  })()

  booksPromise = promise
  booksPromiseKey = key
  return promise
}

async function loadPopularBooks(params = {}) {
  const queryParams = { sort_by: 'popular', per_page: 8, ...params }
  const key = JSON.stringify(queryParams)
  if (popularBooksPromise && popularBooksPromiseKey === key) return popularBooksPromise

  state.popularBooksLoading = true
  const promise = (async () => {
    try {
      const response = await api.books(queryParams)
      const fetchedBooks = (response.data || []).map(mapBook)
      state.popularBooks = fetchedBooks

      // Synchronize updated book data into local store.
      const existingMap = new Map(state.books.map((b) => [String(b.id), b]))
      fetchedBooks.forEach((b) => {
        const prev = existingMap.get(String(b.id))
        if (prev) {
          Object.assign(prev, b)
        } else {
          state.books.push(b)
        }
      })
      return state.popularBooks
    } catch (error) {
      if (!state.popularBooks.length) {
        state.popularBooks = [...state.books].sort(
          (a, b) =>
            (Number(b.sold) || 0) - (Number(a.sold) || 0) ||
            String(a.title).localeCompare(String(b.title)),
        )
      }
      return state.popularBooks
    } finally {
      state.popularBooksLoading = false
      if (popularBooksPromise === promise) {
        popularBooksPromise = null
        popularBooksPromiseKey = ''
      }
    }
  })()

  popularBooksPromise = promise
  popularBooksPromiseKey = key
  return promise
}

async function loadBook(slugOrId) {
  try {
    let slug = slugOrId
    if (slugOrId !== undefined && slugOrId !== null) {
      const matched = state.books.find(
        (b) => String(b.id) === String(slugOrId) || String(b.slug) === String(slugOrId),
      )
      if (matched?.slug) {
        slug = matched.slug
      }
    }

    let response
    try {
      response = await api.book(slug)
    } catch (err) {
      if (err?.status === 404 && !state.books.length) {
        try {
          await loadBooks({ per_page: 100 })
          const matched = state.books.find(
            (b) => String(b.id) === String(slugOrId) || String(b.slug) === String(slugOrId),
          )
          if (matched?.slug && matched.slug !== slug) {
            response = await api.book(matched.slug)
          } else {
            return null
          }
        } catch {
          return null
        }
      } else {
        return null
      }
    }

    const book = mapBookDetail(response.data)
    rememberBook(book)

    // Synchronize updated book data into local store.
    const index = state.books.findIndex(
      (b) =>
        String(b.slug) === String(book.slug) ||
        String(b.id) === String(book.id) ||
        String(b.slug) === String(slugOrId) ||
        String(b.id) === String(slugOrId),
    )
    if (index !== -1) {
      const synchronized = {
        ...state.books[index],
        ...book,
        sold: Number(book.sold) || 0,
        stock: Number(book.stock) || 0,
      }
      state.books[index] = synchronized
      return synchronized
    } else {
      state.books.push(book)
      return book
    }
  } catch (error) {
    handleAuthFailure(error)
    return null
  }
}

let bootstrapPromise = null
let hasFullBootstrapRun = false

function bootstrap() {
  const isAdminRoute =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')

  if (bootstrapPromise && (hasFullBootstrapRun || isAdminRoute)) {
    return bootstrapPromise
  }

  bootstrapPromise = (async () => {
    if (isAdminRoute) {
      // On admin routes, avoid fetching storefront catalog, popular books, cart, and wishlist.
      // AdminDashboardView handles its own data fetching. Only hydrate session profile if authenticated.
      if (session.isAuthenticated && !state.userProfile?.email) {
        try {
          const response = await api.me()
          applyUser(response.data)
        } catch (error) {
          handleAuthFailure(error)
        }
      }
      return
    }

    hasFullBootstrapRun = true
    await Promise.allSettled([loadCategories(), loadBooks(), loadPopularBooks()])

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
  })().finally(() => {
    if (!hasFullBootstrapRun && !isAdminRoute && !state.books.length) {
      bootstrapPromise = null
    }
  })
  return bootstrapPromise
}

async function login(email, password, options = {}) {
  try {
    const response = await api.login(email.trim(), password, options.turnstileToken || '')
    const tokens = response.data || {}
    session.set(
      { access_token: tokens.access_token, refresh_token: tokens.refresh_token },
      { persist: options.remember !== false },
    )

    const me = await api.me()
    applyUser(me.data)
    // Background sync keeps navigation instant.
    Promise.allSettled([refreshCart(), loadWishlist()]).catch(() => {})
    return true
  } catch (error) {
    session.clear()
    state.isLoggedIn = false
    const message = String(error?.message || '')
    const inactive = /inactive|not active|not activated|verify|activation/i.test(message)
    if (inactive) return 'inactive'
    if (error?.status === 401) return 'credentials'
    if (/turnstile/i.test(message)) return message
    return 'error'
  }
}

async function register(name, email, password, turnstileToken = '') {
  try {
    await api.register(name.trim(), email.trim(), password, turnstileToken)
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
      // Proceed with local logout even if network request fails.
    }
  }
  clearSession()
  if (router.currentRoute.value.name !== 'login') {
    router.push({ name: 'login' })
  }
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

async function loadWishlist(params = {}) {
  if (!session.isAuthenticated) {
    state.wishlist = []
    return []
  }
  const isDefaultQuery = Object.keys(params).length === 0
  if (wishlistPromise && isDefaultQuery) return wishlistPromise

  state.wishlistLoading = true
  const promise = (async () => {
    try {
      const response = await api.wishlist({ per_page: 10, ...params })
      state.wishlist = (response.data || []).map((item) => {
        const book = item.book || {}
        const bookId = item.book_id || book.id
        const cachedBook =
          state.books.find((b) => String(b.id) === String(bookId)) || bookCache[bookId] || {}
        const cover =
          book.cover_image ||
          book.coverImage ||
          book.cover ||
          cachedBook.coverImage ||
          cachedBook.cover ||
          ''
        return {
          id: item.id,
          bookId,
          slug: book.slug || cachedBook.slug || '',
          title: book.title || cachedBook.title || 'Buku',
          author:
            book.author_name ||
            (typeof book.author === 'object' ? book.author?.name : book.author) ||
            cachedBook.author ||
            '',
          category: book.category_name || cachedBook.category || '',
          price: Number(book.price) || Number(cachedBook.price) || 0,
          originalPrice: Number(book.original_price) || Number(cachedBook.originalPrice) || 0,
          discount: Number(book.discount_percentage) || Number(cachedBook.discount) || 0,
          cover,
          coverImage: cover,
          stock: Number(book.stock ?? cachedBook.stock) || 0,
          weightGrams: Number(book.weight_grams ?? cachedBook.weightGrams) || 0,
        }
      })
      return state.wishlist
    } catch (error) {
      if (!handleAuthFailure(error)) {
        showToast(errorText(error, 'Gagal memuat wishlist'), { type: 'error' })
      }
      return []
    } finally {
      state.wishlistLoading = false
      if (isDefaultQuery) wishlistPromise = null
    }
  })()

  if (isDefaultQuery) wishlistPromise = promise
  return promise
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
    } else {
      await api.addWishlist(bookId)
      await loadWishlist()
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

  const cleanLine = String(address.fullAddress || '')
    .trim()
    .replace(/^[\s,.-]+/, '')

  return {
    receiver_name: String(address.recipient || '').trim(),
    phone: String(address.phone || '').trim(),
    address_line: cleanLine,
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

    await api.createAddress(payload)
    await loadAddresses(true)
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
    await loadAddresses(true)
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
    await loadAddresses(true)
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
    await loadAddresses(true)
    showToast('Alamat utama berhasil diperbarui.', { type: 'success' })
    return true
  } catch (error) {
    showToast(errorText(error, 'Gagal mengubah alamat utama'), { type: 'error' })
    return false
  }
}

async function reorderBook(order) {
  if (!order) return
  let currentOrder = order

  const hasSpecificBooks =
    Array.isArray(currentOrder.items) &&
    currentOrder.items.some((item) => state.books.some((b) => String(b.id) === String(item.id)))

  if (!hasSpecificBooks && currentOrder.id) {
    try {
      const res = await api.order(currentOrder.id)
      if (res?.data) currentOrder = mapOrder(res.data)
    } catch {}
  }

  if (!currentOrder || !Array.isArray(currentOrder.items)) return

  const available = currentOrder.items
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
    loadPopularBooks,
    loadBook,
    loadOrders,
    loadOrderDetail,
    applyOrderPaymentUpdate,
    applyOrderShippingUpdate,
    loadAddresses,
    enrichAddressDetails,
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
