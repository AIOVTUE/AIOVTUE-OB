import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { writeFileSync, mkdirSync } from 'fs'
import { resolve } from 'path'

// 创建动态生成config.json的插件
function generateConfigPlugin(env: Record<string, string>) {
  return {
    name: 'generate-config',
    buildStart() {
      // 确保public/api目录存在
      const apiDir = resolve(__dirname, 'public/api')
      mkdirSync(apiDir, { recursive: true })
      
      // 读取环境变量
      const backendUrl = env.VITE_API_BASE_URL || 'http://127.0.0.1:8787'
      
      // 生成config.json内容
      const config = {
        backendUrl,
        apiBaseUrl: backendUrl,
        version: '1.0.0',
        description: env.NODE_ENV === 'production' 
          ? 'Obsidian Web 配置文件 - 生产环境'
          : 'Obsidian Web 配置文件 - 开发环境'
      }
      
      // 写入config.json文件
      const configPath = resolve(apiDir, 'config.json')
      writeFileSync(configPath, JSON.stringify(config, null, 2))
      
      console.log('✅ 已生成config.json:', config)
    },
    configureServer(server) {
      // 开发服务器启动时也生成config.json
      const apiDir = resolve(__dirname, 'public/api')
      mkdirSync(apiDir, { recursive: true })
      
      const backendUrl = env.VITE_API_BASE_URL || 'http://127.0.0.1:8787'
      const config = {
        backendUrl,
        apiBaseUrl: backendUrl,
        version: '1.0.0',
        description: 'Obsidian Web 配置文件 - 开发环境'
      }
      
      const configPath = resolve(apiDir, 'config.json')
      writeFileSync(configPath, JSON.stringify(config, null, 2))
      
      console.log('🔄 开发服务器已更新config.json:', config)
    }
  }
}

export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [vue(), generateConfigPlugin(env)],
    server: {
      port: 5173,
      host: true
    }
  }
})