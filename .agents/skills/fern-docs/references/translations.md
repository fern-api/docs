# Translations

Fern **hosts** multilingual docs but does **not** translate them. It renders a
language switcher, serves each locale under its own URL prefix, and falls back to
the default language for any page a locale hasn't translated yet — so partial
coverage is safe and you never have to translate everything at once. The actual
translating is the job here: produce per-locale copies of the source pages and a
navigation overlay, following the rules below.

Read this whenever you add a language, translate or re-translate pages, or update
existing translations after the source language changed.

Canonical docs: https://buildwithfern.com/learn/docs/content/localization.md
(append `.md` to any Fern docs URL for clean markdown to fetch). When a config
key or behavior here is unclear, query the Fern MCP server rather than guessing.

## How Fern translations work

- **Default (source) language** is authored in place: `fern/docs.yml` plus the
  `docs/` pages it points to. Exactly one language in the `translations:` list is
  marked `default: true` — that's the source everything is translated *from*.
- **Each other locale mirrors the source tree** under `fern/translations/{lang}/`,
  keeping the **same relative paths**: source `docs/pages/X.mdx` →
  `translations/{lang}/docs/pages/X.mdx`. A locale folder also carries its own
  `translations/{lang}/docs.yml` — the **navigation overlay** that supplies
  translated sidebar/tab labels.
- **A page's translated title lives in its translated MDX frontmatter**
  (`title:`, and `sidebar-title:` if the sidebar label differs from the page
  title), *and* the matching label appears in the overlay `docs.yml`. Translate
  both; keep them consistent.
- **Slugs (URLs) are inherited from the source locale**, not re-derived from the
  translated title. A page titled `Surcharge` → `Zuschlag` keeps the slug
  `surcharge` in every locale. **Never translate or re-derive a slug** — doing so
  would fork the URL per language and break cross-locale links and SEO.
- **Untranslated pages fall back** to the default language automatically. You do
  not create placeholder files; you simply don't have a locale file yet.

> When the translate recipe invokes you, it hands you a **manifest** produced by a
> deterministic repo scan — the source language, the target locales, the exact
> source→locale file map with each page's status (translated / stale / missing),
> and the glossary path. Trust the manifest; you don't need to rediscover this.
> The steps below explain how that manifest is derived (and are your fallback if
> you ever work a repo without one).

## Step 1 — Discover the translation targets

Read the **root `fern/docs.yml`** and find the `translations:` block:

```yaml
translations:
  - lang: en
    default: true      # the source language — translate FROM this
  - lang: it
  - lang: de
  - lang: fr
  - lang: el
  - lang: "no"         # MUST be quoted — see the "no" gotcha below
```

The target locales are every entry without `default: true`. Do not infer
languages from existing `translations/` folders alone — the `docs.yml` list is
authoritative, and a folder may exist for a locale that was removed, or be
missing for a newly added one.

### The `"no"` (Norwegian) gotcha

YAML parses bare `no`, `yes`, `on`, `off`, `true`, `false` as booleans. The
Norwegian locale code `no` **must be quoted** (`lang: "no"`) anywhere it appears
as a YAML *value*, or it silently becomes the boolean `false` and the language
breaks. The `translations/no/` directory name is fine unquoted (it's a path, not
YAML). When you emit any YAML, quote `"no"` as a value and quote any other value
that is a bare reserved word.

## Step 2 — Inventory what needs translating

For each target locale, the work is two artifacts:

1. **Page content** — one mirrored MDX file per source page under
   `translations/{lang}/`. Translate frontmatter `title`, `description`,
   `sidebar-title`, and the prose/body per the do-not-translate rules below.
2. **Navigation overlay** — `translations/{lang}/docs.yml` carrying the
   translated labels for everything the sidebar shows: each `tab` `display-name`,
   each `section` name, and each `page` label.

Read the root `docs.yml` `navigation:` to enumerate every label that needs an
overlay translation, and `tabs:` for the tab display names.

## Step 3 — Detect the existing overlay style and coverage

A repo's overlay `docs.yml` files follow **one of two styles**. Detect which the
repo already uses and match it; do not mix styles within a repo.

**Path-repeating** (robust; preferred for new overlays). Every `page:` repeats
the source `path:`, so each entry is matched to its source page explicitly:

```yaml
- section: Integrazione web
  contents:
    - page: Panoramica dell'integrazione web
      path: docs/pages/integration-options/web-integration/web-integration.mdx
```

**Label-only** (terse). Entries carry only the translated label and **no `path:`**;
Fern matches each entry to the source page **positionally** (by `pageId`):

```yaml
- section: Web-Integration
  contents:
    - page: Web-Integration im Überblick
```

Because label-only relies on position, its overlay **must keep the exact same
navigation structure and order as the source** — same tabs, same sections, same
page count and sequence. Adding, removing, or reordering an entry silently
misaligns every page after it. Path-repeating is immune to this, which is why
it's the safer style to generate when a repo has no established convention.

**Slugs in overlays:** because slugs inherit from source, you do **not** need to
pin `slug:` in either style (path-repeating overlays here carry none). Some
hand-authored label-only overlays pin the *source* slug defensively
(`slug: surcharge`) — that's harmless, but only ever the source slug, never one
derived from the translated label.

