"""Regression checks without executing imported website scripts or submitting forms."""
import hashlib
from html.parser import HTMLParser
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from validate_site import ROOT, Page, audit, resolve


class StaticSiteTests(unittest.TestCase):
    def test_all_assets_links_scripts_and_sitemap(self):
        result = audit()
        self.assertEqual(result["errors"], [])
        self.assertEqual(result["html_pages"], result["sitemap_urls"])

    def test_excessive_relative_reference_is_not_silently_clamped(self):
        self.assertEqual(resolve(Path("contact.html"), "../../../../../../js/site-config.js")[0], "TRAVERSAL")
        self.assertEqual(resolve(Path("guides/storm-damage.html"), "../js/site-config.js")[0], ROOT / "js/site-config.js")

    def test_query_strings_fragments_and_same_site_absolute_urls(self):
        target, fragment = resolve(Path("services/commercial.html"), "https://www.tridentroofingandexteriors.ca/contact.html?project=commercial#consultation-form")
        self.assertEqual(target, ROOT / "contact.html")
        self.assertEqual(fragment, "consultation-form")
        self.assertIn(fragment, Page(target.read_text()).ids)
        self.assertIsNone(resolve(Path("index.html"), "https://tridentroofingandexteriors.ca.attacker.example/contact.html"))

    def test_inline_parser_captures_scripts_json_css_and_handlers(self):
        page = Page('<div id="target" onclick="return false"></div><style>a{background:url(img.png)}</style><script>const a=1;</script><script type="application/ld+json">{"a":1}</script>')
        self.assertIn("target", page.ids)
        self.assertEqual(page.scripts, ["const a=1;"])
        self.assertEqual(page.jsonld, ['{"a":1}'])
        self.assertEqual(page.handlers, ["return false"])
        self.assertIn(("style", "url", "img.png"), page.refs)

    def test_all_preview_sources_are_noindex_with_recoverable_production_seo(self):
        manifest = json.loads((ROOT / "data/website/production-seo.json").read_text())
        files = {p.relative_to(ROOT).as_posix() for p in ROOT.rglob("*.html") if ".git" not in p.parts}
        self.assertEqual(files, set(manifest["html_robots"]))
        for relative in files:
            self.assertIn('<meta name="robots" content="noindex,nofollow">', (ROOT / relative).read_text(), relative)
        self.assertEqual((ROOT / "robots.txt").read_text(), "User-agent: *\nDisallow: /\n")
        self.assertIn("Sitemap:", manifest["robots_txt"])

    def test_production_restore_dry_run_changes_no_repository_bytes(self):
        paths = [p for p in ROOT.rglob("*.html") if ".git" not in p.parts] + [ROOT / "robots.txt", ROOT / "js/site-config.js"]
        before = {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
        result = subprocess.run([sys.executable, str(ROOT / "scripts/prepare-production.py")], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("DRY RUN:", result.stdout)
        self.assertIn("No files changed", result.stdout)
        self.assertEqual(before, {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in paths})

    def test_production_restore_plan_and_idempotence_in_disposable_fixture(self):
        spec = importlib.util.spec_from_file_location("prepare_production", ROOT / "scripts/prepare-production.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "data/website").mkdir(parents=True)
            (root / "index.html").write_text('<meta name="robots" content="noindex,nofollow">')
            (root / "robots.txt").write_text("User-agent: *\nDisallow: /\n")
            (root / "js").mkdir()
            (root / "js/site-config.js").write_text("releaseMode: 'preview'")
            original = '<meta name="robots" content="index, follow">'
            manifest = {"html_robots": {"index.html": original}, "robots_txt": "User-agent: *\nAllow: /\n"}
            (root / "data/website/production-seo.json").write_text(json.dumps(manifest))
            plan = module.changes(root)
            self.assertEqual(len(plan), 3)
            self.assertIn(("js/site-config.js", b"releaseMode: 'production'"), plan)
            for relative, data in plan:
                (root / relative).write_bytes(data)
            self.assertEqual((root / "index.html").read_text(), original)
            self.assertEqual(module.changes(root), [])

    def test_preview_guard_static_contract(self):
        source = (ROOT / "js/site-config.js").read_text()
        self.assertIn("var productionHosts = ['tridentroofingandexteriors.ca', 'www.tridentroofingandexteriors.ca'];", source)
        self.assertIn("window.location.hostname === 'tridentre.github.io'", source)
        self.assertIn("productionHosts.indexOf(window.location.hostname) === -1", source)
        self.assertNotIn("host.indexOf('tridentroofingandexteriors.ca')", source)
        self.assertIn("path.charAt(1) === '/'", source)
        self.assertIn("productionHosts.indexOf(url.hostname) !== -1", source)
        self.assertIn("!url.username && !url.password", source)
        self.assertIn("url.pathname + url.search + url.hash", source)
        self.assertIn("if (!isPreview) return;", source)
        self.assertIn("Website preview. Please do not submit real customer information.", source)
        self.assertIn("robots.content = 'noindex,nofollow'", source)
        # Only inspect source; no website JS is evaluated by this test.

    def test_commercial_scope_navigation_schema_and_ctas(self):
        source = (ROOT / "services/commercial.html").read_text()
        self.assertIn("For Business Owners &amp; Property Managers", source)
        self.assertIn("/contact.html?project=commercial#consultation-form", source)
        for prohibited in ("TPO", "EPDM", "mod-bit", "maintenance contract", "zero risk", "guaranteed"):
            self.assertNotIn(prohibited.lower(), source.lower())
        home = (ROOT / "index.html").read_text()
        nav = home.split('<nav class="desktop-nav">')[1].split("</nav>")[0]
        self.assertIn('href="services/commercial.html" class="nav-link">Commercial', nav)
        # The original desktop-nav is also the hamburger's mobile menu.
        app = (ROOT / "js/app.js").read_text()
        self.assertIn("nav.classList.toggle('active')", app)
        hub = Page((ROOT / "services/index.html").read_text())
        itemlist = [json.loads(block) for block in hub.jsonld if json.loads(block).get("@type") == "ItemList"][0]
        self.assertEqual(itemlist["itemListElement"][-1]["name"], "Commercial Roofing & Exteriors")

    def test_form_is_isolated_and_no_js_cannot_put_personal_details_in_url(self):
        app = (ROOT / "js/app.js").read_text()
        self.assertNotIn("fetch('/api/submit'", app)
        html = (ROOT / "contact.html").read_text()
        self.assertIn('method="post" action="/contact.html"', html)
        self.assertIn('class="btn btn-primary btn-xl w-100" disabled', html)
        self.assertIn("<noscript>", html)
        self.assertIn('src="js/website-form.js"', html)
        source = (ROOT / "js/website-form.js").read_text()
        self.assertIn("host === PREVIEW_HOST", source)
        self.assertIn("credentials: 'omit'", source)
        self.assertIn("data.submission_id = requestId", source)
        self.assertIn("result.ok !== true", source)
        self.assertIn("releaseMode === 'production'", source)



if __name__ == "__main__":
    unittest.main()
