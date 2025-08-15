<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-6">
          <div>
            <h1 class="text-xl font-bold text-gray-900">
              {{ isEditing ? '✏️ 编辑文章' : '✨ 新建文章' }}
            </h1>
            <p class="text-sm text-gray-600 mt-1">
              {{ isEditing ? '修改您的文章内容' : '创建一篇新的文章' }}
            </p>
          </div>
          <div class="flex items-center space-x-3">
            <button
              @click="goBack"
              class="btn btn-secondary btn-sm"
            >
              ← 返回
            </button>
            <button
              @click="handleSave"
              :disabled="!canSave || isSaving"
              class="btn btn-primary"
            >
              <span v-if="isSaving" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
              {{ isSaving ? '保存中...' : '💾 保存' }}
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div class="card">
        <div class="p-8">
          <!-- Title Input -->
          <div class="mb-6">
            <label for="title" class="block text-sm font-medium text-gray-700 mb-2">
              📝 标题 <span class="text-red-500">*</span>
            </label>
            <input
              id="title"
              v-model="title"
              type="text"
              class="input"
              placeholder="请输入文章标题"
              :disabled="isSaving"
            />
          </div>

          <!-- Content Input -->
          <div class="mb-6">
            <label for="content" class="block text-sm font-medium text-gray-700 mb-2">
              📄 内容 <span class="text-red-500">*</span>
            </label>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Editor -->
              <div>
                <textarea
                  id="content"
                  v-model="content"
                  class="textarea h-96"
                  placeholder="请输入文章内容（支持 Markdown 格式）"
                  :disabled="isSaving"
                ></textarea>
                <p class="text-xs text-gray-500 mt-2">
                  💡 支持 Markdown 语法，如 **粗体**、*斜体*、`代码`、# 标题 等
                </p>
              </div>
              
              <!-- Preview -->
              <div class="hidden lg:block">
                <div class="border border-gray-300 rounded-md p-4 h-96 overflow-y-auto bg-gray-50">
                  <div class="text-sm font-medium text-gray-700 mb-3">📖 预览</div>
                  <div 
                    v-if="content.trim()"
                    class="prose prose-sm max-w-none"
                    v-html="previewContent"
                  ></div>
                  <div v-else class="text-gray-400 text-sm">
                    在左侧输入内容以查看预览
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Author Input -->
          <div class="mb-6">
            <label for="author" class="block text-sm font-medium text-gray-700 mb-2">
              👤 作者
            </label>
            <input
              id="author"
              v-model="author"
              type="text"
              class="input"
              placeholder="请输入作者名称（可选）"
              :disabled="isSaving"
            />
          </div>

          <!-- Expiration Settings -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              ⏰ 自动删除设置
            </label>
            <div class="space-y-3">
              <div class="flex items-center">
                <input
                  id="no-expiry"
                  v-model="expiryType"
                  type="radio"
                  value="never"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  :disabled="isSaving"
                />
                <label for="no-expiry" class="ml-2 text-sm text-gray-700">
                  永不删除
                </label>
              </div>
              <div class="flex items-center">
                <input
                  id="custom-expiry"
                  v-model="expiryType"
                  type="radio"
                  value="custom"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  :disabled="isSaving"
                />
                <label for="custom-expiry" class="ml-2 text-sm text-gray-700">
                  自定义删除时间
                </label>
              </div>
              <div v-if="expiryType === 'custom'" class="ml-6">
                <select
                  v-model="expiresInDays"
                  class="input w-48"
                  :disabled="isSaving"
                >
                  <option value="10s">10秒后删除</option>
                  <option value="1">1天后删除</option>
                  <option value="3">3天后删除</option>
                  <option value="7">7天后删除</option>
                  <option value="14">14天后删除</option>
                  <option value="30">30天后删除</option>
                  <option value="90">90天后删除</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div class="text-red-600 text-sm">{{ error }}</div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { marked } from 'marked'
import { useArticlesStore } from '../stores/articles'

const route = useRoute()
const router = useRouter()
const articlesStore = useArticlesStore()

const title = ref('')
const content = ref('')
const author = ref('')
const isSaving = ref(false)
const error = ref('')
const expiryType = ref('never')
const expiresInDays = ref<number | string>(7)

const isEditing = computed(() => {
  return route.name === 'edit-article' && route.params.id
})

const canSave = computed(() => {
  return title.value.trim() && content.value.trim()
})

const previewContent = computed(() => {
  if (!content.value.trim()) return ''
  return marked(content.value)
})

