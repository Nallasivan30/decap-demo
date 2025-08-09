class GitHubContentLoader {
    constructor() {
        this.owner = 'Nallasivan30';
        this.repo = 'decap-demo';
        this.branch = 'main';
        this.postsPath = 'content/posts';
        this.cache = new Map();
        this.lastCheck = 0;
    }

    async loadPosts() {
        try {
            console.log('Loading posts from GitHub...');
            const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${this.postsPath}?ref=${this.branch}`;
            
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                }
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Posts folder not found. Make sure content/posts exists in your repository.');
                }
                throw new Error(`GitHub API error: ${response.status} - ${response.statusText}`);
            }
            
            const files = await response.json();
            
            // Handle case where API returns a single file object instead of array
            const fileArray = Array.isArray(files) ? files : [files];
            
            const markdownFiles = fileArray.filter(file => 
                file.name && file.name.endsWith('.md') && file.type === 'file'
            );
            
            if (markdownFiles.length === 0) {
                console.log('No markdown files found in content/posts');
                return [];
            }
            
            console.log(`Found ${markdownFiles.length} markdown files`);
            
            const posts = await Promise.all(
                markdownFiles.map(file => this.loadSinglePost(file))
            );
            
            const validPosts = posts.filter(post => post !== null);
            console.log(`Successfully loaded ${validPosts.length} posts`);
            
            return validPosts;
        } catch (error) {
            console.error('Error loading posts:', error);
            throw error;
        }
    }

    async loadSinglePost(file) {
        try {
            // Check if we have this file cached and it hasn't changed
            if (this.cache.has(file.sha)) {
                return this.cache.get(file.sha);
            }

            console.log(`Loading post: ${file.name}`);
            const response = await fetch(file.download_url);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch ${file.name}: ${response.status}`);
            }
            
            const content = await response.text();
            const post = this.parseMarkdownFile(content, file.name);
            
            if (post) {
                // Cache the parsed post with SHA as key
                this.cache.set(file.sha, post);
            }
            
            return post;
        } catch (error) {
            console.error(`Error loading post ${file.name}:`, error);
            return null;
        }
    }

    parseMarkdownFile(content, filename) {
        try {
            // Parse front matter using regex
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
                    
                    // Handle boolean values
                    if (value.toLowerCase() === 'true') {
                        value = true;
                    } else if (value.toLowerCase() === 'false') {
                        value = false;
                    } else if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
                        // Keep date strings as is for now
                        value = value.replace(/['"]/g, '');
                    } else {
                        // Remove surrounding quotes
                        value = value.replace(/^['"]|['"]$/g, '');
                    }
                    
                    result[key] = value;
                }
            }
        }
        
        return result;
    }

    markdownToHtml(markdown) {
        if (!markdown) return '';
        
        return markdown
            // Headers
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            // Bold and italic
            .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/gim, '<em>$1</em>')
            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank">$1</a>')
            // Lists
            .replace(/^\s*\d+\.\s+(.*$)/gim, '<li>$1</li>')
            .replace(/^\s*[\-\*]\s+(.*$)/gim, '<li>$1</li>')
            // Code blocks (basic)
            .replace(/```([^`]*)```/gim, '<pre><code>$1</code></pre>')
            .replace(/`([^`]*)`/gim, '<code>$1</code>')
            // Paragraphs
            .replace(/\n\n/gim, '</p><p>')
            .replace(/^(?!<[h|l|p|c])/gim, '<p>')
            .replace(/$/gim, '</p>')
            // Clean up empty paragraphs
            .replace(/<p><\/p>/gim, '')
            .replace(/<p>(<h[1-6]>.*?<\/h[1-6]>)<\/p>/gim, '$1')
            .replace(/<p>(<pre>.*?<\/pre>)<\/p>/gim, '$1')
            // Wrap lists
            .replace(/(<li>.*?<\/li>)/gims, '<ul>$1</ul>')
            .replace(/<\/ul>\s*<ul>/gim, '');
    }

    renderPosts(posts, containerId = 'posts-container') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container with ID '${containerId}' not found`);
            return;
        }

        if (posts.length === 0) {
            container.innerHTML = `
                <div class="no-posts">
                    <p>No posts found yet. <a href="/admin/">Create your first post</a>!</p>
                    <p><small>Make sure you have markdown files in the <code>content/posts</code> folder of your repository.</small></p>
                </div>
            `;
            return;
        }

        // Filter published posts and sort by date
        const publishedPosts = posts
            .filter(post => post.publish === true)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        if (publishedPosts.length === 0) {
            container.innerHTML = `
                <div class="no-posts">
                    <p>No published posts found. <a href="/admin/">Publish your first post</a>!</p>
                    <p><small>Make sure the <code>publish: true</code> field is set in your post's front matter.</small></p>
                </div>
            `;
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

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return dateString; // Return original if parsing fails
            }
            
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

    showError(message, containerId = 'posts-container') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="error">
                    <h3>⚠️ Error Loading Posts</h3>
                    <p>${message}</p>
                    <details>
                        <summary>Troubleshooting</summary>
                        <ul>
                            <li>Make sure your repository is public or you have proper access</li>
                            <li>Check that the <code>content/posts</code> folder exists</li>
                            <li>Verify your posts have proper front matter with <code>---</code></li>
                            <li>Check browser console for detailed error messages</li>
                        </ul>
                    </details>
                    <button onclick="window.contentLoader.init()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button>
                </div>
            `;
        }
    }

    showLoading(containerId = 'posts-container') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="loading">
                    <p>🔄 Loading posts from GitHub...</p>
                    <small>Repository: ${this.owner}/${this.repo}/content/posts</small>
                </div>
            `;
        }
    }

    // Auto-refresh functionality
    startAutoRefresh(intervalMs = 30000) {
        console.log(`Starting auto-refresh every ${intervalMs/1000} seconds`);
        
        const refreshInterval = setInterval(async () => {
            try {
                console.log('Auto-refreshing posts...');
                const posts = await this.loadPosts();
                this.renderPosts(posts);
                
                // Show refresh notification
                this.showRefreshNotification();
            } catch (error) {
                console.error('Auto-refresh error:', error);
                // Don't show error in UI during auto-refresh, just log it
            }
        }, intervalMs);

        // Store interval ID for potential cleanup
        this.refreshInterval = refreshInterval;
    }

    showRefreshNotification() {
        // Create a subtle notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2ecc71;
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            font-size: 0.9rem;
            z-index: 1000;
            transition: opacity 0.3s;
        `;
        notification.textContent = '✓ Posts updated';
        document.body.appendChild(notification);

        // Remove after 2 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            console.log('Auto-refresh stopped');
        }
    }

    async init(containerId = 'posts-container') {
        console.log('Initializing GitHub content loader...');
        this.showLoading(containerId);
        
        try {
            const posts = await this.loadPosts();
            this.renderPosts(posts, containerId);
            
            // Start auto-refresh every 30 seconds
            this.startAutoRefresh(30000);
            
            console.log('✅ Content loader initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Initialization error:', error);
            this.showError(error.message, containerId);
            return false;
        }
    }

    // Manual refresh method
    async refresh() {
        console.log('Manual refresh triggered');
        try {
            this.showLoading();
            const posts = await this.loadPosts();
            this.renderPosts(posts);
            this.showRefreshNotification();
        } catch (error) {
            this.showError(error.message);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing content loader...');
    window.contentLoader = new GitHubContentLoader();
    window.contentLoader.init();
    
    // Add manual refresh button if desired
    const refreshButton = document.createElement('button');
    refreshButton.innerHTML = '🔄 Refresh Posts';
    refreshButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #3498db;
        color: white;
        border: none;
        padding: 0.7rem 1rem;
        border-radius: 25px;
        cursor: pointer;
        font-weight: 500;
        box-shadow: 0 2px 10px rgba(52, 152, 219, 0.3);
        transition: all 0.3s;
        z-index: 1000;
    `;
    
    refreshButton.addEventListener('click', () => {
        window.contentLoader.refresh();
    });
    
    refreshButton.addEventListener('mouseenter', () => {
        refreshButton.style.transform = 'translateY(-2px)';
        refreshButton.style.boxShadow = '0 4px 15px rgba(52, 152, 219, 0.4)';
    });
    
    refreshButton.addEventListener('mouseleave', () => {
        refreshButton.style.transform = 'translateY(0)';
        refreshButton.style.boxShadow = '0 2px 10px rgba(52, 152, 219, 0.3)';
    });
    
    document.body.appendChild(refreshButton);
});