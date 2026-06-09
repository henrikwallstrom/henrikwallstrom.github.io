const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const markdownIt = require("markdown-it");

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function headingAnchors(md) {
  md.core.ruler.push("heading_anchors", (state) => {
    const seen = new Map();

    state.tokens.forEach((token, index) => {
      if (token.type !== "heading_open") {
        return;
      }

      const inlineToken = state.tokens[index + 1];
      if (!inlineToken || inlineToken.type !== "inline") {
        return;
      }

      const baseSlug = slugify(inlineToken.content);
      const count = seen.get(baseSlug) || 0;
      seen.set(baseSlug, count + 1);

      const slug = count === 0 ? baseSlug : `${baseSlug}-${count}`;
      token.attrSet("id", slug);

      const linkOpen = new state.Token("link_open", "a", 1);
      linkOpen.attrSet("class", "heading-anchor");
      linkOpen.attrSet("href", `#${slug}`);
      linkOpen.attrSet("aria-label", `Link to ${inlineToken.content}`);

      const text = new state.Token("text", "", 0);
      text.content = "#";

      const linkClose = new state.Token("link_close", "a", -1);
      inlineToken.children.push(new state.Token("text", "", 0));
      inlineToken.children[inlineToken.children.length - 1].content = " ";
      inlineToken.children.push(linkOpen, text, linkClose);
    });
  });
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(syntaxHighlight);

  const md = markdownIt({
    html: true,
    breaks: false,
    linkify: true
  }).use(headingAnchors);
  eleventyConfig.setLibrary("md", md);

  eleventyConfig.addPassthroughCopy({ "images": "images" });
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "favicon.ico": "favicon.ico" });
  eleventyConfig.addPassthroughCopy({ "CNAME": "CNAME" });
  eleventyConfig.addPassthroughCopy({ "apple-touch-icon.png": "apple-touch-icon.png" });
  eleventyConfig.addPassthroughCopy({ "apple-touch-icon-114x114.png": "apple-touch-icon-114x114.png" });
  eleventyConfig.addPassthroughCopy({ "apple-touch-icon-120x120.png": "apple-touch-icon-120x120.png" });
  eleventyConfig.addPassthroughCopy({ "apple-touch-icon-144x144.png": "apple-touch-icon-144x144.png" });
  eleventyConfig.addPassthroughCopy({ "apple-touch-icon-152x152.png": "apple-touch-icon-152x152.png" });
  eleventyConfig.addPassthroughCopy({ "apple-touch-icon-180x180.png": "apple-touch-icon-180x180.png" });
  eleventyConfig.addPassthroughCopy({ "apple-touch-icon-57x57.png": "apple-touch-icon-57x57.png" });
  eleventyConfig.addPassthroughCopy({ "apple-touch-icon-60x60.png": "apple-touch-icon-60x60.png" });
  eleventyConfig.addPassthroughCopy({ "apple-touch-icon-72x72.png": "apple-touch-icon-72x72.png" });
  eleventyConfig.addPassthroughCopy({ "apple-touch-icon-76x76.png": "apple-touch-icon-76x76.png" });
  eleventyConfig.addPassthroughCopy({ "favicon-16x16.png": "favicon-16x16.png" });
  eleventyConfig.addPassthroughCopy({ "favicon-32x32.png": "favicon-32x32.png" });
  eleventyConfig.addPassthroughCopy({ "favicon-96x96.png": "favicon-96x96.png" });
  eleventyConfig.addPassthroughCopy({ "favicon-160x160.png": "favicon-160x160.png" });
  eleventyConfig.addPassthroughCopy({ "favicon-192x192.png": "favicon-192x192.png" });

  eleventyConfig.addWatchTarget("src/assets/css");
  eleventyConfig.addFilter("year", () => new Date().getFullYear());
  eleventyConfig.addFilter("readableDate", (dateObj) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "2-digit"
    }).format(dateObj);
  });
  eleventyConfig.addFilter("htmlDate", (dateObj) => {
    return dateObj.toISOString().slice(0, 10);
  });
  eleventyConfig.addFilter("rfc822Date", (dateObj) => {
    return dateObj.toUTCString();
  });
  eleventyConfig.addFilter("absoluteUrl", (url, base) => {
    return new URL(url, base).href;
  });
  eleventyConfig.addFilter("previousPost", (posts, pageUrl) => {
    const ordered = [...posts].sort((a, b) => a.date - b.date);
    const index = ordered.findIndex((post) => post.url === pageUrl);
    return index > 0 ? ordered[index - 1] : null;
  });
  eleventyConfig.addFilter("nextPost", (posts, pageUrl) => {
    const ordered = [...posts].sort((a, b) => a.date - b.date);
    const index = ordered.findIndex((post) => post.url === pageUrl);
    return index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null;
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes"
    }
  };
};
