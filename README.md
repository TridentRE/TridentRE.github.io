# Trident Roofing & Exteriors

Website takeover staging repository. Live-domain cutover requires owner approval.

## Preview preparation

- Branch: `chore/site-import`; **not production-ready for contact submissions**.
- All source pages are temporarily `noindex,nofollow`; robots disallows crawling.
- Commercial content is an owner-requested draft, not a live-domain publication.
- Baseline, validation evidence, form audit and handoff: [data/website/baseline-report.md](data/website/baseline-report.md).

```sh
python scripts/validate_site.py --output data/website/validation-after.json
python -m unittest discover -s tests -v
python scripts/prepare-production.py  # dry run only; no writes
```

Do not run `prepare-production.py --write` until production launch is explicitly approved.
It only restores recorded SEO directives; it does not deploy, publish or switch DNS.
