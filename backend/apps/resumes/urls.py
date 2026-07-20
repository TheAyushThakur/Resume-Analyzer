from django.urls import path
from .views import (
    ResumeListView,
    ResumeDeleteView,
    ResumeUploadView
)

urlpatterns = [
    path('upload/', ResumeUploadView.as_view(), name='resume-upload'),
    path('list/', ResumeListView.as_view(), name='resume-list'),
    path('<int:pk>/delete/', ResumeDeleteView.as_view(), name='resume-delete'),
]
