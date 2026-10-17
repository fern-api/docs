"""Search smoke check for the published docs site.

The site's search dialog fetches a scoped, public Algolia key from
``/learn/api/fern-docs/search/v2/key`` and queries the index directly. This
script does the same and asserts two things:

* fixed **golden queries** (``GOLDEN``) return the expected page in the top
  results, so a re-index that drops or demotes core pages is caught;
* a deterministic **sample** of published pages is discoverable by its own
  title, so pages missing from the index are caught.

Run with ``python3 -m scripts.docs_check.search_smoke``.
"""

from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import json
import os
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import quote

from .site import Site, load_site
from .smoke import DEFAULT_BASE, DEFAULT_FERN_DIR, USER_AGENT, source_title

KEY_PATH = "/api/fern-docs/search/v2/key"

# query -> page URL that must appear in the top ``--top`` hits.
GOLDEN: dict[str, str] = {
    "generators.yml": "/learn/sdks/reference/generators-yml",
    "docs.yml": "/learn/docs/configuration/site-level-settings",
    "navigation": "/learn/docs/configuration/navigation-overview",
    "custom css": "/learn/docs/customization/custom-css-js",
    "openapi": "/learn/api-definitions/openapi/overview",
    "typescript sdk": "/learn/sdks/generators/typescript/quickstart",
    "python sdk": "/learn/sdks/generators/python/quickstart",
    "changelog": "/learn/docs/configuration/changelogs",
    "llms.txt": "/learn/docs/ai-features/llms-txt",
    "redirects": "/learn/docs/seo/redirects",
}


@dataclass(frozen=True)
class Failure:
    query: str
    message: str


def _post_json(url: str, payload: dict, headers: dict[str, str], timeout: float) -> dict:
    request = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={"User-Agent": USER_AGENT, "Content-Type": "application/json", **headers})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_key(base: str, basepath: str, timeout: float) -> dict:
    """The scoped search key the browser uses: ``{"appId", "apiKey", "indexName"}``."""
    request = urllib.request.Request(base + basepath + KEY_PATH, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        key = json.loads(response.read().decode("utf-8"))
    for field in ("appId", "apiKey", "indexName"):
        if not key.get(field):
            raise ValueError(f"search key endpoint returned no {field}: {json.dumps(key)[:200]}")
    return key


def search(key: dict, query: str, top: int, timeout: float) -> list[dict]:
    """Top hits as ``{"pathname", "title"}`` dicts, deduplicated by page."""
    result = _post_json(
        f"https://{key['appId']}-dsn.algolia.net/1/indexes/{quote(key['indexName'])}/query",
        {"query": query, "hitsPerPage": top * 3, "attributesToRetrieve": ["title", "pathname"]},
        {"X-Algolia-API-Key": key["apiKey"], "X-Algolia-Application-Id": key["appId"]},
        timeout,
    )
    hits: list[dict] = []
    seen: set[str] = set()
    for hit in result.get("hits", []):
        pathname = str(hit.get("pathname", "")).rstrip("/")
        if pathname and pathname not in seen:
            seen.add(pathname)
            hits.append({"pathname": pathname, "title": str(hit.get("title", ""))})
    return hits[:top]


def check_query(key: dict, query: str, expected: str, top: int, timeout: float) -> Failure | None:
    try:
        hits = search(key, query, top, timeout)
    except (urllib.error.URLError, TimeoutError, OSError, ValueError) as exc:
        return Failure(query, f"search request failed: {exc}")
    if any(hit["pathname"] == expected.rstrip("/") for hit in hits):
        return None
    got = ", ".join(hit["pathname"] for hit in hits) or "no hits"
    return Failure(query, f"expected {expected} in top {top}, got: {got}")


def sample_pages(site: Site, count: int, salt: str = "") -> list[tuple[str, str]]:
    """``count`` (title, url) pairs chosen by hashing the URL: stable across runs, spread across products.

    Skips hidden and ``noindex`` pages (not indexed) and titles shared by several pages (``Overview``,
    ``Authentication``): a title query cannot single those out, so they would only produce noise.
    """
    candidates = [
        (source_title(str(page.frontmatter["title"])), page.url)
        for page in site.pages
        if page.frontmatter.get("title") and not page.hidden and not page.frontmatter.get("noindex")
    ]
    title_counts = Counter(title for title, _ in candidates)
    titled = [(title, url) for title, url in candidates if title_counts[title] == 1]
    ranked = sorted(titled, key=lambda item: hashlib.sha256((salt + item[1]).encode()).hexdigest())
    return ranked[:count]


def run(base: str, site: Site, top: int, sample: int, timeout: float, salt: str = "", sample_top: int = 10) -> tuple[list[Failure], int]:
    key = fetch_key(base, site.basepath, timeout)
    queries: dict[str, tuple[str, int]] = {query: (url, top) for query, url in GOLDEN.items()}
    for title, url in sample_pages(site, sample, salt):
        # Near-duplicate titles ("Analytics and integration(s)") legitimately outrank each other, so allow a looser rank.
        queries.setdefault(title, (url, sample_top))
    failures = [f for query, (expected, rank) in queries.items() if (f := check_query(key, query, expected, rank, timeout))]
    return failures, len(queries)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="docs_check.search_smoke", description="Query the site's search index and fail when expected pages are not discoverable.")
    parser.add_argument("--base", default=DEFAULT_BASE, help="site origin, e.g. https://buildwithfern.com")
    parser.add_argument("--fern-dir", type=Path, default=DEFAULT_FERN_DIR)
    parser.add_argument("--top", type=int, default=5, help="expected page must rank within this many distinct pages")
    parser.add_argument("--sample", type=int, default=25, help="number of published pages to look up by their own title")
    parser.add_argument("--sample-top", type=int, default=10, help="a sampled page must rank within this many distinct pages for its own title")
    parser.add_argument("--salt", default=os.environ.get("SEARCH_SMOKE_SALT", ""), help="vary the page sample (e.g. the run date) so every page gets covered over time")
    parser.add_argument("--timeout", type=float, default=30)
    parser.add_argument("--json", type=Path, help="write failures as JSON to this path")
    args = parser.parse_args(argv)

    base = args.base.rstrip("/")
    site = load_site(args.fern_dir.resolve())
    unknown = sorted(url for url in GOLDEN.values() if url not in site.page_urls)
    if unknown:
        print("GOLDEN expects pages the site model does not publish; update GOLDEN:\n  " + "\n  ".join(unknown))
        return 2

    try:
        failures, total = run(base, site, args.top, args.sample, args.timeout, args.salt, args.sample_top)
    except (urllib.error.URLError, TimeoutError, OSError, ValueError) as exc:
        print(f"::error title=search-smoke::{exc}" if os.environ.get("GITHUB_ACTIONS") else f"FAIL {exc}")
        return 1

    github = os.environ.get("GITHUB_ACTIONS")
    for failure in failures:
        print(f"::error title=search-smoke::{failure.query!r}: {failure.message}" if github else f"FAIL {failure.query!r}: {failure.message}")
    print(f"\n{len(failures)} failures across {total} queries on {base}")

    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as handle:
            handle.write(f"## Search smoke check ({base})\n\n**{len(failures)} failures** across {total} queries.\n\n")
            handle.writelines(f"- `{f.query}` — {f.message}\n" for f in failures)
    if args.json:
        args.json.write_text(json.dumps({"base": base, "queries": total, "failures": [f.__dict__ for f in failures]}, indent=2), encoding="utf-8")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
