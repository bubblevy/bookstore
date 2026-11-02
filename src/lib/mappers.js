const THEMES = ['violet', 'yellow', 'orange', 'lime', 'black']

const CATEGORY_STYLES = [
  { icon: 'mountain', theme: 'violet', bg: '#8847F5', text: '#FFFFFF' },
  { icon: 'brain', theme: 'yellow', bg: '#D8FA00', text: '#000000' },
  { icon: 'rocket', theme: 'orange', bg: '#FF7B29', text: '#FFFFFF' },
  { icon: 'compass', theme: 'lime', bg: '#CBFF00', text: '#000000' },
  { icon: 'palette', theme: 'pink', bg: '#FF9EC1', text: '#000000' },
  { icon: 'star', theme: 'sky', bg: '#6EC6FF', text: '#000000' },
]

export function themeFor(value = '') {
  let hash = 0
  for (const character of String(value)) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  }
  return THEMES[hash % THEMES.length]
}

export function mapCategory(raw = {}, index = 0) {
  const style = CATEGORY_STYLES[index % CATEGORY_STYLES.length]
  const numericId = Number(raw.id) || 0
  return {
    id: raw.id ?? raw.slug,
    numericId,
    slug: raw.slug || '',
    name: raw.name || 'Kategori',
    count: `${raw.total_books ?? 0} Buku`,
    totalBooks: Number(raw.total_books) || 0,
    description: '',
    icon: style.icon,
    theme: style.theme,
    bg: style.bg,
    text: style.text,
    image: raw.image_url || raw.image || raw.icon_url || raw.thumbnail || '',
    createdAt: raw.created_at || raw.createdAt || '',
    raw,
  }
}

export function mapBook(raw = {}) {
  const price = Number(raw.price) || 0
  const originalPrice = Number(raw.original_price) || 0
  const discount = Number(raw.discount_percentage)

  return {
    id: raw.id,
    slug: raw.slug || String(raw.id ?? ''),
    title: raw.title || 'Tanpa Judul',
    author: raw.author?.name || 'Tanpa Penulis',
    category: raw.category?.name || 'Umum',
    categorySlug: raw.category?.slug || '',
    publisher: raw.publisher?.name || '',
    price,
    originalPrice,
    discount:
      Number.isFinite(discount) && discount > 0
        ? discount
        : originalPrice > price
          ? Math.round(((originalPrice - price) / originalPrice) * 100)
          : 0,
    sold:
      Number(
        raw.sold ?? 0,
      ) || 0,
    stock: Number(raw.stock ?? raw.total_stock ?? 0) || 0,
    weightGrams: Number(raw.weight_grams) || 0,
    coverImage: raw.cover_image || '',
    cover: raw.cover_image || '',
    theme: themeFor(raw.category?.slug || raw.slug || raw.id),
    accentColor: '',
    subtitle: '',
    synopsis: raw.synopsis || raw.description || '',
    format: raw.format || 'Paperback',
  }
}

export function mapBookDetail(raw = {}) {
  const book = mapBook(raw)
  const pubDate = raw.publication_date ? raw.publication_date.slice(0, 10) : ''

  return {
    ...book,
    isbn: raw.isbn || '',
    description: raw.synopsis || '',
    details: {
      publisher: raw.publisher?.name || '-',
      publishDate: pubDate,
      publicationDate: pubDate || null,
      isbn: raw.isbn || '',
      pages: raw.pages || 0,
      language: raw.language || 'Indonesia',
      length: raw.length ? `${raw.length} cm` : '',
      width: raw.width ? `${raw.width} cm` : '',
      height: raw.height ? `${raw.height} cm` : '',
      weight: raw.weight_grams ? `${(Number(raw.weight_grams) / 1000).toFixed(2)} kg` : '',
      condition: raw.condition || '100% Baru & Segel Penerbit',
    },
  }
}

export function mapCartItem(item = {}, cache = {}) {
  const book = item.book || {}
  const bookId = item.book_id || item.bookId || book.id
  const cached = cache[bookId] || cache[book.id] || {}
  const cover =
    book.cover_image ||
    book.coverImage ||
    book.cover ||
    cached.coverImage ||
    cached.cover ||
    ''

  return {
    id: item.id,
    bookId,
    slug: book.slug || cached.slug || '',
    title: book.title || cached.title || 'Buku',
    author:
      (typeof book.author === 'object' ? book.author?.name : book.author) ||
      cached.author ||
      'Penulis',
    price: Number(book.price) || 0,
    originalPrice: 0,
    theme: cached.theme || themeFor(book.slug || bookId),
    quantity: Number(item.quantity) || 1,
    stock: Number(book.stock) || 0,
    selected: true,
    coverImage: cover,
    cover: cover,
  }
}

