CMS.registerPreviewStyle("/admin/styles.css");

function PostPreview({ entry, widgetFor }) {
  return CMS.h("article", null,
    CMS.h("h1", null, entry.getIn(["data", "title"])),
    CMS.h("p", null, entry.getIn(["data", "date"])),
    CMS.h("div", { dangerouslySetInnerHTML: { __html: widgetFor("body") } })
  );
}

CMS.registerPreviewTemplate("posts", PostPreview);
