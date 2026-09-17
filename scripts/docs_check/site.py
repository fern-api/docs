"""Load the docs site model from ``fern/docs.yml`` and the product navigation files.

The URL rules mirror the "Link checking" section of AGENTS.md:

    /{basepath}/{product-slug}?/{section-slug}*/{page-slug}

* A product, section or tab with ``skip-slug: true`` (or no derivable slug)
  contributes nothing to the URL.
* Slugs come from ``slug:`` when set, otherwise from the display name.
* Page frontmatter ``slug:`` overrides the navigation ``slug:`` and is resolved
  relative to the product root (``slug: /`` is the product root itself).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

import yaml

FRONTMATTER_RE = re.compile(r"\A---\s*\n(.*?)\n---\s*\n", re.DOTALL)


def slugify(name: str) -> str:
    """Approximate Fern's display-name to slug conversion (``v3 (Deprecated)`` -> ``v-3-deprecated``, ``GitLab`` -> ``git-lab``)."""
    text = re.sub(r"([a-z])([A-Z])", r"\1-\2", name)
    text = re.sub(r"([a-zA-Z])(\d)", r"\1-\2", text)
    text = re.sub(r"(\d)([a-zA-Z])", r"\1-\2", text)
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text)
    return text.strip("-").lower()


def parse_frontmatter(text: str) -> dict:
    match = FRONTMATTER_RE.match(text)
    if not match:
        return {}
    try:
        data = yaml.safe_load(match.group(1))
    except yaml.YAMLError:
        return {}
    return data if isinstance(data, dict) else {}


@dataclass
class Page:
    path: Path
    url: str
    product: str
    hidden: bool
    frontmatter: dict = field(default_factory=dict)


@dataclass
class Scope:
    """Where a navigation entry lives: the product root URL and the current section prefix."""

    product: str
    product_url: str
    prefix: str

    def within(self, segment: str | None) -> "Scope":
        return Scope(self.product, self.product_url, _join(self.prefix, segment))


@dataclass
class Site:
    root: Path  # the ``fern/`` directory
    basepath: str
    pages: list[Page] = field(default_factory=list)
    # URL prefixes that are generated (API references, changelogs) and cannot be
    # resolved to a source file. Any link under one of these prefixes is accepted.
    generated_prefixes: list[str] = field(default_factory=list)
    changelog_dirs: list[Path] = field(default_factory=list)
    redirects: dict[str, str] = field(default_factory=dict)
    languages: list[str] = field(default_factory=list)
    problems: list[tuple[Path, str]] = field(default_factory=list)

    def redirect_for(self, url: str) -> str | None:
        """Destination of the redirect whose ``source`` matches ``url`` (``:param`` and ``:param*`` patterns included)."""
        for source, destination in self.redirects.items():
            if source == url or (":" in source and _redirect_pattern(source).fullmatch(url)):
                return destination
        return None

    @property
    def page_urls(self) -> set[str]:
        return {page.url for page in self.pages}

    @property
    def nav_paths(self) -> set[Path]:
        return {page.path.resolve() for page in self.pages}


@lru_cache(maxsize=None)
def _redirect_pattern(source: str) -> re.Pattern[str]:
    """``/a/:slug`` matches one segment; ``/a/:slug*`` matches ``/a`` and anything below it."""
    pattern = ""
    for literal, param in re.findall(r"([^:]*)(:[A-Za-z0-9_]+\*?)?", source):
        if param and param.endswith("*"):
            pattern += re.escape(literal.rstrip("/")) + "(?:/.*)?"
        elif param:
            pattern += re.escape(literal) + "[^/]+"
        else:
            pattern += re.escape(literal)
    return re.compile(pattern)


def _load_yaml(path: Path):
    with path.open(encoding="utf-8") as handle:
        return yaml.safe_load(handle) or {}


def _basepath(docs_config: dict) -> str:
    instances = docs_config.get("instances") or []
    if not instances:
        return ""
    url = instances[0].get("url", "")
    _, _, path = url.partition("/")
    return f"/{path}" if path else ""


def _segment(entry: dict, name_key: str) -> str | None:
    """URL segment contributed by a product/section/tab entry, or ``None`` when omitted."""
    if entry.get("skip-slug"):
        return None
    if entry.get("slug"):
        return str(entry["slug"])
    name = entry.get(name_key)
    return slugify(str(name)) if name else None


def _join(prefix: str, segment: str | None) -> str:
    return f"{prefix}/{segment}" if segment else prefix


