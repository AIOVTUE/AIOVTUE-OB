import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, requestUrl } from 'obsidian';

interface ObsidianWebSettings {
	frontendUrl: string;
	apiKey: string;
}

const DEFAULT_SETTINGS: ObsidianWebSettings = {
	frontendUrl: '',
	apiKey: ''
}

export default class ObsidianWebPlugin extends Plugin {
	settings: ObsidianWebSettings;

	async onload() {
		await this.loadSettings();

		// 添加功能区图标
		this.addRibbonIcon('upload-cloud', '发布到网站', (evt: MouseEvent) => {
			this.publishCurrentNote();
		});

		// 添加命令
		this.addCommand({
			id: 'publish-note',
			name: '发布当前笔记',
			callback: () => {
				this.publishCurrentNote();
			}
		});

		this.addCommand({
			id: 'create-share-link',
			name: '创建分享链接',
			callback: () => {
				this.createShareLink();
			}
		});

		// 添加设置选项卡
		this.addSettingTab(new ObsidianWebSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async getBackendUrl(): Promise<string | null> {
		try {
			if (!this.settings.frontendUrl) {
				console.error('前端地址未配置');
				new Notice('请先配置前端地址');
				return null;
			}
			
			console.log('尝试获取后端地址，前端地址:', this.settings.frontendUrl);
			
			// 从前端获取配置信息
			const configUrl = `${this.settings.frontendUrl}/api/config.json`;
			console.log('请求配置文件:', configUrl);
			
			try {
				const configResponse = await requestUrl({
					url: configUrl,
					method: 'GET',
					headers: {
						'Accept': 'application/json',
						'Cache-Control': 'no-cache'
					}
				});
				
				console.log('配置文件响应状态:', configResponse.status);
				console.log('配置文件响应内容:', configResponse.text);
				
				if (configResponse.status >= 200 && configResponse.status < 300) {
					const config = configResponse.json;
					console.log('配置文件内容:', config);
					
					const backendUrl = config.backendUrl || config.apiBaseUrl;
					if (backendUrl) {
						console.log('成功获取后端地址:', backendUrl);
						new Notice('成功获取后端地址: ' + backendUrl);
						return backendUrl;
					} else {
						console.error('配置文件中未找到后端地址');
						new Notice('配置文件中未找到后端地址');
					}
				} else {
					console.error('配置文件请求失败:', configResponse.status);
					new Notice('配置文件请求失败: ' + configResponse.status);
				}
			} catch (requestError) {
				console.error('配置文件请求异常:', requestError);
				new Notice('配置文件请求异常，尝试使用默认配置: ' + requestError.message);
			}
			
			// 如果配置文件获取失败，直接使用已知的后端地址
			console.log('使用已知的后端地址');
			const knownBackendUrl = 'https://obsidna.20030327.xyz';
			console.log('使用后端地址:', knownBackendUrl);
			new Notice('使用默认后端地址: ' + knownBackendUrl);
			return knownBackendUrl;
			
		} catch (error) {
			console.error('获取后端地址过程中发生错误:', error);
			new Notice(`获取后端地址失败: ${error.message}`);
			return null;
		}
	}

	async publishCurrentNote() {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
			new Notice('请先打开一个Markdown文件');
			return;
		}

		if (!this.settings.frontendUrl || !this.settings.apiKey) {
			new Notice('请先在设置中配置前端地址和API密钥');
			return;
		}

		const file = activeView.file;
		if (!file) {
			new Notice('无法获取当前文件');
			return;
		}

		// 检查文件是否已经有分享链接
		try {
			const content = await this.app.vault.read(file);
			const frontmatter = this.parseFrontmatter(content);
			
			// 如果已存在分享链接，显示提示并返回
			if (frontmatter && frontmatter['发布链接']) {
				new Notice('此文件已分享过，无需重复上传！');
				return;
			}
			
			const title = file.basename;
			
			// 移除frontmatter（笔记属性）
			const contentWithoutFrontmatter = this.removeFrontmatter(content);
			
			// 处理图片上传
			const processedContent = await this.processImages(contentWithoutFrontmatter);

			const article: any = {
				title: title,
				content: processedContent,
				author: 'Obsidian用户'
			};

			const response = await this.apiRequest('POST', '/api/articles', article);
				
				if (response.ok) {
					const result = await response.json();
					console.log('发布响应:', result);
					
					if (result && result.id) {
				const successMessage = `文章发布成功！ID: ${result.id}`;
				new Notice(successMessage);
						
						// 自动创建分享链接
						try {
							const shareResponse = await this.apiRequest('POST', `/api/articles/${result.id}/share`);
							if (shareResponse.ok) {
								const shareResult = await shareResponse.json();
								if (shareResult && shareResult.shareId) {
						const shareUrl = `${this.settings.frontendUrl}/share/${shareResult.shareId}`;
						// 直接复制分享链接到剪贴板
						await navigator.clipboard.writeText(shareUrl);
						
						// 将分享链接写入文件的frontmatter
						try {
							await this.addShareLinkToFrontmatter(file, shareUrl);
							new Notice('分享链接已复制到剪贴板并保存到笔记属性！');
						} catch (frontmatterError) {
							console.error('保存分享链接到frontmatter失败:', frontmatterError);
							new Notice('分享链接已复制到剪贴板！');
						}
							} else {
								new Notice('创建分享链接失败');
							}
							} else {
							new Notice('创建分享链接失败');
						}
						} catch (shareError) {
						console.error('创建分享链接时出错:', shareError);
						new Notice('创建分享链接失败');
					}
					} else {
						console.error('响应格式错误:', result);
						new Notice('发布成功但响应格式异常');
					}
				} else {
					const errorText = await response.text();
					if (response.status === 409) {
						// 处理重复文章的情况
						try {
							const errorData = JSON.parse(errorText);
							if (errorData.action === 'prompt') {
								new Notice('检测到重复标题的文章，请在前端页面处理重复文章问题');
							} else {
								new Notice(`发布失败: ${errorText}`);
							}
						} catch {
							new Notice(`发布失败: ${errorText}`);
						}
					} else {
						new Notice(`发布失败: ${errorText}`);
					}
				}
		} catch (error) {
			console.error('发布文章时出错:', error);
			new Notice('发布失败，请检查网络连接和设置');
		}
	}

	async createShareLink() {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
			new Notice('请先打开一个Markdown文件');
			return;
		}

		if (!this.settings.frontendUrl || !this.settings.apiKey) {
			new Notice('请先在设置中配置网站地址和API密钥');
			return;
		}

		const file = activeView.file;
		if (!file) {
			new Notice('无法获取当前文件');
			return;
		}

		try {
			const content = await this.app.vault.read(file);
			const frontmatter = this.parseFrontmatter(content);
			
			// 检查是否已存在分享链接
			if (frontmatter && frontmatter['发布链接']) {
				const existingShareUrl = frontmatter['发布链接'];
				await navigator.clipboard.writeText(existingShareUrl);
				new Notice('分享链接已复制到剪贴板！');
				return;
			}
			
			// 如果没有分享链接，提示用户先发布文章
			new Notice('此文件尚未发布，请先发布文章！');
		} catch (error) {
			console.error('获取分享链接时出错:', error);
			new Notice(`获取分享链接失败: ${error.message}`);
		}
	}

