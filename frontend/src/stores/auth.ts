import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const password = ref('')
  
  const login = (inputPassword: string) => {
    // 这里可以添加密码验证逻辑
    // 目前简单设置为任何非空密码都可以登录
    if (inputPassword.trim()) {
      password.value = inputPassword
      isAuthenticated.value = true
      localStorage.setItem('auth_password', inputPassword)
      return true
    }
    return false
  }
  
  const logout = () => {
    isAuthenticated.value = false
    password.value = ''
    localStorage.removeItem('auth_password')
  }
  
  const checkAuth = () => {
    const savedPassword = localStorage.getItem('auth_password')
    if (savedPassword) {
      password.value = savedPassword
      isAuthenticated.value = true
    }
  }
  
  return {
    isAuthenticated,
    password,
    login,
    logout,
    checkAuth
  }
})