interface Env {
	OBSIDIAN_BUCKET: R2Bucket;
	CORS_ORIGIN: string;
	API_KEY: string;
}

interface Article {
	id: string;
	title: string;
	content: string;
	createdAt: string;
	updatedAt: string;
	shareId?: string;
	author?: string;
	expiresAt?: string;
}

interface ShareLink {
	id: string;
	articleId: string;
	createdAt: string;
	expiresAt?: string;
}

// CORS headers
const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
};

// Simple API key validation
function validateApiKey(request: Request, env: Env): boolean {
	const apiKey = request.headers.get('X-API-Key');
	const expectedApiKey = env.API_KEY || 'your-secret-api-key'; // 从环境变量读取，如果没有则使用默认值
	return apiKey === expectedApiKey;
}

// Generate unique ID
function generateId(): string {
	return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Handle CORS preflight
function handleOptions(): Response {
	return new Response(null, {
		status: 204,
		headers: corsHeaders,
	});
}

// Get all articles (requires API key)
async function getArticles(env: Env): Promise<Response> {
	try {
		// Clean expired articles first
		await cleanExpiredArticles(env);
		
		const articlesObject = await env.OBSIDIAN_BUCKET.get('articles.json');
		const articles = articlesObject ? JSON.parse(await articlesObject.text()) : [];
		return new Response(JSON.stringify(articles), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Failed to fetch articles' }), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
}

// Delete all articles (requires API key)
async function deleteAllArticles(env: Env): Promise<Response> {
	try {
		// Clear articles
		await env.OBSIDIAN_BUCKET.put('articles.json', JSON.stringify([]));
		
		// Clear share links
		await env.OBSIDIAN_BUCKET.put('sharelinks.json', JSON.stringify([]));
		
		return new Response(JSON.stringify({ message: 'All articles deleted successfully' }), {
			status: 200,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Failed to delete all articles' }), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
}

// Get single article by ID (public for share links)
async function getArticle(env: Env, id: string): Promise<Response> {
	try {
		// Clean expired articles first
		await cleanExpiredArticles(env);
		
		const articlesObject = await env.OBSIDIAN_BUCKET.get('articles.json');
		const articles: Article[] = articlesObject ? JSON.parse(await articlesObject.text()) : [];
		const article = articles.find(a => a.id === id);
		
		if (!article) {
			return new Response(JSON.stringify({ error: 'Article not found' }), {
				status: 404,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
		
		return new Response(JSON.stringify(article), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Failed to fetch article' }), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
}

// Clean expired articles
async function cleanExpiredArticles(env: Env): Promise<void> {
	try {
		const articlesObject = await env.OBSIDIAN_BUCKET.get('articles.json');
		const articles: Article[] = articlesObject ? JSON.parse(await articlesObject.text()) : [];
		
		const now = new Date().toISOString();
		const validArticles = articles.filter(article => !article.expiresAt || article.expiresAt > now);
		
		if (validArticles.length !== articles.length) {
			await env.OBSIDIAN_BUCKET.put('articles.json', JSON.stringify(validArticles));
		}
	} catch (error) {
		console.error('Failed to clean expired articles:', error);
	}
}

// Create new article (requires API key)
async function createArticle(env: Env, request: Request): Promise<Response> {
	try {
		const body = await request.json() as Partial<Article> & { expiresInDays?: number; expiresInSeconds?: number; action?: 'create' | 'update' | 'skip' };
		
		if (!body.title || !body.content) {
			return new Response(JSON.stringify({ error: 'Title and content are required' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
		
		// Clean expired articles first
		await cleanExpiredArticles(env);
		
		const articlesObject = await env.OBSIDIAN_BUCKET.get('articles.json');
		const articles: Article[] = articlesObject ? JSON.parse(await articlesObject.text()) : [];
		
		// Check for duplicate title
		const existingArticle = articles.find(a => a.title === body.title);
		if (existingArticle) {
			if (existingArticle.content === body.content) {
				// Same title and content, return existing share link if available
				if (existingArticle.shareId) {
					return new Response(JSON.stringify({ 
						existing: true, 
						article: existingArticle, 
						shareUrl: `/share/${existingArticle.shareId}` 
					}), {
						status: 200,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' },
					});
				} else {
					return new Response(JSON.stringify({ existing: true, article: existingArticle }), {
						status: 200,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' },
					});
				}
			} else {
				// Same title but different content, require user decision
				if (!body.action) {
					return new Response(JSON.stringify({ 
						conflict: true, 
						message: 'Article with same title exists but content differs', 
						existingArticle: { id: existingArticle.id, title: existingArticle.title, content: existingArticle.content.substring(0, 200) + '...' },
						options: ['update', 'create', 'skip']
					}), {
						status: 409,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' },
					});
				}
				
				if (body.action === 'skip') {
					return new Response(JSON.stringify({ skipped: true, message: 'Article creation skipped' }), {
						status: 200,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' },
					});
				}
				
				if (body.action === 'update') {
					// Update existing article
					existingArticle.content = body.content;
					existingArticle.updatedAt = new Date().toISOString();
					if (body.expiresInSeconds && body.expiresInSeconds > 0) {
						const expiresAt = new Date();
						expiresAt.setTime(expiresAt.getTime() + body.expiresInSeconds * 1000);
						existingArticle.expiresAt = expiresAt.toISOString();
					} else if (body.expiresInDays && body.expiresInDays > 0) {
						const expiresAt = new Date();
						expiresAt.setDate(expiresAt.getDate() + body.expiresInDays);
						existingArticle.expiresAt = expiresAt.toISOString();
					}
					await env.OBSIDIAN_BUCKET.put('articles.json', JSON.stringify(articles));
					return new Response(JSON.stringify(existingArticle), {
						status: 200,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' },
					});
				}
			}
		}
		
		// Calculate expiration date if provided
		let expiresAt: string | undefined;
		if (body.expiresInSeconds && body.expiresInSeconds > 0) {
			const expireDate = new Date();
			expireDate.setTime(expireDate.getTime() + body.expiresInSeconds * 1000);
			expiresAt = expireDate.toISOString();
		} else if (body.expiresInDays && body.expiresInDays > 0) {
			const expireDate = new Date();
			expireDate.setDate(expireDate.getDate() + body.expiresInDays);
			expiresAt = expireDate.toISOString();
		}
		
		const newArticle: Article = {
			id: generateId(),
			title: body.title,
			content: body.content,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			author: body.author || 'Anonymous',
			expiresAt,
		};
		
		articles.push(newArticle);
		
		await env.OBSIDIAN_BUCKET.put('articles.json', JSON.stringify(articles));
		
		return new Response(JSON.stringify(newArticle), {
			status: 201,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Failed to create article' }), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
}

// Update article (requires API key)
async function updateArticle(env: Env, id: string, request: Request): Promise<Response> {
	try {
		const body = await request.json() as Partial<Article>;
		
		// Clean expired articles first
		await cleanExpiredArticles(env);
		
		const articlesObject = await env.OBSIDIAN_BUCKET.get('articles.json');
		const articles: Article[] = articlesObject ? JSON.parse(await articlesObject.text()) : [];
		
		const articleIndex = articles.findIndex(a => a.id === id);
		if (articleIndex === -1) {
			return new Response(JSON.stringify({ error: 'Article not found' }), {
				status: 404,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
		
		articles[articleIndex] = {
			...articles[articleIndex],
			...body,
			updatedAt: new Date().toISOString(),
		};
		
		await env.OBSIDIAN_BUCKET.put('articles.json', JSON.stringify(articles));
		
		return new Response(JSON.stringify(articles[articleIndex]), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Failed to update article' }), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
}

// Delete article (requires API key)
async function deleteArticle(env: Env, id: string): Promise<Response> {
	try {
		// Clean expired articles first
		await cleanExpiredArticles(env);
		
		const articlesObject = await env.OBSIDIAN_BUCKET.get('articles.json');
		const articles: Article[] = articlesObject ? JSON.parse(await articlesObject.text()) : [];
		
		const articleIndex = articles.findIndex(a => a.id === id);
		if (articleIndex === -1) {
			return new Response(JSON.stringify({ error: 'Article not found' }), {
				status: 404,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
		
		articles.splice(articleIndex, 1);
		
		await env.OBSIDIAN_BUCKET.put('articles.json', JSON.stringify(articles));
		
		return new Response(JSON.stringify({ message: 'Article deleted successfully' }), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Failed to delete article' }), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
}

// Create share link (requires API key)
async function createShareLink(env: Env, articleId: string): Promise<Response> {
	try {
		// Clean expired articles first
		await cleanExpiredArticles(env);
		
		// Check if article exists
		const articlesObject = await env.OBSIDIAN_BUCKET.get('articles.json');
		const articles: Article[] = articlesObject ? JSON.parse(await articlesObject.text()) : [];
		const article = articles.find(a => a.id === articleId);
		
		if (!article) {
			return new Response(JSON.stringify({ error: 'Article not found' }), {
				status: 404,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
		
		const shareId = generateId();
		const shareLink: ShareLink = {
			id: shareId,
			articleId: articleId,
			createdAt: new Date().toISOString(),
		};
		
		// Store share link
		const shareLinksObject = await env.OBSIDIAN_BUCKET.get('sharelinks.json');
		const shareLinks: ShareLink[] = shareLinksObject ? JSON.parse(await shareLinksObject.text()) : [];
		shareLinks.push(shareLink);
		
		await env.OBSIDIAN_BUCKET.put('sharelinks.json', JSON.stringify(shareLinks));
		
		// Update article with share ID
		article.shareId = shareId;
		await env.OBSIDIAN_BUCKET.put('articles.json', JSON.stringify(articles));
		
		return new Response(JSON.stringify({ shareId, shareUrl: `/share/${shareId}` }), {
			status: 201,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Failed to create share link' }), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
}

// Get article by share ID (public)
async function getSharedArticle(env: Env, shareId: string): Promise<Response> {
	try {
		// Clean expired articles first
		await cleanExpiredArticles(env);
		
		const shareLinksObject = await env.OBSIDIAN_BUCKET.get('sharelinks.json');
		const shareLinks: ShareLink[] = shareLinksObject ? JSON.parse(await shareLinksObject.text()) : [];
		const shareLink = shareLinks.find(s => s.id === shareId);
		
		if (!shareLink) {
			return new Response(JSON.stringify({ error: 'Share link not found' }), {
				status: 404,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
		
		return getArticle(env, shareLink.articleId);
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Failed to fetch shared article' }), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
}

// Upload image (requires API key)
async function uploadImage(env: Env, request: Request): Promise<Response> {
	try {
		const formData = await request.formData();
		const file = formData.get('image') as File;
		
		if (!file) {
			return new Response(JSON.stringify({ error: 'No image file provided' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
		
		const imageId = generateId();
		const fileName = `images/${imageId}-${file.name}`;
		
		await env.OBSIDIAN_BUCKET.put(fileName, file.stream(), {
			httpMetadata: {
				contentType: file.type,
			},
		});
		
		return new Response(JSON.stringify({ 
			imageId, 
			url: `/api/images/${imageId}`,
			fileName: fileName 
		}), {
			status: 201,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Failed to upload image' }), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
}

// Get image (public)
async function getImage(env: Env, imageId: string): Promise<Response> {
	try {
		// Find the image file
		const objects = await env.OBSIDIAN_BUCKET.list({ prefix: `images/${imageId}-` });
		
		if (objects.objects.length === 0) {
			return new Response('Image not found', {
				status: 404,
				headers: corsHeaders,
			});
		}
		
		const imageObject = await env.OBSIDIAN_BUCKET.get(objects.objects[0].key);
		
		if (!imageObject) {
			return new Response('Image not found', {
				status: 404,
				headers: corsHeaders,
			});
		}
		
		return new Response(imageObject.body, {
			headers: {
				...corsHeaders,
				'Content-Type': imageObject.httpMetadata?.contentType || 'image/jpeg',
				'Cache-Control': 'public, max-age=31536000',
			},
		});
	} catch (error) {
		return new Response('Failed to fetch image', {
			status: 500,
			headers: corsHeaders,
		});
	}
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method;
		
		// Handle CORS preflight
		if (method === 'OPTIONS') {
			return handleOptions();
		}
		
		// Public routes (no API key required)
		if (path === '/api/health') {
			return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		if (path.startsWith('/api/share/')) {
			const shareId = path.split('/')[3];
			if (method === 'GET') {
				return getSharedArticle(env, shareId);
			}
		}

		if (path.startsWith('/api/images/')) {
			const imageId = path.split('/')[3];
			if (method === 'GET') {
				return getImage(env, imageId);
			}
		}
		
		// Protected routes (API key required)
		if (!validateApiKey(request, env)) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
		
		// API routes
		if (path === '/api/articles') {
			if (method === 'GET') {
				return getArticles(env);
			} else if (method === 'POST') {
				return createArticle(env, request);
			} else if (method === 'DELETE') {
				return deleteAllArticles(env);
			}
		}
		
		if (path.startsWith('/api/articles/')) {
			const articleId = path.split('/')[3];
			if (method === 'GET') {
				return getArticle(env, articleId);
			} else if (method === 'PUT') {
				return updateArticle(env, articleId, request);
			} else if (method === 'DELETE') {
				return deleteArticle(env, articleId);
			}
		}
		
		if (path.startsWith('/api/articles/') && path.endsWith('/share')) {
			const articleId = path.split('/')[3];
			if (method === 'POST') {
				return createShareLink(env, articleId);
			}
		}
		
		if (path === '/api/upload') {
			if (method === 'POST') {
				return uploadImage(env, request);
			}
		}
		

		
		return new Response(JSON.stringify({ error: 'Not found' }), {
			status: 404,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	},
} satisfies ExportedHandler<Env>;
