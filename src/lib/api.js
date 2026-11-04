export const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')

const ACCESS_TOKEN_KEY = 'bookstore.access_token'
const REFRESH_TOKEN_KEY = 'bookstore.refresh_token'
const USER_ROLE_KEY = 'bookstore.user_role'
const PERSIST_KEY = 'bookstore.persist'
const REQUEST_TIMEOUT_MS = 20000

function activeStorage() {
  try {
    return localStorage.getItem(PERSIST_KEY) === '0' ? sessionStorage : localStorage
  } catch {
    return localStorage
  }
}

function setPersistence(persist) {
  try {
    localStorage.setItem(PERSIST_KEY, persist ? '1' : '0')
  } catch {
    // Fall back to in-memory storage if localStorage is unavailable.
  }
}

function readStorage(key) {
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key, value) {
  try {
    const target = activeStorage()
    const other = target === localStorage ? sessionStorage : localStorage
    if (value) target.setItem(key, value)
    else target.removeItem(key)
    other.removeItem(key)
  } catch {}
}

export class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export const session = {
  get accessToken() {
    return readStorage(ACCESS_TOKEN_KEY)
  },
  get refreshToken() {
    return readStorage(REFRESH_TOKEN_KEY)
  },
  get isAuthenticated() {
    return Boolean(readStorage(ACCESS_TOKEN_KEY))
  },
  get role() {
    return readStorage(USER_ROLE_KEY) || ''
  },
  set(tokens = {}, options = {}) {
    if (typeof options.persist === 'boolean') setPersistence(options.persist)
    writeStorage(ACCESS_TOKEN_KEY, tokens.access_token || '')
    writeStorage(REFRESH_TOKEN_KEY, tokens.refresh_token || '')
  },
  setRole(role) {
    writeStorage(USER_ROLE_KEY, role || '')
  },
  clear() {
    writeStorage(ACCESS_TOKEN_KEY, '')
    writeStorage(REFRESH_TOKEN_KEY, '')
    writeStorage(USER_ROLE_KEY, '')
    try {
      localStorage.removeItem(PERSIST_KEY)
    } catch {}
  },
}

function timeoutSignal() {
  return typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
    ? AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    : undefined
}

function toQuery(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.set(key, String(value))
  })
  const string = query.toString()
  return string ? `?${string}` : ''
}

function errorMessage(payload, status) {
  const errors = payload?.errors
  if (Array.isArray(errors) && errors.length) {
    const details = errors
      .map((error) => (typeof error === 'string' ? error : error?.message))
      .filter(Boolean)
    if (details.length) return details.join(', ')
  }

  const data = payload?.data
  if (typeof data === 'string' && data.trim()) return data
  if (data && typeof data === 'object') {
    const details = Object.values(data)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value) => typeof value === 'string' && value.trim())
    if (details.length) return details.join(', ')
  }

  const message = payload?.message
  if (typeof message === 'string' && message.trim()) return message

  return `Permintaan gagal (${status})`
}

let refreshPromise = null