	async processImages(content: string): Promise<string> {
		// 匹配Markdown图片语法
		const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
		let processedContent = content;
		const matches = Array.from(content.matchAll(imageRegex));

		for (const match of matches) {
			const [fullMatch, alt, imagePath] = match;
			
			// 如果是本地图片路径
			if (!imagePath.startsWith('http')) {
				try {
					// 获取图片文件
					const imageFile = this.app.vault.getAbstractFileByPath(imagePath);
					if (imageFile instanceof TFile) {
						const imageBuffer = await this.app.vault.readBinary(imageFile);
						
						// 上传图片
						const formData = new FormData();
						formData.append('image', new Blob([imageBuffer]), imageFile.name);
						
						const response = await this.apiRequest('POST', '/api/upload', formData, false);
						
						if (response.ok) {
							const result = await response.json();
							const backendUrl = await this.getBackendUrl();
							const newImageUrl = `${backendUrl}/api/images/${result.imageId}`;
							
							// 替换图片链接
							processedContent = processedContent.replace(fullMatch, `![${alt}](${newImageUrl})`);
						}
					}
				} catch (error) {
					console.error('图片上传失败:', error);
				}
			}
		}

		return processedContent;
	}

	parseFrontmatter(content: string): Record<string, any> | null {
		// 检查是否以 --- 开头（frontmatter标记）
		if (!content.startsWith('---')) {
			return null;
		}
		
		// 查找第二个 --- 的位置
		const secondDelimiterIndex = content.indexOf('---', 3);
		if (secondDelimiterIndex === -1) {
			return null;
		}
		
		// 提取frontmatter内容
		const frontmatterText = content.substring(3, secondDelimiterIndex).trim();
		const frontmatter: Record<string, any> = {};
		
		// 简单解析YAML格式的frontmatter
		const lines = frontmatterText.split('\n');
		for (const line of lines) {
			const colonIndex = line.indexOf(':');
			if (colonIndex > 0) {
				const key = line.substring(0, colonIndex).trim();
				const value = line.substring(colonIndex + 1).trim();
				frontmatter[key] = value;
			}
		}
		
		return frontmatter;
	}
	
