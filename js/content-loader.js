class GitHubContentLoader {
    constructor() {
        this.owner = 'Nallasivan30';
        this.repo = 'decap-demo';
        this.branch = 'main';
        this.cache = new Map();
        this.collections = {
            posts: {
                path: 'content/posts',
                renderer: this.renderPosts.bind(this)
            },
            images: {
                path: 'content/images',  
                renderer: this.renderImages.bind(this)
            }
        };
    }

    // ======================
    // Core Loading Methods
    // ======================
     async init() {
        console.log('Initializing GitHub content loader...');
        this.showLoading('posts-container');
        
        try {
            const [posts, images] = await Promise.all([
                this.loadCollection('posts'),
                this.loadCollection('images')
            ]);
            
            this.renderPosts(posts, 'posts-container');
            this.renderImages(images, 'images-container');
            this.startAutoRefresh();
            
            console.log('✅ Content loader initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Initialization error:', error);
            this.showError(error.message, 'posts-container');
            return false;
        }
    }

    async loadCollection(collectionName) {
        const collection = this.collections[collectionName];
        if (!collection) throw new Error(`Collection ${collectionName} not configured`);

        try {
            console.log(`Loading ${collectionName} from GitHub...`);
            const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${collection.path}?ref=${this.branch}`;
            
            const response = await fetch(url, {
                // 'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                headers: {'Accept': 'application/vnd.github.v3+json'}
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`${collectionName} folder not found at ${collection.path}`);
                    return [];
                }
                throw new Error(`GitHub API error: ${response.status}`);
            }
            
            const files = await response.json();
            const fileArray = Array.isArray(files) ? files : [files];
            const validFiles = fileArray.filter(file => 
                file.name && (collectionName === 'images' || file.type === 'file')
            );
            
            const items = await Promise.all(
                validFiles.map(file => this.loadCollectionItem(collectionName, file))
            );
            
            return items.filter(item => item !== null);
        } catch (error) {
            console.error(`Error loading ${collectionName}:`, error);
            throw error;
        }
    }

    async loadCollectionItem(collectionName, file) {
        try {
            const cacheKey = `${collectionName}-${file.sha}`;
            if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

            if (collectionName === 'images') {
                const imageItem = {
                    title: file.name,
                    filename: file.name,
                    download_url: file.download_url,
                    path: file.path,
                    publish: true,
                    date: new Date().toISOString(),
                    uploadImage: file.path
                };
                
                this.cache.set(cacheKey, imageItem);
                return imageItem;
            }
            else if (collectionName === 'posts') {
                const response = await fetch(file.download_url);
                if (!response.ok) throw new Error(`Failed to fetch ${file.name}`);
                
                const content = await response.text();
                const item = this.parseMarkdownFile(content, file.name);
                
                if (item) {
                    item.lastUpdated = new Date().toISOString();
                    this.cache.set(cacheKey, item);
                }
                
                return item;
            }
            
            return null;
        } catch (error) {
            console.error(`Error loading ${file.name}:`, error);
            return null;
        }
    }

    // ======================
    // Parsing Methods
    // ======================
    parseMarkdownFile(content, filename) {
        try {
            const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
            const match = content.match(frontMatterRegex);
            
            if (!match) {
                console.warn(`No front matter found in ${filename}`);
                return {
                    title: filename.replace(/\.md$/, ''),
                    publish: true,
                    date: new Date().toISOString(),
                    body: content,
                    filename: filename,
                    slug: filename.replace(/\.md$/, '')
                };
            }

            const frontMatter = this.parseYAML(match[1]);
            const body = match[2].trim();

            return {
                ...frontMatter,
                body: body,
                filename: filename,
                slug: filename.replace(/\.md$/, '')
            };
        } catch (error) {
            console.error(`Error parsing ${filename}:`, error);
            return null;
        }
    }

    parseYAML(yamlString) {
        const result = {};
        const lines = yamlString.split('\n');
        
        for (let line of lines) {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const colonIndex = line.indexOf(':');
                if (colonIndex > -1) {
                    const key = line.substring(0, colonIndex).trim();
                    let value = line.substring(colonIndex + 1).trim();
                    
                    if (value.toLowerCase() === 'true') value = true;
                    else if (value.toLowerCase() === 'false') value = false;
                    else if (value.match(/^\d{4}-\d{2}-\d{2}/)) value = value.replace(/['"]/g, '');
                    else value = value.replace(/^['"]|['"]$/g, '');
                    
                    result[key] = value;
                }
            }
        }
        
        return result;
    }

    // ======================
    // Rendering Methods
    // ======================
    renderPosts(posts, containerId = 'posts-container') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container with ID '${containerId}' not found`);
            return;
        }

        if (posts.length === 0) {
            container.innerHTML = this.getNoPostsHTML();
            return;
        }

        const publishedPosts = posts
            .filter(post => post.publish === true)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        if (publishedPosts.length === 0) {
            container.innerHTML = this.getNoPublishedPostsHTML();
            return;
        }

        container.innerHTML = publishedPosts.map(post => `
            <article class="post-card" data-slug="${post.slug}">
                <h3>${this.escapeHtml(post.title)}</h3>
                <div class="post-meta">
                    📅 ${this.formatDate(post.date)}
                    <span class="post-published">Published</span>
                    <span class="post-filename">📄 ${post.filename}</span>
                </div>
                <div class="post-content">
                    ${this.markdownToHtml(post.body)}
                </div>
            </article>
        `).join('');

        console.log(`Rendered ${publishedPosts.length} published posts`);
    }

    renderImages(images, containerId = 'images-container') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Images container '${containerId}' not found`);
            return;
        }

        const publishedImages = images
            .filter(img => img.publish !== false)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        if (publishedImages.length === 0) {
            container.innerHTML = this.getNoImagesHTML();
            return;
        }

        container.innerHTML = publishedImages.map(img => {
            const imageSrc = this.getImageSrc(img);
            const altText = img.altText || img.description || img.title || 'Image';

            return `
                <div class="image-card">
                    <div class="image-header">
                        <h3>${this.escapeHtml(img.title)}</h3>
                    </div>
                    ${imageSrc ? `
                        <div class="image-wrapper">
                            <img src="${imageSrc}" 
                                 alt="${this.escapeHtml(altText)}" 
                                 loading="lazy"
                                 onerror="this.parentElement.innerHTML='<div class=\\"image-error\\">❌ Image not found: ${imageSrc}</div>'">
                        </div>
                    ` : this.getImageErrorHTML(img)}
                    ${img.description ? `<div class="image-description">${this.markdownToHtml(img.description)}</div>` : ''}
                    <div class="image-meta">
                        <span>📅 ${this.formatDate(img.date)}</span>
                        <span class="image-filename">📄 ${img.filename}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        console.log(`Rendered ${publishedImages.length} images`);
    }

    getImageSrc(imageItem) {
        if (!imageItem.image) return '';
        // Always point to images/uploads folder for actual images
        return `/images/uploads/${imageItem.image}`;
    }

    // ======================
    // Helper Methods
    // ======================
    resolveImagePath(imageData) {
        if (!imageData) return '';
        
        if (imageData.startsWith('http://') || imageData.startsWith('https://')) return imageData;
        if (imageData.startsWith('/images/')) return imageData;
        if (imageData.startsWith('images/')) return `/${imageData}`;
        if (imageData.startsWith('content/') || imageData.startsWith('images/')) return `/${imageData}`;
        
        return `/images/uploads/${imageData}`;
    }

    getImageSrc(imageItem) {
        if (imageItem.imageType === 'url' && imageItem.externalUrl) return imageItem.externalUrl;
        if (imageItem.imageType === 'upload' && imageItem.uploadImage) return this.resolveImagePath(imageItem.uploadImage);
        if (imageItem.image) return this.resolveImagePath(imageItem.image);
        if (imageItem.externalUrl) return imageItem.externalUrl;
        return '';
    }

    markdownToHtml(markdown) {
        if (!markdown) return '';
        
        return markdown
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, (match, alt, src) => {
                const resolvedSrc = this.resolveImagePath(src);
                return `<img src="${resolvedSrc}" alt="${alt}" loading="lazy" style="max-width: 100%; height: auto;">`;
            })
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/gim, '<em>$1</em>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank">$1</a>')
            .replace(/^\s*\d+\.\s+(.*$)/gim, '<li>$1</li>')
            .replace(/^\s*[\-\*]\s+(.*$)/gim, '<li>$1</li>')
            .replace(/```([^`]*)```/gim, '<pre><code>$1</code></pre>')
            .replace(/`([^`]*)`/gim, '<code>$1</code>')
            .replace(/\n\n/gim, '</p><p>')
            .replace(/^(?!<[h|l|p|c|i])/gim, '<p>')
            .replace(/$/gim, '</p>')
            .replace(/<p><\/p>/gim, '')
            .replace(/<p>(<h[1-6]>.*?<\/h[1-6]>)<\/p>/gim, '$1')
            .replace(/<p>(<pre>.*?<\/pre>)<\/p>/gim, '$1')
            .replace(/<p>(<img.*?>)<\/p>/gim, '$1')
            .replace(/(<li>.*?<\/li>)/gims, '<ul>$1</ul>')
            .replace(/<\/ul>\s*<ul>/gim, '');
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            
            const options = { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            };
            return date.toLocaleDateString('en-US', options);
        } catch (error) {
            console.error('Date formatting error:', error);
            return dateString;
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ======================
    // UI Methods
    // ======================
    showError(message, containerId = 'posts-container') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="error">
                    <h3>⚠️ Error Loading Content</h3>
                    <p>${message}</p>
                    <details>
                        <summary>Troubleshooting</summary>
                        <ul>
                            <li>Make sure your repository is public or you have proper access</li>
                            <li>Check that the required folders exist</li>
                            <li>Verify your files have proper front matter with <code>---</code></li>
                            <li>Check browser console for detailed error messages</li>
                        </ul>
                    </details>
                    <button onclick="window.contentLoader.init()" class="retry-button">Retry</button>
                </div>
            `;
        }
    }

    showLoading(containerId = 'posts-container') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="loading">
                    <p>🔄 Loading content from GitHub...</p>
                    <small>Repository: ${this.owner}/${this.repo}</small>
                </div>
            `;
        }
    }

    showRefreshNotification() {
        const notification = document.createElement('div');
        notification.className = 'refresh-notification';
        notification.textContent = '✓ Content updated';
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    // ======================
    // Auto-Refresh Methods
    // ======================
    startAutoRefresh(intervalMs = 30000) {
        console.log(`Starting auto-refresh every ${intervalMs/1000} seconds`);
        
        this.refreshInterval = setInterval(async () => {
            try {
                console.log('Auto-refreshing content...');
                const [posts, images] = await Promise.all([
                    this.loadCollection('posts'),
                    this.loadCollection('images')
                ]);
                
                this.renderPosts(posts);
                this.renderImages(images);
                this.showRefreshNotification();
            } catch (error) {
                console.error('Auto-refresh error:', error);
            }
        }, intervalMs);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            console.log('Auto-refresh stopped');
        }
    }

    // ======================
    // HTML Templates
    // ======================
    getNoPostsHTML() {
        return `
            <div class="no-posts">
                <p>No posts found yet. <a href="/admin/">Create your first post</a>!</p>
                <p><small>Make sure you have markdown files in the <code>content/posts</code> folder.</small></p>
            </div>
        `;
    }

    getNoPublishedPostsHTML() {
        return `
            <div class="no-posts">
                <p>No published posts found. <a href="/admin/">Publish your first post</a>!</p>
                <p><small>Make sure the <code>publish: true</code> field is set in your post's front matter.</small></p>
            </div>
        `;
    }

    getNoImagesHTML() {
        return `
            <div class="no-images">
                <p>No images found yet. <a href="/admin/">Add your first image</a>!</p>
                <p><small>Make sure you have images in the <code>images/uploads</code> folder.</small></p>
            </div>
        `;
    }

    getImageErrorHTML(img) {
        return `
            <div class="image-error">
                ⚠️ No image source found
                <details style="margin-top: 0.5rem;">
                    <summary>Debug Info</summary>
                    <pre style="font-size: 0.8rem; background: #f5f5f5; padding: 0.5rem; margin-top: 0.5rem;">
                        ${JSON.stringify(img, null, 2)}
                    </pre>
                </details>
            </div>
        `;
    }

    // ======================
    // Public API
    // ======================
    async refresh() {
        console.log('Manual refresh triggered');
        try {
            this.showLoading('posts-container');
            
            const [posts, images] = await Promise.all([
                this.loadCollection('posts'),
                this.loadCollection('images')
            ]);
            
            this.renderPosts(posts, 'posts-container');
            this.renderImages(images, 'images-container');
            this.showRefreshNotification();
        } catch (error) {
            this.showError(error.message, 'posts-container');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing content loader...');
    window.contentLoader = new GitHubContentLoader();
    window.contentLoader.init();
    
    // Add refresh button
    const refreshButton = document.createElement('button');
    refreshButton.className = 'refresh-button';
    refreshButton.innerHTML = '🔄 Refresh Content';
    refreshButton.addEventListener('click', () => window.contentLoader.refresh());
    document.body.appendChild(refreshButton);
});