function notifySessionExpired() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bookstore:auth-expired'))
  }
}

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise

  const refreshToken = session.refreshToken

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${BASE_URL}/v1/auth/refresh-token`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(refreshToken ? { refresh_token: refreshToken } : {}),
        signal: timeoutSignal(),
        credentials: 'include',
      })
      if (!response.ok) return false

      const payload = await response.json().catch(() => null)
      const tokens = payload?.data
      if (!tokens?.access_token) return false

      session.set({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || refreshToken || '',
      })
      return true
    } catch {
      return 'network'
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export function refreshSession() {
  return refreshAccessToken()
}

async function request(path, { method = 'GET', body, auth = true, retry = true, credentials = 'include' } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const token = session.accessToken
  if (auth && token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: timeoutSignal(),
      credentials,
    })
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new ApiError('Server tidak merespons. Silakan coba lagi.', 0)
    }
    throw new ApiError('Tidak dapat terhubung ke server. Periksa koneksi internet.', 0)
  }

  if (response.status === 401 && auth && retry && session.refreshToken) {
    const refreshed = await refreshAccessToken()
    if (refreshed === true) return request(path, { method, body, auth, retry: false })
    if (refreshed === 'network') {
      throw new ApiError('Tidak dapat terhubung ke server. Periksa koneksi internet.', 0)
    }
    session.clear()
    notifySessionExpired()
  } else if (response.status === 401 && auth && session.accessToken) {
    session.clear()
    notifySessionExpired()
  }

  const text = await response.text()
  let payload = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    throw new ApiError(errorMessage(payload, response.status), response.status, payload)
  }

  return payload ?? {}
}

async function requestBlob(path, { retry = true, credentials = 'include' } = {}) {
  const headers = { Accept: 'application/pdf' }
  const token = session.accessToken
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers,
      signal: timeoutSignal(),
      credentials,
    })
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new ApiError('Server tidak merespons. Silakan coba lagi.', 0)
    }
    throw new ApiError('Tidak dapat terhubung ke server. Periksa koneksi internet.', 0)
  }

  if (response.status === 401 && retry && session.refreshToken) {
    const refreshed = await refreshAccessToken()
    if (refreshed === true) return requestBlob(path, { retry: false })
    if (refreshed === 'network') {
      throw new ApiError('Tidak dapat terhubung ke server. Periksa koneksi internet.', 0)
    }
    session.clear()
    notifySessionExpired()
  } else if (response.status === 401 && session.accessToken) {
    session.clear()
    notifySessionExpired()
  }

  if (!response.ok) {
    const text = await response.text()
    let payload = null
    try {
      payload = text ? JSON.parse(text) : null
    } catch {
      payload = null
    }
    throw new ApiError(errorMessage(payload, response.status), response.status, payload)
  }

  const disposition = response.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename="?([^";]+)"?/i)
  return {
    blob: await response.blob(),
    filename: match?.[1] || 'download.pdf',
  }
}

async function uploadImage(file, folder = 'covers') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', folder)

  const headers = { Accept: 'application/json' }
  if (session.accessToken) headers.Authorization = `Bearer ${session.accessToken}`

  let response
  try {
    response = await fetch(`${BASE_URL}/v1/uploads`, {
      method: 'POST',
      headers,
      body: formData,
      signal: timeoutSignal(),
    })
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new ApiError('Server tidak merespons. Silakan coba lagi.', 0)
    }
    throw new ApiError('Tidak dapat terhubung ke server. Periksa koneksi internet.', 0)
  }

  const text = await response.text()
  let payload = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    throw new ApiError(errorMessage(payload, response.status), response.status, payload)
  }

  return payload ?? {}
}

export const api = {
  login: (email, password, turnstileToken = '') =>
    request('/v1/auth/login', {
      method: 'POST',
      body: {
        email,
        password,
        ...(turnstileToken ? { turnstile_token: turnstileToken } : {}),
      },
      auth: false,
    }),
  register: (name, email, password, turnstileToken = '') =>
    request('/v1/auth/register', {
      method: 'POST',
      body: {
        name,
        email,
        password,
        ...(turnstileToken ? { turnstile_token: turnstileToken } : {}),
      },
      auth: false,
    }),
  activateAccount: (token) =>
    request('/v1/auth/activate-account', { method: 'POST', body: { token }, auth: false }),
  forgotPassword: (email, turnstileToken = '') =>
    request('/v1/auth/forgot-password', {
      method: 'POST',
      body: {
        email,
        ...(turnstileToken ? { turnstile_token: turnstileToken } : {}),
      },
      auth: false,
    }),
  resetPassword: (token, newPassword, confirmPassword) =>
    request('/v1/auth/reset-password', {
      method: 'POST',
      body: {
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      },
      auth: false,
    }),
  resendActivation: (email, turnstileToken = '') =>
    request('/v1/auth/resend-activation', {
      method: 'POST',
      body: {
        email,
        ...(turnstileToken ? { turnstile_token: turnstileToken } : {}),
      },
      auth: false,
    }),
  refreshWithCookie: () =>
    request('/v1/auth/refresh-token', {
      method: 'POST',
      body: {},
      auth: false,
      retry: false,
    }),
  logout: (refreshToken) =>
    request('/v1/auth/logout', {
      method: 'POST',
      body: { refresh_token: refreshToken },
      auth: false,
      retry: false,
    }),
  me: () => request('/v1/users/me'),
  users: (params = {}) => request(`/v1/users${toQuery(params)}`),

  books: (params = {}) => {
    const query = { ...params }
    if (query.sort_by === 'populer' || query.sort_by === 'terpopuler') {
      query.sort_by = 'popular'
    } else if (query.sort_by === 'terbaru') {
      query.sort_by = 'newest'
    }
    return request(`/v1/books${toQuery(query)}`)
  },
  book: (slug) => request(`/v1/books/${encodeURIComponent(slug)}`),
  createBook: (payload) => request('/v1/books', { method: 'POST', body: payload }),
  updateBook: (id, payload) => request(`/v1/books/${id}`, { method: 'PUT', body: payload }),
  deleteBook: (id) => request(`/v1/books/${id}`, { method: 'DELETE' }),
  authors: (params = {}) => request(`/v1/authors${toQuery({ per_page: 10, ...params })}`),
  author: (slug) => request(`/v1/authors/${encodeURIComponent(slug)}`),
  createAuthor: (payload) => request('/v1/authors', { method: 'POST', body: payload }),
  updateAuthor: (id, payload) => request(`/v1/authors/${id}`, { method: 'PUT', body: payload }),
  deleteAuthor: (id) => request(`/v1/authors/${id}`, { method: 'DELETE' }),
  publishers: (params = {}) => request(`/v1/publishers${toQuery(params)}`),
  createPublisher: (payload) => request('/v1/publishers', { method: 'POST', body: payload }),
  updatePublisher: (id, payload) =>
    request(`/v1/publishers/${id}`, { method: 'PUT', body: payload }),
  deletePublisher: (id) => request(`/v1/publishers/${id}`, { method: 'DELETE' }),
  categories: () => request('/v1/categories'),
  createCategory: (payload) => request('/v1/categories', { method: 'POST', body: payload }),
  updateCategory: (id, payload) =>
    request(`/v1/categories/${id}`, { method: 'PUT', body: payload }),
  deleteCategory: (id) => request(`/v1/categories/${id}`, { method: 'DELETE' }),
  discounts: (params = {}) => request(`/v1/discounts${toQuery(params)}`),
  discount: (id) => request(`/v1/discounts/${id}`),
  createDiscount: (payload) => request('/v1/discounts', { method: 'POST', body: payload }),
  updateDiscount: (id, payload) => request(`/v1/discounts/${id}`, { method: 'PUT', body: payload }),
  deleteDiscount: (id) => request(`/v1/discounts/${id}`, { method: 'DELETE' }),

  cart: () => request('/v1/cart'),
  addToCart: (bookId, quantity = 1) =>
    request('/v1/cart/items', { method: 'POST', body: { book_id: bookId, quantity } }),
  updateCartItem: (itemId, quantity) =>
    request(`/v1/cart/items/${itemId}`, { method: 'PATCH', body: { quantity } }),
  removeCartItem: (itemId) => request(`/v1/cart/items/${itemId}`, { method: 'DELETE' }),
  clearCart: () => request('/v1/cart', { method: 'DELETE' }),

  wishlist: (params = {}) => request(`/v1/wishlist${toQuery(params)}`),
  checkWishlist: (bookId) => request(`/v1/wishlist/check/${bookId}`),
  addWishlist: (bookId) =>
    request('/v1/wishlist/items', { method: 'POST', body: { book_id: bookId } }),
  removeWishlist: (bookId) => request(`/v1/wishlist/items/${bookId}`, { method: 'DELETE' }),
  clearWishlist: () => request('/v1/wishlist', { method: 'DELETE' }),
  moveWishlistToCart: (bookId, quantity = 1) =>
    request(`/v1/wishlist/items/${bookId}/move-to-cart`, {
      method: 'POST',
      body: { quantity },
    }),

  primaryAddress: () => request('/v1/addresses/primary'),
  addresses: () => request('/v1/addresses'),
  address: (id) => request(`/v1/addresses/${id}`),
  createAddress: (payload) => request('/v1/addresses', { method: 'POST', body: payload }),
  updateAddress: (id, payload) => request(`/v1/addresses/${id}`, { method: 'PUT', body: payload }),
  deleteAddress: (id) => request(`/v1/addresses/${id}`, { method: 'DELETE' }),
  setPrimaryAddress: (id) => request(`/v1/addresses/${id}/primary`, { method: 'PATCH' }),
  areas: (search) => request(`/v1/shipping/areas${toQuery({ search })}`),
  couriers: () => request('/v1/shipping/couriers'),
  rates: (cartItemIds, addressId) =>
    request('/v1/shipping/rates', {
      method: 'POST',
      body: { cart_item_ids: cartItemIds, address_id: addressId },
    }),

  checkDiscount: (code, items) =>
    request('/v1/discounts/check', { method: 'POST', body: { code, items } }),
  preview: (payload) => request('/v1/checkout/preview', { method: 'POST', body: payload }),
  createOrder: (payload) => request('/v1/checkout/order', { method: 'POST', body: payload }),
  checkoutPaymentMethods: (amount) => request(`/v1/checkout/payment-methods${toQuery({ amount })}`),
  paymentMethods: (params = {}) => request(`/v1/payment-methods${toQuery(params)}`),
  paymentMethod: (id) => request(`/v1/payment-methods/${id}`),
  updatePaymentMethod: (id, payload) =>
    request(`/v1/payment-methods/${id}`, { method: 'PUT', body: payload }),
  uploadImage,
  deleteUpload: (params = {}) => request(`/v1/uploads${toQuery(params)}`, { method: 'DELETE' }),
  orders: (status) => request(`/v1/orders${toQuery({ status })}`),
  order: (invoice) => request(`/v1/orders/${encodeURIComponent(invoice)}`),
  orderPdf: (invoice) => requestBlob(`/v1/orders/${encodeURIComponent(invoice)}/pdf`),
  fulfillOrder: (invoice, orderNote = '') =>
    request(`/v1/orders/${encodeURIComponent(invoice)}/fulfill`, {
      method: 'POST',
      body: { order_note: orderNote },
    }),
  returnOrder: (invoice, reason = '') =>
    request(`/v1/orders/${encodeURIComponent(invoice)}/return`, {
      method: 'POST',
      body: { reason },
    }),
  orderTracking: (invoice) => request(`/v1/orders/${encodeURIComponent(invoice)}/tracking`),
  adminOrders: (params = {}) => request(`/v1/orders/all${toQuery(params)}`),
  adminOrder: (invoice) => request(`/v1/orders/detail/${encodeURIComponent(invoice)}`),
  report: (params = {}) => request(`/v1/reports${toQuery(params)}`),
  adminReport: (params = {}) => request(`/v1/reports${toQuery(params)}`),
  reportPdf: (params = {}) => requestBlob(`/v1/reports/pdf${toQuery(params)}`),
  googleLoginUrl: () => `${BASE_URL}/v1/auth/google/login`,
  changePassword: (currentPassword, newPassword, confirmPassword, refreshToken) =>
    request('/v1/auth/change-password', {
      method: 'POST',
      body: {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
        ...(refreshToken ? { refresh_token: refreshToken } : {}),
      },
    }),
}
