# AGENTS.md

## Link checking

Links in files in this repository use **URLs, not file paths**. The URL for a page is determined by the YAML config hierarchy, not by the file's location on disk.

### How URLs are constructed

```
https://buildwithfern.com/learn/{product-slug}/{section-slug}/{page-slug}
```

1. **Base**: All URLs start with `/learn` (defined in `fern/docs.yml` instance URL).
2. **Product slug**: Each product in `fern/docs.yml` has a `slug` (e.g., `slug: docs`, `slug: sdks`). The Home product has no slug.
3. **Section/page slugs**: Defined in the product's own YML file (e.g., `fern/products/docs/docs.yml`). If a page or section has an explicit `slug:` field, use that. Otherwise, the slug is auto-derived from the page name (lowercased, hyphenated).

### Example

Given this in `fern/docs.yml`:
```yaml
- display-name: Docs
  path: ./products/docs/docs.yml
  slug: docs
```

And this in `fern/products/docs/docs.yml`:
```yaml
- section: Getting started
  contents:
    - page: Overview
      path: ./pages/getting-started/overview.mdx
```

The file `fern/products/docs/pages/getting-started/overview.mdx` has the URL:
```
/learn/docs/getting-started/overview
```

**NOT** `/learn/products/docs/pages/getting-started/overview`.

### When adding or checking links

- Do NOT assume the URL matches the file path.
- Look up the product's `slug` in `fern/docs.yml`.
- Look up the section and page slugs in the product's YML file (check for explicit `slug:` overrides).
- Example: `fern/products/docs/pages/ai/llms-txt.mdx` with section slug `ai-features` becomes `/learn/docs/ai-features/llms-txt`, not `/learn/docs/ai/llms-txt`.
