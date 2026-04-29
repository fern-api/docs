# AGENTS.md

## Core principles

- Write what users need to succeed—no more, no less. Every sentence should earn its place.
- Before creating new content, search the repo for existing pages that already cover the topic. Prefer updating over duplicating.
- Favor minimal, precise edits. Don't rewrite a page when a paragraph fix will do.
- If a proposed change or direction seems wrong, say so and explain why. Good docs come from honest pushback.
- When something is unclear or underspecified, ask before you write. Don't fill gaps with assumptions.
- Never fabricate information. If you don't know something, say so.
- Link between related pages and sections. When you mention a concept that's documented elsewhere, cross-reference it so users can find their way naturally.

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
| `skip-slug: true` | Set on a product, section, or tab | Omits that segment from the URL entirely |

Products, sections, and tabs with `skip-slug: true` — or with no `slug:` field at all (like the Home product in `fern/docs.yml`) — are omitted from the URL. The Home product's pages therefore start at `/learn/{section-slug}/{page-slug}`.

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
3. Walk from the product down to the target page. For each section and the page itself:
   - If it has `skip-slug: true`, omit it from the URL.
   - Otherwise, use its explicit `slug:` if set. Page frontmatter `slug:` takes precedence over `slug:` in the navigation YML.
   - If no explicit slug is set, auto-derive it: lowercased and hyphenated from the display name.
4. Assemble: `/learn/{product-slug}/{section-slug}/{page-slug}`.

### What's fine as-is

- **External URLs**: `https://...` — no change needed.
- **Image paths**: `./images/screenshot.png` — relative paths are correct for images.
- **Snippet includes**: `<Markdown src="/snippets/..."/>` — these use a different resolution mechanism.
- **Same-page anchors**: `#section-name` — these don't need a full path.
- **Anchors on internal links**: `/learn/docs/config/navigation#section-availability` — append `#anchor` to the URL path.

## Changelog entries

Changelog entries live in `fern/products/docs/pages/changelog/` and `fern/products/dashboard/pages/changelog/`. Filename format: `YYYY-MM-DD.mdx`.

### Rules

- Always include `tags` in YAML frontmatter. Pick 1–4 from the existing set (e.g., `api-reference`, `components`, `navigation`, `customization`, `search`, `ai`, `security`, `bug-fix`). Tags are categorical — describe the area, not the feature name.
- Use `##` (h2) for each feature heading. No h1.
- Lead with what the user can now do: "You can now..." or a direct capability statement.
- Keep it short: 2–6 sentences per feature. Bullet points for lists of details.
- End each feature section with a Button linking to the relevant docs page:
```mdx
  <Button intent="none" outlined rightIcon="arrow-right" href="/learn/docs/section/page">Read the docs</Button>
```
- For dashboard entries, include a path to the feature in the UI before the Button.
- Follow the link rules above — Button `href` values use `/learn/...` URL paths from the YAML config.

### Example

```mdx
---
tags: ["security"]
---

## Password-protected pages

You can now restrict access to individual documentation pages with a password. Visitors see a prompt before the page content loads.

To configure this, go to **Settings** > **Page access** in the [Dashboard](https://dashboard.buildwithfern.com/).

<Button intent="none" outlined rightIcon="arrow-right" href="/learn/dashboard/settings/page-access">Read the docs</Button>
```

### What not to do

- Don't use h1 (`#`) — the date serves as the title.
- Don't describe implementation details — focus on user benefit.
- Don't skip the Button CTA.
- Don't invent new tags when an existing one fits.

Prefer existing tags when possible. Common tags include: `api-reference`, `components`, `navigation`, `customization`, `configuration`, `search`, `ai`, `security`, `bug-fix`, `performance`, `writing-content`.

## New component pages

When documenting a new component, follow the structure used by existing component pages
in `fern/products/docs/pages/writing-content/components/`.

### Page structure

1. **Frontmatter**: `title` (component name) and `description` (one sentence starting with a verb).
2. **Intro paragraph**: One or two sentences explaining what the component does and when to use it. Reference the component name in backtick-wrapped JSX format (e.g., `<Button>`).
3. **Usage section** (`## Usage`): A live rendered example in a `<div>`, followed by the equivalent MDX in a code block with `jsx Markdown` syntax.
4. **Variants section** (`## Variants`): One `###` subsection per variant, each with a rendered example and code block. Cover the most common use cases.
5. **Properties section** (`## Properties`): One `<ParamField>` per prop. Include `path`, `type`, `required`, and `default` where applicable.

### Adding to the overview page

Add a `<Card>` to the `<CardGroup>` in the components overview page at
`fern/products/docs/pages/writing-content/components/overview.mdx`.
Insert it in alphabetical order:

```mdx
<Card title="Component name" icon="fa-duotone fa-icon-name" href="/learn/docs/writing-content/components/slug">
  One-line description matching the page's frontmatter description
</Card>
```

### Example to follow

Use `accordion.mdx` or `button.mdx` as a reference — they demonstrate the full pattern including
grouped variants, nested component examples, and complete `<ParamField>` documentation.

## LLM visibility tags

Use `<llms-only>` and `<llms-ignore>` to control what AI agents see vs. what human readers see on the docs site.

### `<llms-only>` — content for AI agents only

Use when content helps an agent execute a task but would clutter the page for human readers:

- Step-by-step instructions that are redundant with a UI walkthrough but useful for an agent following along programmatically
- Prerequisite context like "this endpoint requires authentication via Bearer token" that a human would already know from the page layout
- Explicit cross-references between related pages (e.g., "For rate limit details, see /learn/docs/api-reference/rate-limits")

### `<llms-ignore>` — content for human readers only

Use when content is useful to a human browsing the site but adds noise for an agent:

- Marketing CTAs, signup prompts, promotional callouts
- Decorative content, hero images, or UI-only navigation hints
- Internal comments or TODOs in source files

### Rules

- Don't overuse — most content should be visible to both audiences. Only tag content where the human and agent needs clearly diverge.
- Length depends on shape, not a fixed limit:
  - **Inline blocks** (interleaved with mixed-audience content — e.g., the programmatic equivalent of a UI step, a prerequisite note, or a cross-reference) should stay short, usually a few sentences. If an inline block grows long, it's probably regular content that belongs to both audiences.
  - **Standalone sections** that are entirely agent-oriented (troubleshooting / common errors, architecture overviews, CI recipes) can be longer. Wrap the whole section — heading and body — inside the tag so the human TOC stays clean, and keep the block self-contained rather than referring back to surrounding prose.
- Tutorials are a common use case: the human version might walk through a UI with screenshots, while an `<llms-only>` block can add the equivalent curl command or config snippet that an agent can execute directly.

### Example to follow

See `fern/products/docs/pages/getting-started/quickstart.mdx` for a working example of using `<llms-only>` blocks to make a tutorial executable for agents alongside the human-readable version.