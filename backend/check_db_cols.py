import os
import django
import sys

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tgs_backend.settings')
django.setup()

from django.db import connection

def check_columns(table_name):
    with connection.cursor() as cursor:
        cursor.execute(f"DESCRIBE {table_name}")
        columns = [row[0] for row in cursor.fetchall()]
        print(f"Columns for {table_name}: {columns}")

tables = [
    'travel_localcarsubtypemaster',
    'travel_localbikesubtypemaster',
    'travel_trainprovidermaster',
    'travel_busprovidermaster',
    'travel_intercitycabprovidermaster'
]

for t in tables:
    try:
        check_columns(t)
    except Exception as e:
        print(f"Error checking {t}: {e}")
