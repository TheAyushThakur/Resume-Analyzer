from django.urls import path
from .views import (
    JobApplicationCreateView, 
    JobApplicationListView, 
    JobApplicationDetailView
)


urlpatterns = [
    path('create/', JobApplicationCreateView.as_view(), name='job-application-create'),
    path('list/', JobApplicationListView.as_view(), name='job-application-list'),
    path('<int:pk>/', JobApplicationDetailView.as_view(), name='job-application-detail'),
]
