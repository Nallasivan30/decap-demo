const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// CORRECTED PATHS (go up 2 levels from .github/scripts/)
const postsDir = path.join(__dirname, '..', '..', 'content', 'posts');
const outputPath = path.join(__dirname, '..', '..', 'posts.json');

function generatePosts() {
  try {
    console.log('Looking for posts in:', postsDir); // Debug log
    
    if (!fs.existsSync(postsDir)) {
      throw new Error(`Posts directory not found: ${postsDir}`);
    }

    const postFiles = fs.readdirSync(postsDir).filter(file => file.endsWith('.md'));
    console.log('Found posts:', postFiles); // Debug log

    const posts = postFiles.map(file => {
      const filePath = path.join(postsDir, file);
      const { data: metadata, content } = matter(fs.readFileSync(filePath, 'utf-8'));
      return {
        slug: file.replace('.md', ''),
        metadata,
        body: content
      };
    });

    fs.writeFileSync(outputPath, JSON.stringify(posts, null, 2));
    console.log('✅ Generated posts.json at:', outputPath);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

generatePosts();