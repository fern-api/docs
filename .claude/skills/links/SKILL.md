---
name: links
description: >
  TRIGGER when: adding, modifying, or updating any internal link to another documentation page
  in .mdx or .md files. This includes creating new links, editing existing link URLs, or
  moving/renaming pages that affect links.
  DO NOT TRIGGER for: external URLs (https://...), image paths, snippet includes (<Markdown src="..."/>),
  or same-page anchor links (#section).
---

When adding or modifying internal links, follow the link rules in `AGENTS.md` under "Link checking".

**Key rule**: Internal links use `/learn/...` URL paths built from the YAML config — never relative paths or file paths on disk. Always look up the slugs in the YAML files before writing a link.
