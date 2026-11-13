#!/usr/bin/env python3
"""Restore production SEO and enable reviewed production-host form routing. DRY RUN unless --write.

Run --write only after the owner approves production launch. This edits local files;
it does not commit, push, publish, change Pages configuration or alter DNS.
"""
import argparse
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
ROBOTS_META = re.compile(r'<meta\s+name="robots"\s+content="[^"]*"\s*/?>', re.I)


def changes(root):
    manifest = json.loads((root / "data/website/production-seo.json").read_text())
    html_files = {p.relative_to(root).as_posix() for p in root.rglob("*.html") if ".git" not in p.parts}
    if html_files != set(manifest["html_robots"]):
        raise ValueError("HTML pages differ from production-seo.json. Review and update the saved directives before launch.")
    planned = []
    for relative, original in manifest["html_robots"].items():
        path = root / relative
        before = path.read_bytes()
        if len(ROBOTS_META.findall(before.decode())) != 1:
            raise ValueError(f"{relative}: expected exactly one robots meta tag; review before launch")
        after = ROBOTS_META.sub(lambda match: original, before.decode()).encode()
        if before != after:
            planned.append((relative, after))
    robots = manifest["robots_txt"].encode()
    if (root / "robots.txt").read_bytes() != robots:
        planned.append(("robots.txt", robots))
    config = root / "js/site-config.js"
    if config.exists():
        before = config.read_bytes()
        if before.count(b"releaseMode: 'preview'") == 1:
            planned.append(("js/site-config.js", before.replace(b"releaseMode: 'preview'", b"releaseMode: 'production'")))
        elif before.count(b"releaseMode: 'production'") != 1:
            raise ValueError("Expected one reviewed releaseMode in js/site-config.js")
    return planned


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="Write only after explicit production-launch approval")
    args = parser.parse_args()
    planned = changes(ROOT)
    print(f"{'WRITE' if args.write else 'DRY RUN'}: {len(planned)} file(s) would restore recorded production robots directives.")
    for relative, data in planned:
        print(relative)
        if args.write:
            (ROOT / relative).write_bytes(data)
    if not args.write:
        print("No files changed. --write requires explicit production-launch approval; do not run it for preview.")


if __name__ == "__main__":
    main()
