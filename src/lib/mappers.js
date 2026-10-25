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
  return {
    id: raw.slug || raw.id,
    slug: raw.slug || '',
    name: raw.name || 'Kategori',
    count: `${raw.total_books ?? 0} Buku`,
    description: '',
    icon: style.icon,
    theme: style.theme,
    bg: style.bg,
    text: style.text,
    image: raw.image_url || '',
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
    sold: Number(raw.sold) || 0,
    stock: Number(raw.stock) || 0,
    weightGrams: Number(raw.weight_grams) || 0,
    coverImage: raw.cover_image || '',
    cover: raw.cover_image || '',
    theme: themeFor(raw.category?.slug || raw.slug || raw.id),
    accentColor: '',
    subtitle: '',
  }
}

export function mapBookDetail(raw = {}) {
  const book = mapBook(raw)

  return {
    ...book,
    isbn: raw.isbn || '',
    description: raw.synopsis || '',
    details: {
      publisher: raw.publisher?.name || '-',
      publishDate: raw.publication_year ? String(raw.publication_year) : '',
      isbn: raw.isbn || '',
      pages: raw.pages || 0,
      language: raw.language || 'Indonesia',
      length: raw.length ? `${raw.length} cm` : '',
      width: raw.width ? `${raw.width} cm` : '',
      height: raw.height || '',
      weight: raw.weight_grams ? `${(Number(raw.weight_grams) / 1000).toFixed(2)} kg` : '',
      condition: raw.condition || '100% Baru & Segel Penerbit',
    },
  }
}

export function mapCartItem(item = {}, cache = {}) {
  const book = item.book || {}
  const cached = cache[book.id] || {}

  return {
    id: item.id,
    bookId: item.book_id,
    slug: book.slug || cached.slug || '',
    title: book.title || cached.title || 'Buku',
    author: cached.author || 'Penulis',
    price: Number(book.price) || 0,
    originalPrice: 0,
    theme: cached.theme || themeFor(book.slug || book.id),
    quantity: Number(item.quantity) || 1,
    stock: Number(book.stock) || 0,
    selected: true,
  }
}
