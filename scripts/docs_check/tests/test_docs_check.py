"""Run with ``python3 -m unittest discover scripts/docs_check/tests`` from the repository root."""

from __future__ import annotations

import tempfile
import textwrap
import unittest
import unittest.mock
from collections import Counter
from pathlib import Path

from scripts.docs_check import checks, smoke
from scripts.docs_check.__main__ import CHANGELOG_DIRS, apply_baseline, run_checks
from scripts.docs_check.site import load_site, slugify

DOCS_YML = """
instances:
  - url: example.docs.buildwithfern.com/learn
translations:
  - lang: en
    default: true
  - lang: zh
redirects:
  - source: /learn/docs/old
    destination: /learn/docs/guide/overview
  - source: /learn/docs/legacy/:slug*
    destination: /learn/docs/guide/:slug*
products:
  - display-name: Home
    path: ./products/home/home.yml
  - display-name: Docs
    path: ./products/docs/docs.yml
    slug: docs
  - display-name: OpenAPI
    href: https://example.com
"""

HOME_YML = """
navigation:
  - section: Welcome
    skip-slug: true
    contents:
      - page: Home
        path: ./pages/home.mdx
      - page: User feedback
        path: ./pages/feedback.mdx
"""

DOCS_PRODUCT_YML = """
tabs:
  guides:
    display-name: Guides
    skip-slug: true
  api:
    display-name: API
navigation:
  - tab: guides
    layout:
      - section: Guide
        contents:
          - page: Overview
            path: ./pages/guide/overview.mdx
          - page: GitLab
            path: ./pages/guide/gitlab.mdx
          - page: Custom slug
            path: ./pages/guide/custom.mdx
          - page: Hidden thing
            path: ./pages/guide/hidden.mdx
            hidden: true
      - section: Customization
        path: ./pages/guide/customization.mdx
        contents:
          - page: React
            path: ./pages/guide/react.mdx
      - changelog: ./pages/changelog
  - tab: api
    layout:
      - api: API Reference
        api-name: api
        layout:
          - page: API overview
            path: ./pages/api-overview.mdx
"""


def write(root: Path, rel: str, text: str) -> Path:
    path = root / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(textwrap.dedent(text).lstrip(), encoding="utf-8")
    return path


