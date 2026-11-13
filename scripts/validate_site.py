#!/usr/bin/env python3
"""Offline, non-executing static-site audit. Optional public GET-only live comparison."""
import argparse
import concurrent.futures
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import posixpath
import re
import subprocess
import tempfile
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://www.tridentroofingandexteriors.ca"
HOSTS = {"www.tridentroofingandexteriors.ca", "tridentroofingandexteriors.ca"}


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.refs, self.ids, self.scripts, self.jsonld, self.text, self.handlers = [], set(), [], [], [], []
        self.active, self.buffer, self.hidden = None, [], 0
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        self.handlers.extend(value for key, value in attrs if key.startswith("on") and value)
        if a.get("id"):
            self.ids.add(a["id"])
        if tag == "a" and a.get("name"):
            self.ids.add(a["name"])
        for attr in ("href", "src", "poster", "action", "data-src"):
            if a.get(attr):
                self.refs.append((tag, attr, a[attr]))
        if tag == "meta" and a.get("content", "").startswith(("https://", "http://")):
            self.refs.append((tag, "content", a["content"]))
        if tag == "style":
            self.buffer = []
            self.active = "css"
        for part in a.get("srcset", "").split(","):
            if part.strip():
                self.refs.append((tag, "srcset", part.strip().split()[0]))
        for url in re.findall(r"url\(['\"]?([^)'\"\s]+)", a.get("style", "")):
            self.refs.append((tag, "style", url))
        if tag in ("script", "style"):
            self.hidden += 1
        if tag == "script" and not a.get("src"):
            self.active = "json" if a.get("type") == "application/ld+json" else "js"
            self.buffer = []

    def handle_endtag(self, tag):
        if tag == "style" and self.active == "css":
            for url in re.findall(r"url\(['\"]?([^)'\"\s]+)", "".join(self.buffer)):
                self.refs.append(("style", "url", url))
            self.active = None
        if tag == "script" and self.active:
            (self.jsonld if self.active == "json" else self.scripts).append("".join(self.buffer))
            self.active = None
        if tag in ("script", "style"):
            self.hidden = max(0, self.hidden - 1)

    def handle_data(self, data):
        if self.active:
            self.buffer.append(data)
        if not self.hidden:
            self.text.append(data)


def resolve(source, raw):
    u = urllib.parse.urlsplit(raw)
    if u.scheme in ("mailto", "tel", "data", "javascript") or (u.netloc and u.hostname not in HOSTS):
        return None
    # Detect traversal even though browsers clamp it at the origin root.
    depth = len(source.parent.parts)
    if not u.netloc and not u.path.startswith("/"):
        for segment in u.path.split("/"):
            if segment == "..":
                depth -= 1
                if depth < 0:
                    return ("TRAVERSAL", u.fragment)
            elif segment not in ("", "."):
                depth += 1
    path = urllib.parse.unquote(u.path)
    target = posixpath.normpath(path.lstrip("/") if path.startswith("/") or u.netloc else str(source.parent / path))
    if not path:
        target = str(source)
    p = ROOT / target
    if p.is_dir():
        p /= "index.html"
    if not p.exists() and not p.suffix and p.with_suffix(".html").exists():
        p = p.with_suffix(".html")
    return p, urllib.parse.unquote(u.fragment)


