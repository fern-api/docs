# AGENTS.md

## Core principles

- Write what users need to succeed—no more, no less. Every sentence should earn its place.
- Before creating new content, search the repo for existing pages that already cover the topic. Prefer updating over duplicating.
- Favor minimal, precise edits. Don't rewrite a page when a paragraph fix will do.
- If a proposed change or direction seems wrong, say so and explain why. Good docs come from honest pushback.
- When something is unclear or underspecified, ask before you write. Don't fill gaps with assumptions.
- Never fabricate information. If you don't know something, say so.
- Link between related pages and sections. When you mention a concept that's documented elsewhere, cross-reference it so users can find their way naturally.

## Voice

Keep prose dry and direct. State requirements and behavior plainly.

- **Cut hedges and second-person nudges.** "just", "simply", "make sure you", "you'll want to". Prefer "X requires Y" over "make sure you have Y so you can do X".
- **Cut connective filler.** "so that", "in order to", "be sure to" when a flat sentence works.
- **Avoid em dash overuse.** At most one em dash per short paragraph. Before reaching for a second dash, try a colon (for a list or expansion) or parentheses (for an aside). Multiple dashes in close succession read as AI-generated.
- **No conversational framing in callouts and step descriptions.** "Localization requires the latest CLI version" beats "Localization is under active development, so make sure you're on the latest CLI before configuring it."

## Callouts

Before adding any callout — `<Note>`, `<Warning>`, `<Tip>`, `<Info>`, or similar — first evaluate whether the information integrates cleanly into the surrounding prose. Prose is the default; a callout is the exception. This check applies to every callout, not just when one would end up next to another.

Reach for a callout only when the information is a genuine aside: a real but secondary consideration that would break the main flow if inlined. If the content is part of the narrative — the reason an instruction matters, a consequence of a step, a condition on the thing just stated — it belongs in the prose that makes that point.

- If a callout explains *why* an instruction matters, merge it into the sentence that gives the instruction.
- If a callout restates or qualifies a nearby statement, fold it into that statement.
- Never split one idea across a sentence and a callout, or across two callouts.

**Never stack two callouts back-to-back.** A callout must not be immediately adjacent to another callout — they need body prose between them. When two would end up adjacent, at least one of them almost always fails the integration check above: inline it. If two genuinely separate asides remain, keep only the stronger one as a callout.

A single well-chosen callout earns attention; a callout that could have been a sentence dilutes it, and two side by side cancel each other out.

## Link checking

Internal links between documentation pages use **URL paths built from the YAML config**, not file paths on disk or relative paths.

**Before writing any internal link, open the target product's `docs.yml` and walk from the product slug down to the page.** Directory paths on disk are not a reliable hint — folders can be absent from the URL, and section slugs frequently differ from folder names.

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

<!-- WRONG: includes folder segments that aren't part of any docs.yml section -->
[Rich media](/learn/docs/component-library/writing-content/markdown-media)

<!-- CORRECT: URL from YAML config -->
[Overview](/learn/docs/getting-started/overview)
[LLMs.txt](/learn/docs/ai-features/llms-txt)
[Rich media](/learn/docs/writing-content/markdown-media)
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

## Cross-referencing

When new functionality is documented — whether on a new page or as new behavior added to an existing page — related pages elsewhere in the docs usually need pointers to it. Without those pointers, the canonical content is hard to discover from the angles a reader is most likely to come in from.

### Pick a canonical home

One page owns the full explanation; every other page that touches the topic links *to* it rather than restating it.

- Walkthroughs, setup steps, and concept explanations live on the canonical page.
- Reference pages get a sentence + link, not a paragraph of duplicated detail.
- If you find yourself copying more than a sentence or two into a reference page, the content probably belongs on the canonical page.

### Find the targets

Sweep the docs for related touchpoints before assuming you're done:

```bash
grep -rln "<feature-name>\|<related-keyword>" fern/products --include="*.mdx"
```

Then read each candidate to find the natural insertion point. Common targets:

- **Behavior pages** — e.g., a feature affects search → cross-link from `customization/search.mdx`.
- **Dashboard pages** — e.g., a feature has dashboard settings → cross-link from `dashboard/pages/`.
- **Adjacent feature pages** — e.g., Ask Fern, RBAC, localization, when scope or behavior overlaps.
- **Overview / landing pages** — sometimes a card on a hub page is warranted; usually only when the feature is a top-level setup step, not a configuration detail.

### Pick the form

| Form | Use when |
|------|----------|
| Inline sentence in an existing paragraph | The reference fits a list of similar items already on the page (e.g., "for sites with X, Y, or [new thing]"). |
| `<Note>` callout | The reference is a real but secondary consideration that would distract from the main flow if inlined. |
| New section (`##`) | The target page genuinely needs to document the feature from its own angle (e.g., dashboard config for the feature). |
| New page | Only if the feature has substantial standalone content that doesn't fit elsewhere. |

Default to the lightest form that works. New pages and new sections add maintenance surface; inline sentences and Notes don't.

### Phrase inline links naturally

When the form is inline (the common case), put the link on a natural noun phrase inside the sentence that's already making the point. Don't append a "see [page]" sentence, and don't wrap a one-line pointer in a standalone `<Tip>` whose only job is to host the link.

- Good: "Fern emits a set of [analytics events](/learn/docs/integrations/analytics/events) and forwards them to your providers."
- Bad: "Fern emits events. See the [analytics events reference](/learn/docs/integrations/analytics/events) for the list."
- Bad: A standalone `<Tip>` containing only "For more, see [analytics events reference](/learn/...)."