def make_site(root: Path) -> Path:
    fern = root / "fern"
    write(fern, "docs.yml", DOCS_YML)
    write(fern, "products/home/home.yml", HOME_YML)
    write(fern, "products/docs/docs.yml", DOCS_PRODUCT_YML)
    write(fern, "products/home/pages/home.mdx", "---\ntitle: Home\nslug: /\ndescription: d\n---\n" + "word " * 50)
    write(fern, "products/home/pages/feedback.mdx", "---\ntitle: Feedback\nslug: user-feedback\ndescription: d\n---\n" + "word " * 50)
    write(
        fern,
        "products/docs/pages/guide/overview.mdx",
        """
        ---
        title: Overview
        description: d
        ---
        <Markdown src="/snippets/shared.mdx" />
        <Markdown src="../../snippets/local.mdx" />
        [ok](/learn/docs/guide/git-lab) [home](/learn) [feedback](/learn/user-feedback)
        [react](/learn/docs/customization/custom-react-components) [zh](/learn/zh/docs/guide/overview)
        [api](/learn/docs/api/api-reference/endpoints/get) [changelog](/learn/docs/changelog/2025-01-01)
        [redirect](/learn/docs/old) [wild](/learn/docs/legacy/anything/deep) [broken](/learn/docs/guide/nope) [rel](../guide/overview.mdx)
        [api-page](/learn/docs/api/api-reference/api-overview)
        ![img](./missing.png) ![ok](../assets/ok.png)
        ```md
        [in code](/learn/docs/ignored) <Markdown src="/snippets/fenced-missing.mdx" />
        ```
        """ + "word " * 50,
    )
    write(
        fern,
        "products/docs/pages/guide/gitlab.mdx",
        """
        ---
        title: GitLab
        description: d
        ---
        ## Your site is live!
        ## Options [#opts]
        <Steps>
          <Step title="Install">
            ### api
            ```bash
            # not a heading
            ```
          </Step>
        </Steps>
        <ParamField path="settings.filter" type="string" toc={true}>x</ParamField>
        <ParamField path="api" type="string" toc={true}>x</ParamField>
        <Anchor id="explicit" />
        [same](#opts) [same-bad](#nope)
        [a](/learn/docs/guide/overview#shared-heading) [b](/learn/docs/guide/overview#missing-heading)
        [c](/learn/docs/guide/git-lab#your-site-is-live) [d](/learn/docs/guide/git-lab#install) [e](/learn/docs/guide/git-lab#api-1)
        [f](/learn/docs/guide/git-lab#settingsfilter) [g](/learn/docs/guide/git-lab#explicit) [h](/learn/docs/guide/git-lab#not-a-heading)
        [i](/learn/docs/legacy/x#x) [j](/learn/docs/api/api-reference/endpoints/get#x) [k](https://example.com/page#x)
        """ + "word " * 50,
    )
    write(fern, "products/docs/pages/guide/custom.mdx", "---\ntitle: Custom\nslug: custom-slug\n---\nshort")
    write(fern, "products/docs/pages/guide/hidden.mdx", "---\ntitle: Hidden\ndescription: d\n---\n" + "word " * 50)
    write(fern, "products/docs/pages/guide/customization.mdx", "---\ntitle: Customization\nslug: custom-home\ndescription: d\n---\n" + "word " * 50)
    write(fern, "products/docs/pages/guide/react.mdx", "---\ntitle: React\nslug: customization/custom-react-components\ndescription: d\n---\n" + "word " * 50)
    write(fern, "products/docs/pages/api-overview.mdx", "---\ntitle: API overview\ndescription: d\n---\n<Markdown src=\"/snippets/shared.mdx\" />\n" + "word " * 50)
    write(fern, "products/docs/pages/guide/orphan.mdx", "---\ntitle: Orphan\n---\n")
    write(fern, "products/docs/pages/assets/ok.png", "png")
    write(fern, "products/docs/snippets/local.mdx", "local <Markdown src=\"/snippets/missing.mdx\" />")
    write(fern, "snippets/shared.mdx", "## Shared heading\n[self](#shared-heading) [self-bad](#gone)\n![snippet-asset](./assets/nope.png) ![per-includer](../assets/ok.png)")
    write(fern, "snippets/unused.mdx", "unused")
    write(fern, "products/docs/pages/changelog/2025-01-01.mdx", "## Feature\n\n<ChangelogTags>docs.yml</ChangelogTags>\n\nText\n\n## Other\n\nno tags\n\n## Late\n\nProse first\n\n<ChangelogTags>x</ChangelogTags>\n")
    write(fern, "products/docs/pages/changelog/bad-name.mdx", "# Title\n\n<ChangelogTags>x</ChangelogTags>\n")
    return fern


class SlugifyTest(unittest.TestCase):
    def test_slugify(self):
        self.assertEqual(slugify("Getting started"), "getting-started")
        self.assertEqual(slugify("GitLab"), "git-lab")
        self.assertEqual(slugify("v3 (Deprecated)"), "v-3-deprecated")
        self.assertEqual(slugify("Depending on other APIs"), "depending-on-other-ap-is")


class SiteTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.fern = make_site(Path(self.tmp.name))
        self.site = load_site(self.fern)

    def tearDown(self):
        self.tmp.cleanup()

    def test_urls(self):
        urls = {p.path.name: p.url for p in self.site.pages}
        self.assertEqual(urls["home.mdx"], "/learn")
        self.assertEqual(urls["feedback.mdx"], "/learn/user-feedback")
        self.assertEqual(urls["overview.mdx"], "/learn/docs/guide/overview")
        self.assertEqual(urls["gitlab.mdx"], "/learn/docs/guide/git-lab")
        self.assertEqual(urls["custom.mdx"], "/learn/docs/custom-slug")
        self.assertEqual(urls["react.mdx"], "/learn/docs/customization/custom-react-components")
        self.assertEqual(urls["customization.mdx"], "/learn/docs/custom-home")
        self.assertEqual(urls["api-overview.mdx"], "/learn/docs/api/api-reference/api-overview")
        self.assertEqual(self.site.redirect_for("/learn/docs/legacy"), "/learn/docs/guide/:slug*")
        self.assertEqual(self.site.redirect_for("/learn/docs/legacy/a/b"), "/learn/docs/guide/:slug*")
        self.assertIsNone(self.site.redirect_for("/learn/docs/legacy-other"))
        self.assertIn("/learn/docs/api/api-reference", self.site.generated_prefixes)
        self.assertIn("/learn/docs/changelog", self.site.generated_prefixes)
        self.assertEqual(self.site.languages, ["zh"])
        self.assertEqual(self.site.problems, [])

    def test_hidden(self):
        hidden = {p.path.name for p in self.site.pages if p.hidden}
        self.assertEqual(hidden, {"hidden.mdx"})


class SmokeTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.fern = make_site(Path(self.tmp.name))
        self.site = load_site(self.fern)

    def tearDown(self):
        self.tmp.cleanup()

    def test_changed_files_map_to_pages(self):
        with unittest.mock.patch.object(smoke, "REPO_ROOT", Path(self.tmp.name)):
            urls = smoke.urls_for_changed_files(
                self.site,
                [Path("fern/products/docs/pages/guide/gitlab.mdx"), Path("fern/snippets/shared.mdx"), Path("README.md")],
            )
            everything = smoke.urls_for_changed_files(self.site, [Path("fern/products/docs/docs.yml")])
        self.assertEqual(urls, {"/learn/docs/guide/git-lab", "/learn/docs/guide/overview", "/learn/docs/api/api-reference/api-overview"})
        self.assertEqual(everything, set(self.site.page_urls))

    def test_check_page(self):
        pages = {
            "https://x.test/learn/ok": (200, '<img src="/logo.png"><main><img src="./a.png"><img src="data:image/png;base64,AA"></main>'),
            "https://x.test/learn/a.png": (200, ""),
            "https://x.test/learn/broken-img": (200, '<main><img src="https://cdn.test/missing.png"></main>'),
            "https://cdn.test/missing.png": (404, ""),
            "https://x.test/learn/error": (200, "<main>Something went wrong</main>"),
            "https://x.test/learn/gone": (404, ""),
            "https://x.test/learn/titled": (200, '<h1 class="x">The <code>llms.txt</code> &amp; friends</h1>'),
            "https://x.test/learn/wrong-page": (200, "<h1>Welcome</h1>"),
            "https://x.test/learn/code-title": (200, "<h1>Using <code>&lt;Button&gt;</code></h1>"),
            "https://x.test/learn/badge-title": (200, '<h1><p>Library docs <span class="badge">Beta</span></p></h1>'),
            "https://x.test/learn/escaped-title": (200, "<h1>Using &lt;Callout&gt;</h1>"),
        }
        titles = {
            "/learn/titled": "The `llms.txt` & friends",
            "/learn/wrong-page": "Configuration",
            "/learn/code-title": "Using `<Button>`",
            "/learn/badge-title": 'Library docs <Badge type="note">Beta</Badge>',
            "/learn/escaped-title": r"Using \<Callout\>",
        }
        with unittest.mock.patch.object(smoke, "fetch", lambda url, timeout: pages.get(url, (0, "boom"))):
            failures = smoke.run("https://x.test", ["/learn/ok", "/learn/broken-img", "/learn/error", "/learn/gone", "/learn/down", "/learn/titled", "/learn/wrong-page", "/learn/code-title", "/learn/badge-title", "/learn/escaped-title"], 1, 0, 2, titles)
        self.assertEqual(
            [(f.url, f.message) for f in failures],
            [
                ("/learn/broken-img", "image returns HTTP 404: https://cdn.test/missing.png"),
                ("/learn/down", "request failed: boom"),
                ("/learn/error", "page renders an error: 'Something went wrong'"),
                ("/learn/gone", "HTTP 404"),
                ("/learn/wrong-page", "heading 'welcome' does not match title 'Configuration'"),
            ],
        )


class ChecksTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.fern = make_site(Path(self.tmp.name))
        self.findings, self.coverage = run_checks(self.fern)

    def tearDown(self):
        self.tmp.cleanup()

    def by_check(self, check: str) -> list[str]:
        return sorted(f"{f.path.as_posix()}: {f.message}" for f in self.findings if f.check == check)

    def test_internal_links(self):
        self.assertEqual(
            self.by_check("broken-internal-link"),
            ["fern/products/docs/pages/guide/overview.mdx: no page publishes this URL: /learn/docs/guide/nope"],
        )
        self.assertEqual(len(self.by_check("redirected-link")), 3)
        self.assertEqual(len(self.by_check("relative-page-link")), 1)

    def test_anchors(self):
        self.assertEqual(checks.heading_slug("Your site is live!"), "your-site-is-live")
        self.assertEqual(checks.heading_slug("`auth-schemes`"), "auth-schemes")
        self.assertEqual(checks.heading_slug("settings.filter"), "settingsfilter")
        self.assertEqual(
            self.by_check("broken-anchor"),
            [
                "fern/products/docs/pages/guide/gitlab.mdx: no heading or anchor with this id on the target page: #nope",
                "fern/products/docs/pages/guide/gitlab.mdx: no heading or anchor with this id on the target page: /learn/docs/guide/git-lab#not-a-heading",
                "fern/products/docs/pages/guide/gitlab.mdx: no heading or anchor with this id on the target page: /learn/docs/guide/overview#missing-heading",
                "fern/snippets/shared.mdx: no heading or anchor with this id on the target page: #gone",
            ],
        )

    def test_snippets_and_assets(self):
        self.assertEqual(
            self.by_check("missing-snippet"),
            [
                "fern/products/docs/pages/guide/overview.mdx: snippet not found: /snippets/fenced-missing.mdx",
                "fern/products/docs/snippets/local.mdx: snippet not found: /snippets/missing.mdx",
            ],
        )
        self.assertEqual(self.by_check("unused-snippet"), ["fern/snippets/unused.mdx: snippet is not included by any page"])
        self.assertEqual(
            self.by_check("missing-asset"),
            [
                "fern/products/docs/pages/guide/overview.mdx: asset not found: ./missing.png",
                "fern/snippets/shared.mdx: asset not found: ../assets/ok.png (included from fern/products/docs/pages/api-overview.mdx)",
                "fern/snippets/shared.mdx: asset not found: ./assets/nope.png (included from fern/products/docs/pages/api-overview.mdx)",
                "fern/snippets/shared.mdx: asset not found: ./assets/nope.png (included from fern/products/docs/pages/guide/overview.mdx)",
            ],
        )

    def test_baseline_counts_occurrences(self):
        broken = [f for f in self.findings if f.check == "broken-internal-link"]
        self.assertEqual(len(broken), 1)
        doubled = broken + [checks.Finding(broken[0].check, broken[0].severity, broken[0].path, broken[0].message, line=99)]
        active, stale = apply_baseline(doubled, Counter([broken[0].key()]))
        self.assertEqual([f.line for f in active], [99])
        self.assertEqual(stale, [])
        active, stale = apply_baseline([], Counter([broken[0].key()]))
        self.assertEqual(stale, [broken[0].key()])

    def test_orphans(self):
        self.assertEqual(self.by_check("orphan-page"), ["fern/products/docs/pages/guide/orphan.mdx: page is not referenced by any navigation file or snippet include"])

    def test_changelogs(self):
        self.assertEqual(CHANGELOG_DIRS[0], "products/docs/pages/changelog")
        self.assertEqual(self.by_check("changelog-filename"), ["fern/products/docs/pages/changelog/bad-name.mdx: changelog filename must be YYYY-MM-DD.mdx"])
        self.assertEqual(len(self.by_check("changelog-h1")), 1)
        self.assertEqual(len(self.by_check("changelog-missing-tags")), 2)

    def test_frontmatter(self):
        self.assertEqual(self.by_check("missing-description"), ["fern/products/docs/pages/guide/custom.mdx: frontmatter has no description (search and SEO snippet)"])
        self.assertEqual(self.by_check("stub-page"), [f"fern/products/docs/pages/guide/custom.mdx: page body has fewer than {checks.STUB_WORD_COUNT} words"])

    def test_coverage(self):
        docs = next(row for row in self.coverage if row["product"] == "Docs")
        self.assertEqual(docs["pages"], 7)
        self.assertEqual(docs["hidden"], 1)
        self.assertEqual(docs["missing_description"], 1)
        self.assertEqual(docs["broken_links"], 1)


if __name__ == "__main__":
    unittest.main()
