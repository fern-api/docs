# Products and the product switcher

A product switcher lets one docs site host multiple products, each with its own
`navigation`, `tabs`, `versions`, and API references. Use this when setting up
product switching, adding a product to an existing switcher, or refactoring a
single-product site into product format.

**Prerequisite:** products are a Team/Enterprise feature. If the site isn't on
one of those plans, the switcher won't render — direct the user to
support@buildwithfern.com rather than debugging config.

Canonical docs: https://buildwithfern.com/learn/docs/configuration/products.md
(append `.md` to any Fern docs URL for clean markdown to fetch).

## The model

- Each **internal** product is a `.yml` file in `fern/products/` that holds that
  product's `navigation` (and `tabs`, if used).
- Each product is registered in the top-level `fern/docs.yml` under a `products:`
  list.
- The top-level `docs.yml` holds **no** `navigation:` or `tabs:` of its own once
  products exist — that config lives in the product files.
- **External** products link to a URL instead of site content. They're defined
  entirely in `docs.yml` (no product `.yml`) and support no `navigation`/`tabs`.

Paths inside a YAML file are **relative to that file**. Shared pages are
referenced across products with `../pages/...`.

## Register products in docs.yml

```yaml
products:
  - display-name: Product A          # internal
    path: ./products/product-a.yml
    icon: fa-solid fa-leaf
    slug: product-a                  # optional
    subtitle: Product A subtitle     # optional

  - display-name: Product C          # external
    href: https://dashboard.example.com
    subtitle: Product C subtitle
    target: _blank                   # optional, opens in new tab
```

Per-product fields: `display-name` plus `path` (internal) or `href` (external).
Optional for both: `image`, `icon`, `subtitle`. Internal-only: `slug`,
`versions`. If both `image` and `icon` are set, `image` wins.

**Icons** take three forms: a Font Awesome name (`fa-solid fa-rocket`), a
relative image path (resolved against the YAML file it's written in — an icon in
`fern/products/x.yml` resolves `./assets/i.svg` to `fern/products/assets/i.svg`),
or an inline `"<svg>...</svg>"` string.

## Product file

Add the schema directive at the top for editor validation:

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/fern-api/fern/main/product-yml.schema.json
navigation:
  - section: Introduction
    contents:
      - page: Shared Resource
        path: ../pages/shared-resource.mdx   # shared across products
  - api: API Reference
```

With tabs, declare `tabs:` then a `navigation:` keyed by `tab:` — same shape as a
single-product `docs.yml`, just moved into the product file.

## Workflows

**New switcher from scratch:** create `fern/products/`, add a `.yml` per product
with its `navigation`/`tabs`, then add the `products:` list to `docs.yml`.

**Add a product to an existing switcher:** create the new product `.yml`, then
append one entry to the `products:` list. Existing products are untouched.

**Refactor a single-product site into products** (most error-prone):

1. Create `fern/products/` and a `.yml` per product.
2. **Move** the existing top-level `navigation:` (and `tabs:`) out of `docs.yml`
   and into the product file(s), splitting content across products as needed.
3. Add the `products:` list to `docs.yml`.
4. Confirm `docs.yml` no longer has a top-level `navigation:` or `tabs:`.
5. Fix links: a product slug now prefixes every URL in that product (see below).

## Footguns

- **`navigation`/`tabs` must leave `docs.yml`.** Once products exist, top-level
  `navigation:`/`tabs:` in `docs.yml` is wrong — it belongs in the product files.
  For versioned products it moves one level deeper, into the *version* files, not
  the product file.
- **A product slug changes URLs.** Pages gain a `/<product-slug>/` segment, so
  published URLs and existing internal links shift. Update internal links per the
  **Links** section of `SKILL.md`, and set up [redirects](https://buildwithfern.com/learn/docs/seo/redirects.md)
  for the old paths. A product with no `slug:` contributes no segment.
- **Paths are relative to their own YAML file**, including icon image paths —
  a frequent source of broken icons after moving files.
- **External products** support `href`/`target` only — no `navigation`, `tabs`,
  `slug`, or `versions`.

## Related options

Each extends the switcher; follow the link when a task needs it.

- **[Versioning](https://buildwithfern.com/learn/docs/configuration/versions.md)** —
  a `versions/` folder inside a product, one `.yml` per version holding that
  version's `navigation`/`tabs`, registered under the product's `versions:` list.
  The first version is the default and uses unversioned paths.
- **[Site-level landing page](https://buildwithfern.com/learn/docs/configuration/site-level-settings.md)** —
  a `landing-page:` in `docs.yml` that renders at the site root, independent of
  any product.
- **[Instance audiences](https://buildwithfern.com/learn/docs/configuration/site-level-settings.md)** —
  tag products/versions with `audiences` to include or exclude them per
  documentation instance.
- **[Conditional content by product](https://buildwithfern.com/learn/docs/writing-content/components/if.md)** —
  `<If products={["..."]}>…</If>` renders per current product.
- **[Search scoping](https://buildwithfern.com/learn/docs/customization/search.md)**
  and **[selector styling](https://buildwithfern.com/learn/docs/configuration/products.md)**
  (`fern-product-selector`, `fern-version-selector` CSS classes).
