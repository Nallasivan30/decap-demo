async function loadPosts(filePaths) {
  try {
    const posts = [];

    for (const path of filePaths) {
      const res = await fetch(path);
      const raw = await res.text();

      // Extract frontmatter & content
      const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/m.exec(raw);
      let metadata = {};
      let content = raw;

      if (match) {
        const yaml = match[1];
        content = match[2];

        // Simple YAML parsing
        yaml.split("\n").forEach(line => {
          const [key, value] = line.split(":").map(s => s.trim());
          if (key) metadata[key] = value?.replace(/^"|"$/g, '');
        });
      }

      // Convert markdown to HTML
      const html = marked.parse(content);

      // Push post HTML to array
      posts.push(`
        <article>
          <h2>${metadata.title || "Untitled"}</h2>
          <small>${metadata.date || ""}</small>
          <div>${html}</div>
        </article>
      `);
    }

    // Insert all posts into page
    document.getElementById("post-container").innerHTML = posts.join("");
    
  } catch (err) {
    console.error("Error loading posts:", err);
  }
}

// Call with multiple files
loadPosts([
  "content/posts/2025-08-09-hello.md",
  "content/posts/another-post.md"
]);
