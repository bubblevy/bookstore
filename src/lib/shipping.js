import { api } from '@/lib/api'

const COURIER_NAMES = {
  anteraja: 'AnterAja',
  gojek: 'GoSend',
  grab: 'GrabExpress',
  idexpress: 'IDexpress',
  jet: 'JET Express',
  jne: 'JNE',
  jnt: 'J&T',
  lion: 'Lion Parcel',
  ninja: 'Ninja Xpress',
  paxel: 'Paxel',
  pos: 'POS Indonesia',
  rpx: 'RPX',
  sap: 'SAP Express',
  sicepat: 'SiCepat',
  tiki: 'TIKI',
  wahana: 'Wahana',
}

const SERVICE_NAMES = {
  cargo: 'Cargo',
  ct: 'Cargo',
  ez: 'EZ',
  instant: 'Instant',
  jtr: 'Trucking',
  kargo: 'Kargo',
  oke: 'OKE',
  ons: 'ONS',
  reg: 'Reguler',
  sameday: 'Same Day',
  standard: 'Standard',
  yes: 'YES',
}

let catalog = null
let catalogPromise = null

function titleCase(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

// The courier list from Biteship is the naming standard. Cache it once and use
// it for order history, where the API only stores courier/service codes.
export function ensureCourierCatalog() {
  if (catalog) return Promise.resolve(catalog)
  if (catalogPromise) return catalogPromise

  catalogPromise = (async () => {
    const map = new Map()
    try {
      const response = await api.couriers()
      for (const item of response.data || []) {
        if (!item?.courier_code) continue
        map.set(
          `${String(item.courier_code).toLowerCase()}|${String(
            item.courier_service_code || '',
          ).toLowerCase()}`,
          {
            brand: item.courier_name || '',
            service: item.courier_service_name || '',
          },
        )
      }
    } catch {
      // Fall back to the static labels below.
    }
    catalog = map
    catalogPromise = null
    return map
  })()

  return catalogPromise
}

export function shippingLabel(courier, service = '') {
  const code = String(courier || '').toLowerCase()
  const serviceCode = String(service || '').toLowerCase()
  const hit = catalog?.get(`${code}|${serviceCode}`)
  if (hit?.brand) {
    return [hit.brand, hit.service].filter(Boolean).join(' ')
  }

  const brand = COURIER_NAMES[code] || titleCase(courier)
  const name = SERVICE_NAMES[serviceCode] || titleCase(service)
  return [brand, name].filter(Boolean).join(' ')
}
