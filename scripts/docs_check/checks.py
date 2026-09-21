"""Individual checks. Each check yields ``Finding`` objects."""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Iterator
from urllib.parse import urlsplit

from .site import Page, Site, parse_frontmatter

ERROR = "error"
WARNING = "warning"

CODE_BLOCK_RE = re.compile(r"```.*?```|~~~.*?~~~", re.DOTALL)
INLINE_CODE_RE = re.compile(r"`[^`\n]*`")
MARKDOWN_LINK_RE = re.compile(r"(?<!!)\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+\"[^\"]*\")?\s*\)")
IMAGE_LINK_RE = re.compile(r"!\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+\"[^\"]*\")?\s*\)")
HREF_RE = re.compile(r"\bhref=[\"']([^\"']+)[\"']")
SRC_RE = re.compile(r"\bsrc=[\"']([^\"']+)[\"']")
SNIPPET_RE = re.compile(r"<Markdown\s+[^>]*src=[\"']([^\"']+)[\"']")
HEADING_RE = re.compile(r"^##\s+\S.*$", re.MULTILINE)
# Everything the platform gives an id, in document order: headings (optionally
# with an explicit ``[#id]``), ``Step``/``Tab``/``Accordion`` titles and
# ``ParamField`` paths (only with ``toc={true}``) share one duplicate counter
# (``api``, ``api-1``, ...).
ANCHOR_SOURCE_RE = re.compile(
    r"^[ \t]*#{1,6}[ \t]+(?P<heading>\S.*?)(?:[ \t]*\[#(?P<explicit>[^\]]+)\])?[ \t]*$"
    r"|<(?:Step|Tab|Accordion)\b[^>]*\btitle=[\"'](?P<title>[^\"']+)[\"']"
    r"|<ParamField\b(?P<param_attrs>(?:\"[^\"]*\"|'[^']*'|[^>\"'])*)>"
    r"|<Anchor\b[^>]*\bid=[\"'](?P<anchor>[^\"']+)[\"']",
    re.MULTILINE,
)
PARAM_FIELD_PATH_RE = re.compile(r"\bpath=[\"']([^\"']+)[\"']")
PARAM_FIELD_TOC_RE = re.compile(r"\btoc=\{\s*true\s*\}")
CHANGELOG_TAGS_RE = re.compile(r"<ChangelogTags")
CHANGELOG_FILENAME_RE = re.compile(r"^\d{4}-\d{2}-\d{2}\.mdx$")
WORD_RE = re.compile(r"[A-Za-z0-9']+")

ASSET_SUFFIXES = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".mp4", ".webm", ".mov", ".pdf", ".ico", ".avif"}
STUB_WORD_COUNT = 40


@dataclass(frozen=True)
class Finding:
    check: str
    severity: str
    path: Path
    message: str
    line: int | None = None

    def key(self) -> str:
        return f"{self.check} {self.path.as_posix()} {self.message}"


def strip_code(text: str) -> str:
    """Blank out fenced and inline code so example links in code samples are ignored."""
    text = CODE_BLOCK_RE.sub(lambda m: "\n" * m.group(0).count("\n"), text)
    return INLINE_CODE_RE.sub("", text)


def _line_of(text: str, needle: str) -> int | None:
    index = text.find(needle)
    return text.count("\n", 0, index) + 1 if index >= 0 else None


def _occurrences(body: str, matches: list[str]) -> Iterator[tuple[str, int | None]]:
    """Every match with its own line, so a URL repeated in one file yields one finding per occurrence."""
    for raw, count in Counter(matches).items():
        lines = [body.count("\n", 0, m.start()) + 1 for m in re.finditer(re.escape(raw), body)]
        for i in range(count):
            yield raw, lines[i] if i < len(lines) else None


def _relative(site: Site, path: Path) -> Path:
    try:
        return path.relative_to(site.root.parent)
    except ValueError:
        return path


def iter_source_files(site: Site) -> Iterator[Path]:
    """Every authored ``.mdx``/``.md`` page or snippet (translations are generated and skipped)."""
    for pattern in ("products/**/*.mdx", "products/**/*.md", "snippets/**/*.mdx", "snippets/**/*.md"):
        for path in sorted(site.root.glob(pattern)):
            yield path.resolve()


def check_navigation(site: Site) -> Iterator[Finding]:
    for path, message in site.problems:
        yield Finding("nav-path-missing", ERROR, _relative(site, path), message)


