from django.urls import path
from .views import (
    JobApplicationCreateView,
    JobApplicationDeleteView,
    JobApplicationDetailView,
    JobApplicationListView,
)


urlpatterns = [
    path('create/', JobApplicationCreateView.as_view(), name='job-application-create'),
    path('list/', JobApplicationListView.as_view(), name='job-application-list'),
    path('<int:pk>/', JobApplicationDetailView.as_view(), name='job-application-detail'),
    path('<int:pk>/delete/', JobApplicationDeleteView.as_view(), name='job-application-delete'),
]
