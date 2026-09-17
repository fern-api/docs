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


def _snippet_includers(site: Site) -> dict[Path, set[Path]]:
    """snippet file -> pages that include it."""
    includers: dict[Path, set[Path]] = {}
    for path in iter_source_files(site):
        for src in snippet_sources(path.read_text(encoding="utf-8", errors="replace")):
            includers.setdefault(_resolve_snippet(site, path, src), set()).add(path)
    return includers


def _snippet_targets(site: Site) -> set[Path]:
    return set(_snippet_includers(site))


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


def _looks_like_relative_page_link(raw: str) -> bool:
    if not (raw.startswith("./") or raw.startswith("../")):
        return False
    return Path(urlsplit(raw).path).suffix.lower() not in ASSET_SUFFIXES


def check_assets(site: Site) -> Iterator[Finding]:
    """Relative image/media references must exist on disk (snippets resolve relative to the including page)."""
    includers = _snippet_includers(site)
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
                if not CHANGELOG_TAGS_RE.search(body):
                    yield Finding("changelog-missing-tags", ERROR, rel, f"heading lacks <ChangelogTags>: {heading.strip()}", _line_of(text, heading))


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