def check_orphans(site: Site) -> Iterator[Finding]:
    """Pages under ``products/*/pages`` that no navigation entry, changelog or snippet include references."""
    referenced = site.nav_paths | _snippet_targets(site)
    for path in iter_source_files(site):
        if path in referenced or not _is_page_candidate(site, path):
            continue
        yield Finding("orphan-page", WARNING, _relative(site, path), "page is not referenced by any navigation file or snippet include")


def _is_page_candidate(site: Site, path: Path) -> bool:
    rel = path.relative_to(site.root).parts
    if len(rel) < 3 or rel[0] != "products":
        return False
    if any(path.is_relative_to(changelog_dir) for changelog_dir in site.changelog_dirs):
        return False
    return "snippets" not in rel and "assets" not in rel


def snippet_sources(text: str) -> list[str]:
    """``<Markdown src>`` targets. Fenced code keeps its includes (version numbers are injected into config samples); inline code is prose."""
    return SNIPPET_RE.findall(INLINE_CODE_RE.sub("", text))


def snippet_includers(site: Site) -> dict[Path, set[Path]]:
    """snippet file -> pages that include it."""
    includers: dict[Path, set[Path]] = {}
    for path in iter_source_files(site):
        for src in snippet_sources(path.read_text(encoding="utf-8", errors="replace")):
            includers.setdefault(_resolve_snippet(site, path, src), set()).add(path)
    return includers


def _snippet_targets(site: Site) -> set[Path]:
    return set(snippet_includers(site))


def _is_snippet(site: Site, path: Path) -> bool:
    return "snippets" in path.relative_to(site.root).parts


def check_unused_snippets(site: Site) -> Iterator[Finding]:
    """Snippet files nothing includes are dead content."""
    included = _snippet_targets(site)
    for path in iter_source_files(site):
        if _is_snippet(site, path) and path not in included:
            yield Finding("unused-snippet", WARNING, _relative(site, path), "snippet is not included by any page")


def _resolve_snippet(site: Site, source: Path, src: str) -> Path:
    if src.startswith("/"):
        return (site.root / src.lstrip("/")).resolve()
    return (source.parent / src).resolve()


def check_snippets(site: Site) -> Iterator[Finding]:
    for path in iter_source_files(site):
        text = path.read_text(encoding="utf-8", errors="replace")
        for src in snippet_sources(text):
            if not _resolve_snippet(site, path, src).exists():
                yield Finding("missing-snippet", ERROR, _relative(site, path), f"snippet not found: {src}", _line_of(text, src))


def _is_internal(url: str, site: Site) -> bool:
    return url.startswith(site.basepath + "/") or url == site.basepath


def _normalize(url: str, site: Site) -> str:
    path = urlsplit(url).path.rstrip("/")
    for lang in site.languages:
        prefix = f"{site.basepath}/{lang}"
        if path == prefix or path.startswith(prefix + "/"):
            path = site.basepath + path[len(prefix):]
            break
    return path


def check_internal_links(site: Site) -> Iterator[Finding]:
    """``/learn/...`` links must resolve to a page URL, a generated section (API reference, changelog) or a redirect."""
    urls = site.page_urls
    for path in iter_source_files(site):
        text = path.read_text(encoding="utf-8", errors="replace")
        body = strip_code(text)
        candidates = MARKDOWN_LINK_RE.findall(body) + HREF_RE.findall(body)
        for raw, line in _occurrences(body, candidates):
            if not _is_internal(raw, site):
                if _looks_like_relative_page_link(raw):
                    yield Finding("relative-page-link", WARNING, _relative(site, path), f"link uses a relative path instead of a published URL: {raw}", line)
                continue
            url = _normalize(raw, site)
            if url in urls or url == site.basepath or any(url == p or url.startswith(p + "/") for p in site.generated_prefixes):
                continue
            destination = site.redirect_for(url)
            if destination:
                yield Finding("redirected-link", WARNING, _relative(site, path), f"link hits a redirect, point it at {destination} instead: {raw}", line)
                continue
            yield Finding("broken-internal-link", ERROR, _relative(site, path), f"no page publishes this URL: {raw}", line)


