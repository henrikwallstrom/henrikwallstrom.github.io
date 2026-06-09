# henrikwallstrom.github.io

Minimal static blog built with [Eleventy](https://www.11ty.dev/).

## Requirements

- Node.js 22 or newer
- npm

## Development

Install dependencies:

```bash
npm ci
```

Run the local development server:

```bash
npm run dev
```

Build the production site:

```bash
npm run build
```

The generated site is written to `_site/`.

## Content

Posts live in `src/posts/`.

Each post uses Markdown with front matter:

```yaml
---
title: Example Post
date: 2026-06-10 12:00:00
summary: Short summary shown on the post list and feed.
tags:
  - example
---
```

Static images live in `images/` and are copied to the same path in the built site.

## Pages

- `/` lists posts.
- `/about/` exists but is intentionally not linked in the main navigation.
- `/feed.xml` is the RSS feed.
- `/sitemap.xml` is the sitemap.
- `/robots.txt` points crawlers to the sitemap.
- `/404.html` is the GitHub Pages not-found page.

## Deployment

GitHub Actions deploys the site to GitHub Pages on pushes to `master`.

Before pushing, run:

```bash
npm run build
```

The custom domain is configured by `CNAME` and copied into `_site/` during the build.
