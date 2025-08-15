import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

export interface Article {
  id: string
  title: string
  content: string
  author?: string
  createdAt: string
  updatedAt: string
  shareId?: string
  expiresAt?: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://obsidian-web-backend.2578023079.workers.dev'
const API_KEY = import.meta.env.VITE_API_KEY || 'your-secret-api-key'

// Create axios instance with default headers
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
  }
})

export const useArticlesStore = defineStore('articles', () => {
  const articles = ref<Article[]>([])
  const currentArticle = ref<Article | null>(null)
  const isLoading = ref(false)
  const error = ref('')
  
  const fetchArticles = async () => {
    isLoading.value = true
    error.value = ''
    try {
      const response = await apiClient.get('/api/articles')
      articles.value = response.data
    } catch (err) {
      error.value = '获取文章列表失败'
      console.error('Error fetching articles:', err)
    } finally {
      isLoading.value = false
    }
  }
  
  const fetchArticle = async (id: string) => {
    isLoading.value = true
    error.value = ''
    try {
      const response = await apiClient.get(`/api/articles/${id}`)
      currentArticle.value = response.data
    } catch (err) {
      error.value = '获取文章详情失败'
      console.error('Error fetching article:', err)
    } finally {
      isLoading.value = false
    }
  }
  
  const fetchSharedArticle = async (shareId: string) => {
    isLoading.value = true
    error.value = ''
    try {
      const response = await axios.get(`${API_BASE_URL}/api/share/${shareId}`)
      currentArticle.value = response.data
    } catch (err) {
      error.value = '获取分享文章失败'
      console.error('Error fetching shared article:', err)
    } finally {
      isLoading.value = false
    }
  }
  
  const createArticle = async (title: string, content: string, author?: string, expiresInDays?: number, action?: string, expiresInSeconds?: number) => {
    isLoading.value = true
    error.value = ''
    try {
      const requestData: any = {
        title,
        content,
        author: author || 'Anonymous'
      }
      
      if (expiresInSeconds && expiresInSeconds > 0) {
        requestData.expiresInSeconds = expiresInSeconds
      } else if (expiresInDays && expiresInDays > 0) {
        requestData.expiresInDays = expiresInDays
      }
      
      if (action) {
        requestData.action = action
      }
      
      const response = await apiClient.post('/api/articles', requestData)
      
      // Handle conflict response
      if (response.status === 409 && response.data.conflict) {
        return response.data // Return conflict data for UI handling
      }
      
      // Handle existing article response
      if (response.data.existing) {
        return response.data // Return existing article data
      }
      
      await fetchArticles() // 重新获取文章列表
      return response.data
    } catch (err: any) {
      if (err.response?.status === 409) {
        return err.response.data // Return conflict data
      }
      error.value = '创建文章失败'
      console.error('Error creating article:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const updateArticle = async (id: string, title: string, content: string, author?: string, expiresInDays?: number, expiresInSeconds?: number) => {
    isLoading.value = true
    error.value = ''
    try {
      const requestData: any = {
        title,
        content,
        author: author || 'Anonymous'
      }
      
      if (expiresInSeconds && expiresInSeconds > 0) {
        requestData.expiresInSeconds = expiresInSeconds
      } else if (expiresInDays && expiresInDays > 0) {
        requestData.expiresInDays = expiresInDays
      }
      
      const response = await apiClient.put(`/api/articles/${id}`, requestData)
      await fetchArticles() // 重新获取文章列表
      return response.data
    } catch (err) {
      error.value = '更新文章失败'
      console.error('Error updating article:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const deleteArticle = async (id: string) => {
    isLoading.value = true
    error.value = ''
    try {
      await apiClient.delete(`/api/articles/${id}`)
      await fetchArticles() // 重新获取文章列表
    } catch (err) {
      error.value = '删除文章失败'
      console.error('Error deleting article:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const deleteAllArticles = async () => {
    isLoading.value = true
    error.value = ''
    try {
      await apiClient.delete('/api/articles')
      await fetchArticles() // 重新获取文章列表
    } catch (err) {
      error.value = '删除所有文章失败'
      console.error('Error deleting all articles:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const deleteMultipleArticles = async (ids: string[]) => {
    isLoading.value = true
    error.value = ''
    try {
      let successful = 0
      let failed = 0
      
      // 串行删除每篇文章，避免并发竞态条件
      for (const id of ids) {
        try {
          await apiClient.delete(`/api/articles/${id}`)
          successful++
        } catch (err) {
          console.error(`删除文章 ${id} 失败:`, err)
          failed++
        }
      }
      
      await fetchArticles() // 重新获取文章列表
      
      if (failed > 0) {
        console.warn(`批量删除完成：${successful} 个成功，${failed} 个失败`)
        if (successful === 0) {
          throw new Error(`所有文章删除失败`)
        }
      }
      
      return { successful, failed }
    } catch (err) {
      error.value = '批量删除文章失败'
      console.error('Error deleting multiple articles:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const createShareLink = async (id: string) => {
    isLoading.value = true
    error.value = ''
    try {
      console.log('Creating share link for article ID:', id)
      const response = await apiClient.post(`/api/articles/${id}/share`)
      console.log('Share link response:', response.data)
      await fetchArticles() // 重新获取文章列表以更新shareId
      return response.data
    } catch (err: any) {
      error.value = '创建分享链接失败'
      console.error('Error creating share link:', err)
      console.error('Error response:', err.response?.data)
      console.error('Error status:', err.response?.status)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  return {
    articles,
    currentArticle,
    isLoading,
    error,
    fetchArticles,
    fetchArticle,
    fetchSharedArticle,
    createArticle,
    updateArticle,
    deleteArticle,
    deleteAllArticles,
    deleteMultipleArticles,
    createShareLink
  }
})