---
name: cross-references
description: >
  TRIGGER when: documenting new functionality — whether on a new page or as new behavior added
  to an existing page. Examples: a new feature gets its own page; an existing page gains a new
  setting, mode, or capability; a feature has touchpoints in other product areas (dashboard
  settings, search behavior, AI scope, etc.). Also trigger when the user asks "where else
  should this be linked?", "how do I cross-reference X?", or "make sure this is covered in
  <area>".
  DO NOT TRIGGER for: copy edits, restructures that don't add functionality, link URL fixes
  (use the `links` skill), or content with no related touchpoints elsewhere.
---

# Cross-referencing pages

When new functionality is documented — whether on a new page or as new behavior added to an existing page — related pages elsewhere in the docs usually need pointers to it. Without those pointers, the canonical content is hard to discover from the angles a reader is most likely to come in from.

## Pick a canonical home, reference from elsewhere

One page owns the full explanation; every other page that touches the topic links *to* it rather than restating it.

- Walkthroughs, setup steps, and concept explanations live on the canonical page.
- Reference pages get a sentence + link, not a paragraph of duplicated detail.
- If you find yourself copying more than a sentence or two into a reference page, the content probably belongs on the canonical page (or in a shared section).

## Find the targets

Whenever you add new functionality, sweep the docs for related touchpoints before assuming you're done:

```bash
grep -rln "<feature-name>\|<related-keyword>" fern/products --include="*.mdx"
```

Then read each candidate to find the natural insertion point. Common targets:

- **Behavior pages** — e.g., a feature affects search → cross-link from `customization/search.mdx`.
- **Dashboard pages** — e.g., a feature has dashboard settings → cross-link from `dashboard/pages/`.
- **Adjacent feature pages** — e.g., Ask Fern, RBAC, localization, when scope or behavior overlaps.
- **Overview / landing pages** — sometimes a card on a hub page is warranted; usually only when the feature is a top-level setup step, not a configuration detail.

## Pick the form

| Form | Use when |
|------|----------|
| Inline sentence in an existing paragraph | The reference fits a list of similar items already on the page (e.g., "for sites with X, Y, or [new thing]"). |
| `<Note>` callout | The reference is a real but secondary consideration that would distract from the main flow if inlined. |
| New section (`##`) | The target page genuinely needs to document the feature from its own angle (e.g., dashboard config for the feature). |
| New page | Only if the feature has substantial standalone content that doesn't fit elsewhere. |

Default to the lightest form that works. New pages and new sections add maintenance surface; inline sentences and Notes don't.

## Bidirectional links

Reference pages always link *to* canonical. Linking back from canonical to a reference page is optional — only do it when the reference page has additional detail the canonical page doesn't cover (e.g., dashboard click-paths). Most cross-references are one-way.

## Anchor links: heading-only

Internal anchors only resolve for `##` / `###` headings. Things that look like headings but aren't:

- `<Step title="...">` inside `<Steps>` — JSX prop, no anchor generated.
- `<Tab title="...">`, `<Accordion title="...">`, `<Card title="...">` — same.

If you want to deep-link to a step or tab, add a real `##` heading nearby, or link to the page without an anchor and let the reader scroll.

## Constructing the link itself

For the URL syntax (slugs, `/learn/...` paths, internal-link rules), use the `links` skill.

## Sweep checklist

After documenting any new functionality, before declaring the work done:

1. Grep for the feature/setting name and 1–2 related keywords across `fern/products/**/*.mdx`.
2. For each hit on a different page, decide: is a cross-reference warranted?
3. For each warranted cross-ref, pick the lightest form that fits.
4. If the functionality has dashboard settings, verify `fern/products/dashboard/pages/` covers them — usually folded into the most relevant existing page, not a new page.
5. Verify every link you wrote (slug correct, anchor exists if used).
