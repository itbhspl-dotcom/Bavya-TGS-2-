import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from travel.models import Trip, TripTracking
from django.utils import timezone
from core.models import User

today = timezone.now().date()

trips = Trip.all_objects.all()

print(f"Total trips: {trips.count()}")

active = trips.filter(start_date__lte=today, end_date__gte=today)
print(f"Active trips today ({today}): {active.count()}")

for t in active:
    rm_id = None
    if t.user and t.user.reporting_manager:
        rm_id = t.user.reporting_manager.employee_id
    
    has_track = TripTracking.objects.filter(trip=t).exists()
    print(f"- {t.trip_id} | User: {t.user.employee_id if t.user else 'None'} | RM: {rm_id} | Tracked: {has_track} | Status: {t.status}")

