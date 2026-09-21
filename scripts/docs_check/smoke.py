"""Live smoke check for a deployed docs site (preview or production).

For every page URL the site model derives (or a subset picked by changed files),
fetch the page and assert it renders: HTTP 200, no error page markers, the ``<h1>``
matches the page's frontmatter title (a 200 that shows the wrong page is still a
failure), and every image under ``<main>`` loads. Run with
``python3 -m scripts.docs_check.smoke``.
"""

from __future__ import annotations

import argparse
import html as html_lib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urljoin, urlsplit

from . import checks
from .site import Site, load_site

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_FERN_DIR = REPO_ROOT / "fern"
DEFAULT_BASE = "https://buildwithfern.com"
USER_AGENT = "fern-docs-smoke/1.0 (+https://github.com/fern-api/docs)"

# Text the platform renders when a page is missing or an MDX component throws.
ERROR_MARKERS = ("Page not found", "Something went wrong")
MAIN_RE = re.compile(r"<main\b.*?</main>", re.DOTALL)
IMG_SRC_RE = re.compile(r"<img\b[^>]*\bsrc=[\"']([^\"']+)[\"']")
H1_RE = re.compile(r"<h1\b[^>]*>(.*?)</h1>", re.DOTALL)
TAG_RE = re.compile(r"<[^>]+>")
NAVIGATION_SUFFIXES = (".yml", ".yaml")


@dataclass(frozen=True)
class Failure:
    url: str
    message: str


def fetch(url: str, timeout: float) -> tuple[int, str]:
    """Follow redirects; return final status and body (``0`` on a network error)."""
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        return exc.code, ""
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        return 0, str(exc)


def fetch_with_retry(url: str, timeout: float, retries: int) -> tuple[int, str]:
    """Retry 404, 5xx and network errors; a fresh deploy can take a moment to propagate."""
    status, body = 0, ""
    for attempt in range(retries + 1):
        status, body = fetch(url, timeout)
        if status and status < 500 and status != 404:
            return status, body
        if attempt < retries:
            time.sleep(2**attempt)
    return status, body


def page_images(base: str, page_url: str, html: str) -> set[str]:
    main = MAIN_RE.search(html)
    scope = main.group(0) if main else html
    return {urljoin(base + page_url, src) for src in IMG_SRC_RE.findall(scope) if not src.startswith("data:")}


def normalize_title(text: str) -> str:
    """Compare visible text loosely: ignore backticks, case and whitespace runs."""
    return re.sub(r"\s+", " ", text.replace("`", "")).strip().lower()


def source_title(title: str) -> str:
    """Visible text of a frontmatter title: MDX components removed; backtick code and ``\<``-escaped brackets kept."""
    parts = re.split(r"(`[^`]*`)", title)
    visible = "".join(part if part.startswith("`") else TAG_RE.sub("", part.replace("\\<", "\0").replace("\\>", "\1")) for part in parts)
    return normalize_title(visible.replace("\0", "<").replace("\1", ">"))


def rendered_title(html: str) -> str | None:
    """Visible text of the first ``<h1>``: markup removed, entities decoded."""
    match = H1_RE.search(html)
    return normalize_title(html_lib.unescape(TAG_RE.sub("", match.group(1)))) if match else None


def check_page(base: str, page_url: str, timeout: float, retries: int, image_cache: dict[str, int], title: str | None = None) -> list[Failure]:
    status, html = fetch_with_retry(base + page_url, timeout, retries)
    if status != 200:
        return [Failure(page_url, f"HTTP {status}" if status else f"request failed: {html}")]
    failures = [Failure(page_url, f"page renders an error: {marker!r}") for marker in ERROR_MARKERS if marker in html]
    if title is not None:
        heading = rendered_title(html)
        if heading != source_title(title):
            failures.append(Failure(page_url, f"heading {heading!r} does not match title {title!r}"))
    for image in sorted(page_images(base, page_url, html)):
        if image not in image_cache:
            image_cache[image] = fetch_with_retry(image, timeout, retries)[0]
        if image_cache[image] != 200:
            failures.append(Failure(page_url, f"image returns HTTP {image_cache[image]}: {image}"))
    return failures


