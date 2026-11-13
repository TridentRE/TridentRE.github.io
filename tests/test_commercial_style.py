"""Commercial page structure, honest imagery and shared-shell regression checks."""
from html.parser import HTMLParser
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


class Elements(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.elements = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        self.elements.append((tag, dict(attrs)))


class CommercialStyleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = (ROOT / 'services/commercial.html').read_text()
        cls.elements = Elements(cls.source).elements

    def test_service_page_rhythm_not_service_hub_cards(self):
        sections = [a.get('class', '').split()[0] for t, a in self.elements if t == 'section']
        self.assertEqual(sections, ['service-hero', 'commercial-blueprint', 'commercial-assessment', 'commercial-services', 'commercial-systems', 'commercial-maintenance', 'commercial-faq', 'cta-banner'])
        for removed in ('services-hub-card', 'services-hub-grid', 'service-areas-panel'):
            self.assertNotIn(removed, self.source)
        self.assertEqual(sum(t == 'h1' for t, _ in self.elements), 1)
        self.assertEqual(sum(a.get('class') == 'technical-service' for _, a in self.elements), 4)
        self.assertNotIn('commercial-process', self.source)
        self.assertNotIn('process-steps', self.source)
        self.assertNotIn('01 / INQUIRY', self.source)
        self.assertNotIn('From first inquiry', self.source)

    def test_illustration_does_not_imply_portfolio_work(self):
        main = re.search(r'<main>(.*?)</main>', self.source, re.S).group(1)
        self.assertNotIn('<img', main)
        self.assertIn('Commercial roof-detail illustration.', main)
        self.assertIn('aria-labelledby="roof-desktop-title roof-desktop-desc"', main)
        self.assertIn('aria-labelledby="roof-mobile-title roof-mobile-desc"', main)
        self.assertEqual(main.count('class="diagram-marker"'), 16)
        self.assertIn('class="diagram-legend"', main)
        self.assertIn('class="assembly-inset"', main)
        self.assertIn('not a project photograph or engineering construction specification', main)
        for feature in ('raised flashed curb', 'pipe boot', 'internal drain and sump', 'scupper opening', 'raised overflow', 'cricket', 'core-sample location'):
            self.assertIn(feature, main)

    def test_navy_tokens_and_explicit_light_copy_cannot_regress_to_white_page(self):
        style = re.search(r'<style>(.*?)</style>', self.source, re.S).group(1)
        self.assertIn('.commercial-page .service-hero, .commercial-page .cta-banner { background: var(--hero-bg); }', style)
        self.assertIn('.commercial-page .commercial-blueprint, .commercial-page .commercial-services { background: var(--accent-blue); }', style)
        self.assertIn('.commercial-page .commercial-dark :is(h1, h2, h3, p, li, strong, summary) { color: var(--white); }', style)
        self.assertEqual(self.source.count('commercial-dark section-padding'), 4)
        self.assertIn('color: var(--hero-bg);', style)  # readable ink on cyan CTA

    def test_substantive_commercial_content_and_faq(self):
        main = re.search(r'<main>(.*?)</main>', self.source, re.S).group(1)
        words = re.sub(r'<[^>]+>', ' ', main).split()
        self.assertGreaterEqual(len(words), 1200)
        self.assertLessEqual(len(words), 2200)
        self.assertEqual(main.count('<details'), 5)
        self.assertIn('Commercial roofing.<br>Protect the building.', main)
        self.assertIn('What does a roof core sample establish?', main)
        for detail in ('penetrations', 'transitions', 'flashings', 'seams', 'drainage', 'core sampling', 'properly resealed', 'selected locations', 'Preventative maintenance', 'HVAC', 'mechanical trades', 'Tapered insulation', 'scupper', 'overflow', 'counterflashing', 'cladding', 'coping', 'insurer'):
            self.assertIn(detail, main)
        for unsupported in ('24/7', 'thermal scan', 'maintenance contract', 'Master Elite', 'no disruption', 'certified installer', 'manufacturer warranty'):
            self.assertNotIn(unsupported, main)

    def test_system_names_are_educational_not_installation_authorizations(self):
        systems = re.search(r'<section class="commercial-systems.*?</section>', self.source, re.S).group()
        for name in ('TPO / PVC', 'EPDM', 'Modified bitumen', 'Built-up roofing (BUR)'):
            self.assertIn(name, systems)
        for detail in ('heat-welded seams', 'compatible seam and flashing', 'base and cap', 'layers of roofing ply'):
            self.assertIn(detail, systems)
        self.assertIn('common system families provide context', systems)
        self.assertIn('Core samples describe selected locations', self.source)
        self.assertIn('mechanical connections and equipment servicing', self.source)

    def test_all_palette_variables_exist_in_shared_site_palette(self):
        shared = (ROOT / 'css/style.css').read_text()
        used = set(re.findall(r'var\\((--[a-z-]+)\\)', self.source))
        defined = set(re.findall(r'(--[a-z-]+)\\s*:', shared))
        self.assertEqual(used - defined, set())

    def test_both_commercial_ctas_preserve_project_prefill_and_anchor(self):
        ctas = [a for t, a in self.elements if t == 'a' and 'project=commercial' in a.get('href', '')]
        self.assertEqual(len(ctas), 2)
        self.assertTrue(all(a['href'] == '/contact.html?project=commercial#consultation-form' for a in ctas))

    def test_shared_header_footer_are_unchanged_and_preview_guards_remain(self):
        roofing = (ROOT / 'services/roofing.html').read_text()
        header = lambda source: re.search(r'<header\b.*?</header>', source, re.S).group()
        self.assertEqual(header(self.source), header(roofing))
        self.assertIn('<footer class="main-footer">', self.source)
        self.assertIn('<meta name="robots" content="noindex,nofollow">', self.source)
        self.assertIn('<script src="../js/site-config.js"></script>', self.source)
        self.assertIn('<script src="../js/app.js?v=96"></script>', self.source)

    def test_new_styles_are_page_scoped_and_keep_site_fonts(self):
        style = re.search(r'<style>(.*?)</style>', self.source, re.S).group(1)
        style = re.sub(r'/\*.*?\*/', '', style, flags=re.S)
        style = re.sub(r':is\([^)]*\)', ':is-scoped', style)
        for selector in re.findall(r'(?:^|\})([^{}]+)\{', style):
            selector = selector.strip()
            if selector.startswith('@media'):
                continue
            self.assertTrue(all(s.strip().startswith('.commercial-page') for s in selector.split(',')), selector)
        self.assertNotIn('font-family', style)
        self.assertIn('.commercial-page .roof-detail', style)
        self.assertIn('white-space: normal;', style)
        self.assertIn('@media (max-width: 768px)', style)


if __name__ == '__main__':
    unittest.main()
