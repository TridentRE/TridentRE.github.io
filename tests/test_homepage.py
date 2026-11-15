"""Homepage carousel scope, accessible fallback and approved offer contract."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]

class HomepageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / 'index.html').read_text()
        cls.js = (ROOT / 'js/homepage-carousel.js').read_text()
        cls.css = (ROOT / 'css/homepage.css').read_text()

    def test_seven_existing_slides_and_images_remain(self):
        self.assertEqual(len(re.findall(r'class="home-slide(?: active)?"', self.html)), 7)
        self.assertEqual(len(re.findall(r'class="home-frame(?: active)?"', self.html)), 7)
        self.assertEqual(self.html.count('aria-roledescription="slide"'), 7)
        for index in range(1, 8):
            self.assertIn(f'aria-label="{index} of 7"', self.html)
        self.assertEqual(self.html.count('<h1 '), 1)

    def test_no_scroll_runway_or_scroll_interception(self):
        self.assertNotIn('hero-runway', self.html)
        self.assertNotIn('hero-sticky', self.html)
        for banned in ('scrollTo', 'preventDefault', 'touchmove', 'wheel', 'requestAnimationFrame'):
            self.assertNotIn(banned, self.js)
        self.assertNotIn('position: sticky', self.css)
        self.assertNotIn('scroll-snap', self.css)
        self.assertIn('min-height: 100svh', self.css)
        self.assertNotIn('initHeroAnimation', (ROOT / 'js/app.js').read_text())

    def test_accessible_controls_and_motion_preferences(self):
        self.assertIn('class="home-controls" aria-label="Slideshow controls" hidden', self.html)
        for name in ('Pause slideshow', 'Previous slide', 'Next slide'):
            self.assertIn(name, self.html)
        for feature in ('prefers-reduced-motion: reduce', "hero.addEventListener('focusin', pause)", "document.addEventListener('visibilitychange', sync)", "hero.addEventListener('pointerenter'", 'IntersectionObserver'):
            self.assertIn(feature, self.js)
        self.assertIn('aria-hidden', self.js)
        self.assertIn(':focus-visible', self.css)

    def test_offer_has_only_approved_terms(self):
        offer = re.search(r'<section class="winter-planning.*?</section>', self.html, re.S).group()
        for phrase in ('Book your spring roof now.', 'Save 5%.', '5% off your spring roof.', 'Metal roofing, year-round'):
            self.assertIn(phrase, offer)
        for unsupported in ('deadline', 'expires', 'deposit', 'warranty', 'certified', 'limited time', '2027', 'November'):
            self.assertNotIn(unsupported, offer)
        self.assertIn('href="contact.html"', offer)
        self.assertIn('Discuss metal roofing', offer)

    def test_existing_trust_labels_remain_outside_hero(self):
        strip = re.search(r'<div class="trust-bar homepage-trust-strip".*?</section>', self.html, re.S).group()
        for label in ('IKO Certified Contractor', 'GAF Certified', 'Westlake Royal', 'Velux Specialist', 'Alu-Rex Preferred', 'Insurance Claim Assistance', 'Fully Insured to $5M'):
            self.assertIn(label, strip)
        self.assertLess(self.html.index('id="winter-planning"'), self.html.index('homepage-trust-strip'))
        self.assertNotIn('pc-hero-overlay', self.html)

    def test_production_release_and_routing(self):
        self.assertIn('<meta name="robots" content="index, follow">', self.html)
        self.assertIn('<script src="js/site-config.js"></script>', self.html)
        self.assertIn("releaseMode: 'production'", (ROOT / 'js/site-config.js').read_text())

if __name__ == '__main__':
    unittest.main()
