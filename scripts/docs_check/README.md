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

Inside GitHub Actions the output switches to workflow annotations and the coverage table is appended to the job summary. `.github/workflows/docs-checks.yml` runs the checks on pull requests and nightly, and opens a tracking issue when the nightly run fails.

## Checks

| Check | Severity | What it catches |
|---|---|---|
| `nav-path-missing` | error | Navigation entry points at a file or directory that does not exist |
| `broken-internal-link` | error | `/learn/...` link that no page, API reference, changelog, or redirect publishes |
| `missing-snippet` | error | `<Markdown src>` target that does not exist |
| `missing-asset` | error | Relative image or media file that does not exist |
| `changelog-filename` | error | Changelog file not named `YYYY-MM-DD.mdx` |
| `changelog-missing-tags` | error | `##` heading without `<ChangelogTags>` |
| `redirected-link` | warning | Internal link that only resolves through a redirect |
| `relative-page-link` | warning | Link to a page written as a relative path instead of a published URL |
| `orphan-page` | warning | Page file that no navigation entry or snippet include references |
| `unused-snippet` | warning | Snippet file that no page includes |
| `missing-title` / `missing-description` | warning | Page frontmatter without a title or description |
| `stub-page` | warning | Page body under 40 words with no snippet include |
| `changelog-h1` | warning | Changelog entry with an `#` heading |

Generated paths (`fern/translations/`, the CLI changelog, `version-number-*` snippets) are never edited by these checks; findings on them are baselined.

## Baseline

`baseline.txt` lists known findings as `<check> <path> <message>` so the checks pass today and only new problems fail a PR. Because the message is part of the key, a second broken link in an already-listed page is still reported. Fix an issue and delete its line, or regenerate the file after a deliberate review:

```bash
python3 -m scripts.docs_check --write-baseline
```

The run prints a note for every baseline line that no longer matches a finding.

## Limitations

- Display-name slugs are derived with a local approximation of Fern's rules (`v3 (Deprecated)` -> `v-3-deprecated`, `GitLab` -> `git-lab`). Every URL in the current navigation was verified against the live site, but an unusual new name could be mis-derived and produce a false `broken-internal-link`. Set an explicit `slug:` on the entry to remove the ambiguity.
- `folder:` navigation entries and `ref:`-backed versions are not expanded into pages; links under their URL prefix are accepted without validation, like API references.
- Only `/learn/...` paths and relative links are checked. Links to external hosts and query strings are not validated; live-link failures are covered by the scheduled `check-links.yml` workflow.
