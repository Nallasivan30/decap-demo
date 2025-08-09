async function loadPosts() {
  try {
    const res = await fetch(`/posts.json?t=${new Date().getTime()}`);
    const posts = await res.json();
    
    posts.sort((a, b) => new Date(b.metadata.date) - new Date(a.metadata.date));
    
    document.getElementById("post-container").innerHTML = posts.map(post => `
      <article>
        <h2>${post.metadata.title}</h2>
        <time>${new Date(post.metadata.date).toLocaleDateString()}</time>
        <div>${marked.parse(post.body)}</div>
      </article>
    `).join('');
  } catch (err) {
    console.error("Failed to load posts:", err);
    document.getElementById("post-container").innerHTML = `
      <p>Posts loading failed. Retrying soon...</p>
    `;
    setTimeout(loadPosts, 3000); // Retry after 3 seconds
  }
}

document.addEventListener('DOMContentLoaded', loadPosts);