**`viewers:` in overlays:** do **not** repeat `viewers:` / RBAC gating in an
overlay. Visibility is inherited from the source navigation through the
structural match. (The "never drop `viewers:`" rule applies to editing *source*
files, not overlays.)

**Coverage:** compare the set of source pages against the files already present
under `translations/{lang}/`. Pages missing there are untranslated (they fall
back to default). When translating after a source change, translate only the
pages whose source changed plus any not yet covered — don't re-translate
unchanged pages.

### The mechanical mapping

For every source page and every target locale:

```
docs/pages/<...>.mdx   →   translations/<lang>/docs/pages/<...>.mdx
```

The relative path is **identical**; only the `translations/<lang>/` root differs.
Never rename, re-slug, or restructure on the way across.

## Do-not-translate rules

Translate meaning, preserve mechanics. **Translate:** prose and body text;
frontmatter `title`, `description`, `sidebar-title`; navigation labels (tab
`display-name`, `section`, `page`); alt text; and the visible child text and
human-readable **prop values** of MDX components (e.g. a `<Card title="...">`
title).

**Preserve verbatim — never translate:**

- Fenced code blocks and inline `` `code` ``, including comments and string
  literals inside them (translating a code comment is acceptable only if the
  surrounding pages clearly do so; default to leaving code untouched).
- API identifiers: endpoints, parameters, fields, enum values, error codes,
  HTTP methods, status codes.
- MDX/JSX **component names and prop *names*** — translate prop *values* and child
  text, never the tag or attribute key. `<Note>` stays `<Note>`; `title=` stays
  `title=`.
- UPPERCASE placeholders and template tokens: `<YOUR_API_KEY>`, `{{merchantId}}`,
  `:param`.
- URLs, link targets, anchors (`#section`), and image/asset paths.
- Frontmatter `slug`, `path`, `icon`, `viewers`, and any other non-display key.
- Numbers, units, currency codes, and dates unless the surrounding locale
  convention clearly localizes them.

When in doubt whether a token is content or mechanics, preserve it.

## Per-repo glossary

Fern has no native glossary, so for cross-page consistency build one **per repo**:
a short list of source terms that must render a fixed way in every locale (or
stay untranslated everywhere). It exists so the same term never comes out three
different ways across a docs site — most commonly product names, company and
partner names, and other proper nouns that should stay verbatim.

**Discover it from the repo, don't hardcode it.** Scan the source docs for
recurring brand/proper nouns and the product's own house terminology; those are
the glossary. When a preferred rendering for a term isn't obvious, default to
keeping it verbatim rather than guessing a translation.

**Format** — a YAML list; each entry is a source term plus either `keep: true`
(never translate, all locales) or explicit per-locale renderings:

```yaml
terms:
  - term: "<ProductName>"      # product/brand name — identical in every locale
    keep: true
  - term: "<house-term>"       # a term with a fixed agreed translation
    translations:
      it: "<it rendering>"
      de: "<de rendering>"
```

Keep it in the repo at `fern/translations/glossary.yml` so it lives beside the
content it governs and is reviewed in the same PRs (follow an existing location
if the repo already has one). Pass it into **every** page's translation.

## Writing the output

- **Write each translated page** to its locale path — `translations/{locale}/`
  plus the source page's relative path, unchanged.
- **Update the navigation overlay** (`translations/{locale}/docs.yml`) for any
  new or renamed entry, matching that locale's existing overlay style. Keep its
  structure and order aligned with the source nav, and never add or drop
  `viewers:` — gating is inherited (a gated page must stay gated in every
  language).
- **Remove orphans.** When a source page was deleted or renamed, delete the
  matching `translations/{locale}/…` file in every locale and its overlay nav
  entry. The manifest lists these under "remove (source page deleted/renamed)".
- **Partial coverage is safe.** You don't have to translate everything in one
  pass — untranslated pages fall back to the default language. Translate what
  the manifest flags and leave the rest.
- **Summarize in the PR description** what changed per locale: pages added,
  updated, and removed, and any locale still missing pages — so a reviewer can
  see coverage at a glance.

## Footguns

- **Don't translate slugs or paths.** URLs are inherited; re-deriving them per
  locale forks every link.
- **Don't reorder or drop nav entries in a label-only overlay** — positional
  matching breaks silently for every page after the change.
- **Don't add `viewers:` to overlays** — gating is inherited; repeating it risks
  drift from the source.
- **Quote `"no"`** (and other reserved words) as YAML values.
- **Don't create empty placeholder files** for untranslated pages — let Fern fall
  back to the default language.
- **Don't mix overlay styles** within one repo.
- **Don't re-translate unchanged pages** on an incremental update — only changed
  or not-yet-covered pages.

## Verify

- Run `fern check` — it validates that overlay paths resolve and the config is
  well-formed. Capture a baseline before your changes so pre-existing warnings
  aren't mistaken for new ones.
- Spot-check that translated page slugs match their source (open the source and
  translated frontmatter side by side — slugs identical, titles translated).
- Confirm no glossary term appears untranslated-but-should-be or
  translated-but-should-be-kept by grepping the new locale files for each
  `keep: true` term and each source term that has a fixed rendering.