def check_redirects(site: Site) -> Iterator[Finding]:
    """Redirects must point somewhere real and should not chain; ``:param`` destinations are accepted as-is."""
    urls = site.page_urls | {page.nav_url for page in site.pages}

    def resolves(url: str) -> bool:
        # A section URL (prefix of a page URL) is served by the platform as its first page.
        return (
            url == site.basepath
            or any(url == p or p.startswith(url + "/") for p in urls)
            or any(url == p or url.startswith(p + "/") for p in site.generated_prefixes)
        )

    for source, destination in site.redirects.items():
        if source in urls:
            yield Finding("shadowed-redirect", WARNING, _relative(site, site.root / "docs.yml"), f"redirect source is also a page URL; the redirect wins, so the page is only reachable at its navigation URL: {source}")
        if ":" in destination or not _is_internal(destination, site):
            continue
        target = _normalize(destination, site)
        if resolves(target):
            continue
        if site.redirect_for(target):
            yield Finding("redirect-chain", WARNING, _relative(site, site.root / "docs.yml"), f"redirect destination is itself redirected, point it at the final URL: {source} -> {destination}")
        else:
            yield Finding("broken-redirect", ERROR, _relative(site, site.root / "docs.yml"), f"redirect destination is not a published URL: {source} -> {destination}")


def heading_slug(text: str) -> str:
    """github-slugger: lowercase, drop punctuation, spaces to hyphens (``Your site is live!`` -> ``your-site-is-live``)."""
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"<[^>]+>", "", text).replace("`", "")
    text = re.sub(r"[^\w\s-]", "", text.lower(), flags=re.UNICODE)
    return re.sub(r"\s", "-", text.strip())


def page_anchors(text: str) -> set[str]:
    """Ids the platform renders for a page body: headings, ``Step``/``Tab``/``Accordion`` titles, ``ParamField toc={true}`` paths and ``<Anchor id>``."""
    anchors: set[str] = set()
    seen: Counter[str] = Counter()
    for match in ANCHOR_SOURCE_RE.finditer(CODE_BLOCK_RE.sub("", text)):
        if match.group("anchor") or match.group("explicit"):
            anchors.add(match.group("anchor") or match.group("explicit"))
            continue
        rendered = True
        if match.group("param_attrs") is not None:
            param = PARAM_FIELD_PATH_RE.search(match.group("param_attrs"))
            if not param:
                continue
            # A field without ``toc={true}`` gets no id but still advances the duplicate counter.
            rendered = bool(PARAM_FIELD_TOC_RE.search(match.group("param_attrs")))
            slug = heading_slug(param.group(1))
        else:
            slug = heading_slug(match.group("heading") or match.group("title"))
        if rendered:
            anchors.add(slug if seen[slug] == 0 else f"{slug}-{seen[slug]}")
        seen[slug] += 1
    return anchors


def _anchors_with_snippets(site: Site, path: Path, seen: set[Path] | None = None) -> set[str]:
    seen = set() if seen is None else seen
    if path in seen or not path.exists():
        return set()
    seen.add(path)
    text = path.read_text(encoding="utf-8", errors="replace")
    anchors = page_anchors(text)
    for src in snippet_sources(text):
        anchors |= _anchors_with_snippets(site, _resolve_snippet(site, path, src), seen)
    return anchors


def check_anchors(site: Site) -> Iterator[Finding]:
    """``#fragment`` on internal and same-page links must match an id the target page renders."""
    by_url = {page.url: page.path for page in site.pages}
    includers = snippet_includers(site)
    cache: dict[Path, set[str]] = {}

    def anchors(path: Path) -> set[str]:
        if path not in cache:
            cache[path] = _anchors_with_snippets(site, path)
        return cache[path]

    for path in iter_source_files(site):
        text = path.read_text(encoding="utf-8", errors="replace")
        body = strip_code(text)
        candidates = [raw for raw in MARKDOWN_LINK_RE.findall(body) + HREF_RE.findall(body) if "#" in raw]
        for raw, line in _occurrences(body, candidates):
            fragment = urlsplit(raw).fragment
            if not fragment:
                continue
            if raw.startswith("#"):
                targets = sorted(includers.get(path) or {path})
            elif _is_internal(raw, site):
                target = by_url.get(_normalize(raw, site))
                if target is None:
                    continue  # generated section, redirect or broken link; reported elsewhere
                targets = [target]
            else:
                continue
            if not any(fragment in anchors(target) for target in targets):
                yield Finding("broken-anchor", ERROR, _relative(site, path), f"no heading or anchor with this id on the target page: {raw}", line)


def _looks_like_relative_page_link(raw: str) -> bool:
    if not (raw.startswith("./") or raw.startswith("../")):
        return False
    return Path(urlsplit(raw).path).suffix.lower() not in ASSET_SUFFIXES


