import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../views/HomePage.vue'
import AIChatPage from '../views/AIChatPage.vue'
import SimChatPage from '../views/SimChatPage.vue'
import CustomerServicePage from '../views/CustomerServicePage.vue'
import ChatPDFPage from '../views/ChatPDFPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage
    },
    {
      path: '/ai-chat',
      name: 'aiChat',
      component: AIChatPage
    },
    {
      path: '/sim-chat',
      name: 'simChat',
      component: SimChatPage
    },
    {
      path: '/customer-service',
      name: 'customerService',
      component: CustomerServicePage
    },
    {
      path: '/chat-pdf',
      name: 'chatPdf',
      component: ChatPDFPage
    }
  ],
})

export default router