Reserve `<Tip>` and `<Card>` callouts for genuinely orthogonal pointers — a tutorial, a related concept that isn't part of the current narrative — not as wrappers for a link that already belongs in the prose.

### Frame by function, not by plumbing

Lead the cross-reference with what each feature *does* and how they complement or differ. Don't headline the connection with shared config infrastructure — same YAML key, sibling files in the same directory, same lifecycle.

- Good: "X decides A; Y decides B." Contrast on function.
- Bad: "Y is also configured under the same `agents` key." Contrast on plumbing.

If the only thing linking two features is that they live in the same key, that's not a cross-reference worth writing. Config mechanics belong on the page that is itself about configuration.

### Bidirectional links

Reference pages always link *to* canonical. Linking back from canonical to a reference page is optional — only do it when the reference page has additional detail the canonical page doesn't cover (e.g., dashboard click-paths). Most cross-references are one-way.

### Anchor links

Internal anchors only resolve for `##` / `###` headings. Things that look like headings but aren't:

- `<Step title="...">` inside `<Steps>` — JSX prop, no anchor generated.
- `<Tab title="...">`, `<Accordion title="...">`, `<Card title="...">` — same.

If you want to deep-link to a step or tab, add a real `##` heading nearby, or link to the page without an anchor and let the reader scroll.

### Sweep checklist

After documenting any new functionality, before declaring the work done:

1. Grep for the feature/setting name and 1–2 related keywords across `fern/products/**/*.mdx`.
2. For each hit on a different page, decide: is a cross-reference warranted?
3. For each warranted cross-ref, pick the lightest form that fits.
4. Frame each cross-ref by what each feature does, not by shared config keys or directory structure.
5. If the functionality has dashboard settings, verify `fern/products/dashboard/pages/` covers them — usually folded into the most relevant existing page, not a new page.
6. Verify every link you wrote — see *Link checking* above for URL construction.

## Changelog entries

Changelog entries live in `fern/products/docs/pages/changelog/` and `fern/products/dashboard/pages/changelog/`. Filename format: `YYYY-MM-DD.mdx`.

### Rules

- Every entry needs tags. Place `<ChangelogTags>` directly under each `##` heading to tag that entry individually. For bullet-point-only files without `##` headings (rare legacy format), frontmatter `tags` is acceptable.
- Pick 1–4 tags from the existing set (e.g., `api-reference`, `components`, `navigation`, `customization`, `search`, `ai`, `security`, `bug-fix`). Tags are categorical — describe the area, not the feature name.
- Use `##` (h2) for each feature heading. No h1.
- Lead with what the user can now do: "You can now..." or a direct capability statement.
- Keep it short: 2–6 sentences per feature. Bullet points for lists of details.
- End each feature section with a Button linking to the relevant docs page. When the feature is documented in a specific section of a page, link to that section anchor rather than the page top:
```mdx
  <Button intent="none" outlined rightIcon="arrow-right" href="/learn/docs/section/page#feature-section">Read the docs</Button>
```
- For dashboard entries, include a path to the feature in the UI before the Button.
- Follow the link rules above — Button `href` values use `/learn/...` URL paths from the YAML config.

### Example

```mdx
## Password-protected pages

<ChangelogTags>security</ChangelogTags>

You can now restrict access to individual documentation pages with a password. Visitors see a prompt before the page content loads.

To configure this, go to **Settings** > **Page access** in the [Dashboard](https://dashboard.buildwithfern.com/).

<Button intent="none" outlined rightIcon="arrow-right" href="/learn/dashboard/settings/page-access">Read the docs</Button>
```

When a single file holds multiple releases under separate headings, each heading gets its own `<ChangelogTags>`:

```mdx
## New dashboard analytics

<ChangelogTags>integrations</ChangelogTags>

Track page views and API usage from the dashboard.

<Button intent="none" outlined rightIcon="arrow-right" href="/learn/docs/getting-started/analytics">Read the docs</Button>

## Bug fixes

<ChangelogTags>api-reference, bug-fix</ChangelogTags>

Resolved an issue where SDK snippets failed to render for paginated endpoints.

<Button intent="none" outlined rightIcon="arrow-right" href="/learn/docs/api-reference/snippets">Read the docs</Button>
```

`<ChangelogTags>` accepts comma-separated children (above) or a `tags` prop: `<ChangelogTags tags={["api-reference", "bug-fix"]} />`.

### What not to do

- Don't use h1 (`#`) — the date serves as the title.
- Don't describe implementation details — focus on user benefit.
- Don't skip the Button CTA.
- Don't invent new tags when an existing one fits — this applies to `<ChangelogTags>` as much as frontmatter. A one-off tag fragments the filter bar.
- Don't tag by feature name (`changelog`, `dark-mode`). Tag by area (`navigation`, `customization`).

Prefer existing tags when possible. Common tags include: `ai`, `api-reference`, `bug-fix`, `components`, `customization`, `deprecated`, `developer-tools`, `docs.yml`, `frontmatter`, `generators.yml`, `integrations`, `local-development`, `navigation`, `performance`, `search`, `security`, `seo`, `writing-content`.

Retired tags (do not use): `configuration` (too broad), `ai-features` (use `ai`), `fern-editor` (use `developer-tools`), `fern-check` (use `developer-tools`).

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