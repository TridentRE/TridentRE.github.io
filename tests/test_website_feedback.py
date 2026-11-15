"""Approved imagery, plain credentials, siding options and commercial voice."""
from pathlib import Path
import json
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]

class WebsiteFeedbackTests(unittest.TestCase):
    def test_hero_and_replaced_cards_have_approved_local_sources(self):
        html = (ROOT/'index.html').read_text()
        frames = re.findall(r'<img src="assets/([^"]+)"[^>]+class="home-frame',html)
        self.assertEqual(len(frames),7)
        self.assertTrue(all(name.startswith('approved-') for name in frames))
        manifest = json.loads((ROOT/'data/website/photo-provenance-20261114.json').read_text())
        approved = {item['asset'] for item in manifest['photos']}
        self.assertTrue(set(frames).issubset(approved))
        for asset in (ROOT/'assets').glob('approved-*'):
            self.assertLess(asset.stat().st_size,300000,asset.name)
        for name in ['service_roofing_new.png','service_siding_new.png','service_eavestrough_new.png','service_specialty.png','service_emergency.png']:
            self.assertNotIn(f'src="assets/{name}"',html)

    def test_local_official_logos_and_plain_certification_labels(self):
        for file in ['index.html','certifications.html']:
            text=(ROOT/file).read_text()
            for name,label in [('iko','IKO Certified Contractor'),('gaf','GAF Certified')]:
                self.assertIn(f'src="assets/{name}-logo-red.svg"',text)
                self.assertIn(label,text)
                self.assertIn('<svg',(ROOT/f'assets/{name}-logo-red.svg').read_text())

    def test_siding_options_in_primary_service_copy(self):
        for file in ['services/siding.html','services/index.html','index.html','js/app.js']:
            text=(ROOT/file).read_text().lower()
            self.assertIn('cedar shake',text)
            self.assertIn('wood siding',text)

    def test_commercial_planning_speaks_for_trident(self):
        text=(ROOT/'services/commercial.html').read_text()
        note=re.search(r'<p class="planning-note">(.*?)</p>',text).group(1)
        self.assertIn('The Trident difference',note)
        self.assertIn('We plan',note)
        self.assertIn('minimise disruption',note)
        self.assertNotIn('Agree on',note)
        self.assertNotIn('These requirements belong',note)
        self.assertNotIn('\u2014',note)
