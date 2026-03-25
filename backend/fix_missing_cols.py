import os
import django
import sys

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tgs_backend.settings')
django.setup()

from django.db import connection

tables = [
    'travel_localcarsubtypemaster',
    'travel_localbikesubtypemaster',
    'travel_trainprovidermaster',
    'travel_busprovidermaster',
    'travel_intercitycabprovidermaster',
    'travel_localprovidermaster',
    'travel_staytypemaster',
    'travel_roomtypemaster',
    'travel_mealcategorymaster',
    'travel_mealtypemaster',
    'travel_incidentaltypemaster',
    'travel_mastermodule',
    'travel_custommasterdefinition',
    'travel_custommastervalue'
]

def add_deleted_by_col(table_name):
    with connection.cursor() as cursor:
        try:
            cursor.execute(f"DESCRIBE {table_name}")
            cols = [row[0] for row in cursor.fetchall()]
            if 'deleted_by_id' not in cols:
                print(f"Adding deleted_by_id to {table_name}...")
                cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN deleted_by_id INT NULL")
                cursor.execute(f"ALTER TABLE {table_name} ADD CONSTRAINT fk_{table_name}_deleted_by FOREIGN KEY (deleted_by_id) REFERENCES core_user(id)")
                print(f"Success for {table_name}")
            else:
                print(f"Column already exists in {table_name}")
        except Exception as e:
            print(f"Error processed {table_name}: {e}")

for t in tables:
    add_deleted_by_col(t)
