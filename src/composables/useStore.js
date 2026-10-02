import { reactive, readonly } from 'vue'

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

  isLoggedIn: false,
  userName: '',
  userEmail: '',

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
  showToast(`"${book.title}" (${format}) masuk keranjang!`, { type: 'success' })
}

function removeFromCart(id, format) {
  state.cart = state.cart.filter((item) => !(item.id === id && (!format || item.format === format)))
  showToast('Item dihapus dari keranjang', { type: 'info' })
}

function updateQuantity(id, qty, format) {
  const item = state.cart.find((item) => item.id === id && (!format || item.format === format))
  if (item) {
    if (qty < 1) {
      return
    }
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
  showToast(`Selamat datang kembali, ${name}!`, { type: 'success' })
}

function register(name, email) {
  state.isLoggedIn = true
  state.userName = name
  state.userEmail = email
  showToast(`Akun berhasil dibuat. Selamat datang, ${name}!`, { type: 'success' })
}

function loginWithGoogle(name, email) {
  state.isLoggedIn = true
  state.userName = name
  state.userEmail = email
  showToast(`Masuk dengan Google berhasil. Halo, ${name}!`, { type: 'success' })
}

function logout() {
  state.isLoggedIn = false
  state.userName = ''
  state.userEmail = ''
  showToast('Anda telah keluar.', { type: 'info' })
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
    cartCount,
    cartTotal,
    selectedCount,
    selectedTotal,
    selectedItems,
  }
}
