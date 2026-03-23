import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tgs_backend.settings")
django.setup()

from django.db import connection
with connection.cursor() as cursor:
    cursor.execute("DELETE FROM django_migrations WHERE app = 'core'")
print("Deleted core from django_migrations")
