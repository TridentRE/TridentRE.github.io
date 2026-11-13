# Trident Roofing & Exteriors

Static website with a separate, write-only lead-intake backend.
The live domain is not changed by this branch.

## Preview

- Preview uses only a separate development lead database. Use synthetic details, never real customer information.
- Notification delivery is disabled in preview; saved test requests do not email the business.
- All preview HTML is noindex,nofollow and robots disallows crawling.
- Production-domain form routing stays disabled until the reviewed release mode is enabled.
- The form fails closed without JavaScript; personal details are never submitted by native GET.

## Checks

```sh
python scripts/validate_site.py --output data/website/validation-after.json
python -m unittest discover -s tests -v
node --test scripts/website-form.test.cjs
python scripts/prepare-production.py  # dry run, no writes
```

`prepare-production.py --write` restores the recorded production SEO directives and
production-host form routing. It does not publish, deploy a backend or alter DNS.
Run it only for an approved production release. Production backend deployment,
notification activation, DNS zone backup, HTTPS checks and owner approval are separate gates.
