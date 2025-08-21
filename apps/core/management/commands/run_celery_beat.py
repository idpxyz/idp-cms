from django.core.management.base import BaseCommand
from authoring.celery import app


class Command(BaseCommand):
    help = 'Run Celery beat scheduler'

    def handle(self, *args, **options):
        self.stdout.write('Starting Celery beat scheduler...')
        # Start the Celery beat scheduler programmatically
        app.start(['beat']) 