def check_assets(site: Site) -> Iterator[Finding]:
    """Relative image/media references must exist on disk (snippets resolve relative to the including page)."""
    includers = snippet_includers(site)
    for path in iter_source_files(site):
        if _is_snippet(site, path) and path not in includers:
            continue  # never rendered; reported by check_unused_snippets
        bases = includers.get(path) or {path}
        text = path.read_text(encoding="utf-8", errors="replace")
        body = strip_code(text)
        refs = IMAGE_LINK_RE.findall(body) + HREF_RE.findall(body) + SRC_RE.findall(body)
        for raw, line in _occurrences(body, refs):
            target = urlsplit(raw).path
            if not target or "://" in raw or Path(target).suffix.lower() not in ASSET_SUFFIXES:
                continue
            if target.startswith("/"):
                resolved = (site.root / target.lstrip("/")).resolve()
                if not resolved.exists() and not _is_internal(target, site):
                    continue  # absolute asset URLs served by the platform; not checkable
                if not resolved.exists():
                    yield Finding("missing-asset", ERROR, _relative(site, path), f"asset not found: {raw}", line)
            else:
                for base in sorted(bases):
                    if not (base.parent / target).resolve().exists():
                        where = "" if base == path else f" (included from {_relative(site, base)})"
                        yield Finding("missing-asset", ERROR, _relative(site, path), f"asset not found: {raw}{where}", line)


def check_changelogs(site: Site, changelog_dirs: Iterable[Path]) -> Iterator[Finding]:
    """Hand-written changelog entries need a dated filename and ``<ChangelogTags>`` under every ``##`` heading."""
    for directory in changelog_dirs:
        for path in sorted(directory.glob("*.mdx")):
            rel = _relative(site, path)
            if not CHANGELOG_FILENAME_RE.match(path.name):
                yield Finding("changelog-filename", ERROR, rel, "changelog filename must be YYYY-MM-DD.mdx")
            text = path.read_text(encoding="utf-8", errors="replace")
            if re.search(r"^#\s+\S", text, re.MULTILINE):
                yield Finding("changelog-h1", WARNING, rel, "changelog entries use ## headings; the date is the title")
            headings = HEADING_RE.findall(text)
            if not headings:
                if not CHANGELOG_TAGS_RE.search(text) and "tags:" not in text:
                    yield Finding("changelog-missing-tags", ERROR, rel, "changelog entry has no <ChangelogTags> or frontmatter tags")
                continue
            sections = HEADING_RE.split(text)[1:]
            for heading, body in zip(headings, sections):
                first = body.strip().split("\n", 1)[0]
                if not CHANGELOG_TAGS_RE.match(first):
                    yield Finding("changelog-missing-tags", ERROR, rel, f"<ChangelogTags> must directly follow the heading: {heading.strip()}", _line_of(text, heading))


def check_frontmatter(site: Site) -> Iterator[Finding]:
    """Coverage/SEO gaps: navigation pages without a title or description, or with almost no content."""
    for page in site.pages:
        if page.hidden:
            continue
        rel = _relative(site, page.path)
        text = page.path.read_text(encoding="utf-8", errors="replace")
        frontmatter = page.frontmatter or parse_frontmatter(text)
        if not frontmatter.get("title"):
            yield Finding("missing-title", WARNING, rel, "frontmatter has no title")
        if not frontmatter.get("description"):
            yield Finding("missing-description", WARNING, rel, "frontmatter has no description (search and SEO snippet)")
        if word_count(text) < STUB_WORD_COUNT and not SNIPPET_RE.search(text):
            yield Finding("stub-page", WARNING, rel, f"page body has fewer than {STUB_WORD_COUNT} words")


def word_count(text: str) -> int:
    body = re.sub(r"\A---.*?\n---\s*\n", "", text, flags=re.DOTALL)
    body = strip_code(body)
    body = re.sub(r"<[^>]+>", " ", body)
    return len(WORD_RE.findall(body))


def coverage(site: Site, findings: list[Finding]) -> list[dict]:
    """Per-product summary used for the coverage table."""
    by_path = {}
    for finding in findings:
        by_path.setdefault(finding.path.as_posix(), set()).add(finding.check)
    rows = []
    for product in dict.fromkeys(page.product for page in site.pages):
        pages = [page for page in site.pages if page.product == product]
        visible = [page for page in pages if not page.hidden]
        def count(check: str, subset: list[Page]) -> int:
            return sum(check in by_path.get(_relative(site, page.path).as_posix(), set()) for page in subset)
        rows.append(
            {
                "product": product,
                "pages": len(pages),
                "hidden": len(pages) - len(visible),
                "missing_description": count("missing-description", visible),
                "stub_pages": count("stub-page", visible),
                "broken_links": count("broken-internal-link", pages),
            }
        )
    return rows
