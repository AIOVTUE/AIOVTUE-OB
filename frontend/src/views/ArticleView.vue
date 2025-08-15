<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-6">
          <div>
            <h1 class="text-xl font-bold text-gray-900">📖 文章详情</h1>
          </div>
          <div class="flex items-center space-x-3">
            <button
              @click="goBack"
              class="btn btn-secondary btn-sm"
            >
              ← 返回
            </button>
            <button
              v-if="articlesStore.currentArticle"
              @click="editArticle"
              class="btn btn-primary btn-sm"
            >
              ✏️ 编辑
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <!-- Loading State -->
      <div v-if="articlesStore.isLoading" class="card p-8 text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-gray-600">加载中...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="articlesStore.error" class="card p-8 text-center">
        <div class="text-red-600 mb-4">{{ articlesStore.error }}</div>
        <button @click="loadArticle" class="btn btn-primary">
          🔄 重试
        </button>
      </div>

      <!-- Article Content -->
      <div v-else-if="articlesStore.currentArticle" class="card">
        <div class="p-8">
          <!-- Article Header -->
          <div class="mb-8">
            <h1 class="text-3xl font-bold text-gray-900 mb-4">
              {{ articlesStore.currentArticle.title }}
            </h1>
            <div class="flex items-center text-sm text-gray-500 space-x-4">
              <span v-if="articlesStore.currentArticle.author">
                👤 {{ articlesStore.currentArticle.author }}
              </span>
              <span>
                📅 {{ formatDate(articlesStore.currentArticle.createdAt) }}
              </span>
              <span v-if="articlesStore.currentArticle.updatedAt !== articlesStore.currentArticle.createdAt">
                🔄 {{ formatDate(articlesStore.currentArticle.updatedAt) }}
              </span>
            </div>
          </div>

          <!-- Article Content -->
          <div 
            class="prose prose-lg max-w-none"
            v-html="renderedContent"
            @click="handleContentClick"
          ></div>
        </div>
      </div>
    </main>

    <!-- Image Modal -->
    <div
      v-if="showImageModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
      @click="closeImageModal"
    >
      <div class="relative max-w-full max-h-full p-4">
        <img
          :src="modalImageSrc"
          :alt="modalImageAlt"
          class="max-w-full max-h-full object-contain"
          @click.stop
        />
        <button
          @click="closeImageModal"
          class="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl font-bold"
        >
          ×
        </button>
      </div>
    </div>
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

const showImageModal = ref(false)
const modalImageSrc = ref('')
const modalImageAlt = ref('')

const renderedContent = computed(() => {
  if (!articlesStore.currentArticle?.content) return ''
  return marked(articlesStore.currentArticle.content)
})

onMounted(() => {
  loadArticle()
})

const loadArticle = () => {
  const articleId = route.params.id as string
  articlesStore.fetchArticle(articleId)
}

const goBack = () => {
  router.push('/home')
}

const editArticle = () => {
  if (articlesStore.currentArticle) {
    router.push(`/article/${articlesStore.currentArticle.id}/edit`)
  }
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const handleContentClick = (event: Event) => {
  const target = event.target as HTMLElement
  if (target.tagName === 'IMG') {
    const img = target as HTMLImageElement
    modalImageSrc.value = img.src
    modalImageAlt.value = img.alt || ''
    showImageModal.value = true
  }
}

const closeImageModal = () => {
  showImageModal.value = false
  modalImageSrc.value = ''
  modalImageAlt.value = ''
}
</script>

<style>
.prose {
  color: #374151;
  line-height: 1.75;
}

.prose h1 {
  font-size: 2.25em;
  margin-top: 0;
  margin-bottom: 0.8888889em;
  line-height: 1.1111111;
  font-weight: 800;
  color: #111827;
}

.prose h2 {
  font-size: 1.875em;
  margin-top: 2em;
  margin-bottom: 1em;
  line-height: 1.3333333;
  font-weight: 700;
  color: #111827;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 0.5em;
}

.prose h3 {
  font-size: 1.5em;
  margin-top: 1.6em;
  margin-bottom: 0.6em;
  line-height: 1.6;
  font-weight: 600;
  color: #111827;
}

.prose p {
  margin-top: 1.25em;
  margin-bottom: 1.25em;
}

.prose img {
  margin: 2em auto;
  max-width: 70%;
  height: auto;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
  display: block;
}

.prose img:hover {
  transform: scale(1.02);
}

.prose code {
  color: #dc2626;
  font-weight: 600;
  font-size: 0.875em;
  background-color: #f3f4f6;
  padding: 0.125rem 0.375rem;
  border-radius: 0.375rem;
}

.prose pre {
  color: #e5e7eb;
  background-color: #1f2937;
  overflow-x: auto;
  font-size: 0.875em;
  line-height: 1.7142857;
  margin-top: 1.7142857em;
  margin-bottom: 1.7142857em;
  border-radius: 0.5rem;
  padding: 1rem 1.25rem;
}

.prose pre code {
  background-color: transparent;
  border-width: 0;
  border-radius: 0;
  padding: 0;
  font-weight: 400;
  color: inherit;
  font-size: inherit;
}

.prose blockquote {
  font-weight: 500;
  font-style: italic;
  color: #111827;
  border-left-width: 0.25rem;
  border-left-color: #6366f1;
  margin-top: 1.6em;
  margin-bottom: 1.6em;
  padding-left: 1em;
  background-color: #f8fafc;
  padding: 1rem;
  border-radius: 0.375rem;
}

.prose ul, .prose ol {
  margin-top: 1.25em;
  margin-bottom: 1.25em;
  padding-left: 1.625em;
}

.prose li {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}

.prose a {
  color: #6366f1;
  text-decoration: underline;
  font-weight: 500;
}

.prose a:hover {
  color: #4f46e5;
}
</style>