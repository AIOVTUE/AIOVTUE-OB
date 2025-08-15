import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import LoginView from '../views/LoginView.vue'
import HomeView from '../views/HomeView.vue'
import ArticleView from '../views/ArticleView.vue'
import SharedArticleView from '../views/SharedArticleView.vue'
import EditArticleView from '../views/EditArticleView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/login'
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/home',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: true }
    },
    {
      path: '/article/:id',
      name: 'article',
      component: ArticleView,
      meta: { requiresAuth: true }
    },
    {
      path: '/article/:id/edit',
      name: 'edit-article',
      component: EditArticleView,
      meta: { requiresAuth: true }
    },
    {
      path: '/new-article',
      name: 'new-article',
      component: EditArticleView,
      meta: { requiresAuth: true }
    },
    {
      path: '/share/:shareId',
      name: 'shared-article',
      component: SharedArticleView
    }
  ]
})

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else {
    next()
  }
})

export default router