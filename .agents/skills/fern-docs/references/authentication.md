# Authentication & RBAC

Gate a docs site so readers only see content meant for them. Read this when a
task involves restricting pages or content by role (RBAC), or wiring docs into an
auth method (password, SSO, JWT, OAuth).

This page is decision context: what each piece is, which surface it lives on, and
**which canonical doc to fetch before you edit**. Don't work the syntax from
memory — fetch the matching page (append `.md` for clean markdown) or query the
Fern MCP server, since the config evolves.

## First, locate the surface

Most of an auth setup is *not* in the docs repo. Before touching anything,
work out which surface the task actually lives on — it changes whether you edit a
file at all:

- **In the repo (`docs.yml` + MDX)** — declaring roles and gating content. This is
  RBAC, and it's the bulk of what you'll edit here.
- **In the Fern Dashboard** — password protection (passwords mapped to roles).
- **With Fern support** — SSO, OAuth, and JWT signing secrets. You send Fern your
  identity-provider details; Fern provisions the connection. **The repo never
  holds client secrets or signing keys** — if a task asks you to put one in
  `docs.yml`, push back.

When a request is really "turn on SSO" or "set the docs password," the answer is a
pointer to the Dashboard or support, not a `docs.yml` edit. Say so rather than
inventing config.

## RBAC (the in-repo part)

RBAC has three moving parts, all in the repo. You'll usually touch more than one
in a single task, so know what each is for:

- **Declare roles** — a top-level `roles:` list in `docs.yml`. Every role
  referenced anywhere must be declared here or `fern check` fails. `everyone` is
  auto-assigned to all visitors, including unauthenticated ones — but it is *not*
  exempt from the declaration rule: if you reference it in `viewers:` or
  `<If roles>`, you must still list `everyone` under `roles:` or `fern check`
  fails with "Role 'everyone' is used but not declared."
- **Gate navigation** — a `viewers:` key on a navigation item. Only listed roles
  see it. Fern allows `viewers:` on **products, versions, tabs, sections, pages,
  api references, and changelogs** — every level of the tree.
- **Gate inline content** — the `<If roles={[...]}>` component, to hide part of a
  page rather than the whole page.

Three behaviors that are easy to get backwards — get these right or the gating is
silently wrong:

- **Omitting `viewers:` is authenticated-only, NOT public.** A navigation item
  with no `viewers:` key is visible to *any signed-in user* but hidden from
  logged-out visitors. To make something truly public you must set it explicitly:
  `viewers: [everyone]`. "No key" and `[everyone]` are different states — don't
  treat a bare item as public.
- **Viewership is inherited.** If a section is restricted to `admins`, all its
  pages and nested sections are admins-only too — you don't repeat `viewers:` on
  each child. So to test or reason about one level in isolation, keep its parents
  permissive; otherwise an inherited restriction, not the key you're looking at,
  is what's gating.
- **Gated items are hidden, not locked.** By default an unauthorized reader sees
  no trace of the item in nav (not a 404 or lock screen), and unauthenticated
  users are redirected to login. A "visible but locked" presentation exists but
  must be requested from Fern, so don't assume it's on.

**`viewers:` placement depends on the item.** On most items it sits directly on
the navigation entry, but **on a tab it goes in the `tabs:` map, not on the
`- tab:` entry** in `navigation:`. Putting it on the `- tab:` entry fails
`fern check`.

**Fetch before editing:**
https://buildwithfern.com/learn/docs/authentication/features/rbac.md — for exact
`roles:`/`viewers:`/`<If>` syntax.

### Gating a level means that level must exist in the nav

To gate, say, the tab or version level, the nav must actually contain a tab or a
version — and Fern's nav structure rules vary by file type in ways that bite when
you build a fixture or restructure to add a gate:

- A **versioned product**'s version files use flat navigation (sections/pages);
  **tabs are not supported there** — put tab-level structure in a non-versioned
  product, whose product file does support `tabs:`.
- A **versioned product entry** in `docs.yml` needs both a top-level `path:` (the
  default version) **and** a `versions:` list.
- An `- api:` reference node validates in a product's flat navigation but is
  rejected inside a version file's tab layout.

