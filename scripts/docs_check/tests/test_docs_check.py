"""Run with ``python3 -m unittest discover scripts/docs_check/tests`` from the repository root."""

from __future__ import annotations

import tempfile
import textwrap
import unittest
from pathlib import Path

from scripts.docs_check import checks
from scripts.docs_check.__main__ import CHANGELOG_DIRS, run_checks
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
    write(fern, "products/docs/pages/guide/gitlab.mdx", "---\ntitle: GitLab\ndescription: d\n---\n" + "word " * 50)
    write(fern, "products/docs/pages/guide/custom.mdx", "---\ntitle: Custom\nslug: custom-slug\n---\nshort")
    write(fern, "products/docs/pages/guide/hidden.mdx", "---\ntitle: Hidden\ndescription: d\n---\n" + "word " * 50)
    write(fern, "products/docs/pages/guide/customization.mdx", "---\ntitle: Customization\nslug: custom-home\ndescription: d\n---\n" + "word " * 50)
    write(fern, "products/docs/pages/guide/react.mdx", "---\ntitle: React\nslug: customization/custom-react-components\ndescription: d\n---\n" + "word " * 50)
    write(fern, "products/docs/pages/api-overview.mdx", "---\ntitle: API overview\ndescription: d\n---\n<Markdown src=\"/snippets/shared.mdx\" />\n" + "word " * 50)
    write(fern, "products/docs/pages/guide/orphan.mdx", "---\ntitle: Orphan\n---\n")
    write(fern, "products/docs/pages/assets/ok.png", "png")
    write(fern, "products/docs/snippets/local.mdx", "local <Markdown src=\"/snippets/missing.mdx\" />")
    write(fern, "snippets/shared.mdx", "![snippet-asset](./assets/nope.png) ![per-includer](../assets/ok.png)")
    write(fern, "snippets/unused.mdx", "unused")
    write(fern, "products/docs/pages/changelog/2025-01-01.mdx", "## Feature\n\n<ChangelogTags>docs.yml</ChangelogTags>\n\nText\n\n## Other\n\nno tags\n")
    write(fern, "products/docs/pages/changelog/bad-name.mdx", "# Title\n\n<ChangelogTags>x</ChangelogTags>\n")
    return fern


class SlugifyTest(unittest.TestCase):
    def test_slugify(self):
        self.assertEqual(slugify("Getting started"), "getting-started")
        self.assertEqual(slugify("GitLab"), "git-lab")
        self.assertEqual(slugify("v3 (Deprecated)"), "v-3-deprecated")


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
        self.assertEqual(len(self.by_check("redirected-link")), 2)
        self.assertEqual(len(self.by_check("relative-page-link")), 1)

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

    def test_orphans(self):
        self.assertEqual(self.by_check("orphan-page"), ["fern/products/docs/pages/guide/orphan.mdx: page is not referenced by any navigation file or snippet include"])

    def test_changelogs(self):
        self.assertEqual(CHANGELOG_DIRS[0], "products/docs/pages/changelog")
        self.assertEqual(self.by_check("changelog-filename"), ["fern/products/docs/pages/changelog/bad-name.mdx: changelog filename must be YYYY-MM-DD.mdx"])
        self.assertEqual(len(self.by_check("changelog-h1")), 1)
        self.assertEqual(len(self.by_check("changelog-missing-tags")), 1)

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
