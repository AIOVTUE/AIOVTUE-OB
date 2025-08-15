<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          登录到 AIOVTUE-OB
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          请输入您的 API 密钥
        </p>
      </div>
      <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <div>
          <label for="apiKey" class="sr-only">API 密钥</label>
          <input
            id="apiKey"
            v-model="apiKey"
            name="apiKey"
            type="password"
            required
            class="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
            placeholder="请输入 API 密钥"
          />
        </div>
        <div v-if="error" class="text-red-600 text-sm text-center">
          {{ error }}
        </div>
        <div>
          <button
            type="submit"
            :disabled="loading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {{ loading ? '验证中...' : '登录' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const apiKey = ref('')
const error = ref('')
const loading = ref(false)

const handleLogin = async () => {
  if (!apiKey.value.trim()) {
    error.value = '请输入 API 密钥'
    return
  }

  loading.value = true
  error.value = ''

  try {
    await authStore.login(apiKey.value)
    router.push('/home')
  } catch (err: any) {
    error.value = err.message || '登录失败，请检查 API 密钥'
  } finally {
    loading.value = false
  }
}
</script>