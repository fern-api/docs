# Reusable snippets

A snippet is an `.mdx` file whose content is included into other pages with the
`<Markdown src="..." />` component, so one source renders in many places. Reach
for this reference when you notice either trigger:

- You're **editing the same content across multiple pages** — a sign it should be
  single-sourced into one snippet instead of maintained in parallel.
- You're **adding generic or boilerplate content** that likely already exists
  elsewhere — a "contact support" line, a prerequisites block, a standard
  warning. Check for an existing snippet to reuse before writing it fresh.

It also covers the reverse: pulling content back inline when a snippet is no
longer earning its keep.

Canonical docs: https://buildwithfern.com/learn/docs/writing-content/reusable-snippets.md
(append `.md` to any Fern docs URL for clean markdown to fetch).

## Mechanics

- Snippet files are `.mdx`, conventionally under `fern/snippets/` (any folder in
  the `fern` project works).
- Include one with an **absolute** `src` relative to the `fern` folder:

  ```jsx
  <Markdown src="/snippets/watering-schedule.mdx" />
  ```

  So `fern/snippets/file.mdx` → `src="/snippets/file.mdx"`, and
  `fern/docs/guides/snippets/file.mdx` → `src="/docs/guides/snippets/file.mdx"`.
  The path is the same no matter which page includes it.
- Parameterize with `{{paramName}}` placeholders in the snippet, passed as props
  on include:

  ```mdx
  <Warning>Water your {{plant}} every {{interval}} days.</Warning>
  ```
  ```jsx
  <Markdown src="/snippets/watering.mdx" plant="peace lily" interval="3" />
  ```

A snippet include is **not** an internal link — leave the `src` path as-is; don't
rewrite it like a page URL (see the **Links** section of `SKILL.md`).

## When to use a snippet

The test is *single-sourcing*: the same content appears in two or more places and
must stay identical when it changes. Good fits:

- **Constants** — API limits, prices, version numbers, endpoints.
- **Repeated warnings or notes** that must read the same everywhere.
- **Standardized blocks** — a setup prerequisite, a support footer, a boilerplate
  callout reused across pages.

The win is that one edit propagates everywhere. If editing in one place is
actually what you want, a snippet is the wrong tool.

## When not to use a snippet

- **Used in only one place.** No single-sourcing benefit — it just hides the
  content in another file and makes the page harder to read and edit. Keep it
  inline.
- **The instances should be able to drift.** If two spots happen to say something
  similar but may legitimately diverge later, don't couple them.
- **To avoid scrolling / "tidy up" a long page.** Length isn't a reason to
  extract; reuse is. Use sections and headings for structure instead.
- **The content is so parameterized it's mostly `{{props}}`.** If almost
  everything varies per use, the snippet abstracts nothing — write it inline.

## Moving content out of a snippet

Watch for snippets that have **dropped to a single use** — often the result of an
edit that removed or merged the other references. A one-use snippet has no reason
to exist, so inline it:

1. Confirm the real usage count — grep the repo for the `src` path:

   ```bash
   grep -rn 'src="/snippets/watering.mdx"' fern --include="*.mdx"
   ```

   (Match on whatever path the snippet uses.)
2. If exactly one include remains, paste the snippet's content into that page,
   substituting any `{{params}}` with the literal values from that include's
   props.
3. Delete the now-orphaned snippet file.

Conversely, when you find yourself copying the same block onto a second page,
that's the signal to extract it into a snippet rather than maintaining two copies
— the same canonical-home principle from `SKILL.md`'s cross-referencing guidance.