def urls_for_changed_files(site: Site, changed: list[Path]) -> set[str]:
    """Published URLs affected by edited files: the page itself, or every page including an edited snippet.

    A navigation YAML edit can move any URL, so it widens the selection to the whole site.
    """
    if any(rel.suffix in NAVIGATION_SUFFIXES for rel in changed):
        return set(site.page_urls)
    by_path = {page.path.resolve(): page.url for page in site.pages}
    includers = checks.snippet_includers(site)
    urls: set[str] = set()
    for rel in changed:
        path = (REPO_ROOT / rel).resolve()
        if path in by_path:
            urls.add(by_path[path])
        for includer in includers.get(path, ()):
            if includer in by_path:
                urls.add(by_path[includer])
    return urls


def page_titles(site: Site) -> dict[str, str]:
    return {page.url: str(page.frontmatter["title"]) for page in site.pages if page.frontmatter.get("title")}


def run(base: str, urls: list[str], timeout: float, retries: int, workers: int, titles: dict[str, str] | None = None) -> list[Failure]:
    image_cache: dict[str, int] = {}
    titles = titles or {}
    with ThreadPoolExecutor(max_workers=workers) as pool:
        results = pool.map(lambda url: check_page(base, url, timeout, retries, image_cache, titles.get(url)), urls)
    return sorted({failure for batch in results for failure in batch}, key=lambda f: (f.url, f.message))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="docs_check.smoke", description="Fetch published docs pages and fail on 404s, render errors and broken images.")
    parser.add_argument("--base", default=DEFAULT_BASE, help="site origin, e.g. https://buildwithfern.com or a preview URL (path is ignored)")
    parser.add_argument("--fern-dir", type=Path, default=DEFAULT_FERN_DIR)
    parser.add_argument("--changed", nargs="*", type=Path, help="repo-relative files; only pages they publish or include are checked")
    parser.add_argument("--changed-from", type=Path, help="file with one repo-relative path per line (same as --changed)")
    parser.add_argument("--timeout", type=float, default=30)
    parser.add_argument("--retries", type=int, default=2)
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--json", type=Path, help="write failures as JSON to this path")
    args = parser.parse_args(argv)

    split = urlsplit(args.base if "://" in args.base else "https://" + args.base)
    base = f"{split.scheme}://{split.netloc}"
    site = load_site(args.fern_dir.resolve())

    changed = list(args.changed or [])
    if args.changed_from:
        changed += [Path(line.strip()) for line in args.changed_from.read_text(encoding="utf-8").splitlines() if line.strip()]
    if args.changed is not None or args.changed_from:
        urls = sorted(urls_for_changed_files(site, changed))
    else:
        urls = sorted(site.page_urls)

    if not urls:
        print("no published pages to check")
        return 0
    print(f"checking {len(urls)} pages on {base}")
    failures = run(base, urls, args.timeout, args.retries, args.workers, page_titles(site))

    github = os.environ.get("GITHUB_ACTIONS")
    for failure in failures:
        print(f"::error title=smoke::{failure.url}: {failure.message}" if github else f"FAIL {failure.url}: {failure.message}")
    print(f"\n{len(failures)} failures across {len(urls)} pages")

    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as handle:
            handle.write(f"## Live smoke check ({base})\n\n**{len(failures)} failures** across {len(urls)} pages.\n\n")
            handle.writelines(f"- `{f.url}` — {f.message}\n" for f in failures[:200])
    if args.json:
        args.json.write_text(json.dumps({"base": base, "pages": len(urls), "failures": [f.__dict__ for f in failures]}, indent=2), encoding="utf-8")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
