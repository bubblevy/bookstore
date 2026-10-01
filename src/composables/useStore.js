// Reactive global store using Vue's reactivity primitives.
// Manages cart, modals, drawer, and notifications.

import { reactive, readonly } from 'vue'

const state = reactive({
  // Cart state
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
    },
  ],

  // Cart slide-over drawer state
  isCartOpen: false,

  // Auth state
  isLoggedIn: false,
  userName: '',

  // Active modal: null | 'login' | 'quickview' | 'search'
  activeModal: null,
  modalPayload: null,

  // Search filter
  searchQuery: '',
})

// Toast notifications
let toastListeners = new Set()
let toastId = 0

function showToast(message, options = {}) {
  const id = ++toastId
  const toast = {
    id,
    message,
    type: options.type || 'info', // 'info' | 'success' | 'error'
  }
  toastListeners.forEach((fn) => fn(toast))
  return id
}

function onToast(fn) {
  toastListeners.add(fn)
  return () => toastListeners.delete(fn)
}

// Cart actions
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
    })
  }
  showToast(`"${book.title}" (${format}) masuk keranjang!`, { type: 'success' })
}

function removeFromCart(id, format) {
  state.cart = state.cart.filter((item) => !(item.id === id && (!format || item.format === format)))
  showToast('Item dihapus dari keranjang', { type: 'info' })
}

function updateQuantity(id, qty, format) {
  const item = state.cart.find((item) => item.id === id && (!format || item.format === format))
  if (item) {
    if (qty <= 0) {
      removeFromCart(id, format)
    } else {
      item.quantity = Math.min(99, qty)
    }
  }
}

function clearCart() {
  state.cart = []
}

// Drawer actions
function openCart() {
  state.isCartOpen = true
}

function closeCart() {
  state.isCartOpen = false
}

function toggleCart() {
  state.isCartOpen = !state.isCartOpen
}

// Modal actions
function openModal(name, payload = null) {
  state.activeModal = name
  state.modalPayload = payload
}

function closeModal() {
  state.activeModal = null
  state.modalPayload = null
}

// Auth actions
function login(name) {
  state.isLoggedIn = true
  state.userName = name
  showToast(`Selamat datang, ${name}! Siap berburu buku baru?`, { type: 'success' })
}

function logout() {
  state.isLoggedIn = false
  state.userName = ''
  showToast('Anda telah keluar.', { type: 'info' })
}

// Selectors
const cartCount = () => state.cart.reduce((sum, item) => sum + item.quantity, 0)
const cartTotal = () =>
  state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

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
    openCart,
    closeCart,
    toggleCart,
    openModal,
    closeModal,
    login,
    logout,
    cartCount,
    cartTotal,
  }
}
