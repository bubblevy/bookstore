export function localizeApiError(message, status = 0) {
  const text = String(message || '')

  if (/category slug already exists/i.test(text)) {
    return 'Kategori dengan nama itu sudah ada.'
  }
  if (/voucher code already exists|discount code already exists/i.test(text)) {
    return 'Kode voucher sudah digunakan.'
  }
  if (/isbn.*(exists|registered|unique|duplicate)/i.test(text)) {
    return 'ISBN sudah terdaftar.'
  }
  if (/already exists|already registered|duplicate|unique constraint/i.test(text)) {
    return 'Data sudah ada. Gunakan nilai lain.'
  }
  if (/invalid or expired token/i.test(text)) {
    return 'Link sudah tidak valid atau kedaluwarsa.'
  }
  if (/insufficient stock|out of stock|stock.*not enough/i.test(text)) {
    return 'Stok buku tidak mencukupi.'
  }
  if (/current password is incorrect/i.test(text)) {
    return 'Password saat ini salah.'
  }
  if (/strong_password|at least 8 characters/i.test(text)) {
    return 'Password belum cukup kuat. Tambahkan variasi karakter.'
  }
  if (/already processed|already fulfilled/i.test(text)) {
    return 'Pesanan ini sudah pernah didispatch.'
  }
  if (/invalid return state|not shipped|already returned/i.test(text)) {
    return 'Retur hanya bisa untuk pesanan yang sudah dikirim atau selesai.'
  }
  if (/not found/i.test(text)) {
    return 'Data tidak ditemukan.'
  }
  if (status === 429) {
    return 'Terlalu banyak percobaan. Coba lagi sebentar.'
  }

  return text
}
