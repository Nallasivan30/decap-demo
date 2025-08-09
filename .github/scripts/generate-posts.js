const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// CORRECTED PATHS (go up 2 levels from .github/scripts/)
const postsDir = path.join(__dirname, '..', '..', 'content', 'posts');
const outputPath = path.join(__dirname, '..', '..', 'posts.json');

function generatePosts() {
  const postFiles = fs.readdirSync(postsDir).filter(file => file.endsWith('.md'));
  
  const posts = postFiles.map(file => {
    const filePath = path.join(postsDir, file);
    const { data: metadata, content } = matter(fs.readFileSync(filePath, 'utf-8'));
    return { 
      slug: file.replace('.md', ''),
      metadata,
      body: content,
      lastUpdated: new Date().toISOString() 
    };
  });

  fs.writeFileSync(outputPath, JSON.stringify({
    _generatedAt: Date.now(),
    posts
  }, null, 2));
}

generatePosts();