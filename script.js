async function loadPosts() {
  try {
    const response = await fetch("content/posts/2025-08-09-hello.md");
    const text = await response.text();
    document.getElementById("post-container").innerHTML =
      `<pre>${text}</pre>`;
  } catch (error) {
    console.error("Error loading post:", error);
  }
}

loadPosts();
