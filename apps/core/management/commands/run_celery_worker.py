from django.core.management.base import BaseCommand
from authoring.celery import app


class Command(BaseCommand):
    help = 'Run Celery worker'

    def handle(self, *args, **options):
        self.stdout.write('Starting Celery worker...')
        # Start the Celery worker programmatically
        app.start(['worker']) 