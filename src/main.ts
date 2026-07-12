import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import router from './router'
import App from './App.vue'
import { useAuthStore } from './platform/stores/authStore'
import './style.css'

const app = createApp(App)
const pinia = createPinia();

pinia.use(piniaPluginPersistedstate);
app.use(pinia);

// Authentication must begin before router guards wait for auth readiness.
useAuthStore(pinia).init()

app.use(router)
app.mount('#app')
