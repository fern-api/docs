#!/usr/bin/env python3
"""
Script to map changed .mdx files to their URL slugs based on navigation YAML files.

This script parses the Fern docs navigation structure and builds a mapping from
file paths to URL slugs, then outputs the slugs for any changed .mdx files.
"""

import os
import re
import sys
import yaml
from pathlib import Path


def slugify(text: str) -> str:
    """Convert text to a URL-friendly slug."""
    # Convert to lowercase and replace spaces with hyphens
    slug = text.lower().replace(" ", "-")
    # Remove any characters that aren't alphanumeric, hyphens, or underscores
    slug = re.sub(r"[^a-z0-9\-_]", "", slug)
    return slug


def get_page_slug(item: dict, default_slug: str) -> str:
    """Get the slug for a page item."""
    if "slug" in item:
        return item["slug"]
    return default_slug


def get_section_slug(item: dict) -> str | None:
    """Get the slug for a section item."""
    if item.get("skip-slug"):
        return None
    if "slug" in item:
        return item["slug"]
    if "section" in item:
        return slugify(item["section"])
    return None


def parse_navigation(
    nav_items: list,
    base_path: str,
    current_slug_path: list[str],
    file_to_slug: dict[str, str],
    yml_dir: Path,
) -> None:
    """Recursively parse navigation items and build file-to-slug mapping."""
    for item in nav_items:
        if isinstance(item, dict):
            # Handle page items
            if "page" in item and "path" in item:
                file_path = item["path"]
                # Resolve the file path relative to the yml directory
                if file_path.startswith("./"):
                    file_path = file_path[2:]
                full_path = (yml_dir / file_path).resolve()
                
                # Get the page slug
                filename = Path(file_path).stem  # Remove .mdx extension
                page_slug = get_page_slug(item, filename)
                
                # Build the full URL slug
                slug_parts = current_slug_path + [page_slug]
                full_slug = "/" + "/".join(slug_parts)
                
                # Store the mapping using relative path from repo root
                try:
                    rel_path = full_path.relative_to(Path.cwd())
                    file_to_slug[str(rel_path)] = full_slug
                except ValueError:
                    # Path is not relative to cwd, use absolute
                    file_to_slug[str(full_path)] = full_slug
            
            # Handle section items (recursive)
            if "section" in item and "contents" in item:
                section_slug = get_section_slug(item)
                new_slug_path = current_slug_path.copy()
                if section_slug:
                    new_slug_path.append(section_slug)
                parse_navigation(
                    item["contents"],
                    base_path,
                    new_slug_path,
                    file_to_slug,
                    yml_dir,
                )
            
            # Handle changelog items
            if "changelog" in item:
                changelog_path = item["changelog"]
                if changelog_path.startswith("./"):
                    changelog_path = changelog_path[2:]
                changelog_dir = (yml_dir / changelog_path).resolve()
                changelog_slug = item.get("slug", "changelog")
                
                # Map all .mdx files in the changelog directory
                if changelog_dir.exists() and changelog_dir.is_dir():
                    for mdx_file in changelog_dir.glob("**/*.mdx"):
                        try:
                            rel_path = mdx_file.relative_to(Path.cwd())
                            # Changelog entries use their filename as slug
                            entry_slug = mdx_file.stem
                            slug_parts = current_slug_path + [changelog_slug, entry_slug]
                            full_slug = "/" + "/".join(slug_parts)
                            file_to_slug[str(rel_path)] = full_slug
                        except ValueError:
                            pass


def parse_product_yml(
    product_yml_path: Path,
    product_slug: str | None,
    base_url: str,
    file_to_slug: dict[str, str],
) -> None:
    """Parse a product's navigation YAML file."""
    if not product_yml_path.exists():
        return
    
    with open(product_yml_path, "r") as f:
        content = yaml.safe_load(f)
    
    if not content or "navigation" not in content:
        return
    
    yml_dir = product_yml_path.parent
    slug_path = [base_url]
    if product_slug:
        slug_path.append(product_slug)
    
    parse_navigation(
        content["navigation"],
        str(yml_dir),
        slug_path,
        file_to_slug,
        yml_dir,
    )


def main():
    """Main function to build file-to-slug mapping and output slugs for changed files."""
    # Get the repo root (assuming we're running from repo root)
    repo_root = Path.cwd()
    fern_dir = repo_root / "fern"
    
    # Read the main docs.yml to get products
    docs_yml_path = fern_dir / "docs.yml"
    if not docs_yml_path.exists():
        print("Error: fern/docs.yml not found", file=sys.stderr)
        sys.exit(1)
    
    with open(docs_yml_path, "r") as f:
        docs_config = yaml.safe_load(f)
    
    # Get the base URL from instances (e.g., "learn")
    base_url = "learn"  # Default
    if "instances" in docs_config and docs_config["instances"]:
        instance_url = docs_config["instances"][0].get("url", "")
        # Extract the path part (e.g., "fern.docs.buildwithfern.com/learn" -> "learn")
        if "/" in instance_url:
            base_url = instance_url.split("/")[-1]
    
    file_to_slug: dict[str, str] = {}
    
    # Parse each product's navigation
    if "products" in docs_config:
        for product in docs_config["products"]:
            if "path" not in product:
                continue
            
            product_path = product["path"]
            if product_path.startswith("./"):
                product_path = product_path[2:]
            
            product_yml_path = fern_dir / product_path
            product_slug = product.get("slug")
            
            parse_product_yml(product_yml_path, product_slug, base_url, file_to_slug)
    
    # Read changed files from stdin or command line args
    changed_files = []
    if len(sys.argv) > 1:
        changed_files = sys.argv[1:]
    else:
        # Read from stdin
        for line in sys.stdin:
            line = line.strip()
            if line:
                changed_files.append(line)
    
    # Output the slugs for changed .mdx files
    results = []
    for changed_file in changed_files:
        if not changed_file.endswith(".mdx"):
            continue
        
        # Normalize the path
        normalized_path = str(Path(changed_file))
        
        if normalized_path in file_to_slug:
            slug = file_to_slug[normalized_path]
            results.append((changed_file, slug))
    
    # Output results
    for file_path, slug in results:
        print(f"{file_path}|{slug}")


if __name__ == "__main__":
    main()
