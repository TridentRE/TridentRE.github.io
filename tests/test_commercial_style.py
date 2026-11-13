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
        self.assertEqual(sections, ['service-hero', 'problem-solution', 'benefits-deep-dive', 'cta-banner'])
        for removed in ('services-hub-card', 'services-hub-grid', 'service-areas-panel'):
            self.assertNotIn(removed, self.source)
        self.assertEqual(sum(t == 'h1' for t, _ in self.elements), 1)
        self.assertEqual(sum(a.get('class') == 'benefit-item' for _, a in self.elements), 4)

    def test_existing_brand_visual_never_implies_residential_work_is_commercial(self):
        main = re.search(r'<main>(.*?)</main>', self.source, re.S).group(1)
        images = [a for t, a in Elements(main).elements if t == 'img']
        self.assertEqual(len(images), 1)
        self.assertEqual(images[0]['src'], '../assets/logo.png')
        self.assertEqual(images[0]['class'], 'about-logo')
        self.assertEqual(images[0]['alt'], 'Trident Roofing & Exteriors logo')
        self.assertNotIn('<figcaption', main)
        self.assertNotIn('service_eavestrough_new.png', main)
        self.assertTrue((ROOT / 'assets/logo.png').exists())

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
        for selector in re.findall(r'(?:^|\})([^{}]+)\{', style):
            selector = selector.strip()
            if selector.startswith('@media'):
                continue
            self.assertTrue(all(s.strip().startswith('.commercial-page') for s in selector.split(',')), selector)
        self.assertNotIn('font-family', style)
        self.assertIn('.commercial-page .about-visual', style)
        self.assertIn('white-space: normal;', style)
        self.assertIn('@media (max-width: 768px)', style)


if __name__ == '__main__':
    unittest.main()
