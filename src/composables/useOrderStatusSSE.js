import { ref, onMounted, onUnmounted, watch } from 'vue'
import { session, BASE_URL, refreshSession } from '@/lib/api'

export function mapOrderStatus(status) {
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

/**
 * Composable to subscribe to Server-Sent Events (SSE) for real-time order status updates.
 * Corresponds to endpoint GET /api/v1/sse/orders (see docs backend/sse_integration.md).
 *
 * Supported events:
 * - `connected`: { status, user_id, invoice, timestamp }
 * - `payment_status`: { order_id, invoice_number, user_id, payment_status, order_status, payment_type, gross_amount, paid_at, updated_at }
 * - `shipping_status`: { order_id, invoice_number, user_id, biteship_order_id, tracking_id, waybill_number, courier, courier_service, shipping_status, order_status, note, updated_at }
 * - `: keepalive` (heartbeat ping)
 *
 * @param {Object} options
 * @param {import('vue').Ref<string>|string} [options.invoice] - Optional specific invoice number
 * @param {import('vue').Ref<boolean>|boolean} [options.enabled=true] - Whether the subscription is active
 * @param {Function} [options.onPaymentStatus] - Callback when payment_status event is received
 * @param {Function} [options.onShippingStatus] - Callback when shipping_status event is received
 * @param {Function} [options.onConnected] - Callback when connected event is received
 * @param {Function} [options.onError] - Callback on stream error
 */
export function useOrderStatusSSE(options = {}) {
  const isConnected = ref(false)
  const lastPaymentUpdate = ref(null)
  const lastShippingUpdate = ref(null)
  const connectionError = ref(null)

  let abortController = null
  let reconnectTimer = null
  let isClosedExplicitly = false
  let retryCount = 0
  let authRetried = false

  function getInvoice() {
    if (
      typeof options.invoice === 'object' &&
      options.invoice !== null &&
      'value' in options.invoice
    ) {
      return options.invoice.value ? String(options.invoice.value).trim() : ''
    }
    return options.invoice ? String(options.invoice).trim() : ''
  }

  function isEnabled() {
    if (options.enabled === undefined) return true
    if (
      typeof options.enabled === 'object' &&
      options.enabled !== null &&
      'value' in options.enabled
    ) {
      return Boolean(options.enabled.value)
    }
    return Boolean(options.enabled)
  }

  async function connect() {
    if (!isEnabled() || !session.isAuthenticated) {
      disconnect()
      return
    }

    // Close previous connection before starting a new one.
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    clearTimeout(reconnectTimer)
    isClosedExplicitly = false

    const invoice = getInvoice()
    const query = invoice ? `?invoice=${encodeURIComponent(invoice)}` : ''
    const url = `${BASE_URL}/v1/sse/orders${query}`
    const token = session.accessToken

    abortController = new AbortController()

    try {
      const headers = {
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
      }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include',
        signal: abortController.signal,
      })

      if (response.status === 401 && !authRetried) {
        authRetried = true
        const refreshed = await refreshSession()
        if (refreshed === true) return connect()
      }

      if (!response.ok) {
        throw new Error(`SSE stream failed with status ${response.status}`)
      }

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('text/event-stream')) {
        throw new Error(`Invalid SSE content type: ${contentType}`)
      }

      isConnected.value = true
      connectionError.value = null
      retryCount = 0
      authRetried = false

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      let currentEvent = 'message'
      let dataLines = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() // retain trailing uncompleted segment

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) {
            // Empty line marks SSE event boundary.
            if (dataLines.length > 0) {
              const rawData = dataLines.join('\n')
              dispatchEvent(currentEvent, rawData)
              currentEvent = 'message'
              dataLines = []
            }
          } else if (trimmed.startsWith(':')) {
            // Ignore server keepalive ping.
            isConnected.value = true
          } else if (trimmed.startsWith('event:')) {
            currentEvent = trimmed.slice(6).trim()
          } else if (trimmed.startsWith('data:')) {
            dataLines.push(trimmed.slice(5).trim())
          }
        }
      }

      // Connection completed normally.
      isConnected.value = false
      if (!isClosedExplicitly && isEnabled()) {
        scheduleReconnect()
      }
    } catch (err) {
      if (err.name === 'AbortError' || isClosedExplicitly) {
        return
      }
      isConnected.value = false
      connectionError.value = err.message || 'SSE stream disconnected'
      if (typeof options.onError === 'function') {
        options.onError(err)
      }
      scheduleReconnect()
    }
  }

  function dispatchEvent(eventName, rawData) {
    let parsed = null
    try {
      parsed = JSON.parse(rawData)
    } catch {
      parsed = rawData
    }

    if (eventName === 'connected') {
      isConnected.value = true
      if (typeof options.onConnected === 'function') {
        options.onConnected(parsed)
      }
    } else if (eventName === 'payment_status') {
      lastPaymentUpdate.value = parsed
      if (typeof options.onPaymentStatus === 'function') {
        options.onPaymentStatus(parsed)
      }
    } else if (eventName === 'shipping_status') {
      lastShippingUpdate.value = parsed
      if (typeof options.onShippingStatus === 'function') {
        options.onShippingStatus(parsed)
      }
    }
  }

  function scheduleReconnect() {
    if (isClosedExplicitly || !isEnabled()) return
    clearTimeout(reconnectTimer)
    retryCount++
    const delay = Math.min(1000 * Math.pow(1.5, retryCount), 30000)
    reconnectTimer = setTimeout(() => {
      if (!isClosedExplicitly && isEnabled()) {
        authRetried = false
        connect()
      }
    }, delay)
  }

  function disconnect() {
    isClosedExplicitly = true
    clearTimeout(reconnectTimer)
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    isConnected.value = false
  }

  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    disconnect()
  })

  // Resubscribe when invoice parameter changes.
  if (
    typeof options.invoice === 'object' &&
    options.invoice !== null &&
    'value' in options.invoice
  ) {
    watch(
      () => options.invoice.value,
      () => {
        connect()
      },
    )
  }

  // Resubscribe when enabled parameter changes.
  if (
    typeof options.enabled === 'object' &&
    options.enabled !== null &&
    'value' in options.enabled
  ) {
    watch(
      () => options.enabled.value,
      (newVal) => {
        if (newVal) connect()
        else disconnect()
      },
    )
  }

  return {
    isConnected,
    lastPaymentUpdate,
    lastShippingUpdate,
    connectionError,
    reconnect: connect,
    disconnect,
  }
}
