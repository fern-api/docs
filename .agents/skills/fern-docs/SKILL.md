---
name: fern-docs
description: >-
  Author and edit Fern documentation: MDX pages, navigation, docs.yml config,
  custom components, landing pages, and changelog entries. Use when working in a
  Fern docs repo (a fern/ directory with docs.yml). Routes to a detailed
  reference per task.
---

# Fern docs authoring

Write and edit documentation on a Fern site. `SKILL.md` is the index: follow the
principles below, then read the `references/` file that matches the
task before writing. Don't work from this page alone when a reference exists.

**Scope: this skill governs Fern docs content only** — MDX pages, navigation,
`docs.yml` and related config, snippets, changelog entries, custom components,
and landing pages. It does **not** govern repo governance or tooling files that
happen to live in the same repo, such as `CLAUDE.md`, `AGENTS.md`,
`STYLE-GUIDE.md`, and contributor guides. Never apply the principles below —
"one canonical home," "prefer editing over creating," consolidation — to those
files. Leave them alone unless the user explicitly asks you to edit them.

## Fern resources

Fern's configuration evolves. Look things up rather than guessing.

- **Docs:** https://buildwithfern.com/learn/docs/getting-started/overview.md
  (append `.md` to any docs URL for clean markdown to fetch)
- **Page index:** https://buildwithfern.com/learn/llms.txt
- **MCP server** — connect your agent to Fern's live docs and query it for any
  syntax or behavior you're unsure of. The endpoint works with any MCP client;
  for Claude Code:

  ```bash
  claude mcp add --transport http fern https://buildwithfern.com/learn/_mcp/server
  ```

## Routing

| Task | Read |
|------|------|
| Writing or editing a changelog entry | `references/changelog.md` |
| Setting up a product switcher, adding a product, or refactoring nav into products | `references/products.md` |
| Moving, renaming, or deleting a page, or any edit that changes a published URL | `references/redirects.md` |
| Restricting pages or content by role (RBAC), or wiring docs into an auth method (password, SSO, JWT, OAuth) | `references/authentication.md` |
| Editing the same content across multiple pages, or adding generic/boilerplate content (e.g. "contact support") | `references/snippets.md` |
| Translating pages into another language, adding a language, or updating existing translations (multi-language Fern repo) | `references/translations.md` |

## Core principles

- **Defer to the repo's own conventions.** When a docs repo has an established
  pattern, voice, or structure — a `CLAUDE.md`, a style guide, or just the
  consistent practice of surrounding pages — follow it over the guidance here.
  This skill is the default, not an override.
- **Write what the reader needs to succeed — no more.** Every sentence earns its place.
- **Prefer editing over creating.** Search the repo for a page that already
  covers the topic and update it instead of adding a duplicate.
- **Make minimal, precise edits.** Don't rewrite a page when a paragraph fix will do.
- **Push back when something seems wrong.** Explain why rather than complying silently.
- **Ask when unclear.** Don't fill gaps with assumptions.
- **Never fabricate.** If you don't know a config key or behavior, look it up
  (MCP server or docs) or say so. Don't invent frontmatter or YAML fields.
- **Cross-reference.** When you mention a concept documented elsewhere, link to it
  so readers can find their way.
- **Preserve URLs when they change.** Any edit that moves, renames, or deletes a
  page — or changes a slug, section, or product — can change a published URL.
  When it does, set up [redirects](https://buildwithfern.com/learn/docs/seo/redirects.md)
  from the old path (see `references/redirects.md`) so inbound links and search
  rankings survive.

## Links

Internal links are URL paths derived from **this repo's own `docs.yml` and page
frontmatter** — not file paths on disk or relative paths. Nearly every edit
touches a link, so get this right every time.

A page URL is `<base-path>/<product-slug>/<rest>`:

- **Base path** — the prefix in your docs URL (e.g. `/learn`, `/docs`; may be empty).
- **Product slug** — the product's `slug` in `fern/docs.yml`. Omitted for a
  product with no `slug:` (such as a default single Home product).
- **`<rest>`** — found by step 1 or step 2 below.

To find `<rest>`:

1. **Open the target page and check its frontmatter for `slug:`.** A frontmatter
   slug is **absolute within the product**: it *is* `<rest>` on its own, and it
   replaces the entire section/folder hierarchy. The section's slug does not
   appear. Do not walk the navigation.
2. **Otherwise, walk `docs.yml`** within the product, from section through any
   folders to the page. Each level contributes one slug:
   - Its explicit `slug:` if set.
   - Otherwise auto-derived from the display name: lowercased, spaces to
     hyphens, special characters stripped (so `v3 (Latest)` becomes
     `v-3-latest`). Auto-derivation isn't always obvious — verify, don't assume.
   - In folder-based navigation, a page's slug comes from its **filename**, not
     a display name (`quick-start.mdx` to `quick-start`).
   - **Omit any level with `skip-slug: true`** — it contributes no segment.

Example — page `./pages/ai/overview.mdx` under section "AI features", in product
`docs`, base path `/learn`:

- with frontmatter `slug: ai-ai` → `/learn/docs/ai-ai` (the `ai-features`
  section slug is dropped)
- with no frontmatter slug → `/learn/docs/ai-features/overview` (section
  auto-slug `ai-features` + page auto-slug `overview`)

Section slugs frequently differ from folder names, so never guess the URL from
the directory layout. If you can't resolve a path from `docs.yml` and the page's
frontmatter, say so rather than guessing.

**Anchors** append `#heading`, and only resolve for real `##`/`###` Markdown
headings — not for JSX title props like `<Step title>`, `<Tab title>`,
`<Accordion title>`, or `<Card title>`.

**Not internal links** (leave as-is): external `https://` URLs, image paths
(`./images/...`), snippet includes (`<Markdown src="/snippets/..." />`), and
same-page anchors (`#section`).

## Cross-referencing

When you document new functionality — a new page, or new behavior on an existing
one — related pages usually need a pointer to it, or the new content is hard to
find from where readers actually start. This applies to small edits too, not
just new pages.

- **One canonical home.** The full explanation lives on one page; every other
  page that touches the topic links to it instead of restating it. If you're
  copying more than a sentence or two onto another page, it belongs on the
  canonical page.
- **Find the targets.** Grep the docs for the feature name and one or two related
  keywords, then read each hit and decide whether a pointer is warranted:

  ```bash
  grep -rln "<feature>\|<keyword>" fern --include="*.mdx"
  ```

  Common targets: pages for behavior the feature affects, adjacent feature pages,
  and overview or landing pages.
- **Use the lightest form that works:** an inline link inside an existing
  sentence, then a `<Note>` for a secondary aside, then a new `##` section, then
  a new page. Inline links and Notes add no maintenance surface; new pages and
  sections do.
- **Phrase inline links naturally — never "See [page]."** Put the link on a noun
  phrase already in the sentence, not a tacked-on pointer sentence. Don't wrap a
  lone link in a `<Tip>` whose only job is to host it.
  - Good: "Each request counts against your [rate limit](...), which resets hourly."
  - Bad: "Requests are rate limited. See the [rate limits reference](...) for details."
  - Bad: a standalone `<Tip>` containing only "For more, see [rate limits](...)."
- **Frame by function, not plumbing.** Contrast what each feature does ("X
  decides A; Y decides B"), not that they share a config key or sit in the same
  directory. If the only thing linking two features is the same YAML key, it's
  not worth a cross-reference.
