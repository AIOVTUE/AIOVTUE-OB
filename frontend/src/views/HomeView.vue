<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-6">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">📚 文章管理</h1>
            <p class="text-sm text-gray-600 mt-1">管理您的文章内容</p>
          </div>
          <div class="flex items-center space-x-3">
            <button
              @click="createNewArticle"
              class="btn btn-primary"
            >
              ✨ 新建文章
            </button>
            <button
              @click="toggleSelectionMode"
              class="btn btn-secondary"
              :disabled="articlesStore.articles.length === 0"
            >
              {{ isSelectionMode ? '✅ 取消选择' : '☑️ 多选删除' }}
            </button>
            <button
              v-if="isSelectionMode && hasSelectedArticles"
              @click="deleteSelectedArticles"
              class="btn btn-danger"
            >
              🗑️ 删除选中 ({{ selectedArticles.length }})
            </button>
            <button
              @click="logout"
              class="btn btn-secondary"
            >
              🚪 退出登录
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <!-- Loading State -->
      <div v-if="articlesStore.isLoading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-gray-600">加载中...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="articlesStore.error" class="text-center py-12">
        <div class="text-red-600 mb-4">{{ articlesStore.error }}</div>
        <button @click="articlesStore.fetchArticles()" class="btn btn-primary">
          🔄 重试
        </button>
      </div>

      <!-- Empty State -->
      <div v-else-if="articlesStore.articles.length === 0" class="text-center py-20">
        <div class="text-6xl mb-4">📝</div>
        <h3 class="text-xl font-medium text-gray-900 mb-2">还没有文章</h3>
        <p class="text-gray-600 mb-6">开始创建您的第一篇文章吧</p>
        <button @click="createNewArticle" class="btn btn-primary">
          ✨ 创建第一篇文章
        </button>
      </div>

      <!-- Selection Controls -->
      <div v-if="isSelectionMode && articlesStore.articles.length > 0" class="mb-6 p-4 bg-white rounded-lg shadow-sm border">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <label class="flex items-center cursor-pointer">
              <input
                type="checkbox"
                :checked="isAllSelected"
                @change="toggleSelectAll"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span class="ml-2 text-sm font-medium text-gray-700">
                {{ isAllSelected ? '取消全选' : '全选' }}
              </span>
            </label>
            <span class="text-sm text-gray-500">
              已选择 {{ selectedArticles.length }} / {{ articlesStore.articles.length }} 篇文章
            </span>
          </div>
        </div>
      </div>

      <!-- Articles Grid -->
      <div v-if="articlesStore.articles.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="article in articlesStore.articles"
          :key="article.id"
          class="card overflow-hidden hover:shadow-lg transition-shadow duration-200"
          :class="{ 
            'ring-2 ring-blue-500': isSelectionMode && selectedArticles.includes(article.id),
            'cursor-pointer': isSelectionMode
          }"
          @click="isSelectionMode ? toggleArticleSelection(article.id) : null"
        >
          <!-- Selection Checkbox -->
          <div v-if="isSelectionMode" class="absolute top-3 left-3 z-10">
            <label class="flex items-center cursor-pointer" @click.stop>
              <input
                type="checkbox"
                :checked="selectedArticles.includes(article.id)"
                @change.stop="toggleArticleSelection(article.id)"
                class="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-white shadow-sm"
              />
            </label>
          </div>

          <!-- Article Image/Cover -->
          <div class="h-48 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 relative overflow-hidden">
            <div class="absolute inset-0 bg-black bg-opacity-20"></div>
            <div class="absolute bottom-4 left-4 right-4">
              <h3 class="text-white font-bold text-lg line-clamp-2 mb-1">
                {{ article.title }}
              </h3>
              <p class="text-white text-sm opacity-90">
                {{ getContentPreview(article.content) }}
              </p>
            </div>
          </div>

          <!-- Article Info -->
          <div class="p-4">
            <div class="flex items-center justify-between text-sm text-gray-500 mb-3">
              <span>{{ formatDate(article.updatedAt) }}</span>
              <span v-if="article.author" class="flex items-center">
                👤 {{ article.author }}
              </span>
            </div>
            
            <div class="flex items-center space-x-2">
              <button
                @click.stop="viewArticle(article.id)"
                class="btn btn-primary btn-sm flex-1"
              >
                👁️ 查看
              </button>
              <button
                @click.stop="editArticle(article.id)"
                class="btn btn-secondary btn-sm"
                title="编辑"
              >
                ✏️
              </button>
              <button
                v-if="article.shareId"
                @click.stop="copyShareLink(article.shareId)"
                class="btn btn-secondary btn-sm"
                title="复制分享链接"
              >
                🔗
              </button>
              <button
                v-else
                @click.stop="createShare(article.id)"
                class="btn btn-secondary btn-sm"
                title="创建分享链接"
              >
                📤
              </button>
              <button
                v-if="!isSelectionMode"
                @click.stop="deleteArticle(article.id, article.title)"
                class="btn btn-danger btn-sm"
                title="删除"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useArticlesStore } from '../stores/articles'

