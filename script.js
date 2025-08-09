// Updated loadAllPosts() using posts.json
async function loadAllPosts() {
  try {
    const res = await fetch('/posts.json');
    if (!res.ok) throw new Error("Failed to load posts.json");
    const posts = await res.json();

    // Sort and render (same as your original)
    posts.sort((a, b) => new Date(b.metadata.date) - new Date(a.metadata.date));
    renderPosts(posts);

  } catch (err) {
    console.error("Error loading posts:", err);
    document.getElementById("post-container").innerHTML = `
      <p>Error loading posts. <a href="/tools/generate-posts.html">Regenerate posts.json</a></p>
    `;
  }
}