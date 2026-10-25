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

function titleCase(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

// The order API only stores courier codes, so map the common ones to readable
// names and fall back to title case for anything new.
export function shippingLabel(courier, service = '') {
  const code = String(courier || '').toLowerCase()
  const serviceCode = String(service || '').toLowerCase()
  const brand = COURIER_NAMES[code] || titleCase(courier)
  const name = SERVICE_NAMES[serviceCode] || titleCase(service)
  return [brand, name].filter(Boolean).join(' ')
}
