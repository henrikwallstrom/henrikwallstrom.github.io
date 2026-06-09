const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const markdownIt = require("markdown-it");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(syntaxHighlight);

  const md = markdownIt({
    html: true,
    breaks: false,
    linkify: true
  });
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

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes"
    }
  };
};
