from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from . import checks
from .checks import ERROR, WARNING, Finding
from .site import load_site

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_FERN_DIR = REPO_ROOT / "fern"
DEFAULT_BASELINE = Path(__file__).resolve().parent / "baseline.txt"
CHANGELOG_DIRS = ("products/docs/pages/changelog", "products/dashboard/pages/changelog")


def run_checks(fern_dir: Path) -> tuple[list[Finding], list[dict]]:
    site = load_site(fern_dir)
    findings: list[Finding] = []
    findings += checks.check_navigation(site)
    findings += checks.check_orphans(site)
    findings += checks.check_snippets(site)
    findings += checks.check_unused_snippets(site)
    findings += checks.check_internal_links(site)
    findings += checks.check_assets(site)
    findings += checks.check_changelogs(site, [fern_dir / d for d in CHANGELOG_DIRS if (fern_dir / d).is_dir()])
    findings += checks.check_frontmatter(site)
    findings.sort(key=lambda f: (f.severity != ERROR, f.check, f.path.as_posix(), f.line or 0))
    return findings, checks.coverage(site, findings)


def load_baseline(path: Path) -> set[str]:
    if not path.exists():
        return set()
    return {line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip() and not line.startswith("#")}


def github_annotation(finding: Finding) -> str:
    level = "error" if finding.severity == ERROR else "warning"
    location = f"file={finding.path.as_posix()}" + (f",line={finding.line}" if finding.line else "")
    message = finding.message.replace("%", "%25").replace("\n", "%0A")
    return f"::{level} {location},title={finding.check}::{message}"


def text_line(finding: Finding) -> str:
    location = finding.path.as_posix() + (f":{finding.line}" if finding.line else "")
    return f"{finding.severity:7} {finding.check:24} {location}: {finding.message}"


def markdown_summary(findings: list[Finding], baselined: int, coverage: list[dict]) -> str:
    errors = [f for f in findings if f.severity == ERROR]
    warnings = [f for f in findings if f.severity == WARNING]
    lines = ["## Docs checks", "", f"**{len(errors)} errors**, {len(warnings)} warnings ({baselined} known issues suppressed by baseline).", ""]
    lines += ["### Coverage", "", "| Product | Pages | Hidden | No description | Stub pages | Broken links |", "|---|---:|---:|---:|---:|---:|"]
    for row in coverage:
        lines.append(f"| {row['product']} | {row['pages']} | {row['hidden']} | {row['missing_description']} | {row['stub_pages']} | {row['broken_links']} |")
    lines.append("")
    by_check: dict[str, int] = {}
    for finding in findings:
        by_check[finding.check] = by_check.get(finding.check, 0) + 1
    if by_check:
        lines += ["### Findings by check", "", "| Check | Count |", "|---|---:|"]
        lines += [f"| {check} | {count} |" for check, count in sorted(by_check.items(), key=lambda kv: -kv[1])]
        lines.append("")
    if errors:
        lines += ["### Errors", ""]
        lines += [f"- `{f.path.as_posix()}`" + (f":{f.line}" if f.line else "") + f" — **{f.check}**: {f.message}" for f in errors[:200]]
        lines.append("")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="docs_check", description="Static checks for the Fern docs source tree.")
    parser.add_argument("--fern-dir", type=Path, default=DEFAULT_FERN_DIR)
    parser.add_argument("--baseline", type=Path, default=DEFAULT_BASELINE, help="file of known findings to suppress (one '<check> <path> <message>' per line)")
    parser.add_argument("--write-baseline", action="store_true", help="rewrite the baseline file with all current findings")
    parser.add_argument("--format", choices=("text", "github"), default="github" if os.environ.get("GITHUB_ACTIONS") else "text")
    parser.add_argument("--json", type=Path, help="write the full report as JSON to this path")
    parser.add_argument("--summary", type=Path, help="append a Markdown summary to this path (defaults to $GITHUB_STEP_SUMMARY)")
    parser.add_argument("--strict", action="store_true", help="exit non-zero on warnings as well as errors")
    parser.add_argument("--only", nargs="*", help="only report these checks")
    args = parser.parse_args(argv)
    if args.write_baseline and args.only:
        parser.error("--write-baseline would drop every check not listed in --only")

    findings, coverage = run_checks(args.fern_dir.resolve())
    if args.only:
        findings = [f for f in findings if f.check in args.only]

    if args.write_baseline:
        args.baseline.write_text(
            "# Known findings suppressed by docs_check. One '<check> <path> <message>' per line.\n"
            "# Remove a line once the issue is fixed; regenerate with --write-baseline.\n"
            + "".join(sorted({f.key() + "\n" for f in findings})),
            encoding="utf-8",
        )
        print(f"wrote {args.baseline}")
        return 0

    baseline = load_baseline(args.baseline)
    active = [f for f in findings if f.key() not in baseline]
    suppressed = len(findings) - len(active)
    stale = sorted(baseline - {f.key() for f in findings})
    for key in stale:
        print(f"note: baseline entry no longer reported, remove it: {key}")

    for finding in active:
        print(github_annotation(finding) if args.format == "github" else text_line(finding))

    errors = sum(f.severity == ERROR for f in active)
    warnings = sum(f.severity == WARNING for f in active)
    print(f"\n{errors} errors, {warnings} warnings ({suppressed} suppressed by baseline)")

    summary_path = args.summary or (Path(os.environ["GITHUB_STEP_SUMMARY"]) if os.environ.get("GITHUB_STEP_SUMMARY") else None)
    if summary_path:
        with summary_path.open("a", encoding="utf-8") as handle:
            handle.write(markdown_summary(active, suppressed, coverage))
    if args.json:
        args.json.write_text(
            json.dumps(
                {
                    "errors": errors,
                    "warnings": warnings,
                    "suppressed": suppressed,
                    "coverage": coverage,
                    "findings": [
                        {"check": f.check, "severity": f.severity, "path": f.path.as_posix(), "line": f.line, "message": f.message}
                        for f in active
                    ],
                },
                indent=2,
            ),
            encoding="utf-8",
        )

    if errors or (args.strict and warnings):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
