import os
import sys
import django

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tgs_backend.settings')
django.setup()

from travel.models import Trip
from django.db.models import Q
from core.models import User

user = User.objects.first()
if user:
    print(f"Testing query for user: {user.name}")
    try:
        search_query = "TEST"
        queryset = Trip.objects.filter(user=user, consider_as_local=False)
        queryset = queryset.filter(
                    Q(trip_id__icontains=search_query) |
                    Q(purpose__icontains=search_query) |
                    Q(source__icontains=search_query) |
                    Q(destination__icontains=search_query)
                )
        results = list(queryset)
        print(f"Success! Found {len(results)} results")
    except Exception as e:
        import traceback
        traceback.print_exc()
else:
    print("No user found to test")
