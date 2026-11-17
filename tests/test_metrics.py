"""Site-wide script loading and no-visible-markup regression."""
from html.parser import HTMLParser
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]

class Scripts(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.scripts = []
        self.feed(source)
    def handle_starttag(self, tag, attrs):
        if tag == 'script':
            self.scripts.append(dict(attrs))

class MetricsTests(unittest.TestCase):
    def test_every_page_loads_deferred_config_then_metrics_exactly_once(self):
        pages = list(ROOT.rglob('*.html'))
        self.assertEqual(len(pages), 156)
        for page in pages:
            scripts = Scripts(page.read_text()).scripts
            config = [s for s in scripts if s.get('src', '').endswith('/analytics-config.js')]
            metrics = [s for s in scripts if s.get('src', '').endswith('/website-metrics.js')]
            self.assertEqual(len(config), 1, page)
            self.assertEqual(len(metrics), 1, page)
            self.assertIn('defer', config[0], page)
            self.assertIn('defer', metrics[0], page)
            self.assertLess(scripts.index(config[0]), scripts.index(metrics[0]), page)
            self.assertTrue((page.parent / metrics[0]['src']).is_file(), page)
