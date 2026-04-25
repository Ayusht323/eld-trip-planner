from django.urls import path
from .views import calculate_trip, health_check

urlpatterns = [
    path("calculate-trip/", calculate_trip, name="calculate-trip"),
    path("health/", health_check, name="health"),
]