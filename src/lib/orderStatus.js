export const ORDER_STATUS = {
  waiting_payment: { label: 'Menunggu Pembayaran', className: 'bg-gray-200 text-black' },
  paid: { label: 'Dibayar', className: 'bg-neo-yellow text-black' },
  processing: { label: 'Diproses', className: 'bg-neo-yellow text-black' },
  shipped: { label: 'Dikirim', className: 'bg-sky text-black' },
  completed: { label: 'Selesai', className: 'bg-neo-lime text-black' },
  cancelled: { label: 'Dibatalkan', className: 'bg-red-300 text-black' },
  returned: { label: 'Diretur', className: 'bg-red-300 text-black' },
}

export function orderStatusLabel(status) {
  return ORDER_STATUS[status]?.label || status
}

export function orderStatusClass(status) {
  return ORDER_STATUS[status]?.className || 'bg-gray-200 text-black'
}