def audit():
    html = sorted(p for p in ROOT.rglob("*.html") if ".git" not in p.parts)
    pages = {p: Page(p.read_text()) for p in html}
    errors, warnings, checks = [], [], 0
    external = set()
    for source, page in pages.items():
        for tag, attr, raw in page.refs:
            checks += 1
            result = resolve(source.relative_to(ROOT), raw)
            if result is None:
                if raw.startswith(("http:", "https:", "//")):
                    external.add(raw)
                continue
            p, fragment = result
            if p == "TRAVERSAL":
                errors.append(f"{source.relative_to(ROOT)}: excessive-relative {attr}={raw}")
            elif not p.is_file():
                errors.append(f"{source.relative_to(ROOT)}: missing {attr}={raw} -> {p.relative_to(ROOT)}")
            elif fragment and p in pages and fragment not in pages[p].ids:
                errors.append(f"{source.relative_to(ROOT)}: missing fragment {raw}")
        for i, block in enumerate(page.jsonld):
            try:
                json.loads(block)
            except ValueError as exc:
                errors.append(f"{source.relative_to(ROOT)} JSON-LD {i}: {exc}")
    for css in ROOT.glob("css/*.css"):
        for raw in re.findall(r"url\(\s*['\"]?([^)'\"\s]+)", css.read_text()):
            checks += 1
            result = resolve(css.relative_to(ROOT), raw)
            if result and (result[0] == "TRAVERSAL" or not result[0].is_file()):
                errors.append(f"{css.relative_to(ROOT)}: missing CSS url {raw}")
    # Parse only: node --check never executes the saved website JavaScript.
    syntax = 0
    with tempfile.TemporaryDirectory() as tmp:
        scripts = list(ROOT.glob("js/*.js"))
        for source, page in pages.items():
            for i, block in enumerate(page.scripts):
                p = Path(tmp) / f"{source.stem}-{i}.js"
                p.write_text(block)
                scripts.append(p)
            for i, block in enumerate(page.handlers):
                p = Path(tmp) / f"{source.stem}-handler-{i}.js"
                p.write_text("function handler(event) {\n" + block + "\n}\n")
                scripts.append(p)
        for p in scripts:
            result = subprocess.run(["node", "--check", str(p)], capture_output=True, text=True)
            syntax += 1
            if result.returncode:
                errors.append(f"JS syntax {p.name}: {result.stderr}")
    sitemap = ET.parse(ROOT / "sitemap.xml")
    urls = [e.text for e in sitemap.iter() if e.tag.endswith("}loc") or e.tag == "loc"]
    for url in urls:
        p, _ = resolve(Path("index.html"), url)
        if not p.is_file():
            errors.append(f"Sitemap missing: {url}")
    return {"html_pages": len(pages), "references_checked": checks, "js_blocks_checked": syntax,
            "jsonld_blocks_parsed": sum(len(page.jsonld) for page in pages.values()),
            "sitemap_urls": len(urls), "external_urls_not_requested": sorted(external),
            "errors": errors, "warnings": warnings}


def compare_live():
    files = sorted(p for p in ROOT.rglob("*.html") if ".git" not in p.parts)
    assets = sorted(p for directory in ("js", "css", "assets") for p in (ROOT / directory).rglob("*") if p.is_file())

    def fetch(p):
        relative = p.relative_to(ROOT).as_posix()
        url = ORIGIN + ("/" if relative == "index.html" else "/" + relative)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Trident-baseline-validation/1.0"})
            with urllib.request.urlopen(req, timeout=40) as response:
                body, final, status = response.read(), response.url, response.status
            saved = p.read_bytes()
            row = {"path": relative, "url": url, "status": status, "final_url": final,
                   "saved_sha256": hashlib.sha256(saved).hexdigest(), "live_sha256": hashlib.sha256(body).hexdigest(),
                   "bytes_equal": body == saved}
            if p.suffix == ".html":
                a, b = Page(saved.decode()), Page(body.decode())
                text = lambda page: re.sub(r"\s+", " ", " ".join(page.text)).strip()
                row["visible_text_equal"] = text(a) == text(b)
                # Whitespace-normalized source shows mirror path/query rewrites separately.
                row["live_title"] = re.findall(r"<title>(.*?)</title>", body.decode(), re.S)
            return row
        except Exception as exc:
            return {"path": relative, "url": url, "error": str(exc)}

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        rows = list(pool.map(fetch, files + assets))
    return {"origin": ORIGIN, "method": "GET only; response scripts never executed",
            "html_pages": len(files), "asset_files": len(assets), "results": rows}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--live", action="store_true")
    parser.add_argument("--output")
    args = parser.parse_args()
    result = compare_live() if args.live else audit()
    text = json.dumps(result, indent=2)
    if args.output:
        output = ROOT / args.output
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(text + "\n")
    print(text)
    raise SystemExit(1 if result.get("errors") else 0)
