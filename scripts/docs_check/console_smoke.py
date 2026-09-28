"""Browser console check for deployed docs pages.

``smoke.py`` only sees server-rendered HTML. This script opens each page in
headless Chromium (Playwright) and fails on uncaught JavaScript errors,
``console.error`` output and failed same-origin requests: the class of breakage
where a page renders on the server but a component crashes on the client.

Run with ``python3 -m scripts.docs_check.console_smoke --base <preview-url> --changed-from changed-files.txt``.
Requires ``pip install playwright && python3 -m playwright install chromium``.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit

from .site import load_site
from .smoke import DEFAULT_BASE, DEFAULT_FERN_DIR, urls_for_changed_files

# Messages that are noise on every page: third-party scripts blocked by the
# headless profile, analytics beacons, and browser feature warnings.
IGNORED_MESSAGE_RE = re.compile(
    r"net::ERR_BLOCKED_BY_CLIENT"
    r"|Failed to load resource: the server responded with a status of \d{3}"  # the response/requestfailed listeners report same-origin ones with their URL
    r"|ResizeObserver loop"
    r"|third-party cookie"
    r"|\[HMR\]|Download the React DevTools",
    re.IGNORECASE,
)
# Hosts whose failed requests are not the docs site's problem.
IGNORED_HOSTS_RE = re.compile(r"(^|\.)(googletagmanager|google-analytics|segment|posthog|intercom|hubspot|algolia|sentry|vercel-insights|vercel-scripts)\.", re.IGNORECASE)


@dataclass(frozen=True)
class Failure:
    url: str
    message: str


def _ignored(text: str, url: str = "") -> bool:
    host = urlsplit(url).hostname or ""
    return bool(IGNORED_MESSAGE_RE.search(text) or (host and IGNORED_HOSTS_RE.search(host)))


def _is_prefetch(url: str, page_url: str) -> bool:
    """Next.js prefetches linked pages (``?_rsc=``); a failure there belongs to the linked page, which has its own smoke run."""
    parts = urlsplit(url)
    return "_rsc=" in parts.query and parts.path.rstrip("/") != page_url.rstrip("/")


def check_page(page, base: str, page_url: str, timeout_ms: int) -> list[Failure]:
    """Load ``base + page_url`` and return console errors, page errors and failed same-origin requests."""
    url = base + page_url
    origin = urlsplit(base).netloc
    failures: list[Failure] = []
    seen: set[str] = set()

    def add(message: str) -> None:
        if message not in seen:
            seen.add(message)
            failures.append(Failure(page_url, message))

    page.on("pageerror", lambda exc: add(f"uncaught error: {str(exc).splitlines()[0][:300]}"))
    page.on("console", lambda msg: msg.type == "error" and not _ignored(msg.text, msg.location.get("url", "")) and add(f"console.error: {msg.text[:300]}"))
    page.on("requestfailed", lambda req: urlsplit(req.url).netloc == origin and not _ignored(req.failure or "", req.url) and add(f"request failed: {req.url} ({req.failure})"))
    page.on("response", lambda res: res.status >= 400 and urlsplit(res.url).netloc == origin and not _ignored("", res.url) and not _is_prefetch(res.url, page_url) and add(f"HTTP {res.status}: {res.url}"))

    try:
        response = page.goto(url, wait_until="networkidle", timeout=timeout_ms)
    except Exception as exc:  # Playwright raises its own TimeoutError/Error hierarchy
        return [Failure(page_url, f"navigation failed: {str(exc).splitlines()[0][:300]}")]
    if response is None or response.status != 200:
        failures.insert(0, Failure(page_url, f"HTTP {response.status if response else 'none'} on navigation"))
    return failures


def run(base: str, urls: list[str], timeout_ms: int) -> list[Failure]:
    from playwright.sync_api import sync_playwright  # imported lazily so the static checks do not need the dependency

    failures: list[Failure] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        context = browser.new_context(user_agent="fern-docs-console-smoke/1.0 (+https://github.com/fern-api/docs)")
        for url in urls:
            page = context.new_page()
            try:
                failures += check_page(page, base, url, timeout_ms)
            finally:
                page.close()
        browser.close()
    return failures


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="docs_check.console_smoke", description="Open docs pages in headless Chromium and fail on console errors, uncaught exceptions and failed requests.")
    parser.add_argument("--base", default=DEFAULT_BASE, help="site origin or preview URL (path is ignored)")
    parser.add_argument("--fern-dir", type=Path, default=DEFAULT_FERN_DIR)
    parser.add_argument("--changed", nargs="*", type=Path, help="repo-relative files; only pages they publish or include are checked")
    parser.add_argument("--changed-from", type=Path, help="file with one repo-relative path per line (same as --changed)")
    parser.add_argument("--max-pages", type=int, default=40, help="cap on pages opened per run (a navigation change selects the whole site)")
    parser.add_argument("--timeout", type=float, default=45, help="seconds to wait for a page to go network-idle")
    parser.add_argument("--json", type=Path, help="write failures as JSON to this path")
    args = parser.parse_args(argv)

    split = urlsplit(args.base if "://" in args.base else "https://" + args.base)
    base = f"{split.scheme}://{split.netloc}"
    site = load_site(args.fern_dir.resolve())

    changed = list(args.changed or [])
    if args.changed_from:
        changed += [Path(line.strip()) for line in args.changed_from.read_text(encoding="utf-8").splitlines() if line.strip()]
    urls = sorted(urls_for_changed_files(site, changed)) if (args.changed is not None or args.changed_from) else sorted(site.page_urls)
    if not urls:
        print("no published pages to check")
        return 0
    if len(urls) > args.max_pages:
        print(f"{len(urls)} pages selected, checking the first {args.max_pages}")
        urls = urls[: args.max_pages]

    print(f"opening {len(urls)} pages on {base}")
    failures = run(base, urls, int(args.timeout * 1000))

    github = os.environ.get("GITHUB_ACTIONS")
    for failure in failures:
        print(f"::error title=console-smoke::{failure.url}: {failure.message}" if github else f"FAIL {failure.url}: {failure.message}")
    print(f"\n{len(failures)} failures across {len(urls)} pages")

    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as handle:
            handle.write(f"## Browser console check ({base})\n\n**{len(failures)} failures** across {len(urls)} pages.\n\n")
            handle.writelines(f"- `{f.url}` — {f.message}\n" for f in failures[:200])
    if args.json:
        args.json.write_text(json.dumps({"base": base, "pages": urls, "failures": [f.__dict__ for f in failures]}, indent=2), encoding="utf-8")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
