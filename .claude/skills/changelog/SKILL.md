---
name: changelog
description: >
  TRIGGER when: creating a new changelog entry or modifying an existing one in
  fern/products/docs/pages/changelog/ or fern/products/dashboard/pages/changelog/.
  DO NOT TRIGGER for: changelog entries in other directories (sdks, cli-api-reference, etc.)
  as those are generated from a different repo.
---

# Writing changelog entries

## File basics

- **Location**: `fern/products/docs/pages/changelog/` or `fern/products/dashboard/pages/changelog/`
- **Filename**: `YYYY-MM-DD.mdx` (e.g., `2026-02-28.mdx`)
- **Format**: MDX (Markdown with JSX components)
- All entries go directly in the `changelog/` folder — no subdirectories.

## Frontmatter

All changelog entries should include tags in YAML frontmatter.

```yaml
---
tags: ["tag1", "tag2"]
---
```

### Available tags

Prefer existing tags when possible. New tags are fine if none of the existing ones fit.

| Tag | Use for |
|-----|---------|
| `api-reference` or `api-references` | API reference features |
| `components` | UI component additions/changes |
| `navigation` | Navigation and sidebar changes |
| `customization` | Styling, theming, CSS customization |
| `configuration` | Config file changes |
| `docs.yml` | Changes involving `docs.yml` config |
| `generators.yml` | Changes involving `generators.yml` config |
| `writing-content` | Markdown/content authoring features |
| `content-authoring` | Content creation tools |
| `search` | Search functionality |
| `ai` | AI-related features |
| `seo` | SEO improvements |
| `local-development` | Local dev server features |
| `performance` | Performance improvements |
| `accessibility` | Accessibility improvements |
| `security` | Security features |
| `bug-fix` | Bug fixes |

Pick 1–4 tags that best describe the change. Prefer fewer, more specific tags.

## Writing style

- **Heading**: Use `##` (h2) for each feature. No h1 — the date is the implicit title.
- **Opening line**: Lead with what the user can now do. Start with "You can now..." or a direct statement of the capability.
- **Tone**: Professional, friendly, concise. Focus on user benefit, not implementation details.
- **Length**: Keep entries short — typically 2–6 sentences per feature. Use bullet points for lists of details.
- **"Learn more" link**: End with a link to the relevant docs page using the `/learn/...` URL format (see `AGENTS.md` link rules).
- **Dashboard CTA**: Dashboard entries often include a path to the feature: "To get started, go to **Settings** > **Feature** in the [Dashboard](https://dashboard.buildwithfern.com/)."

## Structure template

### Docs entry

```mdx
---
tags: ["relevant-tag"]
---

## Feature name

One or two sentences explaining what users can now do and why it matters.

Optional details:
- Bullet point 1
- Bullet point 2

Learn more about [feature name](/learn/docs/section/page).
```

### Dashboard entry

```mdx
---
tags: ["relevant-tag"]
---

## Feature name

One or two sentences explaining what users can now do.

[Learn more](/learn/dashboard/section/page) about feature name. To get started, go to **Menu** > **Option** in the [Dashboard](https://dashboard.buildwithfern.com/).
```

## Components you can use

- `<Frame>` with `<img>` — for screenshots
- `<iframe>` — for embedded content like PDFs
- `<Tabs>` and `<Tab>` — for alternative views
- `<Note>`, `<Warning>` — for callouts
- Code blocks with language and optional `title` — for config examples
