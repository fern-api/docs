"""Run with ``python3 -m unittest discover scripts/docs_check/tests`` from the repository root."""

from __future__ import annotations

import tempfile
import textwrap
import unittest
import unittest.mock
from collections import Counter
from pathlib import Path

from scripts.docs_check import checks, examples, search_smoke, smoke
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
  - source: /learn/docs/gone
    destination: /learn/docs/nowhere
  - source: /learn/docs/hop
    destination: /learn/docs/old
  - source: /learn/docs/section
    destination: /learn/docs/guide
  - source: /learn
    destination: /learn/home
  - source: /learn/docs/guide/git-lab
    destination: /learn/docs/guide/overview
  - source: /learn/docs/old
    destination: /learn/docs/guide/git-lab
  - source: /learn/docs/via-page
    destination: /learn/docs/guide/git-lab
  - source: /learn/docs/customization/:slug
    destination: /learn/docs/guide/overview
  - ./redirects.yml
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
    write(fern, "redirects.yml", "redirects:\n  - source: /learn/docs/from-file\n    destination: /learn/docs/nowhere-either\n")
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
        <ParamField path="quiet" type="string">no id without toc</ParamField>
        <ParamField path="api" type="list<string>">counted, not rendered</ParamField>
        <ParamField path="api" type="map<string, string>" toc={true}>x</ParamField>
        <Anchor id="explicit" />
        [same](#opts) [same-bad](#nope) [quiet](#quiet) [api-2](#api-2) [api-3](#api-3)
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


class ConsoleSmokeTest(unittest.TestCase):
    def test_check_page_collects_errors(self):
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:  # optional dependency, installed in the preview workflow only
            self.skipTest("playwright not installed")
        from scripts.docs_check import console_smoke

        html = "<html><body><script>console.error('boom'); fetch('/learn/missing.js'); throw new Error('kaboom')</script></body></html>"
        try:
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch()
        except Exception as exc:  # browser binaries not installed
            self.skipTest(f"chromium unavailable: {exc}")
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            context = browser.new_context()
            page = context.new_page()
            context.route("https://docs.test/learn/ok", lambda route: route.fulfill(status=200, content_type="text/html", body="<html><body>fine</body></html>"))
            context.route("https://docs.test/learn/bad", lambda route: route.fulfill(status=200, content_type="text/html", body=html))
            context.route("https://docs.test/learn/missing.js", lambda route: route.fulfill(status=404, body=""))
            self.assertEqual(console_smoke.check_page(page, "https://docs.test", "/learn/ok", 10000), [])
            messages = [f.message for f in console_smoke.check_page(context.new_page(), "https://docs.test", "/learn/bad", 10000)]
            browser.close()
        self.assertIn("console.error: boom", messages)
        self.assertIn("uncaught error: kaboom", messages)
        self.assertIn("HTTP 404: https://docs.test/learn/missing.js", messages)

    def test_ignores_third_party_noise(self):
        from scripts.docs_check import console_smoke

        self.assertTrue(console_smoke._ignored("Failed to load resource: net::ERR_BLOCKED_BY_CLIENT"))
        self.assertTrue(console_smoke._ignored("", "https://cdn.segment.com/analytics.js"))
        self.assertFalse(console_smoke._ignored("TypeError: x is undefined", "https://docs.test/learn/page"))


class SearchSmokeTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        fern = make_site(Path(self.tmp.name))
        write(fern, "products/docs/pages/guide/secret.mdx", "---\ntitle: Secret\nnoindex: true\ndescription: d\n---\n" + "word " * 50)
        write(fern, "products/docs/pages/guide/react2.mdx", "---\ntitle: React\nslug: react-two\ndescription: d\n---\n" + "word " * 50)
        (fern / "products/docs/docs.yml").write_text(
            (fern / "products/docs/docs.yml").read_text() + "          - page: Secret\n            path: ./pages/guide/secret.mdx\n          - page: React two\n            path: ./pages/guide/react2.mdx\n"
        )
        self.site = load_site(fern)

    def tearDown(self):
        self.tmp.cleanup()

    def test_sample_skips_noindex_hidden_and_ambiguous_titles(self):
        titles = {title for title, _ in search_smoke.sample_pages(self.site, 100)}
        self.assertNotIn("secret", titles)  # noindex
        self.assertNotIn("hidden", titles)
        self.assertNotIn("react", titles)  # two pages share the title
        self.assertIn("gitlab", titles)
        self.assertEqual(search_smoke.sample_pages(self.site, 3), search_smoke.sample_pages(self.site, 3))
        self.assertNotEqual(search_smoke.sample_pages(self.site, 3), search_smoke.sample_pages(self.site, 3, salt="x"))

    def test_run_reports_missing_pages(self):
        index = {"generators.yml": ["/learn/sdks/reference/generators-yml"], "gitlab": ["/learn/docs/a", "/learn/docs/guide/git-lab"]}

        def fake_search(key, query, top, timeout):
            return [{"pathname": p, "title": ""} for p in index.get(query, [])][:top]

        with unittest.mock.patch.object(search_smoke, "fetch_key", lambda *a: {"appId": "x", "apiKey": "y", "indexName": "z"}), unittest.mock.patch.object(
            search_smoke, "search", fake_search
        ), unittest.mock.patch.object(search_smoke, "GOLDEN", {"generators.yml": "/learn/sdks/reference/generators-yml", "docs.yml": "/learn/docs/x"}):
            failures, total = search_smoke.run("https://example.com", self.site, top=5, sample=100, timeout=1)
        by_query = {f.query: f.message for f in failures}
        self.assertNotIn("generators.yml", by_query)
        self.assertNotIn("gitlab", by_query)
        self.assertIn("expected /learn/docs/x in top 5, got: no hits", by_query["docs.yml"])
        self.assertIn("overview", by_query)  # sampled page absent from the fake index
        self.assertGreater(total, 2)


SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "title": {"type": "string"},
        "navigation": {"type": "array", "items": {"$ref": "#/definitions/Item"}},
        "groups": {"type": "object", "additionalProperties": {"$ref": "#/definitions/Group"}},
        "github": {"oneOf": [{"$ref": "#/definitions/GithubPush"}, {"$ref": "#/definitions/GithubPR"}]},
    },
    "required": ["title"],
    "definitions": {
        "Item": {
            "anyOf": [
                {"type": "object", "additionalProperties": False, "properties": {"page": {"type": "string"}, "path": {"type": "string"}}},
                {"type": "object", "additionalProperties": False, "properties": {"section": {"type": "string"}, "contents": {"type": "array"}}},
            ]
        },
        "Group": {"type": "object", "additionalProperties": False, "properties": {"generators": {"type": "array", "items": {"$ref": "#/definitions/Generator"}}}},
        "Generator": {"type": "object", "additionalProperties": False, "properties": {"name": {"type": "string"}, "version": {"type": "string"}, "config": {"$ref": "#/definitions/Config"}}},
        "Config": {"type": "object", "additionalProperties": False, "properties": {"clientName": {"type": "string"}}},
        "GithubPush": {"type": "object", "additionalProperties": False, "properties": {"repository": {"type": "string"}, "mode": {"enum": ["push"]}}},
        "GithubPR": {"type": "object", "additionalProperties": False, "properties": {"repository": {"type": "string"}, "mode": {"enum": ["pull-request"]}, "reviewers": {"type": "array"}}},
    },
}