These are navigation-structure rules, not RBAC rules, but they surface the moment
you add a gate to a level that wasn't there before. Confirm structure against the
[products](https://buildwithfern.com/learn/docs/configuration/products.md) and
[versions](https://buildwithfern.com/learn/docs/configuration/versions.md) docs
(or `references/products.md`) rather than guessing — getting the wrong shape costs
far more time than looking it up.

### You can't verify RBAC in local preview

`fern docs dev` renders the site but does **not** enforce `viewers:` — every
reader is effectively unauthenticated, so restricted content just won't appear and
you can't confirm a role sees what it should. RBAC only takes effect on the
**published** site once an auth method is configured. Plan to verify on the
deployed site (or a preview instance) with real credentials, and tell the user
that local preview can't prove the gating works.

## Auth methods — which one, and where it's configured

Four ways to establish *who* a reader is; RBAC then decides what they see. JWT,
OAuth, and SSO all work through a `fern_token` browser cookie.

| Method | Configured | RBAC | API key injection | Fetch when working on it |
|--------|-----------|------|-------------------|--------------------------|
| Password | Dashboard | ✅ up to 3 roles | ❌ | [`setup/password-protection.md`](https://buildwithfern.com/learn/docs/authentication/setup/password-protection.md) |
| SSO | Fern support | ❌ | ❌ | [`setup/sso.md`](https://buildwithfern.com/learn/docs/authentication/setup/sso.md) |
| OAuth | Fern support | ✅ | ✅ | [`setup/oauth.md`](https://buildwithfern.com/learn/docs/authentication/setup/oauth.md) |
| JWT | You (mint the token) | ✅ | ✅ | [`setup/jwt.md`](https://buildwithfern.com/learn/docs/authentication/setup/jwt.md) |

Pick by the constraints, not preference:

- **Password** — quick gate for a small set of audiences. **Capped at three
  password-mapped roles**, no API key injection. Passwords (and their role
  mapping) are set in the Fern Dashboard → Settings → Password card, not in the
  repo. Each Dashboard role name must match a string in `docs.yml`'s `roles:` list
  **exactly**, or the password won't unlock the content it's meant to. You don't
  map a password to `everyone` — that's the built-in unauthenticated role.
- **SSO** — internal docs behind corporate login (SAML 2.0 / OIDC). No RBAC, no
  API key injection — it's all-or-nothing access.
- **OAuth** — Fern runs the flow against your provider; supports RBAC and API key
  injection. Choose over JWT when you'd rather not mint tokens yourself.
- **JWT** — you sign the `fern_token` yourself, so you control the payload. The
  only method with meaningful repo/code involvement: roles travel in the token's
  `fern` claim, and you can inject an API key into the API Explorer through it.
  Fetch `setup/jwt.md` for the claim shape and a token-minting example, and
  [`features/api-key-injection.md`](https://buildwithfern.com/learn/docs/authentication/features/api-key-injection.md)
  for the injection payload schema.

## Footguns

- **Declare before you use.** Any role in `viewers:` or `<If roles>` must be in the
  top-level `roles:` list, or `fern check` fails.
- **Bare ≠ public.** An item with no `viewers:` is authenticated-only, not public.
  Set `viewers: [everyone]` for anything that should reach logged-out visitors.
- **Inherited restrictions hide more than you think.** Because viewership cascades
  down, a permissive-looking child can still be gated by an ancestor. Check the
  whole path from product down, not just the item itself.
- **Gating without auth exposes everything.** `viewers:` and `<If roles>` are
  inert until an auth method is configured. On a published site with *no* auth
  method, all gated content is publicly visible — *not* hidden, and not locked.
  `fern check` passing does not mean content is protected. Never treat `viewers:`
  as protection until auth is wired up and verified live.
- **Secrets never live in the repo.** Signing keys, client secrets, and passwords
  belong in the Dashboard or with Fern support.
- **Gating ≠ moving.** Hiding a page with `viewers:` doesn't change its URL, so
  it's not a redirect situation. Renaming or moving it still is — see
  `references/redirects.md`.

## Verify

Run `fern check` after editing roles or `viewers:` — it catches undeclared roles
and malformed config. But neither `fern check` nor `fern docs dev` proves the
gating works: visibility is only enforced on the **published** site with an auth
method configured, so a passing check is necessary, not sufficient.

Validating RBAC end-to-end happens mostly outside the repo. Walk the user through
the full loop and present it as concrete next steps:

1. **Publish** — `fern generate --docs` (needs `fern login` or a `FERN_TOKEN`; add
   `--no-prompt` for non-interactive runs).
2. **Configure an auth method** — declaring and gating in the repo enforces
   nothing on its own. For a quick RBAC test, password protection is the fastest
   path: in the Dashboard, add one password per role, with role names matching
   `docs.yml` exactly. Fetch
   https://buildwithfern.com/learn/dashboard/configuration/password-protection.md
   for the current Dashboard steps and walk the user through them — don't recite
   menus from memory, since the UI changes.
3. **Verify per role** — load the published site and enter each role's credential
   in turn, confirming each role sees exactly its slice and *not* another's. Give
   the user a role → expected-visible-content table so they know what correct
   looks like.

Always tell the user that local checks can't validate RBAC and that auth must be
live first.