const router = useRouter()
const authStore = useAuthStore()
const articlesStore = useArticlesStore()

// 多选功能相关状态
const selectedArticles = ref<string[]>([])
const isSelectionMode = ref(false)

// 计算属性
const isAllSelected = computed(() => {
  return articlesStore.articles.length > 0 && selectedArticles.value.length === articlesStore.articles.length
})

const hasSelectedArticles = computed(() => {
  return selectedArticles.value.length > 0
})

onMounted(() => {
  articlesStore.fetchArticles()
})

const logout = () => {
  authStore.logout()
  router.push('/login')
}

const createNewArticle = () => {
  router.push('/new-article')
}

const viewArticle = (id: string) => {
  router.push(`/article/${id}`)
}

const editArticle = (id: string) => {
  router.push(`/article/${id}/edit`)
}

const deleteArticle = async (id: string, title: string) => {
  if (confirm(`确定要删除文章「${title}」吗？此操作不可撤销。`)) {
    try {
      await articlesStore.deleteArticle(id)
    } catch (error) {
      alert('删除失败，请重试')
    }
  }
}

// 多选功能方法
const toggleSelectionMode = () => {
  isSelectionMode.value = !isSelectionMode.value
  if (!isSelectionMode.value) {
    selectedArticles.value = []
  }
}

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedArticles.value = []
  } else {
    selectedArticles.value = articlesStore.articles.map(article => article.id)
  }
}

const toggleArticleSelection = (articleId: string) => {
  const index = selectedArticles.value.indexOf(articleId)
  if (index > -1) {
    selectedArticles.value.splice(index, 1)
  } else {
    selectedArticles.value.push(articleId)
  }
}

const deleteSelectedArticles = async () => {
  if (selectedArticles.value.length === 0) return
  
  const count = selectedArticles.value.length
  if (confirm(`确定要删除选中的 ${count} 篇文章吗？此操作不可撤销。`)) {
    try {
      const result = await articlesStore.deleteMultipleArticles(selectedArticles.value)
      selectedArticles.value = []
      isSelectionMode.value = false
      
      if (result && result.failed > 0) {
        alert(`删除完成：${result.successful} 篇成功，${result.failed} 篇失败`)
      } else {
        alert(`已成功删除 ${count} 篇文章`)
      }
    } catch (error) {
      alert('删除失败，请重试')
    }
  }
}

const createShare = async (id: string) => {
  try {
    const result = await articlesStore.createShareLink(id)
    console.log('createShare result:', result)
    if (result && result.shareId) {
      const shareUrl = `${window.location.origin}/share/${result.shareId}`
      await navigator.clipboard.writeText(shareUrl)
      alert('分享链接已复制到剪贴板！')
    } else {
      console.error('Invalid result from createShareLink:', result)
      alert('创建分享链接失败：返回数据格式错误')
    }
  } catch (error) {
    console.error('Error in createShare:', error)
    alert('创建分享链接失败，请重试')
  }
}

const copyShareLink = async (shareId: string) => {
  try {
    const shareUrl = `${window.location.origin}/share/${shareId}`
    await navigator.clipboard.writeText(shareUrl)
    alert('分享链接已复制到剪贴板！')
  } catch (error) {
    alert('复制失败，请重试')
  }
}

const getContentPreview = (content: string): string => {
  const plainText = content.replace(/[#*`_\[\]()]/g, '').replace(/\n/g, ' ')
  return plainText.length > 50 ? plainText.substring(0, 50) + '...' : plainText
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric'
  })
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>