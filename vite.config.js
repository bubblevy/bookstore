import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_PROXY_TARGET
  const addCorsHeaders = (proxy) => {
    proxy.on('proxyRes', (proxyRes) => {
      proxyRes.headers['cross-origin-resource-policy'] = 'cross-origin'
      proxyRes.headers['access-control-allow-origin'] = '*'
    })
  }

  const proxy = apiTarget
    ? {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
        },
        '/payments': {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
          configure: addCorsHeaders,
        },
        '/uploads': {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
          configure: addCorsHeaders,
        },
        '/storage': {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
          configure: addCorsHeaders,
        },
        '/covers': {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
          configure: addCorsHeaders,
        },
        '/categories': {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
          configure: addCorsHeaders,
        },
      }
    : undefined

  return {
    plugins: [vue(), vueDevTools(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy,
      headers: {
        'Cross-Origin-Resource-Policy': 'cross-origin',
      },
    },
    preview: {
      proxy,
      headers: {
        'Cross-Origin-Resource-Policy': 'cross-origin',
      },
    },
  }
})
