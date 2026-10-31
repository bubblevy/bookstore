import { session } from '@/lib/api'

/**
 * Subscribe to real-time order events via Server-Sent Events (SSE).
 *
 * @param {Object} options
 * @param {string} options.invoice - Invoice number to filter (e.g. INV-20261029-XXXXXX)
 * @param {Function} [options.onPaymentStatus] - Triggered when payment gateway updates order state
 * @param {Function} [options.onShippingStatus] - Triggered when Biteship/courier updates tracking
 * @param {Function} [options.onConnected] - Triggered when SSE connection is authorized & established
 * @param {Function} [options.onError] - Triggered on connection errors
 * @returns {{ close: () => void }}
 */
export function subscribeOrderSSE({
  invoice,
  onPaymentStatus,
  onShippingStatus,
  onConnected,
  onError,
}) {
  let isClosed = false
  let abortController = null
  let reconnectTimer = null

  const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')
  const queryParam = invoice ? `?invoice=${encodeURIComponent(invoice)}` : ''
  const endpoint = `${baseUrl}/v1/sse/orders${queryParam}`

  async function connect() {
    if (isClosed) return

    abortController = new AbortController()
    const headers = {
      Accept: 'text/event-stream',
    }

    const token = session.accessToken
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers,
        credentials: 'include',
        signal: abortController.signal,
      })

      if (!response.ok) {
        throw new Error(`SSE stream returned status ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('ReadableStream not supported on response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (!isClosed) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE messages separated by double newlines.
        const events = buffer.split(/\r?\n\r?\n/)
        buffer = events.pop() || ''

        for (const eventBlock of events) {
          if (!eventBlock.trim()) continue

          let eventType = 'message'
          const dataLines = []

          for (const line of eventBlock.split(/\r?\n/)) {
            if (line.startsWith(':')) {
              // Ignore server keepalive ping.
              continue
            }
            if (line.startsWith('event:')) {
              eventType = line.slice(6).trim()
            } else if (line.startsWith('data:')) {
              dataLines.push(line.slice(5).trim())
            }
          }

          if (dataLines.length > 0) {
            const rawData = dataLines.join('\n')
            let parsed = rawData
            try {
              parsed = JSON.parse(rawData)
            } catch {
                          }

            if (eventType === 'connected') {
              onConnected?.(parsed)
            } else if (eventType === 'payment_status') {
              onPaymentStatus?.(parsed)
            } else if (eventType === 'shipping_status') {
              onShippingStatus?.(parsed)
            }
          }
        }
      }
    } catch (err) {
      if (isClosed || abortController.signal.aborted) return
      onError?.(err)

      // Automatically reconnect after connection drop.
      reconnectTimer = setTimeout(() => {
        if (!isClosed) connect()
      }, 4000)
    }
  }

  connect()

  return {
    close() {
      isClosed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (abortController) {
        try {
          abortController.abort()
        } catch {
                  }
      }
    },
  }
}