def load_site(fern_dir: Path) -> Site:
    docs_config = _load_yaml(fern_dir / "docs.yml")
    site = Site(root=fern_dir, basepath=_basepath(docs_config))
    site.languages = [
        str(entry["lang"])
        for entry in docs_config.get("translations") or []
        if isinstance(entry, dict) and entry.get("lang") and not entry.get("default")
    ]
    for redirect in docs_config.get("redirects") or []:
        if isinstance(redirect, dict) and "source" in redirect and "destination" in redirect:
            site.redirects[str(redirect["source"])] = str(redirect["destination"])

    products = docs_config.get("products")
    if products:
        for product in products:
            if "path" not in product:
                continue  # link-only product switcher entries (``href``)
            product_file = (fern_dir / product["path"]).resolve()
            # Products contribute a URL segment only through an explicit ``slug``.
            product_url = _join(site.basepath, str(product["slug"]) if product.get("slug") else None)
            name = str(product.get("display-name", product_file.stem))
            _load_navigation_file(site, product_file, Scope(name, product_url, product_url))
    else:
        # Single-product site: navigation (or versions) lives directly in docs.yml.
        _load_navigation(site, fern_dir / "docs.yml", docs_config, Scope("docs", site.basepath, site.basepath))
    return site


def _load_navigation_file(site: Site, nav_file: Path, scope: Scope) -> None:
    if not nav_file.exists():
        site.problems.append((nav_file, "navigation file referenced from docs.yml does not exist"))
        return
    _load_navigation(site, nav_file, _load_yaml(nav_file), scope)


def _load_navigation(site: Site, nav_file: Path, config: dict, scope: Scope) -> None:
    if "tabs" in config:
        tabs = config.get("tabs") or {}
        for entry in config.get("navigation") or []:
            tab_id = entry.get("tab")
            tab = tabs.get(tab_id, {}) if tab_id else {}
            tab_scope = scope.within(_segment({**tab, "slug": tab.get("slug", tab_id)}, "display-name")) if tab_id else scope
            _walk_navigation(site, nav_file, entry.get("layout") or [], tab_scope, hidden=bool(entry.get("hidden")))
    elif "versions" in config:
        for version in config.get("versions") or []:
            version_url = _join(scope.prefix, _segment(version, "display-name"))
            if not version.get("path"):
                site.generated_prefixes.append(version_url)  # ``ref``-backed versions live in another git tree
                continue
            version_file = (nav_file.parent / version["path"]).resolve()
            _load_navigation_file(site, version_file, Scope(scope.product, version_url, version_url))
    else:
        _walk_navigation(site, nav_file, config.get("navigation") or [], scope, hidden=False)


def _walk_navigation(site: Site, nav_file: Path, items: list, scope: Scope, hidden: bool) -> None:
    for item in items:
        if not isinstance(item, dict):
            continue
        item_hidden = hidden or bool(item.get("hidden"))
        if "page" in item:
            _add_page(site, nav_file, item, scope, item_hidden)
        elif "section" in item:
            section_scope = scope.within(_segment(item, "section"))
            if item.get("path"):
                _add_page(site, nav_file, {**item, "page": item["section"], "slug": None}, scope, item_hidden, url=section_scope.prefix)
            _walk_navigation(site, nav_file, item.get("contents") or [], section_scope, item_hidden)
        elif "api" in item:
            api_scope = scope.within(_segment(item, "api"))
            site.generated_prefixes.append(api_scope.prefix)
            _walk_navigation(site, nav_file, item.get("layout") or [], api_scope, item_hidden)
        elif "folder" in item:
            # Folder pages are derived from filenames; accept links under the folder rather than modelling them.
            folder_dir = (nav_file.parent / str(item["folder"])).resolve()
            if folder_dir.is_dir():
                site.generated_prefixes.append(scope.within(item.get("slug") or folder_dir.name).prefix)
            else:
                site.problems.append((nav_file, f"folder does not exist: {item['folder']}"))
        elif "changelog" in item:
            site.generated_prefixes.append(_join(scope.prefix, item.get("slug") or "changelog"))
            changelog_dir = (nav_file.parent / item["changelog"]).resolve()
            if changelog_dir.exists():
                site.changelog_dirs.append(changelog_dir)
            else:
                site.problems.append((nav_file, f"changelog directory does not exist: {item['changelog']}"))
        # ``link`` entries point at external URLs and contribute no pages.


def _add_page(site: Site, nav_file: Path, item: dict, scope: Scope, hidden: bool, url: str | None = None) -> None:
    page_path = (nav_file.parent / str(item["path"])).resolve()
    if not page_path.exists():
        site.problems.append((nav_file, f"page path does not exist: {item['path']}"))
        return
    frontmatter = parse_frontmatter(page_path.read_text(encoding="utf-8", errors="replace"))
    if frontmatter.get("slug"):
        url = _join(scope.product_url, str(frontmatter["slug"]).strip("/"))
    elif url is None:
        url = _join(scope.prefix, str(item.get("slug") or slugify(str(item["page"]))))
    site.pages.append(Page(path=page_path, url=url, product=scope.product, hidden=hidden, frontmatter=frontmatter))
