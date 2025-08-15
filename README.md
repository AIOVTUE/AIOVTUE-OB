# Aiovtue-ob - 全栈文章发布平台

##### 本项目由==***AIOVTUE***==独立开发
一个基于Cloudflare的全栈解决方案，让您可以轻松地将Obsidian笔记发布到Web平台，支持文章管理、分享和在线编辑。

## 🌟 本站提供demo

### 本站demo可以直接配合插件使用，可以先进行体验在考虑是否需要部署，或者轻量使用demo也没问题，注意数据安全和文档即可，使用的用户请遵守demo相关要求
[点击跳转demo](https://demo.aiovtue.dpdns.org/)
demo的登陆秘钥和api秘钥均为`demo123`

demo需要配合obsidian插件使用，可以再release中下载，也可以  
### [点击链接下载插件](https://github.com/AIOVTUE/AIOVTUE-OB/releases/download/V1.0.0/obsidian-plugin.zip)  

### [obsidian插件安装教程](https://github.com/AIOVTUE/AIOVTUE-OB#5-obsidian%E6%8F%92%E4%BB%B6%E5%AE%89%E8%A3%85)  


## 🌟 网页预览

![](https://pic1.imgdb.cn/item/689f622658cb8da5c8281965.png)




## 🌟 功能特性

### 后端 (Cloudflare Workers)
- 🚀 **高性能API**：基于Cloudflare Workers的无服务器架构
- 💾 **R2存储**：使用Cloudflare R2作为数据库和文件存储
- 🔐 **API密钥认证**：安全的访问控制
- 🖼️ **图片上传**：支持图片文件上传和管理
- 🔗 **分享链接**：为文章创建公开分享链接
- 📝 **CRUD操作**：完整的文章增删改查功能

### 前端 (Vue.js + Cloudflare Pages)
- 🎨 **现代UI**：基于Vue 3和Tailwind CSS的美观界面
- 📱 **响应式设计**：完美适配桌面和移动设备
- ✏️ **Markdown编辑器**：支持实时预览和语法高亮
- 🖼️ **图片查看器**：点击图片全屏查看
- 🔍 **文章管理**：直观的文章列表和搜索功能
- 🔗 **分享功能**：一键生成和复制分享链接

### Obsidian插件
- 📤 **一键发布**：直接从Obsidian发布笔记
- 🖼️ **自动图片上传**：本地图片自动上传到服务器
- 🔗 **分享链接生成**：为已发布文章创建分享链接
- ⚙️ **简单配置**：只需配置网站地址和API密钥

## 📁 项目结构

```
AIOVTUE-OB/
├── backend/                 # Cloudflare Workers后端
│   ├── src/
│   │   └── index.ts        # 主要API逻辑
│   ├── wrangler.jsonc      # Cloudflare配置
│   └── package.json
├── frontend/                # Vue.js前端
│   ├── src/
│   │   ├── views/          # 页面组件
│   │   ├── services/       # API服务
│   │   ├── stores/         # 状态管理
│   │   └── router/         # 路由配置
│   ├── .env                # 环境变量模板
│   ├── .env.local          # 本地开发环境变量
│   └── package.json
├── obsidian-plugin/         # Obsidian插件
│   ├── main.ts             # 插件主文件
│   ├── manifest.json       # 插件清单
│   └── README.md           # 插件说明
└── README.md               # 项目说明
```

## 🚀 快速开始

### 前置要求

- Node.js 18+
- npm 或 yarn
- Cloudflare账户
- Obsidian（用于插件）

### 1. 后端部署 (Cloudflare Workers)

#### 步骤一：修改环境变量 `\backend\wrangler.jsonc`

只需要修改如下内容
```
	"vars": {
		"CORS_ORIGIN": "*",
		"API_KEY": "你的API秘钥，前后端保持一致"
	},
```
修改示例如下
```
	"vars": {
		"CORS_ORIGIN": "*",
		"API_KEY": "admin123"
	},
```
#### 步骤二：配置Cloudflare

- 登录Cloudflare Dashboard
- 创建R2存储桶：
   - 进入R2 Object Storage
   - 创建名为 `obsidian-web-storage` 的存储桶


#### 步骤三：部署后端

- 登陆cloudflare，点击workers，新建workers
- 选择从储存库导入
- 选择克隆的仓库，即本项目
- 名称填`aiovtue-ob-back`，根目录选择:/backend
![](https://pic1.imgdb.cn/item/689f5c1958cb8da5c8281847.png)
- 点击部署就可以了


#### 步骤四：绑定域名

给这个worker绑定域名以供访问，在worker的设置-域和路由中添加域名（默认域名在国内被墙）
得到后端域名：https://demo.demo
注意域名后面没有“/”

---
---

### 2. 前端部署 (Cloudflare Pages)

#### 步骤一：编辑环境变量

编辑 `\frontend\.env` 文件：
```
VITE_API_BASE_URL=后端地址(末尾不含/)
VITE_API_KEY=API秘钥，前后端一样
```
示例：
```
VITE_API_BASE_URL=https://demo.demo
VITE_API_KEY=admin123
```

#### 步骤二：构件和部署

- 进入`frontend`目录，点击在文件地址栏输入cmd后回车（或者打开cmd后cd到该文件夹）
- 运行如下代码
```bash
# 构建项目
npm run build
```

#### 步骤三：部署到cloudflare page

- 登陆cloudflare
- 新建page，名称随意
- 选择本地上传，上传文件夹
- 选择`\frontend\dist`文件夹（上传整个dist文件夹）
- 点击部署
- 给page绑定域名方便访问


### 3. 前端部署 (Vercel)

#### 步骤一：编辑环境变量

编辑 `\frontend\.env` 文件：
```
VITE_API_BASE_URL=后端地址(末尾不含/)
VITE_API_KEY=API秘钥，前后端一样
```
示例：
```
VITE_API_BASE_URL=https://demo.demo
VITE_API_KEY=admin123
```

#### 步骤二：构件和部署

- 进入`frontend`目录，点击在文件地址栏输入cmd后回车（或者打开cmd后cd到该文件夹）
- 运行如下代码
```bash
# 构建项目
npm run build
```

#### 步骤三：部署到Vercel

现将`\frontend\dist`文件夹上传到自己的github仓库，或者直接上传到本仓库原本的位置（如此做部署的是需要选择根目录为`\frontend\dist`）
上传到仓库之后登陆Vercel，点击创建项目，导入该仓库，直接部署即可

### 4. 前端部署 (其他平台)

部署前端都需要以下步骤：
#### 步骤一：编辑环境变量

编辑 `\frontend\.env` 文件：
```
VITE_API_BASE_URL=后端地址(末尾不含/)
VITE_API_KEY=API秘钥，前后端一样
```
示例：
```
VITE_API_BASE_URL=https://demo.demo
VITE_API_KEY=admin123
```
#### 步骤二：构件和部署

- 进入`frontend`目录，点击在文件地址栏输入cmd后回车（或者打开cmd后cd到该文件夹）
- 运行如下代码
```bash
# 构建项目
npm run build
```

#### 剩下的步骤类似Vercel

导入`\frontend\dist`文件夹到github仓库之后直接连接该储存库进行部署即可

#### 截止到此，你可以看到网站的样子了

![](https://pic1.imgdb.cn/item/689f622658cb8da5c8281965.png)

#### 关于前端部署，推荐使用[zeabur](https://dash.zeabur.com/)，cloudflare有点慢，其他的可能有小bug


### 5. Obsidian插件安装

1. 复制 `obsidian-plugin` 整个文件夹
2. 在Obsidian中：设置 → 第三方插件 → 已安装插件 → 打开插件文件夹
3. 将复制的文件夹直接放到该目录下
4. 重启Obsidian并启用插件
5. 在插件设置中输入你的前端地址，例如`https://qianduan.demo`(末尾不要出现/)
6. 输入你的`api key`
7. 当你需要分享文章时，只需要打开该文章然后点击旁边的插件按钮即可自动分享和复制链接

#### 插件配置
1. 在Obsidian设置中找到 "Obsidian Web Publisher"
2. 配置：
   - **网站地址**：您的Cloudflare Pages URL
   - **API密钥**：与后端相同的API密钥

## 🔧 配置说明

### 环境变量

#### 后端 (Cloudflare Workers)
- `API_KEY`: API访问密钥（通过wrangler secret设置）
- `CORS_ORIGIN`: CORS允许的源（在wrangler.jsonc中配置）

#### 前端 (Vue.js)
- `VITE_API_BASE_URL`: 后端API地址
- `VITE_API_KEY`: API访问密钥

### API端点

- `GET /api/health` - 健康检查
- `GET /api/articles` - 获取文章列表
- `POST /api/articles` - 创建文章
- `GET /api/articles/:id` - 获取文章详情
- `PUT /api/articles/:id` - 更新文章
- `DELETE /api/articles/:id` - 删除文章
- `POST /api/articles/:id/share` - 创建分享链接
- `GET /api/share/:shareId` - 获取分享文章
- `POST /api/upload` - 上传图片
- `GET /api/images/:imageId` - 获取图片

## 🎯 使用流程

1. **部署后端**：将Cloudflare Workers部署到您的账户
2. **配置前端**：设置API地址和密钥，部署到Cloudflare Pages
3. **安装插件**：在Obsidian中安装并配置插件
4. **发布文章**：在Obsidian中编写文章，使用插件一键发布
5. **管理文章**：通过Web界面管理和编辑文章
6. **分享文章**：创建公开分享链接

## 🛠️ 开发说明

### 本地开发

#### 后端开发
```bash
cd backend
npm run dev
# Worker将在 http://localhost:8787 运行
```

#### 前端开发
```bash
cd frontend
npm run dev
# 前端将在 http://localhost:5173 运行
```

确保在 `frontend/.env.local` 中设置正确的本地API地址：
```env
VITE_API_BASE_URL=http://localhost:8787
VITE_API_KEY=your-secret-api-key
```

### 技术栈

- **后端**: TypeScript, Cloudflare Workers, R2 Storage
- **前端**: Vue 3, TypeScript, Tailwind CSS, Vite
- **插件**: TypeScript, Obsidian API

## 📝 注意事项

1. **API密钥安全**：请妥善保管API密钥，不要在公开代码中暴露
2. **R2存储**：确保R2存储桶名称与配置文件中的一致
3. **CORS配置**：生产环境建议设置具体的域名而不是 `*`
4. **图片大小**：建议限制上传图片的大小以节省存储空间
5. **备份数据**：定期备份R2存储桶中的数据

## 🐛 故障排除

### 常见问题

1. **部署失败**
   - 检查Cloudflare账户权限
   - 确认R2存储桶已创建
   - 验证wrangler配置

2. **API调用失败**
   - 检查API密钥是否正确
   - 确认CORS配置
   - 查看浏览器开发者工具的网络请求

3. **插件无法发布**
   - 确认网站地址和API密钥配置
   - 检查网络连接
   - 查看Obsidian开发者控制台


## 🤝 贡献

欢迎提交Issue和Pull Request！

