# Writing changelog entries

A changelog entry announces a shipped change to users. Each entry is a dated
`.mdx` file; the filename date is the title. This reference covers how to *write*
an entry. For setup (folder location, `docs.yml` wiring, RSS, navigation), see
the official docs: https://buildwithfern.com/learn/docs/configuration/changelogs

## File and naming

- Entries go directly in the `changelog/` folder inside `fern/`. The folder must
  be named `changelog` exactly. **No subdirectories** — nested files are silently
  ignored.
- One entry per date, named by date. Supported filename formats: `YYYY-MM-DD`
  (preferred, sorts cleanly), `MM-DD-YYYY`, `MM-DD-YY`. Always use `.mdx` (Fern
  also accepts `.md`, but `.mdx` is the standard and unlocks the component
  library).
- Sort order comes from the **filename date**, not frontmatter. A wrong filename
  date puts the entry in the wrong position.
- The date is the title. **Do not add an h1.**
- If a file already exists for that date, add your feature as a new `##` section
  in it rather than creating a second file.

## Frontmatter tags

Every entry needs a `tags` array. Tags drive the changelog's filtering, so use
specific, descriptive tags users would search for — by product area, feature,
release stage, platform, or impact:

```mdx
---
tags: ["voice-api", "breaking-change"]
---
```

**Reuse existing tags** for consistency before adding a new one:

```bash
grep -rh "^tags:" changelog/ | sort | uniq -c | sort -rn
```

A near-duplicate tag (`auth` when `security` already exists) fragments the
filter.

## Entry format

```mdx
---
tags: ["search"]
---

## Filter search results by section

You can now scope a search to a single section of your docs. Visitors pick a
section from the search bar, and results are limited to pages under it.

- Available on all plans.
- Configured per docs instance.

<Button intent="none" outlined rightIcon="arrow-right" href="/docs/customization/search">Read the docs</Button>
```

- **One `##` per feature.** No h1.
- **Lead with the capability** — "You can now…" — not the implementation.
- **Keep it short:** 2–6 sentences. Bullets for detail lists, not the whole entry.
- **End with a Button** linking to the relevant docs page (recommended).
- For dashboard/UI changes, give the click-path (**Settings** > **Page access**)
  before the Button.

## The docs-link Button

The `href` is a docs **URL path** built from `docs.yml`, not a file path:
`<base-path>/<section-slug>/<page-slug>`.

```mdx
<!-- WRONG: file path on disk -->         href="/changelog/../pages/search/configuration"
<!-- WRONG: guessed from folder names --> href="/docs/search-config/configuration"
<!-- CORRECT: built from docs.yml -->     href="/docs/customization/search"
```

See the **Links** section of `SKILL.md` for how to construct the path (base
path, product slug, frontmatter slugs, `skip-slug`) from this repo's `docs.yml`.

## Voice

Dry and direct. Cut hedges ("just", "simply", "make sure you") and filler ("in
order to", "so that"). At most one em dash per short paragraph.

## Options

Beyond a plain entry, the changelog supports:

- **Overview page** — an `overview.mdx` in the `changelog/` folder renders above
  all entries. `overview.mdx` is a reserved filename, so it is never treated as a
  dated entry.
- **Components are available but avoid them.** `.mdx` entries *can* use Fern's
  component library (`<Note>`, `<Card>`, `<Accordion>`, etc.), but stacked across
  a list of short entries they create visual noise. House rule: prose + the
  `<Button>` only. Reach for another component only when it's genuinely the only
  way to convey something.
- **Tab or section** — the changelog is wired in `docs.yml` either as a tab
  (`tabs: { changelog: { changelog: ./changelog } }`) or as a section
  (`navigation: [ { changelog: ./changelog, title: ..., slug: ... } ]`).
- **RSS feed** — generated automatically; append `.rss` to the changelog path
  (e.g. `https://yourdomain.com/docs/changelog.rss`). No config needed.
- **Per-entry permalinks** — each entry gets `…/changelog/YYYY/M/D` (month and
  day are not zero-padded).

For exact `docs.yml` syntax, see the official docs linked above.

## Gotchas

- **Folder name is exact and flat.** Not `changelogs`, not nested — files in
  subfolders are silently dropped with no error.
- **Slug must be recognized.** `fern check` (`valid-changelog-slug`) errors
  unless the changelog's effective slug is one of: `changelog`, `changelogs`,
  `release-notes`, `releasenotes`, `whats-new`, `whatsnew`.
- **A section changelog can't live inside an `api:` block** in `docs.yml`.
- **Only `tags` is a supported frontmatter field.** `title`, `date`, `hidden`,
  etc. are not — the date comes from the filename. Don't add undocumented keys.
- **The tag filter UI only renders when entries have tags.** No tags, no filter.

## What not to do

- Don't use h1 (`#`) — the date is the title.
- Don't describe implementation details; describe the user benefit.
- Don't invent a tag when an existing one fits.
- Don't write the Button `href` from the file path on disk.
- Don't use components other than the `<Button>` — prose keeps the entry list clean.

## Checklist

Mechanics to verify before considering an entry done:

- [ ] File is in `fern/changelog/`, named with a supported date format, no subfolder.
- [ ] `.mdx` extension.
- [ ] Frontmatter has a `tags` array and no unsupported fields.
- [ ] Tags reused from the existing set where one fits.
- [ ] No h1; each feature is an `##`.
- [ ] Opens with the user capability; 2–6 sentences per feature.
- [ ] Button present per feature, `href` a docs URL path (not a disk path).
- [ ] Dashboard/UI changes include the click-path before the Button.
