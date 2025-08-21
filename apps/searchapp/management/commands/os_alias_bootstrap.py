from django.core.management.base import BaseCommand
from django.conf import settings
from apps.searchapp.alias import ensure_versioned_index

class Command(BaseCommand):
    help = "Ensure versioned index and read/write aliases exist for SITE_HOSTNAME"

    def add_arguments(self, parser):
        parser.add_argument("--site", default=None)
        parser.add_argument("--ver", type=int, default=1)

    def handle(self, *args, **opts):
        site = opts["site"] or settings.SITE_HOSTNAME
        v = opts["ver"]
        idx = ensure_versioned_index(site, v)
        self.stdout.write(self.style.SUCCESS(f"OK: {site} -> {idx} with read/write aliases"))
