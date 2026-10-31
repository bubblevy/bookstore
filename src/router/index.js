import { createRouter, createWebHistory } from 'vue-router'
import { api, session } from '@/lib/api'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },
    {
      path: '/book/:id',
      name: 'book-detail',
      component: () => import('@/views/BookDetailView.vue'),
    },
    {
      path: '/catalog',
      alias: ['/search', '/katalog', '/books'],
      name: 'catalog',
      component: () => import('@/views/CatalogView.vue'),
    },
    {
      path: '/checkout/:token?',
      alias: ['/checkput/:token?', '/checkput'],
      name: 'checkout',
      component: () => import('@/views/CheckoutView.vue'),
    },
    {
      path: '/orders/:id',
      alias: ['/order/:id', '/oder/:id', '/invoice/:id'],
      name: 'order-detail',
      component: () => import('@/views/OrderDetailView.vue'),
    },
    {
      path: '/login',
      alias: '/activate-account',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/views/ResetPasswordView.vue'),
    },
    {
      path: '/garansi-pengembalian',
      name: 'return-policy',
      component: () => import('@/views/PolicyView.vue'),
      meta: { policy: 'returns' },
    },
    {
      path: '/kebijakan-privasi',
      name: 'privacy-policy',
      component: () => import('@/views/PolicyView.vue'),
      meta: { policy: 'privacy' },
    },
    {
      path: '/syarat-ketentuan',
      name: 'terms',
      component: () => import('@/views/PolicyView.vue'),
      meta: { policy: 'terms' },
    },
    {
      path: '/dashboard',
      name: 'user-dashboard',
      component: () => import('@/views/UserDashboardView.vue'),
      beforeEnter: async () => {
        if (session.isAuthenticated) {
          sessionStorage.removeItem('bookstore.google_oauth_pending')
          if (session.role === 'admin') return { name: 'admin-dashboard' }
          return true
        }

        const pending = sessionStorage.getItem('bookstore.google_oauth_pending')

        try {
          const response = await api.refreshWithCookie()
          const tokens = response?.data || {}
          if (!tokens.access_token) throw new Error('missing access token')
          session.set({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
          })
          sessionStorage.removeItem('bookstore.google_oauth_pending')
          const me = await api.me().catch(() => null)
          if (me?.data?.role === 'admin') {
            session.setRole('admin')
            return { name: 'admin-dashboard' }
          }
          session.setRole('user')
          return true
        } catch {
          sessionStorage.removeItem('bookstore.google_oauth_pending')
          return pending
            ? { name: 'login', query: { error: 'oauth_failed' } }
            : { name: 'login', query: { redirect: '/dashboard' } }
        }
      },
    },
    {
      path: '/user/dashboard',
      redirect: '/dashboard',
    },
    {
      path: '/admin',
      name: 'admin-dashboard',
      component: () => import('@/views/AdminDashboardView.vue'),
    },
    {
      path: '/admin/dashboard',
      redirect: '/admin',
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  if ((to.name === 'login' || to.name === 'register') && session.isAuthenticated) {
    return { name: session.role === 'admin' ? 'admin-dashboard' : 'user-dashboard' }
  }

  if (to.name === 'checkout') {
    if (!session.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
    if (session.role === 'admin') {
      return { name: 'admin-dashboard' }
    }
  }

  if (to.name === 'user-dashboard' && session.role === 'admin') {
    return { name: 'admin-dashboard' }
  }

  if (to.name === 'admin-dashboard') {
    if (!session.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
    if (session.role === 'admin') {
      return true
    }
    try {
      const response = await api.me()
      if (response.data?.role !== 'admin') {
        return { name: 'user-dashboard' }
      }
      session.setRole('admin')
      return true
    } catch {
      session.clear()
      return { name: 'home' }
    }
  }
})

export default router
