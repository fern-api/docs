# Redirects

Redirects map old URLs to new ones so inbound links and search rankings survive
when a page moves, is renamed, or is deleted. Read this whenever an edit changes
a published URL — moving or renaming a page or its file, changing a `slug:`,
restructuring navigation, adding a product slug, or removing a page.

Canonical docs: https://buildwithfern.com/learn/docs/seo/redirects.md
(append `.md` to any Fern docs URL for clean markdown to fetch).

## When a URL changes

A redirect is needed whenever the path computed by the **Links** section of
`SKILL.md` would change for a page that has already been published. Common
triggers:

- Moving or renaming a page file, or moving it to a different section/folder.
- Setting, changing, or removing a page's frontmatter `slug:`.
- Renaming a section, folder, tab, or version **whose slug is auto-derived from
  its display name** — changing the `title:`/`display-name:` in `docs.yml`
  changes the auto-slug, and thus every URL beneath it. No URL changes if that
  item has an explicit `slug:` (the title is then just a label), or if the
  affected pages set their own absolute frontmatter `slug:`.
- Adding or changing a product `slug:` (prefixes every URL in that product).
- Deleting a page that readers or search engines may still reach.

Compute the old path and the new path per `SKILL.md`. If they differ, add a
redirect from old to new.

## Where redirects go

Default to the top-level `fern/docs.yml`, under a single `redirects:` list — even
in a multi-product or versioned site where navigation is split across several
`.yml` files. Redirects are site-wide, so keeping them in one place is easiest to
reason about.

But check first: if the repo already keeps redirects somewhere else or splits
them by a clear convention (per product, per version), follow that instead of
introducing a second pattern. Grep for `redirects:` to see what's already there.

## Configuration

Add entries under a top-level `redirects:` list.

```yaml
redirects:
  - source: "/old-path"
    destination: "/new-path"
  - source: "/old-folder/path"
    destination: "https://www.example.com/fern"   # external is allowed
```

Per-entry fields:

- **`source`** (required) — the relative path to redirect *from*. No absolute
  URLs, no query parameters.
- **`destination`** (required) — an internal path or a full external `https` URL.
- **`permanent`** — defaults to `true` (308). Set `false` for a temporary (307)
  redirect.

## Pattern matching

Use `:param` to capture a single path segment and `:param*` to capture zero or
more. This preserves nested paths when a whole folder moves:

```yaml
redirects:
  - source: "/old-folder/:slug"      # one segment
    destination: "/new-folder/:slug"
  - source: "/old-folder/:slug*"     # any depth below the folder
    destination: "/new-folder/:slug*"
```

**Order matters.** Redirects are evaluated top-to-bottom and the first match
wins, so list specific paths before broad `:slug*` catch-alls.

## Footguns

- **Don't redirect to the homepage** to handle dead URLs — set
  `hide-404-page: true` instead.
- **Don't redirect between default and versioned URLs by hand** — Fern handles
  the default version's unversioned paths automatically; a manual redirect
  conflicts.
- **Avoid loops.** `source` must not equal `destination`, and chains must not
  circle back (A→B→A).
- **Don't add redirects for paths Fern already resolves.** Only add them for URLs
  that genuinely changed.

## Verify

`fern check` flags missing redirects via its `missing-redirects` rule —
previously-published URLs that no longer resolve. Run it twice:

- **Before** you start, to capture a baseline of what's already flagged. Anything
  it reports now is pre-existing, not something your edit caused.
- **After** your changes, to confirm you haven't introduced new unresolved URLs.
  Every `missing-redirects` warning that wasn't in the baseline is a move you
  made that still needs a redirect.
