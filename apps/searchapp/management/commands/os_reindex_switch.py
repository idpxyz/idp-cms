from django.core.management.base import BaseCommand
from django.conf import settings
from apps.searchapp.alias import reindex_and_switch

class Command(BaseCommand):
    help = "Reindex from current read alias to a new versioned index, then atomically switch aliases"

    def add_arguments(self, parser):
        parser.add_argument("--site", default=None)
        parser.add_argument("--new-version", type=int, required=True)

    def handle(self, *args, **opts):
        site = opts["site"] or settings.SITE_HOSTNAME
        new_v = int(opts["new-version"])
        dst = reindex_and_switch(site, new_v)
        self.stdout.write(self.style.SUCCESS(f"Switched {site} read/write aliases to {dst}"))