	async addShareLinkToFrontmatter(file: TFile, shareUrl: string): Promise<void> {
		const content = await this.app.vault.read(file);
		let newContent: string;
		
		if (content.startsWith('---')) {
			// 已有frontmatter，添加发布链接属性
			const secondDelimiterIndex = content.indexOf('---', 3);
			if (secondDelimiterIndex !== -1) {
				const frontmatterPart = content.substring(0, secondDelimiterIndex);
				const restContent = content.substring(secondDelimiterIndex);
				newContent = frontmatterPart + `发布链接: ${shareUrl}\n` + restContent;
			} else {
				// frontmatter格式错误，在开头添加新的frontmatter
				newContent = `---\n发布链接: ${shareUrl}\n---\n\n` + content;
			}
		} else {
			// 没有frontmatter，创建新的
			newContent = `---\n发布链接: ${shareUrl}\n---\n\n` + content;
		}
		
		await this.app.vault.modify(file, newContent);
	}
	
	removeFrontmatter(content: string): string {
		// 检查是否以 --- 开头（frontmatter标记）
		if (content.startsWith('---')) {
			// 查找第二个 --- 的位置
			const secondDelimiterIndex = content.indexOf('---', 3);
			if (secondDelimiterIndex !== -1) {
				// 移除frontmatter部分，保留后面的内容
				return content.substring(secondDelimiterIndex + 3).trim();
			}
		}
		// 如果没有frontmatter，返回原内容
		return content;
	}

	async apiRequest(method: string, endpoint: string, data?: any, isJson: boolean = true): Promise<Response> {
		const backendUrl = await this.getBackendUrl();
		if (!backendUrl) {
			throw new Error('无法获取后端地址，请检查前端地址配置');
		}
		
		const url = `${backendUrl}${endpoint}`;
		const headers: Record<string, string> = {
			'X-API-Key': this.settings.apiKey
		};

		let body;
		if (data) {
			if (isJson) {
				headers['Content-Type'] = 'application/json';
				body = JSON.stringify(data);
			} else {
				body = data;
			}
		}

		const response = await requestUrl({
		url,
		method,
		headers,
		body
	});
	
	// 将requestUrl的响应转换为fetch兼容的Response对象
	return {
		ok: response.status >= 200 && response.status < 300,
		status: response.status,
		statusText: response.status.toString(),
		headers: new Headers(response.headers || {}),
		json: async () => response.json,
		text: async () => response.text,
		arrayBuffer: async () => response.arrayBuffer
	} as Response;
	}
}

class ShareLinkModal extends Modal {
	constructor(app: App, private shareUrl: string, private plugin?: ObsidianWebPlugin, private file?: TFile) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: '分享链接已创建' });
		contentEl.createEl('p', { text: '您的文章已分享！请复制下面的链接：' });
		
		const linkContainer = contentEl.createDiv({ cls: 'share-link-container' });
		const linkInput = linkContainer.createEl('input', {
			type: 'text',
			value: this.shareUrl,
			attr: { readonly: 'true' }
		});
		
		const copyButton = linkContainer.createEl('button', { text: '复制' });
		copyButton.onclick = async () => {
			await navigator.clipboard.writeText(this.shareUrl);
			new Notice('链接已复制到剪贴板！');
			
			// 复制完成后删除本地文件中的发布信息
			if (this.plugin && this.file) {
				try {
					const content = await this.app.vault.read(this.file);
					// 删除发布信息部分（从"---\n发布信息:"开始到文件末尾）
					const publishInfoRegex = /\n\n---\n发布信息:[\s\S]*$/;
					const cleanContent = content.replace(publishInfoRegex, '');
					if (cleanContent !== content) {
						await this.app.vault.modify(this.file, cleanContent);
						new Notice('已清理本地文件中的发布信息');
					}
				} catch (error) {
					console.error('清理发布信息时出错:', error);
				}
			}
		};
		
		const closeButton = contentEl.createEl('button', { text: '关闭' });
		closeButton.onclick = () => this.close();
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class ObsidianWebSettingTab extends PluginSettingTab {
	plugin: ObsidianWebPlugin;

	constructor(app: App, plugin: ObsidianWebPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Obsidian Web 发布器设置'});

		new Setting(containerEl)
			.setName('前端地址')
			.setDesc('您的前端应用程序的基础URL（例如：https://your-frontend.pages.dev），插件将自动获取后端API地址')
			.addText(text => text
				.setPlaceholder('https://your-frontend.pages.dev')
				.setValue(this.plugin.settings.frontendUrl)
				.onChange(async (value) => {
					this.plugin.settings.frontendUrl = value.trim();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('API密钥')
			.setDesc('用于身份验证的API密钥')
			.addText(text => text
				.setPlaceholder('请输入您的API密钥')
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value.trim();
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h3', {text: '使用说明'});
		const instructions = containerEl.createEl('div');
		instructions.innerHTML = `
			<p>1. 在上方配置您的前端地址和API密钥</p>
			<p>2. 插件会自动从前端获取后端API地址</p>
			<p>3. 打开您想要发布的笔记</p>
			<p>4. 使用功能区图标或命令面板进行发布</p>
			<p>5. 使用命令面板为已发布的文章创建分享链接</p>
			<p>6. 本地图片会自动上传到服务器</p>
		`;
	}
}