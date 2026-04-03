# AGENTS.md

## Link checking

Internal links between documentation pages use **URL paths built from the YAML config**, not file paths on disk or relative paths.

### URL format

```
/learn/{product-slug}/{section-slug}/{page-slug}
```

| Segment | Source | Example |
|---------|--------|---------|
| `/learn` | Base path from `fern/docs.yml` instance URL | Always `/learn` |
| `{product-slug}` | `slug` field on the product in `fern/docs.yml` | `docs`, `sdks`, `dashboard` |
| `{section-slug}` | Section name or `slug` override in the product's YML file | `getting-started`, `ai-features` |
| `{page-slug}` | Page name or `slug` override in the product's YML file | `overview`, `llms-txt` |

The Home product has no slug, so its pages start at `/learn/{section}/{page}`.

### Example

Given `fern/docs.yml`:
```yaml
- display-name: Docs
  path: ./products/docs/docs.yml
  slug: docs
```

And `fern/products/docs/docs.yml`:
```yaml
- section: Getting started
  contents:
    - page: Overview
      path: ./pages/getting-started/overview.mdx
```

The correct link is:
```
/learn/docs/getting-started/overview
```

### Common mistakes

```markdown
<!-- WRONG: relative path -->
[Overview](./getting-started/overview)
[Overview](../getting-started/overview.mdx)

<!-- WRONG: file path on disk -->
[Overview](/products/docs/pages/getting-started/overview)

<!-- WRONG: guessed URL from file path (section slug differs from folder name) -->
[LLMs.txt](/learn/docs/ai/llms-txt)

<!-- CORRECT: URL from YAML config -->
[Overview](/learn/docs/getting-started/overview)
[LLMs.txt](/learn/docs/ai-features/llms-txt)
```

### Steps to construct a link

1. Find the product's `slug` in `fern/docs.yml`.
2. Open the product's YML file (e.g., `fern/products/docs/docs.yml`).
3. Find the target page — check for explicit `slug:` overrides on both the section and the page.
4. If no explicit slug, the slug is auto-derived: lowercased and hyphenated from the display name.
5. Assemble: `/learn/{product-slug}/{section-slug}/{page-slug}`.

### What's fine as-is

- **External URLs**: `https://...` — no change needed.
- **Image paths**: `./images/screenshot.png` — relative paths are correct for images.
- **Snippet includes**: `<Markdown src="/snippets/..."/>` — these use a different resolution mechanism.
- **Same-page anchors**: `#section-name` — these don't need a full path.
- **Anchors on internal links**: `/learn/docs/config/navigation#section-availability` — append `#anchor` to the URL path.

## New pages

The agent directive is now handled automatically via the `agents.page-directive` setting in `docs.yml`. New pages do not need any manual snippet inclusion.