onMounted(async () => {
  if (isEditing.value) {
    const articleId = route.params.id as string
    await articlesStore.fetchArticle(articleId)
    if (articlesStore.currentArticle) {
      title.value = articlesStore.currentArticle.title
      content.value = articlesStore.currentArticle.content
      author.value = articlesStore.currentArticle.author || ''
    }
  }
})

const goBack = () => {
  router.push('/home')
}

const handleSave = async () => {
  if (!canSave.value) {
    error.value = '请填写标题和内容'
    return
  }

  isSaving.value = true
  error.value = ''

  try {
    const articleData: any = {
      title: title.value.trim(),
      content: content.value.trim(),
      author: author.value.trim() || 'Anonymous'
    }
    
    if (expiryType.value === 'custom') {
      if (expiresInDays.value === '10s') {
        articleData.expiresInSeconds = 10
      } else {
        articleData.expiresInDays = typeof expiresInDays.value === 'string' ? parseInt(expiresInDays.value) : expiresInDays.value
      }
    }

    if (isEditing.value) {
      const articleId = route.params.id as string
      await articlesStore.updateArticle(articleId, articleData.title, articleData.content, articleData.author, articleData.expiresInDays, articleData.expiresInSeconds)
    } else {
      const result = await articlesStore.createArticle(articleData.title, articleData.content, articleData.author, articleData.expiresInDays, undefined, articleData.expiresInSeconds)
      
      // Handle duplicate article scenarios
      if (result && typeof result === 'object') {
        if (result.conflict) {
          // Show conflict resolution dialog
          const action = await showConflictDialog(result)
          if (action === 'skip') {
            router.push('/home')
            return
          }
          
          // Retry with user's choice
          await articlesStore.createArticle(
            articleData.title, 
            articleData.content, 
            articleData.author, 
            articleData.expiresInDays,
            action,
            articleData.expiresInSeconds
          )
        } else if (result.existing) {
          // Article already exists, show success message
          error.value = '文章已存在，已返回现有文章'
          setTimeout(() => {
            router.push('/home')
          }, 2000)
          return
        }
      }
    }
    
    router.push('/home')
  } catch (err: any) {
    error.value = err.message || (isEditing.value ? '更新文章失败，请重试' : '创建文章失败，请重试')
  } finally {
    isSaving.value = false
  }
}

const showConflictDialog = async (conflictData: any): Promise<string> => {
  return new Promise((resolve) => {
    const action = confirm(
      `文章标题"${conflictData.existingArticle.title}"已存在但内容不同。\n\n` +
      `现有内容预览：${conflictData.existingArticle.content}\n\n` +
      `请选择操作：\n` +
      `确定 - 覆盖现有文章\n` +
      `取消 - 创建新文章（标题会自动添加后缀）`
    )
    
    if (action) {
      resolve('update')
    } else {
      const createNew = confirm('是否创建新文章？取消将跳过创建。')
      resolve(createNew ? 'create' : 'skip')
    }
  })
}
</script>

<style>
.prose {
  color: #374151;
  line-height: 1.6;
}

.prose h1 {
  font-size: 1.5em;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.5em;
}

.prose h2 {
  font-size: 1.25em;
  font-weight: 600;
  color: #111827;
  margin-top: 1em;
  margin-bottom: 0.5em;
}

.prose h3 {
  font-size: 1.125em;
  font-weight: 600;
  color: #111827;
  margin-top: 1em;
  margin-bottom: 0.5em;
}

.prose p {
  margin-bottom: 1em;
}

.prose code {
  color: #dc2626;
  font-weight: 600;
  font-size: 0.875em;
  background-color: #f3f4f6;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}

.prose pre {
  background-color: #1f2937;
  color: #e5e7eb;
  padding: 0.75rem;
  border-radius: 0.375rem;
  overflow-x: auto;
  font-size: 0.875em;
  margin: 1em 0;
}

.prose pre code {
  background-color: transparent;
  color: inherit;
  padding: 0;
}

.prose blockquote {
  border-left: 4px solid #6366f1;
  padding-left: 1rem;
  margin: 1em 0;
  font-style: italic;
  color: #6b7280;
}

.prose ul, .prose ol {
  padding-left: 1.5rem;
  margin: 1em 0;
}

.prose li {
  margin: 0.25em 0;
}

.prose a {
  color: #6366f1;
  text-decoration: underline;
}

.prose img {
  max-width: 100%;
  height: auto;
  border-radius: 0.375rem;
  margin: 1em 0;
}
</style>