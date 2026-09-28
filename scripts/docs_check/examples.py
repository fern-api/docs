"""Validate the ``docs.yml`` and ``generators.yml`` examples in the docs against Fern's published schemas.

Every fenced ``yaml`` block whose info string names ``docs.yml`` or
``generators.yml`` (``\\`\\`\\`yaml docs.yml``, ``\\`\\`\\`yaml title="generators.yml"``)
is parsed and validated against the JSON schema Fern publishes at
``https://schema.buildwithfern.dev``. Examples are fragments, so ``required``
constraints are dropped and a block whose keys are not root keys is matched
against the schema object that declares them (a bare ``config:`` block, a
single named group); unknown keys, wrong types and bad enum values still fail.
Elided values (``...``) and ``<Markdown>`` interpolations are ignored, and
blocks whose top level is not a mapping (a lone navigation item) are skipped.

Run with ``python3 -m scripts.docs_check.examples``. Schemas are fetched live
so the nightly run catches docs that drift from the current CLI; pass
``--schema-dir`` to validate against local copies. Known-bad examples live in
``examples-baseline.txt`` until fixed.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.request
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

import yaml

from .smoke import DEFAULT_FERN_DIR, USER_AGENT

SCHEMA_BASE = "https://schema.buildwithfern.dev"
SCHEMAS = {"docs.yml": "docs-yml.json", "generators.yml": "generators-yml.json"}

FENCE_RE = re.compile(r"^(?P<indent>[ \t]*)```(?P<info>ya?ml\b[^\n]*)\n(?P<body>.*?)\n(?P=indent)```[ \t]*$", re.MULTILINE | re.DOTALL)
FILE_RE = re.compile(r"(?<![\w./-])(docs|generators)\.yml")
BASELINE = Path(__file__).resolve().parent / "examples-baseline.txt"


@dataclass(frozen=True)
class Example:
    path: Path
    line: int
    kind: str
    body: str


@dataclass(frozen=True)
class Finding:
    path: str
    line: int
    kind: str
    message: str


def extract_examples(path: Path, text: str) -> list[Example]:
    examples: list[Example] = []
    for match in FENCE_RE.finditer(text):
        named = FILE_RE.search(match.group("info"))
        if not named:
            continue
        indent = match.group("indent")
        body = "\n".join(line[len(indent):] if line.startswith(indent) else line for line in match.group("body").splitlines())
        examples.append(Example(path, text.count("\n", 0, match.start()) + 2, named.group(0), body))
    return examples


def strip_required(schema: object) -> object:
    """Copy of ``schema`` with every ``required`` list removed so fragments validate."""
    if isinstance(schema, dict):
        return {key: strip_required(value) for key, value in schema.items() if key != "required"}
    if isinstance(schema, list):
        return [strip_required(item) for item in schema]
    return schema


def load_schemas(schema_dir: Path | None, timeout: float) -> dict[str, dict]:
    schemas: dict[str, dict] = {}
    for kind, name in SCHEMAS.items():
        if schema_dir:
            raw = (schema_dir / name).read_text(encoding="utf-8")
        else:
            request = urllib.request.Request(f"{SCHEMA_BASE}/{name}", headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(request, timeout=timeout) as response:
                raw = response.read().decode("utf-8")
        schemas[kind] = strip_required(json.loads(raw))
    return schemas


def _leaves(error) -> list:
    return [leaf for child in error.context for leaf in _leaves(child)] if error.context else [error]


def _describe(error) -> str:
    where = "/".join(str(part) for part in error.absolute_path) or "(top level)"
    return f"{where}: {error.message}"


ELLIPSIS_LINE_RE = re.compile(r"^[ \t]*(?:-[ \t]+)?(?:\.\.\.|#[ \t]*\.\.\.)[ \t]*$", re.MULTILINE)
PLACEHOLDERS = (None, "...", "…")


def _object_schemas(schema: dict) -> list[dict]:
    """The root object followed by every named object definition, ``$ref`` and ``oneOf`` wrappers resolved."""
    definitions = schema.get("definitions", {})

    def resolve(node: dict) -> list[dict]:
        if "$ref" in node:
            return resolve(definitions[node["$ref"].rsplit("/", 1)[1]])
        if "properties" in node:
            return [node]
        return [obj for branch in node.get("oneOf", []) + node.get("anyOf", []) for obj in resolve(branch)]

    return [schema] + [obj for definition in definitions.values() for obj in resolve(definition)]


def fragment_schemas(data: dict, schema: dict) -> list[dict]:
    """Schemas a fragment may be validated against: the root when its keys are root keys, else every
    definition that declares all of them (a bare ``config:`` or ``output:`` block, for instance)."""
    keys = set(data)
    return [
        {**candidate, "definitions": schema.get("definitions", {})}
        for candidate in _object_schemas(schema)
        if keys <= set(candidate.get("properties", {}))
    ]


def validate_example(example: Example, schema: dict) -> list[str]:
    import jsonschema  # optional dependency, installed by the workflow

    try:
        data = yaml.safe_load(ELLIPSIS_LINE_RE.sub("", example.body))
    except yaml.YAMLError as exc:
        return [f"not valid YAML: {str(exc).splitlines()[0]}"]
    if not isinstance(data, dict) or not data:
        return []
    # A block keyed by a single user-chosen name (a group, an API name) is the value underneath.
    while len(data) == 1 and isinstance(next(iter(data.values())), dict) and not fragment_schemas(data, schema):
        data = next(iter(data.values()))
    targets = fragment_schemas(data, schema)
    if not targets:
        return [f"(top level): no {example.kind} object declares the key(s) {', '.join(sorted(map(str, data)))}"]
    # Several definitions may share the fragment's keys (``github:`` modes); report against the best fit.
    errors: list = []
    for target in targets:
        candidate = sorted(jsonschema.Draft7Validator(target).iter_errors(data), key=lambda error: list(error.absolute_path))
        if not candidate:
            return []
        if not errors or len(candidate) < len(errors):
            errors = candidate
    seen: set[str] = set()
    messages: list[str] = []
    for error in errors:
        # ``anyOf``/``oneOf`` errors list every branch; the deepest leaves are the branch the author meant.
        leaves = _leaves(error)
        depth = max(len(leaf.absolute_path) for leaf in leaves)
        by_path: dict[str, list] = {}
        for leaf in leaves:
            if len(leaf.absolute_path) == depth:
                by_path.setdefault(_describe(leaf).split(":", 1)[0], []).append(leaf)
        for candidates in by_path.values():
            # One message per location; among sibling branches the one rejecting the fewest keys is the closest fit.
            best = min(candidates, key=lambda leaf: (leaf.message.count("'"), leaf.message))
            if any(best.instance is p or best.instance == p for p in PLACEHOLDERS) or (isinstance(best.instance, str) and best.instance.startswith("<")):
                continue  # elided or templated value
            message = _describe(best)
            if message not in seen:
                seen.add(message)
                messages.append(message)
    return messages


def load_baseline(path: Path) -> Counter[str]:
    """One line per known finding; a repeated line suppresses that many occurrences."""
    if not path.is_file():
        return Counter()
    return Counter(line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip() and not line.startswith("#"))


def apply_baseline(findings: list[Finding], baseline: Counter[str]) -> tuple[list[Finding], list[str]]:
    """Each baseline line consumes one matching finding, so a new copy of a known error still fails; returns (active, stale keys)."""
    remaining = Counter(baseline)
    active: list[Finding] = []
    for finding in findings:
        key = baseline_key(finding)
        if remaining[key] > 0:
            remaining[key] -= 1
        else:
            active.append(finding)
    return active, sorted(remaining.elements())


def baseline_key(finding: Finding) -> str:
    return f"{finding.path} [{finding.kind}] {finding.message}"


def run(fern_dir: Path, schemas: dict[str, dict]) -> tuple[list[Finding], int]:
    findings: list[Finding] = []
    total = 0
    for path in sorted(fern_dir.rglob("*.mdx")):
        if "translations" in path.parts or "cli-changelog" in path.parts:  # generated content
            continue
        for example in extract_examples(path, path.read_text(encoding="utf-8")):
            total += 1
            for message in validate_example(example, schemas[example.kind]):
                findings.append(Finding(str(example.path.relative_to(fern_dir.parent)), example.line, example.kind, message))
    return findings, total


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="docs_check.examples", description="Validate docs.yml and generators.yml examples in the docs against Fern's schemas.")
    parser.add_argument("--fern-dir", type=Path, default=DEFAULT_FERN_DIR)
    parser.add_argument("--schema-dir", type=Path, help="directory holding docs-yml.json and generators-yml.json instead of fetching them")
    parser.add_argument("--timeout", type=float, default=30)
    parser.add_argument("--json", type=Path, help="write findings as JSON to this path")
    parser.add_argument("--baseline", type=Path, default=BASELINE, help="known findings to suppress, one '<path> [<kind>] <message>' per line")
    parser.add_argument("--write-baseline", action="store_true", help="rewrite the baseline with the current findings")
    args = parser.parse_args(argv)

    schemas = load_schemas(args.schema_dir, args.timeout)
    all_findings, total = run(args.fern_dir.resolve(), schemas)
    if args.write_baseline:
        args.baseline.write_text(
            "# Known invalid docs.yml/generators.yml examples suppressed by docs_check.examples. One '<path> [<kind>] <message>' per line.\n"
            "# Remove a line once the example is fixed; regenerate with --write-baseline.\n" + "".join(f"{baseline_key(f)}\n" for f in all_findings),
            encoding="utf-8",
        )
    baseline = load_baseline(args.baseline)
    findings, stale = apply_baseline(all_findings, baseline)
    for key in stale:
        print(f"note: baseline entry no longer reported, remove it: {key}")

    github = os.environ.get("GITHUB_ACTIONS")
    for finding in findings:
        if github:
            print(f"::error file={finding.path},line={finding.line},title=invalid {finding.kind} example::{finding.message}")
        else:
            print(f"FAIL {finding.path}:{finding.line} [{finding.kind}] {finding.message}")
    print(f"\n{len(findings)} problems across {total} examples ({len(all_findings) - len(findings)} suppressed by baseline)")

    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as handle:
            handle.write(f"## docs.yml / generators.yml examples\n\n**{len(findings)} problems** across {total} examples.\n\n")
            handle.writelines(f"- `{f.path}:{f.line}` ({f.kind}) — {f.message}\n" for f in findings[:200])
    if args.json:
        args.json.write_text(json.dumps({"examples": total, "findings": [f.__dict__ for f in findings]}, indent=2), encoding="utf-8")
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
