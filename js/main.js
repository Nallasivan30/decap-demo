
document.addEventListener('DOMContentLoaded', async function() {
    const postsContainer = document.getElementById('posts-container');
    
    try {
        // Load posts from GitHub repository
        await loadPosts();
    } catch (error) {
        console.error('Error loading posts:', error);
        showError('Failed to load posts. Please try again later.');
    }

    async function loadPosts() {
        try {
            // In a real implementation, you'd fetch from GitHub API
            // For demo purposes, we'll show sample data
            const samplePosts = [
                {
                    title: "Welcome to My Blog",
                    publish: true,
                    date: "2024-01-15T10:00:00Z",
                    body: "# Welcome!\n\nThis is my first blog post created with **Decap CMS**. \n\n## Features\n\n- Easy content management\n- Markdown support\n- Version control with Git\n- Automatic deployment\n\nYou can edit this post through the admin panel at `/admin/`!"
                },
                {
                    title: "How to Use Decap CMS",
                    publish: true,
                    date: "2024-01-10T14:30:00Z",
                    body: "# Getting Started\n\nDecap CMS makes it easy to manage your website content:\n\n1. Go to `/admin/` on your site\n2. Log in with your Netlify Identity account\n3. Create and edit posts using the visual editor\n4. Publish changes directly to your Git repository\n\n## Why Choose Decap CMS?\n\n- **Git-based**: All content is stored in your repository\n- **No database**: Static site generation for better performance\n- **User-friendly**: Non-technical users can easily manage content"
                }
            ];

            renderPosts(samplePosts);
            
        } catch (error) {
            showError('Error fetching posts from repository.');
        }
    }

    function renderPosts(posts) {
        if (posts.length === 0) {
            postsContainer.innerHTML = `
                <div class="no-posts">
                    <p>No posts found. <a href="/admin/">Create your first post</a>!</p>
                </div>
            `;
            return;
        }

        // Filter published posts and sort by date
        const publishedPosts = posts
            .filter(post => post.publish)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        postsContainer.innerHTML = publishedPosts.map(post => `
            <article class="post-card">
                <h3>${escapeHtml(post.title)}</h3>
                <div class="post-meta">
                    📅 ${formatDate(post.date)}
                    <span class="post-published">Published</span>
                </div>
                <div class="post-content">
                    ${markdownToHtml(post.body)}
                </div>
            </article>
        `).join('');
    }

    function showError(message) {
        postsContainer.innerHTML = `<div class="error">${message}</div>`;
    }

    function formatDate(dateString) {
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(dateString).toLocaleDateString('en-US', options);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function markdownToHtml(markdown) {
        // Simple markdown parser for demo
        return markdown
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/gim, '<em>$1</em>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank">$1</a>')
            .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
            .replace(/^- (.*$)/gim, '<li>$1</li>')
            .replace(/\n\n/gim, '</p><p>')
            .replace(/^(?!<[h|l|p])/gim, '<p>')
            .replace(/$/gim, '</p>')
            .replace(/<p><\/p>/gim, '')
            .replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>')
            .replace(/<\/ul>\s*<ul>/gim, '');
    }
});