class ExamplesTest(unittest.TestCase):
    def setUp(self):
        self.schema = examples.strip_required(SCHEMA)

    def validate(self, body: str, kind: str = "docs.yml") -> list[str]:
        return examples.validate_example(examples.Example(Path("p.mdx"), 1, kind, textwrap.dedent(body).strip("\n")), self.schema)

    def test_extracts_named_fences_only(self):
        text = textwrap.dedent("""
            ```yaml title="docs.yml"
            title: A
            ```
            ```yaml
            title: unnamed
            ```
              ```yml generators.yml {2}
              groups: {}
              ```
            ```yaml .github/workflows/publish-docs.yml
            name: not a docs.yml
            ```
        """)
        found = examples.extract_examples(Path("p.mdx"), text)
        self.assertEqual([(e.kind, e.line, e.body) for e in found], [("docs.yml", 3, "title: A"), ("generators.yml", 9, "groups: {}")])

    def test_complete_and_fragment_examples_pass(self):
        self.assertEqual(self.validate("title: A\nnavigation:\n  - page: P\n    path: ./p.mdx"), [])
        self.assertEqual(self.validate("config:\n  clientName: Base"), [])  # bare nested block
        self.assertEqual(self.validate("my-group:\n  generators:\n    - name: x\n      version: <Markdown src='/snippets/v.mdx'/>"), [])  # named group, templated value
        self.assertEqual(self.validate("navigation:\n  - section: S\n    contents:\n      - ...\n  - page: P\n    path: ..."), [])  # elided
        self.assertEqual(self.validate("github:\n  repository: o/r\n  mode: pull-request\n  reviewers: []"), [])  # second oneOf branch

    def test_reports_the_specific_branch_error(self):
        self.assertEqual(self.validate("navigation:\n  - page: P\n    hidden: true"), ["navigation/0: Additional properties are not allowed ('hidden' was unexpected)"])
        self.assertEqual(self.validate("github:\n  repository: o/r\n  mode: rebase"), ["github/mode: 'rebase' is not one of ['pull-request']"])  # one message per location
        self.assertEqual(self.validate("bogus: 1\nother: 2"), ["(top level): no docs.yml object declares the key(s) bogus, other"])
        self.assertEqual(self.validate("groups:\n\tbad: 1")[0][:15], "not valid YAML:")


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
                "fern/products/docs/pages/guide/gitlab.mdx: no heading or anchor with this id on the target page: #api-2",
                "fern/products/docs/pages/guide/gitlab.mdx: no heading or anchor with this id on the target page: #nope",
                "fern/products/docs/pages/guide/gitlab.mdx: no heading or anchor with this id on the target page: #quiet",
                "fern/products/docs/pages/guide/gitlab.mdx: no heading or anchor with this id on the target page: /learn/docs/guide/git-lab#not-a-heading",
                "fern/products/docs/pages/guide/gitlab.mdx: no heading or anchor with this id on the target page: /learn/docs/guide/overview#missing-heading",
                "fern/snippets/shared.mdx: no heading or anchor with this id on the target page: #gone",
            ],
        )

    def test_redirects(self):
        self.assertEqual(
            self.by_check("broken-redirect"),
            [
                "fern/docs.yml: redirect destination is not a published URL: /learn/docs/from-file -> /learn/docs/nowhere-either",
                "fern/docs.yml: redirect destination is not a published URL: /learn/docs/gone -> /learn/docs/nowhere",
            ],
        )
        # /learn/docs/via-page targets a page that is also a redirect source: the redirect wins, so it still chains.
        self.assertEqual(
            self.by_check("redirect-chain"),
            [
                "fern/docs.yml: redirect destination is itself redirected, point it at the final URL: /learn/docs/hop -> /learn/docs/old",
                "fern/docs.yml: redirect destination is itself redirected, point it at the final URL: /learn/docs/via-page -> /learn/docs/guide/git-lab",
            ],
        )
        self.assertEqual(self.by_check("duplicate-redirect"), ["fern/docs.yml: redirect source is declared more than once, only the first declaration fires: /learn/docs/old"])
        shadowed = self.by_check("shadowed-redirect")
        self.assertEqual(len(shadowed), 3)  # /learn (frontmatter slug), /learn/docs/guide/git-lab, and the :slug pattern
        self.assertIn("fern/docs.yml: redirect source matches 1 page URL(s); the redirect wins, so those pages are only reachable at their navigation URL: /learn/docs/customization/:slug -> /learn/docs/customization/custom-react-components", shadowed)

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
