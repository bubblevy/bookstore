import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { showToast } from '@/composables/useStore'
import './assets/main.css'
import AOS from 'aos'
import 'aos/dist/aos.css'

const app = createApp(App)
app.config.errorHandler = (error) => {
  console.error(error)
  showToast('Terjadi kesalahan tak terduga. Silakan coba lagi.', { type: 'error' })
}
app.use(router)
app.mount('#app')

setTimeout(() => {
  AOS.init({
    duration: 600,
    easing: 'ease-out-cubic',
    once: true,
    offset: 40,
  })
}, 50)

router.afterEach(() => {
  setTimeout(() => {
    AOS.refreshHard()
  }, 150)
})