export function formatFullAddress(addr) {
  if (!addr) return ''

  if (typeof addr === 'string') {
    return addr
      .trim()
      .replace(/^[\s,.-]+/, '')
      .replace(/[\s,.-]+$/, '')
      .replace(/\s*,\s*,+/g, ', ')
  }

    let street = (
    addr.address_line ||
    addr.address ||
    addr.fullAddress ||
    addr.full_address ||
    addr.street ||
    ''
  ).trim()

    street = street
    .replace(/^[\s,.-]+/, '')
    .replace(/[\s,.-]+$/, '')
    .replace(/\s*,\s*,+/g, ', ')

    const subdistrict = (
    addr.subdistrict_name ||
    addr.subdistrict ||
    addr.administrative_division_level_4_name ||
    ''
  ).trim()
  const district = (
    addr.district_name ||
    addr.district ||
    addr.administrative_division_level_3_name ||
    ''
  ).trim()
  const city = (
    addr.city_name ||
    addr.city ||
    addr.administrative_division_level_2_name ||
    ''
  ).trim()
  const province = (
    addr.province_name ||
    addr.province ||
    addr.administrative_division_level_1_name ||
    ''
  ).trim()
  const postal = String(
    addr.postal_code ||
    addr.postalCode ||
    addr.zip_code ||
    ''
  ).trim()

  const parts = []
  if (street) parts.push(street)

  const streetLower = street.toLowerCase()

    if (subdistrict) {
    const rawSub = subdistrict.replace(/^(kelurahan|desa|kel\.?|ds\.?)\s+/i, '').trim().toLowerCase()
    const alreadyIncluded =
      streetLower === rawSub ||
      streetLower.includes(`kel. ${rawSub}`) ||
      streetLower.includes(`kelurahan ${rawSub}`) ||
      streetLower.includes(`desa ${rawSub}`)
    if (!alreadyIncluded) {
      const label = /^(kelurahan|desa|kel\.?|ds\.?)\s+/i.test(subdistrict)
        ? subdistrict
        : `Kel. ${subdistrict}`
      parts.push(label)
    }
  }

    if (district) {
    const rawDist = district.replace(/^(kecamatan|kec\.?)\s+/i, '').trim().toLowerCase()
    const alreadyIncluded =
      streetLower === rawDist ||
      streetLower.includes(`kec. ${rawDist}`) ||
      streetLower.includes(`kecamatan ${rawDist}`)
    if (!alreadyIncluded) {
      const label = /^(kecamatan|kec\.?)\s+/i.test(district) ? district : `Kec. ${district}`
      parts.push(label)
    }
  }

    if (city) {
    const rawCity = city.replace(/^(kota|kabupaten|kab\.?)\s+/i, '').trim().toLowerCase()
    const alreadyIncluded =
      streetLower === rawCity ||
      parts.some((p) => {
        const pClean = p.replace(/^(kota|kabupaten|kab\.?)\s+/i, '').trim().toLowerCase()
        return pClean === rawCity
      })
    if (!alreadyIncluded) {
      parts.push(city)
    }
  }

    if (province) {
    const provLower = province.toLowerCase()
    const alreadyIncluded =
      streetLower === provLower ||
      parts.some((p) => p.toLowerCase() === provLower)
    if (!alreadyIncluded) {
      parts.push(province)
    }
  }

  let full = parts.filter(Boolean).join(', ')

    if (postal && !full.includes(postal)) {
    full = full ? `${full} ${postal}` : postal
  }

  return full.replace(/^[\s,]+/, '').replace(/,\s*,/g, ', ').trim()
}

export function formatPaymentMethodName(rawMethod, order = {}) {
  const payment = order?.payment || {}
  const method = String(
    rawMethod ||
    payment?.payment_method_name ||
    payment?.payment_method ||
    payment?.paymentMethod ||
    payment?.name ||
    payment?.method ||
    order?.payment_method_name ||
    order?.payment_method ||
    order?.paymentMethod ||
    order?.paymentMethodCode ||
    order?.payment_type ||
    payment?.payment_type ||
    ''
  ).trim()

  const lower = method.toLowerCase()
  const bank = String(payment?.bank || order?.bank || '').toUpperCase()
  const va = String(
    payment?.va_number ||
    payment?.vaNumber ||
    order?.vaNumber ||
    order?.va_number ||
    ''
  )
  const qr = Boolean(
    payment?.qr_url ||
    payment?.qrUrl ||
    order?.qrUrl ||
    order?.qr_url ||
    lower.includes('qris')
  )

  if (qr) return 'QRIS'
  if (lower === 'gopay' || lower.includes('gopay')) return 'GoPay'
  if (lower === 'shopeepay' || lower.includes('shopeepay')) return 'ShopeePay'
  if (lower === 'bca_va' || (bank === 'BCA' && va)) return 'BCA Virtual Account'
  if (lower === 'bni_va' || (bank === 'BNI' && va)) return 'BNI Virtual Account'
  if (lower === 'bri_va' || (bank === 'BRI' && va)) return 'BRI Virtual Account'
  if (lower === 'cimb_va' || (bank === 'CIMB' && va)) return 'CIMB Niaga Virtual Account'
  if (lower === 'permata_va' || (bank === 'PERMATA' && va)) return 'Permata Virtual Account'
  if (lower === 'mandiri_bill' || lower === 'echannel' || lower.includes('mandiri')) return 'Mandiri Bill Payment'
  if (lower.includes('indomaret')) return 'Indomaret'
  if (lower.includes('alfamart')) return 'Alfamart'
  if (bank) return `${bank} Virtual Account`
  if (lower.includes('bank') || lower.includes('va') || va) return 'Virtual Account'
  if (lower === 'cstore') return payment?.store || order?.store || 'Gerai Retail'

  if (method && method !== '-' && method !== '—' && method !== 'undefined' && method !== 'null') {
    return method.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }
  return '—'
}
