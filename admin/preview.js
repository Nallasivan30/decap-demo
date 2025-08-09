// admin/preview.js
CMS.registerPreviewTemplate("posts", PostPreview);
CMS.registerPreviewStyle("/styles.css"); // Optional: Load your CSS for the preview

function PostPreview({ entry, widgetFor }) {
  // Extract data from the CMS entry
  const title = entry.getIn(["data", "title"]);
  const date = entry.getIn(["data", "date"]);
  const body = widgetFor("body"); // Renders the markdown as HTML

  return (
    `<article>
      <h2>${title || "Untitled"}</h2>
      <small>${date ? new Date(date).toLocaleDateString() : ""}</small>
      <div>${body}</div>
    </article>`
  );
}