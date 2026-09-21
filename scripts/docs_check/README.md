# docs_check

Static checks for the docs source tree. They read `fern/docs.yml` and the product navigation files, build the published `/learn/...` URL of every page, and report coverage gaps that `fern check`, Vale, and the live link checker do not catch.

```bash
pip install pyyaml
python3 -m scripts.docs_check                 # text output, exit 1 on errors
python3 -m scripts.docs_check --strict        # also fail on warnings
python3 -m scripts.docs_check --only orphan-page stub-page
python3 -m scripts.docs_check --json report.json --summary summary.md
python3 -m unittest discover -s scripts/docs_check/tests -t .
```

Inside GitHub Actions the output switches to workflow annotations and the coverage table is appended to the job summary.

## Where each layer runs

| Stage | Workflow | What runs |
|---|---|---|
| Pull request, source | `docs-checks.yml` | Unit tests, the static checks, `fern check` |
| Pull request, external links | `docs-checks.yml` | lychee over the http(s) links in changed files, with the shared `.github/lychee.toml` |
| Pull request, rendered preview | `preview-docs.yml` | `smoke.py` against the preview for every page the PR touches |
| Push to `main` | `publish-docs.yml` | `smoke.py` against buildwithfern.com for every derived URL after `fern generate` |
| Weekday schedule | `docs-checks.yml`, `check-links.yml` | Full static run, full production smoke run, full external link sweep; failures open a tracking issue |

## Checks

| Check | Severity | What it catches |
|---|---|---|
| `nav-path-missing` | error | Navigation entry points at a file or directory that does not exist |
| `broken-internal-link` | error | `/learn/...` link that no page, API reference, changelog, or redirect publishes |
| `missing-snippet` | error | `<Markdown src>` target that does not exist |
| `missing-asset` | error | Relative image or media file that does not exist |
| `changelog-filename` | error | Changelog file not named `YYYY-MM-DD.mdx` |
| `changelog-missing-tags` | error | `##` heading not directly followed by `<ChangelogTags>` |
| `broken-anchor` | error | `#fragment` (same page or on a `/learn/...` link) that matches no heading, `<Anchor id>`, `<Step>`/`<Tab>`/`<Accordion>` title, or `<ParamField path toc={true}>` on the target page |
| `redirected-link` | warning | Internal link that only resolves through a redirect |
| `broken-redirect` | error | `docs.yml` redirect whose destination is not a published URL |
| `redirect-chain` | warning | `docs.yml` redirect whose destination is itself redirected |
| `shadowed-redirect` | warning | `docs.yml` redirect whose source is also a page URL (the redirect wins) |
| `relative-page-link` | warning | Link to a page written as a relative path instead of a published URL |
| `orphan-page` | warning | Page file that no navigation entry or snippet include references |
| `unused-snippet` | warning | Snippet file that no page includes |
| `missing-title` / `missing-description` | warning | Page frontmatter without a title or description |
| `stub-page` | warning | Page body under 40 words with no snippet include |
| `changelog-h1` | warning | Changelog entry with an `#` heading |

Generated paths (`fern/translations/`, the CLI changelog, `version-number-*` snippets) are never edited by these checks; findings on them are baselined.

## Baseline

`baseline.txt` lists known findings as `<check> <path> <message>` so the checks pass today and only new problems fail a PR. Because the message is part of the key, a second broken link in an already-listed page is still reported, and each line suppresses one occurrence, so repeating a listed URL in the same file is also reported. Fix an issue and delete its line, or regenerate the file after a deliberate review:

```bash
python3 -m scripts.docs_check --write-baseline
```

The run prints a note for every baseline line that no longer matches a finding.

## Live smoke check

`smoke.py` fetches published pages from a deployed site and fails on a non-200 response, an error page (`Page not found`, `Something went wrong`), an `<h1>` that does not match the page's frontmatter `title` (a 200 that serves the wrong page), or an image under `<main>` that does not load. It reuses the site model, so a page that the navigation YAML publishes but the site does not serve is caught without a sitemap.

```bash
python3 -m scripts.docs_check.smoke                                   # every page on buildwithfern.com
python3 -m scripts.docs_check.smoke --base https://<preview-host>/learn --changed fern/products/docs/pages/x.mdx fern/snippets/y.mdx
python3 -m scripts.docs_check.smoke --changed-from changed-files.txt --json smoke.json
```

`--changed` maps each edited page to its URL and each edited snippet to every page that includes it; an edited navigation YAML widens the run to the whole site. 404 and 5xx responses are retried with backoff so a deploy that is still propagating does not fail the run.

## Limitations

- Display-name slugs are derived with a local approximation of Fern's rules (`v3 (Deprecated)` -> `v-3-deprecated`, `GitLab` -> `git-lab`, `APIs` -> `ap-is`). Every URL in the current navigation was verified against the live site, but an unusual new name could be mis-derived and produce a false `broken-internal-link`. Set an explicit `slug:` on the entry to remove the ambiguity.
- `folder:` navigation entries and `ref:`-backed versions are not expanded into pages; links under their URL prefix are accepted without validation, like API references.
- Only `/learn/...` paths and relative links are checked. Links to external hosts and query strings are not validated; the lychee job in `docs-checks.yml` covers external links in changed files and `check-links.yml` sweeps the whole site.
- Anchor ids are derived from the source. Fern applies its own id transformations to some generated components, so a fragment that targets one of those can pass the check while the rendered page uses a different id. Every `broken-anchor` reported today was confirmed against the live site; links into API reference and changelog pages are accepted without anchor validation.
